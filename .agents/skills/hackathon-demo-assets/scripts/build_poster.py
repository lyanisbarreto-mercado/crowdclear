#!/usr/bin/env python3
"""Expo table poster (Letter landscape) built from docs/FACTS.json and docs/design/BRAND.md.

    python build_poster.py --project . --steps "Find it|Hold it|Scan it|Settle it" [--out docs/presentation/poster.html]

Every number comes from FACTS (up to 3 headline metrics; optional FACTS.labels maps a metric key to its
poster label, e.g. "macroF1": "Macro-F1 on unseen products"). QR codes need `pip install qrcode`; without it the
poster shows labelled placeholders. Print to PDF from a browser: Letter, landscape, background graphics on.
Scan every QR on a phone before printing.
"""

from __future__ import annotations

import argparse
import html
import io
import json
import re
import sys
from pathlib import Path

DEFAULT_COLORS = {"ink": "#15161f", "paper": "#fffaf0", "field": "#ffb020", "accent": "#1434cb"}


def brand(project: Path) -> tuple[dict[str, str], str, str]:
    colors = dict(DEFAULT_COLORS)
    display = body = "system-ui"
    path = project / "docs" / "design" / "BRAND.md"
    if path.is_file():
        text = path.read_text(encoding="utf-8")
        for token, hexval in re.findall(r"`--([a-z]+)`\s*\|\s*(#[0-9a-fA-F]{3,8})", text):
            colors[token] = hexval
        for label, value in re.findall(r"\*\*(Display|Body):\*\*\s*([A-Za-z][\w ]{1,40}?)\s*(?:[,(<]|$)", text, re.M):
            if label == "Display":
                display = value.strip()
            else:
                body = value.strip()
    return colors, display, body


def qr_svg(url: str) -> str | None:
    try:
        import qrcode
        import qrcode.image.svg
    except ImportError:
        return None
    img = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=1)
    buf = io.BytesIO()
    img.save(buf)
    svg = buf.getvalue().decode()
    return svg[svg.index("<svg"):]


def label(key: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", " ", key).capitalize()


def fmt(value) -> str:
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, int):
        return f"{value:,}"
    return html.escape(str(value))


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", default=".")
    ap.add_argument("--steps", default="", help='pipe-separated how-it-works steps, e.g. "Find|Hold|Check|Settle"')
    ap.add_argument("--out", default="docs/presentation/poster.html")
    args = ap.parse_args()

    project = Path(args.project).resolve()
    facts = json.loads((project / "docs" / "FACTS.json").read_text(encoding="utf-8"))
    demo = facts.get("demo", {}) or {}
    live = demo.get("liveUrl")
    if not live:
        print("error: set FACTS.demo.liveUrl before building the poster", file=sys.stderr)
        return 1
    live = live.rstrip("/")
    colors, display, body = brand(project)
    metrics = facts.get("metrics", {}) or {}
    headline = [k for k in facts.get("headline", []) if k in metrics][:3]
    steps = [s.strip() for s in args.steps.split("|") if s.strip()]

    links = [("Try it live", live), ("Judges start here", live + (demo.get("judgePath") or "/judge"))]
    if demo.get("repoUrl"):
        links.append(("Read the code", demo["repoUrl"]))
    missing_qr = False
    tiles = []
    for title, url in links:
        svg = qr_svg(url)
        if svg is None:
            missing_qr = True
            svg = '<div class="ph">QR placeholder<br>pip install qrcode</div>'
        tiles.append(f'<div class="qr">{svg}<b>{html.escape(title)}</b><small>{html.escape(url)}</small></div>')

    labels = facts.get("labels", {}) or {}
    stats = "".join(f'<div class="stat"><b>{fmt(metrics[k])}</b><span>{html.escape(labels.get(k) or label(k))}</span></div>' for k in headline)
    step_list = "".join(f"<li>{html.escape(s)}</li>" for s in steps)
    honesty = "Sandbox demo. No real money moves." if (facts.get("honesty", {}) or {}).get("sandboxOnly") else ""
    css_vars = "".join(f"--{k}:{v};" for k, v in colors.items())

    page = f"""<!doctype html><html><head><meta charset="utf-8"><title>{html.escape(facts.get('projectName', 'Poster'))} poster</title>
<style>
@page {{ size: 11in 8.5in; margin: 0 }}
* {{ box-sizing: border-box; margin: 0 }}
:root {{ {css_vars} }}
body {{ width: 11in; height: 8.5in; background: var(--field); color: var(--ink); font-family: '{body}', system-ui, sans-serif; padding: .35in;
  -webkit-print-color-adjust: exact; print-color-adjust: exact }}
.grid {{ display: grid; grid-template-columns: 1.3fr 1fr; gap: .25in; height: 100% }}
.card {{ background: var(--paper); border: 3px solid var(--ink); border-radius: .25in; padding: .3in; box-shadow: 5px 6px 0 var(--ink); display: flex; flex-direction: column; gap: .2in }}
h1 {{ font-family: '{display}', system-ui, sans-serif; font-size: .8in; line-height: .95; letter-spacing: -.01em }}
.tag {{ font-size: .24in; font-weight: 700; line-height: 1.25 }}
ol {{ padding-left: .3in; font-size: .2in; font-weight: 700; display: grid; gap: .06in }}
.stats {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: .12in; margin-top: auto }}
.stat {{ border: 2px solid var(--ink); border-radius: .14in; padding: .1in .12in }}
.stat b {{ font-family: '{display}', system-ui, sans-serif; font-size: .38in; display: block; line-height: 1 }}
.stat span {{ font-size: .12in; font-weight: 700 }}
.qrs {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: .18in }}
.qr {{ text-align: center }}
.qr svg, .ph {{ width: 100%; height: auto; aspect-ratio: 1; background: #fff; border: 2px solid var(--ink); border-radius: .08in; padding: .06in }}
.ph {{ display: grid; place-items: center; font-size: .14in; font-weight: 700 }}
.qr b {{ display: block; font-size: .16in; margin-top: .05in }}
.qr small {{ font-size: .1in; word-break: break-all }}
.honest {{ margin-top: auto; font-size: .13in; font-weight: 700 }}
.accent {{ color: var(--accent) }}
</style></head><body><div class="grid">
<section class="card"><h1>{html.escape(facts.get('projectName', ''))}</h1><p class="tag">{html.escape(facts.get('tagline', ''))}</p>
{f'<ol>{step_list}</ol>' if step_list else ''}<div class="stats">{stats}</div></section>
<section class="card"><p class="tag accent">Scan it. No login.</p><div class="qrs">{''.join(tiles)}</div>
<p class="honest">{honesty}</p></section>
</div></body></html>"""

    out = project / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"wrote {out}")
    if missing_qr:
        print("warning: qrcode not installed; QR tiles are placeholders (pip install qrcode, then rerun)")
    if not headline:
        print("note: FACTS.headline is empty, so the poster shows no numbers")
    print("next: open in a browser, print to PDF (Letter, landscape, background graphics), scan every QR")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
