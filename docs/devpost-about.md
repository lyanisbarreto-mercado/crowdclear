## Inspiration

When a stadium lobby fills with people and the familiar exit becomes blocked, a staff member has to decide where the crowd goes next. Real evacuation drills are expensive and disruptive, so opportunities to practice those decisions can be limited.

We built CrowdClear to make that practice repeatable and to help trainees understand why a decision worked. Our central idea is a **ghost replay**: change the timing of one action and watch the original and alternative outcomes side by side.

## What it does

CrowdClear is an evacuation training game that runs in a laptop browser or in VR through **WebXR**.

You manage a stadium lobby with 60 people and three exits. During a 60-second drill, a hazard blocks the busiest exit. Smoke, an alarm, a closed door, and a captioned announcement signal the incident. You can start four seconds of hazard clearing, reopen exits, and redirect people. Equipment and smoke remain visible during clearing, and reopening is a separate action. People start scattered, walk at varied speeds, and some briefly hesitate when the incident begins.

- **Learn by doing.** Two guided tasks teach you to open an exit and redirect part of the crowd. Each step advances only after you perform the action.
- **Act directly in the scene.** Click a door with a mouse or point and press the controller trigger in VR. In VR, select a blocked door twice within 450 milliseconds to start clearing it. Laptop users can also use the side panel. A five-second redirect cooldown makes the timing of each instruction matter.
- **Review your decisions.** See how many people evacuated, how long evacuation took, the longest queue, and a timestamped record of your actions.
- **Explore an alternative.** Change when one action happened, then replay both versions together. Your original crowd appears as wireframe figures; the alternative appears as solid characters. The comparison checks whether the original reproduced exactly and shows how the change affected evacuation time.
- **Revisit saved drills.** Runs can be saved to **Neon Postgres**, with a link that reopens the review and replay.

**ElevenLabs** supplies generated PA announcements, the evacuation alarm, and crowd ambience. Announcements also appear as captions on the laptop. On supported laptop setups, **Presage SmartSpectra** measures breathing rate through the webcam so trainees can compare readings from guided practice and the timed drill.

## How we built it

**JavaScript powers a reproducible crowd simulation.** Our dependency-free simulation advances on fixed 0.1-second ticks. The live drill, replay, comparison, and server validation all use the same simulation function, making outcomes reproducible regardless of rendering frame rate.

People walk toward their assigned exit, form queues, and maintain separation. Each exit normally releases one person every 1.2 seconds. Seeded variation gives people walking speeds of 1.8 to 3 metres per second and gives some a brief pause at the incident. Queues longer than 10 people increase that interval, making congestion part of the decision-making challenge.

**A-Frame, Three.js, and WebXR bring the lobby into the browser and VR.** We built the scene with **A-Frame 1.8.0**, which uses **Three.js** for 3D rendering. **WebXR** provides the immersive session and tracked controller input. Mouse clicks and VR controller triggers reach the same game actions, keeping behavior consistent across both ways of playing.

**Kenney's CC0 Mini Characters** provide the animated crowd. Colored rings show each person's assigned exit, while gate labels communicate exit states alongside color. The VR scene includes a raised command post, separate instruction and expandable score panels, and haptic feedback for successful actions on supported controllers.

**Higgsfield helped create the concourse artwork.** We generated floor, wall, and exterior textures with Higgsfield GPT Image Flare, then compressed the artwork to local WebP files. Three production generations were quoted at 0.75 credits total. The runtime textures total about 156 KB.

We built animated double doors, EXIT sign housings, striped equipment cases, and a trolley with A-Frame geometry based on the approved visual references. Five camera-facing smoke sprites mark the blockage. Decorative fixtures stay at the lobby edges because the crowd simulation does not yet have obstacle pathfinding.

**ElevenLabs gives the drill its voice and atmosphere.** We used the **ElevenLabs Text-to-Speech API** to generate PA messages for drill instructions, blocked exits, and crowd redirects. Its **Sound Effects API** generated the evacuation alarm and looping stadium crowd ambience. These sounds help communicate what is happening while making the lobby feel occupied.

We generate the audio ahead of time and play the clips when their corresponding events occur. This avoids waiting for audio generation during the drill and keeps API keys out of the browser. Spoken announcements share their text with the captions, and missing speech or alarm clips fall back to browser speech and synthesized sound.

**Presage SmartSpectra adds breathing feedback to the review.** A local helper uses the **Presage SmartSpectra Node.js SDK** to collect webcam-based breathing-rate readings and their confidence scores. The interface displays numerical readings only when confidence reaches at least 50%; otherwise, it shows measurement progress.

The review compares average breathing rates during guided practice and the drill, adding a physiological measure alongside evacuation performance. CrowdClear keeps these readings in local server memory and excludes them from saved database records. This integration is for laptop sessions where the camera can see the trainee.

**Node.js, Express, and Neon Postgres make runs shareable and verifiable.** **Node.js** and **Express 5** serve the game and its API, while **Neon Postgres** stores each run's scenario, simulation version, timestamped commands, and results. Before accepting a save, the server re-simulates the submitted commands and rejects outcomes it cannot reproduce. Storing the decisions lets us reconstruct a run without recording every person's position on every frame.

**Meta's Immersive Web Emulator let us test VR without an Oculus/Quest headset.** The **[Immersive Web Emulator (IWE)](https://github.com/meta-quest/immersive-web-emulator)** is a browser extension powered by the **Immersive Web Emulation Runtime (IWER)**. It emulates WebXR headset and controller behavior in a desktop browser. Earlier builds used a Meta Quest 3 profile to check VR entry, panel visibility, controller-trigger actions, and the return to the laptop view. The extension bridge can expose emulator controls to an agent through MCP. The latest 60-person scene and separate VR panels still need emulator and physical-headset visual checks.

**Automated tests and strategy measurements guided development.** Our 55 automated tests cover simulation behavior, tutorial progression, replays, saving, audio, and breathing integration. **GitHub Actions** runs the suite on pushes to `main` and pull requests.

For the current 60-person build, we checked scenarios with incidents at 10, 14, 15, and 20 seconds. Early redirection followed by prompt clearing and reopening evacuated all 60 people in **52.4 to 54.3 seconds**. Without intervention, **42 to 45 people remained inside** at the end.

These are simulation measurements from four checked scenarios, not predictions of real evacuation times. Desktop browser checks also completed practice, timed clearing, local saving and reopening, and an exact original ghost replay without console errors or failed local assets.

## Challenges we ran into

**Making the ghost replay trustworthy.** A comparison only means something if the original outcome can be reproduced. Fixed simulation ticks and a consistent update order made that possible. Testing also caught a bug where replayed redirects lost their intended exit target. Preserving the complete command fixed it.

**Making decisions matter.** Early versions sometimes cleared without intervention, while repeated redirects could outperform thoughtful choices. Blocking the busiest exit, adding a redirect cooldown, and slowing congested queues gave the drill more meaningful tradeoffs.

**Testing VR without physical hardware.** The **Immersive Web Emulator** exposed issues that laptop testing missed, including controller rays that could not reach the doors and an instruction panel placed too close to the player. It helped us verify the interaction flow; pointing accuracy, comfort, and performance still need testing on a physical Quest.

**Integrating with the hardware and network available.** On our Windows ARM laptop, the **Presage SmartSpectra** helper runs under x64 emulation, with slower camera performance and longer waits for confident readings. Our network also blocked direct Postgres connections, so we verified real **Neon** saves through its serverless driver over port 443.

## Accomplishments that we're proud of

- A ghost replay that makes the consequences of a decision visible in the same scene.
- Reproducible runs that can be saved, reopened, and checked by the server.
- Shared door interactions for mouse and VR controllers.
- **ElevenLabs** audio integrated with game events and accessible captions.
- **Presage SmartSpectra** breathing readings connected to the practice and drill review.
- Scenario balance supported by automated measurements.

## What we learned

Determinism is much easier to design in from the beginning than to add later. It gave us a foundation for replay, comparison, save validation, and testing.

We also learned to measure strategies before tuning by feel. Earlier strategy sweeps across all 101 hazard timings exposed weaknesses that individual playthroughs missed. We checked the revised 60-person model separately after changing the flow and clearing duration.

**ElevenLabs** helped communicate the unfolding incident. **Presage** added breathing feedback to reflect on afterward.

The review deserves as much attention as the drill. Seeing how one changed action affects the crowd is where CrowdClear turns a result into a learning opportunity.

## What's next for CrowdClear

CrowdClear is a prototype with a deliberately simplified crowd model. Its results are simulation outputs, not predictions of real evacuations.

Our next steps are to:

- Add microphone conversations with selected distressed people. A trainee could speak reassurance or directions, and a person might hesitate or resist before responding. This is planned; the current build has prerecorded announcements and reliable staff redirections, with no microphone input or person-level conversations.
- Test pointing accuracy, panel placement, comfort, and performance on a physical Quest.
- Add navigable obstacles and more floor plans, supported by proper pathfinding.
- Introduce multiple incidents, people with mobility needs, and staff coordination.
- Improve breathing-rate collection on hardware supported natively by **Presage**.
- Give trainers tools to assign drills and track progress.
- Compare the crowd model with published evacuation research and seek feedback from venue staff.
