## Inspiration

When a stadium lobby is full and the exit everyone walked in through gets blocked, a staff member has seconds to decide where the crowd goes. Full evacuation drills are expensive and disruptive, so chances to practice that decision are limited, and staff almost never get to see what would have happened if they had acted differently.

We built CrowdClear so staff can run that emergency again and again, hear it the way a real one sounds, and then watch their run play back next to their best one. We also wanted to measure the person in charge, not just the crowd. With **Presage**, the laptop webcam shows how calm you stayed.

## What it does

CrowdClear is an evacuation training game that runs in a laptop browser or in VR through **WebXR**. You manage a stadium lobby with 60 people and three exits during a 60-second drill.

- **Guided practice first.** Two untimed tasks teach you to open an exit and send people to it. Each step advances only after you actually do it.
- **A drill that escalates.** Two or three blockages hit during the drill. The first lands 10 to 20 seconds in, and each one strikes the exit most people are heading for at that moment. Blocked exits stay blocked until you deal with them: clearing takes four seconds, one exit at a time, and reopening the door is a separate step. Sending people to another exit has a five-second cooldown, so timing matters.
- **Panic you have to manage.** At each incident, about one in five guests panics. They wander, ignore redirects and won't queue until someone calms them. On a laptop, press Reassure and an **ElevenLabs** voice tells the crowd "You are safe. Follow staff to the open exit. Stay calm." while two or three panicking guests settle. In browsers with speech recognition you can also just say "calm" into the microphone. In VR, that's how you calm people.
- **Act in the scene.** Click a door or blockage with the mouse, or point a controller and pull the trigger in VR. In VR, select a blocked door twice within 450 ms to start clearing it, and the controller pulses when an action goes through.
- **ElevenLabs voices the incident.** A PA announcer opens the drill, calls out each blocked exit ("Attention. Exit B is blocked. Staff, respond now.") and directs the crowd after every redirect, over an evacuation alarm and looping crowd ambience.
- **Presage measures the trainee.** With the **Presage SmartSpectra** helper running, the HUD shows your breathing rate and pulse from the laptop webcam. After the drill, the results card turns those readings into a 1 to 10 calm score (Steady, Tense or Panicky) and tells you whether this was your calmest run yet.
- **Review against your best.** The review puts people out, time left, guests calmed, guests still panicking and your score next to your best run, along with the longest line and a timestamped log of every action. Drag a 0 to 60 second slider or press Play to watch your best run as wireframe figures alongside this run as solid ones. In VR, −5 s / +5 s buttons and Play do the same.
- **Shareable runs.** Finished drills save to **Neon Postgres**, and the page link reopens that run's review.

## How we built it

**One deterministic simulation drives everything.** The simulation is plain JavaScript with no dependencies and no clock. It advances in fixed 0.1-second ticks, and the live drill, the best-run replay, saved-run reopening and the server's save check all call the same function. A run is just its scenario seed plus a list of timestamped commands (clear, open, redirect, calm), so any run can be rebuilt exactly without recording every person's position.

The crowd model is simple on purpose. People walk at seeded speeds from 1.8 to 3 m/s toward their assigned exit, queue in three columns and keep 0.55 m of personal space. Each exit lets one person out every 1.2 seconds, and every person beyond ten in line adds 0.05 seconds, so a crowded exit gets slower. The Reassure button picks which panicking guests to calm with a seeded shuffle, so calming replays exactly too.

**ElevenLabs makes every sound the trainee hears.** A Node script (`npm run audio`) calls the **ElevenLabs Text-to-Speech API** with the `eleven_multilingual_v2` model to voice eight lines: the drill start, a blocked-exit call and a redirect call for each of the three exits, and the Reassure line. It calls the **ElevenLabs Sound Effects API** (`eleven_text_to_sound_v2`) for a three-second two-tone evacuation alarm and a 12-second crowd murmur generated to loop.

The spoken text lives in one file that both the game and the generator read, so the audio always matches the on-screen copy. We generate the clips ahead of time and serve them as static MP3s. That means no waiting on audio mid-drill, and the API key never reaches the browser. The alarm plays at 45% volume and the ambience at 25%, so the announcer stays clear over both. If the alarm clip is missing, the game falls back to a synthesized Web Audio siren.

**Presage SmartSpectra reads the trainee's vitals.** A small Node helper (`npm run sensor`) uses the **Presage SmartSpectra Node.js SDK** to read breathing rate, breathing amplitude, pulse and heart-rate variability (Baevsky stress index) from the laptop webcam. It posts the latest reading to the game server about once a second. The page polls it, shows breathing and pulse on the HUD once Presage reports at least 50% confidence, and logs samples for the review from 40%.

At the end of the drill we average the samples and combine breathing, pulse and stress into our own 1 to 10 calm score, compared against the calmest run stored in that browser. It's a training signal, not a medical measurement. Readings stay in server memory and are never written to the database. The endpoint only talks to the same machine unless remote posting is switched on for a deployed demo, optionally protected by a shared token.

**A-Frame, Three.js and WebXR bring the lobby into the browser and VR.** **A-Frame 1.8.0** (built on **Three.js**) renders the lobby, and **WebXR** provides the headset session and tracked controllers. Mouse clicks and controller triggers press the same page buttons, so both ways of playing share one set of rules. In VR you stand on a raised command post with world-fixed instruction, analysis and replay panels. **Kenney's CC0 Mini Characters** make up the animated crowd, with colored foot rings showing each person's exit.

**Higgsfield helped create the concourse art.** We generated the floor, wall and exterior textures with **Higgsfield** (GPT Image Flare): three generations for 0.75 credits, compressed to local WebP files totaling about 156 KB. Doors, EXIT signs, equipment cases, smoke and flames are lightweight A-Frame geometry and SVG sprites.

**Node.js, Express and Neon Postgres make runs shareable and verifiable.** **Express 5** on **Node.js** serves the game and its API. Before saving a run to **Neon**, the server replays the submitted commands with the shared simulation and rejects any run whose result it can't reproduce. The client picks the run ID, so a retried save never creates a duplicate.

**Meta's Immersive Web Emulator let us test VR without a headset.** The **[Immersive Web Emulator](https://github.com/meta-quest/immersive-web-emulator)** browser extension, built on the Immersive Web Emulation Runtime (IWER), emulates a Meta Quest 3 headset and controllers in desktop Chrome. We used it to check VR entry, panel placement, controller-trigger actions and the return to the laptop view.

**Automated tests and strategy sweeps.** Our 117 automated tests cover the simulation, tutorial gating, panic and calming, multiple blockages, saving and reopening, audio, Presage readings and the VR layout. **GitHub Actions** runs them on every push to `main` and every pull request.

We also ran scripted strategies against all 202 drill scenarios (101 first-incident times, each with two or three blockages):

- Doing nothing: 12 to 19 of 60 people get out.
- Clearing, reopening and redirecting only after each blockage, while calming guests: 34 to 45 get out.
- Keeping the lines balanced from the start and clearing right away, but never calming anyone: 48 to 58 get out.
- The same, plus calming two guests every 1.2 seconds: all 60 get out, in 34.2 to 49.3 seconds.

These come from scripted bots in our simulation, not human players or real evacuations.

## Challenges we ran into

**Keeping replays exact as the game grew.** Every new mechanic (timed clearing, multiple blockages, panic, calming) had to stay deterministic or replays would drift. Input at a tick is now applied before that tick's incident, calming goes through recorded commands, and even the Reassure button chooses guests with a seeded shuffle. Testing caught replayed redirects losing their target exit. When the rules change, we bump the simulation version (now 9), so older saved runs say they can't be replayed instead of replaying wrong.

**Making decisions matter.** Early versions cleared themselves without help, and spamming redirects beat thinking. Blocking the busiest exit, a redirect cooldown, slower crowded lines, repeat blockages and panicking guests turned it into a real tradeoff. In the sweeps above, only the bot that spread the crowd early, cleared right away and calmed guests got everyone out.

**Calming by voice.** Our first microphone version calmed guests whenever it heard moderately loud sound held for a fraction of a second. We switched to the browser's speech recognition, so it only reacts when the trainee actually says "calm", with a 1.2-second cooldown between reassurances.

**Running Presage on our hardware.** The SmartSpectra Node SDK ships a Windows x64 runtime but not a Windows ARM one, and our laptop is a Snapdragon. We run the helper under x64 Node emulation, where the camera drops below 25 frames per second and readings take longer to become confident; we saw 52 to 54% confidence. A webcam also can't see your face inside a headset, so Presage is a laptop feature for now.

**Testing VR without a headset.** The Immersive Web Emulator found bugs that laptop testing missed. Controller rays reached only 4 m when the doors are about 25 m away. The panel sat 0.9 m from your face. And because the emulator installs its XR runtime after the page loads, VR wouldn't start at all until we rechecked for a headset when practice begins. Pointing accuracy, comfort and performance still need a physical Quest.

**Network limits.** Our network blocked outbound Postgres connections on port 5432, so we verified real Neon saves through Neon's serverless driver over port 443.

## Accomplishments that we're proud of

- A best-run replay that shows, in the same scene, how two runs played out differently.
- Runs that rebuild exactly from a seed and a command list, checked by the server before saving.
- **ElevenLabs** audio wired to game events, generated ahead of time with no key in the browser.
- **Presage** webcam vitals turned into a calm score the trainee can try to beat.
- One set of door controls shared by mouse and VR controllers.
- Game balance backed by strategy sweeps over every scenario.

## What we learned

- Build determinism in from the start. It gave us replay, server-side checks and testable balance, and every later feature had to respect it.
- Measure strategies before tuning by feel. The sweeps showed that a strong strategy without calming tops out at 58 of 60 people. Adding calming gets everyone out.
- Pre-generating **ElevenLabs** audio suits a timed drill: no delay when an incident hits, no key in the browser, and one source file for every spoken line.
- **Presage** gave us a second outcome besides people out: how calm the person in charge stayed while making those calls.
- The review deserves as much attention as the drill. Watching your run next to your best is where a score turns into a lesson.

## What's next for CrowdClear

CrowdClear is a prototype with a deliberately simple crowd model. Its results are simulation outputs, not predictions of real evacuations. Next, we want to:

- Test pointing accuracy, panel placement, comfort and performance on a physical Quest.
- Run **Presage** on hardware it supports natively, and find a way to measure trainees in VR, where the headset hides the face.
- Replace the single "calm" keyword with real conversations with panicking guests.
- Add navigable obstacles and more floor plans with proper pathfinding.
- Add people with mobility needs and coordination between several staff members.
- Give trainers tools to assign drills and track progress.
- Compare the crowd model with published evacuation research and get feedback from venue staff.
