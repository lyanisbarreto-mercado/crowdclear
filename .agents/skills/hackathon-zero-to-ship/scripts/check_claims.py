#!/usr/bin/env python3
"""Audit judge-facing claims against docs/FACTS.json and the live /api/health.

    python check_claims.py --project . [--health-url https://app.tech/api/health] [--strict] [--include FILE ...]

Errors (exit 1):
  - a FACTS metric without provenance, or a headline key that is not a metric
  - a claimed integration (FACTS.integrationsClaimed) that live health does not report true
Warnings (exit 1 only with --strict):
  - template placeholders left in FACTS or the copy
  - numbers in the copy that match no FACTS value (at the precision written)
Review notices (non-blocking):
  - copy mentions an integration that health reports false; a contextual claims reviewer must
    distinguish unsupported live claims from honest limits, build tools or deferred work

A zero exit code is a mechanical lint result, not proof that every prose claim is true.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

DOCS = ["README.md", "docs/pitch.md", "docs/submission-draft.md", "docs/stills/GALLERY.md", "docs/video/EDIT.md"]
NUM = re.compile(r"(?<![\w.#/])(\d[\d,]*)(\.\d+)?(\s?%)?(?!\w)")
UNIT = re.compile(r"^\s?-?\s?(ms|s|sec|secs|seconds?|mins?|minutes?|h|hrs?|hours?|am|pm|px|x)\b", re.I)
PLACEHOLDERS = ("YOUR_PROJECT", "YOUR_DOMAIN", "TODO(you)", "example.com")


def numbers_in(value) -> list[float]:
    if isinstance(value, bool):
        return []
    if isinstance(value, (int, float)):
        return [float(value)]
    if isinstance(value, dict):
        return [n for k, v in value.items() if k != "$comment" for n in numbers_in(v)]
    if isinstance(value, list):
        return [n for v in value for n in numbers_in(v)]
    return []


def backed(written: str, decimals: int, percent: bool, facts: list[float]) -> bool:
    x = float(written)
    for f in facts:
        for candidate in ((f, f * 100) if percent else (f,)):
            if round(candidate, decimals) == x:
                return True
    return False


def prose_lines(text: str):
    """Yield (line_no, line) outside fenced code, with inline code and HTML comments blanked."""
    text = re.sub(r"<!--.*?-->", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)
    fenced = False
    for n, line in enumerate(text.splitlines(), 1):
        if line.lstrip().startswith("```"):
            fenced = not fenced
            continue
        if not fenced:
            yield n, re.sub(r"`[^`]*`", "", line)


def fetch_health(url: str):
    req = urllib.request.Request(url, headers={"accept": "application/json", "user-agent": "check-claims"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", default=".")
    ap.add_argument("--health-url", help="production /api/health URL; without it only static checks run")
    ap.add_argument("--strict", action="store_true", help="warnings also fail (use before submitting)")
    ap.add_argument("--include", nargs="*", default=[], help="extra judge-facing files to scan")
    args = ap.parse_args()

    root = Path(args.project).resolve()
    facts_path = root / "docs" / "FACTS.json"
    if not facts_path.is_file():
        print(f"error: {facts_path} not found")
        return 1
    facts = json.loads(facts_path.read_text(encoding="utf-8"))
    errors: list[str] = []
    warnings: list[str] = []
    review: list[str] = []

    metrics = facts.get("metrics", {}) or {}
    provenance = facts.get("provenance", {}) or {}
    errors += [f"FACTS metric '{k}' has no provenance (which command measured it?)" for k in metrics if not provenance.get(k)]
    errors += [f"FACTS headline '{k}' is not a metric" for k in facts.get("headline", []) if k not in metrics]
    raw_facts = facts_path.read_text(encoding="utf-8")
    warnings += [f"FACTS still contains placeholder '{p}'" for p in PLACEHOLDERS if p in raw_facts.replace(facts.get("$comment", ""), "")]
    if not facts.get("asOf"):
        warnings.append("FACTS.asOf is empty")

    docs = [root / d for d in DOCS + args.include if (root / d).is_file()]
    texts = {d: d.read_text(encoding="utf-8", errors="replace") for d in docs}

    claimed = facts.get("integrationsClaimed", []) or []
    aliases = facts.get("integrationAliases", {}) or {}
    if args.health_url:
        try:
            health = fetch_health(args.health_url)
        except Exception as e:  # noqa: BLE001 - report any network/parse failure as one error
            errors.append(f"health unreachable at {args.health_url}: {e}")
            health = None
        if health is not None:
            live = health.get("integrations", {}) or {}
            if health.get("ok") is not True:
                errors.append("health.ok is not true")
            errors += [f"claimed integration '{k}' is not true in live health" for k in claimed if live.get(k) is not True]
            for name, on in live.items():
                if on is True:
                    continue
                for term in [name, *aliases.get(name, [])]:
                    pat = re.compile(r"\b" + re.escape(term), re.I)
                    for d, text in texts.items():
                        for n, line in prose_lines(text):
                            if pat.search(line):
                                review.append(f"{d.relative_to(root).as_posix()}:{n} mentions '{term}' while health reports {name}=false; check whether this is a live claim or an honest limitation/tool reference")
    elif claimed:
        warnings.append("no --health-url given; claimed integrations not verified against production")

    fact_numbers = numbers_in(facts)
    for d, text in texts.items():
        for p in PLACEHOLDERS:
            if p in text:
                warnings.append(f"{d.relative_to(root).as_posix()} still contains '{p}'")
        for n, line in prose_lines(text):
            for m in NUM.finditer(line):
                whole, frac, pct = m.group(1), m.group(2) or "", m.group(3)
                if re.fullmatch(r"\d{1,3}(,\d{3})+", whole):
                    whole = whole.replace(",", "")
                else:
                    whole = whole.split(",")[0]
                if not whole:
                    continue
                value = float(whole + frac)
                if UNIT.match(line[m.end():]) or (value <= 12 and not frac and not pct) or (1990 <= value <= 2099 and not frac):
                    continue
                if not backed(whole + frac, max(len(frac) - 1, 0), bool(pct), fact_numbers):
                    warnings.append(f"{d.relative_to(root).as_posix()}:{n} number '{m.group(0).strip()}' is not in FACTS")

    for e in errors:
        print("ERROR  ", e)
    for w in warnings:
        print("warning", w)
    for item in review:
        print("review ", item)
    print(f"{len(errors)} error(s), {len(warnings)} warning(s), {len(review)} review notice(s); scanned {len(docs)} file(s)")
    return 1 if errors or (args.strict and warnings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
