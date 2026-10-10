---
name: hackathon-demo-assets
description: Use when a hackathon product is live and the team needs a demo video, Devpost thumbnail or gallery images, screenshots of the real UI, an expo poster with QR codes, a capture shot list, or Higgsfield (or other generator) prompts and edits.
---

# Hackathon demo assets

Plan and produce the event's required demo video, gallery and expo poster. Prepare shot lists and copy while the product is being built; final captures use verified stable behavior.

**Core rule:** product UI is always real capture. Generation (Higgsfield or any other tool) makes B-roll, stings, thumbnails and backgrounds around real footage, never a fake screen.

## Preconditions

- For final production captures: the URL works and the captured journey is stable (`hackathon-zero-to-ship` Phase 3). Record the commit/deployment captured.
- `docs/FACTS.json`, `docs/pitch.md` and `docs/design/BRAND.md` exist and are current.

If the product is not live, continue planning and labelled local capture when useful while the builder resolves deployment. Do not describe local or fixture footage as production.

## Pipeline (adapt to the event, skip optional assets when short on time)

```text
Assets:
- [ ] 1 Stills of every judge page (desktop + phone), defects fixed
- [ ] 2 Shot list + real footage captured
- [ ] 3 Brand kit generated (thumbnails, B-roll, sting)
- [ ] 4 Video edited, captioned, uploaded (by ~T-15% of the event)
- [ ] 5 Gallery: 3-6 images with captions
- [ ] 6 Expo poster with verified QR codes
- [ ] 7 docs/SHOWCASE.md package
```

### 1. Stills

From the project root: `node <this-skill-dir>/scripts/stills.mjs <prodUrl> docs/stills/raw / /judge <other pages>` (needs `@playwright/test` in the project). It saves desktop and phone shots and prints horizontal overflow and console errors per page. Fix those defects first; they show in every asset downstream. A browser MCP (Playwright, Chrome) works too for one-off shots.

### 2. Shot list and footage

Follow [shot-list.md](references/shot-list.md). The user records (OBS, QuickTime, phone screen record) or you drive a browser MCP. Raw files go to `docs/video/raw/` (gitignored). Record each beat twice.

### 3. Brand kit

Use [higgsfield.md](references/higgsfield.md) or an available generator, filled from `BRAND.md`. Work within existing generation authorization and budget; propose the concrete batch if these are missing. If unavailable, reuse real stills and simple graphics. Optional B-roll must not delay the required demo. Save to `docs/stills/generated/`.

### 4. Video

Write `docs/video/EDIT.md`: the pitch formula timeline, each row naming the raw clip and VO line. Every number matches FACTS; live integration claims need verified health and operation evidence. Build-tool references and honest limits describe actual use. Burn in captions, edit in available tools and upload early when required and authorized. Put the verified link in FACTS `demo.videoUrl`.

Require a real operation proof as well as health for integration claims. Confirm event length, visibility and upload rules. Prepare the export before requesting missing publication authorization; use an existing authorized destination without asking twice. After product changes, re-capture only affected scenes and recheck their claims.

### 5. Gallery

3-6 images, in this order: (1) cover with name + tagline, (2) Beat B moment from a real still, (3) proof surface (`/judge`, `/api/stats`, a board), (4) optional architecture or money-flow diagram from real notes, (5) optional phone frame. Devpost recommends 3:2 images (for example 1500x1000); check the form's hint. Keep UI pixels from the capture when compositing. Write `docs/stills/GALLERY.md`: file, caption. Captions are short, concrete, no stacked adjectives, no em dashes.

### 6. Poster

`python <this-skill-dir>/scripts/build_poster.py --project . --steps "Find|Hold|Check|Settle"` writes `docs/presentation/poster.html` from FACTS and BRAND (QR codes need `pip install qrcode`). Print to PDF from a browser: Letter landscape, background graphics on. Scan every QR with a phone and confirm it opens the right live page before printing.

### 7. Package

`docs/SHOWCASE.md`: video URL, gallery files + captions, poster PDF path, live URL + `/judge`, one curl, FACTS `asOf`.

## Common mistakes

| Mistake | Fix |
|---|---|
| Generated "dashboard" in the gallery | Use a real still; generated art only as background or cover |
| Video opens on a logo | Cold open on the payoff moment (real capture, real audio) |
| Number in the video differs from the site | Read it from FACTS; re-export the clip |
| QR printed without scanning | Scan each one on a phone before printing |
| Thumbnail unreadable on a phone | Max 4 words of title, high contrast, test at 300 px wide |
