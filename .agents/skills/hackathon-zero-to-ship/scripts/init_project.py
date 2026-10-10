#!/usr/bin/env python3
"""Copy the zero-to-ship project templates into a project root. Safe to re-run.

    python init_project.py <project-dir> [--dry-run]

- Plain files are created only when missing (existing files are never overwritten).
- AGENTS.md: the kit block (between BEGIN/END markers) is added or refreshed; other content is kept.
- CLAUDE.md: gains an `@AGENTS.md` import line if it lacks one.
- .gitignore: missing lines are appended.
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

TEMPLATES = Path(__file__).resolve().parents[1] / "assets" / "templates"
BEGIN, END = "<!-- BEGIN:hackathon-kit -->", "<!-- END:hackathon-kit -->"
# stored under neutral names so agents never auto-load the templates as nested instruction files
RENAMES = {
    "gitignore": ".gitignore",
    "github-workflows": ".github/workflows",
    "AGENTS.template.md": "AGENTS.md",
    "CLAUDE.template.md": "CLAUDE.md",
}


def destination(rel: Path) -> Path:
    parts = rel.as_posix()
    for src, dst in RENAMES.items():
        if parts == src or parts.startswith(src + "/"):
            return Path(dst + parts[len(src):])
    return rel


def merge_agents(existing: str, block: str) -> str:
    block = block.strip()
    pattern = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END), re.S)
    if pattern.search(existing):
        return pattern.sub(lambda _: block, existing)
    return block + "\n\n" + existing.lstrip() if existing.strip() else block + "\n"


def merge_claude(existing: str) -> str:
    if any(line.strip() == "@AGENTS.md" for line in existing.splitlines()):
        return existing
    return "@AGENTS.md\n" + existing


def merge_gitignore(existing: str, template: str) -> str:
    have = {line.strip() for line in existing.splitlines()}
    add = [line for line in template.splitlines() if line.strip() and not line.startswith("#") and line.strip() not in have]
    if not add:
        return existing
    sep = "" if existing.endswith("\n") or not existing else "\n"
    return existing + sep + "\n# hackathon kit\n" + "\n".join(add) + "\n"


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project", nargs="?", default=".", help="project root (default: current directory)")
    ap.add_argument("--dry-run", action="store_true", help="show what would change, write nothing")
    args = ap.parse_args()

    root = Path(args.project).resolve()
    if not TEMPLATES.is_dir():
        print(f"templates not found at {TEMPLATES}", file=sys.stderr)
        return 2
    if not args.dry_run:
        root.mkdir(parents=True, exist_ok=True)

    report: dict[str, list[str]] = {"created": [], "merged": [], "kept": []}
    for src in sorted(p for p in TEMPLATES.rglob("*") if p.is_file()):
        rel = destination(src.relative_to(TEMPLATES))
        dst = root / rel
        name = rel.as_posix()
        template = src.read_text(encoding="utf-8")
        if not dst.exists():
            report["created"].append(name)
            if not args.dry_run:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, dst)
            continue
        current = dst.read_text(encoding="utf-8")
        if name == "AGENTS.md":
            merged = merge_agents(current, template)
        elif name == "CLAUDE.md":
            merged = merge_claude(current)
        elif name == ".gitignore":
            merged = merge_gitignore(current, template)
        else:
            report["kept"].append(name)
            continue
        if merged != current:
            report["merged"].append(name)
            if not args.dry_run:
                dst.write_text(merged, encoding="utf-8", newline="\n")
        else:
            report["kept"].append(name)

    prefix = "[dry run] " if args.dry_run else ""
    print(f"{prefix}project: {root}")
    for label, items in report.items():
        if items:
            print(f"{prefix}{label} ({len(items)}): " + ", ".join(items))
    print("next: fill PLAN.md Context and docs/design/BRAND.md (phase 0), then scaffold (phase 1)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
