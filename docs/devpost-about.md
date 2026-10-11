## Inspiration
When a stadium lobby fills with people and the exit everyone came in through is suddenly blocked, the person deciding where the crowd goes is usually a staff member in a vest. Most of them have never practiced that call. Real evacuation drills are expensive, disruptive, and rare, so the first time staff make these decisions under pressure is often the real thing.

We wanted a way to practice those decisions as often as you like, and to show staff *why* a decision worked or didn't, not just whether it did.

## What it does
CrowdClear is an evacuation training game that runs in the browser on a laptop, or in VR on a WebXR headset such as Meta Quest.

- **Guided practice.** Two hands-on tasks teach the controls: open a closed exit, then send part of the crowd to it. Each step waits until you actually do it. There is no Next button and no timer.
- **The drill.** You coordinate a stadium lobby with three exits and 30 people, most of them heading for the exit they know. Somewhere between 10 and 20 seconds into the 60-second drill, a hazard blocks that busiest exit: a yellow obstruction, rising smoke, a red door, an alarm, and a spoken announcement. A line starts to build.
- **Your actions.** For each exit you can clear the hazard, reopen the door, or send people to it. Click a door directly in the scene (the mouse on a laptop, the controller trigger in a headset) or use the side panel; both run the same handlers. Staff need 5 seconds between redirects, so spamming orders doesn't work.
- **The review.** See how many people got out and how fast, the longest line and where it formed, every action you took with its time, and a score: people evacuated, plus a bonus for every second left when everyone is out.
- **Ghost replay.** Pick one action, change when it happened, and both versions replay in the same scene from the same start: your original run as wireframe figures, the alternative as solid people. CrowdClear tells you whether your original reproduced exactly and how much sooner or later the alternative cleared the venue.
- **Saved runs.** A finished drill is saved to Neon, and its link reopens the review so you can replay it later.
- **Sound.** ElevenLabs voices the PA announcements (drill start, each blocked exit, each redirect) and generated the alarm and a looping crowd ambience. Every announcement is also captioned on screen and in the headset.
- **Breathing (laptop).** Presage SmartSpectra reads the trainee's breathing rate from the webcam during play, and the review compares practice with the drill.

## How we built it
- **3D and VR.** A-Frame on Three.js renders the lobby and handles WebXR, the controller lasers, and the mouse pointer. The people are Kenney's CC0 Mini Characters with walk and idle animations, and a colored ring at each person's feet shows which exit they're heading for. In a headset you stand on a raised command post with a railing and an instruction panel, and every press that does something sends a short haptic pulse. The laptop interface is plain HTML and CSS: each exit is a stadium-style gate sign with its state written beside the color.
- **A deterministic simulation.** All crowd logic is one dependency-free file built around `step(state, schedule)` on fixed 0.1-second ticks. The live drill, the ghost replay, the comparison, and the server's save validation all call that same function, so the frame rate never changes the outcome. People walk to their place in their exit's line and keep at least 0.55 m apart. Each exit lets one person out every 1.8 seconds, and a crowded line slows it down: $t_{release} = 1.8 + 0.05 \cdot \max(0,\ n - 10)$ seconds, where $n$ is the number of people standing in that exit's line.
- **Balance by measurement.** A script plays all 101 possible hazard times with different strategies. Doing nothing never clears the venue (about 20 people stay inside). Clearing and reopening the blocked exit right away clears it in 52.7 s on average. Adding one well-chosen redirect takes 37.5 s. Spreading people out before the hazard and then fixing it takes 32.1 s and keeps the longest line at 14 people instead of about 23. Spamming redirects scores below one good redirect.
- **Backend and database.** Node.js and Express serve the game. A finished drill posts its scenario (which exit was blocked and when), its commands, and its result. The server re-runs the simulation and refuses any record it can't reproduce, then stores it in Neon Postgres. The client picks the run ID, so a retried save never creates a duplicate. We store commands, not positions, and rebuild any run by re-simulating it.
- **Audio.** A script pre-generates every clip with the ElevenLabs text-to-speech (`eleven_multilingual_v2`) and sound-effects (`eleven_text_to_sound_v2`) APIs, so the API key never reaches the browser. Missing clips fall back to the browser's own speech and synth.
- **Presage helper.** A small Node program runs the SmartSpectra SDK on the laptop webcam and posts the breathing rate to the game server on the same machine. The server only accepts readings from localhost and keeps them in memory; nothing biometric is stored.
- **Testing.** 45 automated tests (Node's built-in test runner) cover the simulation, tutorial gating, replays, saving against an in-process Postgres (PGlite), audio, and breathing. GitHub Actions runs them on every push. We tested the headset flows in Meta's Immersive Web Emulator.

## Challenges we ran into
- **Making the replay reproducible.** The ghost comparison only means something if the original plays back exactly. Fixed ticks, a fixed order for separating people who get too close, and replaying the same command schedule keep runs identical. When we added targeted actions, a replayed "redirect to C" quietly became "redirect to B" until we passed each command's target through the replay. Now the server re-simulates every save and rejects anything that doesn't match.
- **Making decisions matter.** At one point a third of the drills needed no response at all, and spamming redirects beat thinking. The hazard now strikes the busiest exit mid-drill, which exit is busiest changes from drill to drill, redirects have a cooldown, and crowded lines slow down. The measured results above are how we know it worked.
- **VR without a headset on the desk.** The Immersive Web Emulator installs its WebXR runtime after A-Frame checks for a headset, so VR silently refused to start. Once it ran, the emulator caught two bugs a laptop never would have: the controller lasers only reached 4 m (the doors are 25 m away), and the instruction panel sat 0.9 m from the player's face.
- **Thirty people, one texture.** When 30 character models loaded their shared texture in parallel, only one got image data and the rest flooded the console with thousands of warnings a second. Loading the texture once and sharing it fixed the warnings and saved memory.
- **Presage on an ARM laptop.** SmartSpectra has no Windows-on-ARM build, so on our Snapdragon laptop the helper runs under x64 emulation. It works, but the camera runs below 25 frames per second, so readings take longer to become confident.
- **A network that blocked Postgres.** Our network blocked port 5432, so we verified saving against the real Neon database through Neon's HTTPS driver.

## Accomplishments that we're proud of
- The ghost replay. Watching the wireframe crowd jam up at a blocked door while the solid one walks out is the clearest way we've found to show why a decision matters.
- Determinism we can prove: a drill saved to Neon, reopened from its link, and re-simulated from its commands reproduces its original result exactly, and the server checks that on every save.
- One set of controls for the mouse and VR controllers, both acting on the doors themselves.
- A balance we measured instead of guessed: every better decision clears the venue faster.

## What we learned
- Designing for determinism from the first hour is much easier than adding it later, and it gave us replay, saving, validation, and testing almost for free.
- Simulate strategies before tuning by feel. One script running all 101 scenarios told us more than an hour of playtesting.
- An emulator is not a headset, but it catches a whole class of VR bugs before you put one on.
- In a training tool, the review matters as much as the drill. Seeing the other outcome is where the learning happens.

## What's next for CrowdClear
CrowdClear is a prototype. The crowd model is deliberately simple (people walk straight to their exit's line and keep their distance), and its results are simulation outputs, not predictions of real evacuations. Next steps:
- Tune the headset experience on a physical Quest: pointing accuracy, panel placement, and frame rate.
- Real floor plans with walls and obstacles, which will need proper pathfinding such as flow fields.
- More scenarios: multiple incidents, people with mobility needs (the character pack already includes wheelchairs), and staff coordinating over radio.
- Breathing sensing on hardware Presage supports natively, used as a stress cue in the review.
- A trainer dashboard to assign drills and track progress across a venue's staff.
- Checking crowd behavior against published evacuation research.
