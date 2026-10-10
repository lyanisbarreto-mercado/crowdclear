# Higgsfield prompts (any image or video generator works)

Fill tokens from `docs/design/BRAND.md`: `[NAME]`, `[ATMOSPHERE]`, `[C1] [C2] [C3]`, `[ACCENT]`, `[ONE-LINER]`, `[PROBLEM DOMAIN]`.

## Using the Higgsfield MCP (when connected)

- Images (thumbnail, cover base, B-roll plates): `generate_image`. Video (B-roll, sting): `generate_video`. Several at once: the batch variants, then wait for jobs before showing results.
- Check the credit balance before a batch and tell the user the count you will generate.
- Real recordings for editing: upload them with the MCP's media upload tool, then use its edit or workflow tools; keep product frames untouched.
- Download every result into `docs/stills/generated/` or `docs/video/generated/` with a descriptive name.

Without the MCP: give the user the filled prompts below, one block per asset, and the file name to save as.

## Cover / thumbnail (3:2 for Devpost, 16:9 for YouTube)

```text
Cover image for [NAME]. Mood: [ATMOSPHERE]. Palette [C1], [C2], accent [ACCENT].
Large readable title "[NAME]" and at most 4 more words: "[short phrase]".
Bold composition, high contrast, cinematic light. Leave the lower-right fifth calm for a URL.
Negative: screenshots, fake app UI, dashboards, tiny text, purple neon glow, stock handshake, logos of real companies.
```

## B-roll plate (under the hook voice-over)

```text
Cinematic still suggesting [PROBLEM DOMAIN], [ATMOSPHERE], palette [C1] [C2].
Documentary feel, natural light, shallow depth of field.
Negative: faces looking at camera, logos, text, UI mockups, phones showing screens.
```

## Name sting (2-3 s video)

```text
Short motion sting: the wordmark "[NAME]" resolves on a [C1] field with [ACCENT] light sweep.
Clean, confident, 2 seconds, no extra text.
```

## Poster background (optional; build_poster.py makes the poster itself)

```text
Abstract printable background texture, [ATMOSPHERE], palette [C1] [C2] [C3],
low detail in the center two thirds for text, no text, no UI.
```

## Edit instruction (Higgsfield edit or any editor)

```text
Assemble a [150]-second hackathon demo from the provided recordings.
Timeline: 0-8s cold open clip C0 with its real audio; 8-35s hook voice-over over B-roll plates;
35-45s name sting + one-liner; 45-110s Beat A then Beat B from real screen recordings;
110-135s proof (C4, C5); 135-150s endcard with [URL] for at least 3 seconds.
Use only the provided recordings for product UI. Do not generate or alter UI frames.
Grade to the palette, soft cuts between beats only, captions on, loudness for laptop speakers.
```

## Caption style

Short and concrete. Example: "Pickup scan reverses the hold when the label matches a recall."
