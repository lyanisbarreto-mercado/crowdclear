# 00 · Overview

## The project

CrowdClear is an evacuation training game for venue staff, built in 36 hours. A player spots congestion, opens an alternative exit, and redirects people. After the drill, a review shows their decisions and results, and the player can change one decision and watch both outcomes play out together.

The first version contains one stadium lobby, three exits, about 30 simple crowd figures, and a 90-second scenario. These are build targets, not measured performance claims.

## Revision notes

- Breathing sensing (Presage) is now a stretch goal with a go/no-go decision at hour 2 and a build slot near the end.
- Crowd routing uses one flow field per exit instead of a path search per agent.
- Session storage moves into the first half; deployment happens in hour 1.
- Replay runs entirely in the browser; the server only stores and returns data.
- The comparison becomes a ghost replay: the original crowd faded, the alternative solid, running at the same time.
- Judging targets narrow to three primary categories.

## Tools

| Tool | What it does | Status |
|---|---|---|
| A-Frame | 3D scene, camera, controller and mouse pointers, positional audio, WebXR. Built on Three.js. | Core |
| HTML + CSS | Start screen, instructions, post-drill review. | Core |
| Plain JavaScript | Crowd simulation, flow fields, interactions, scoring, replay. | Core |
| Node.js + Express | Serves the frontend; stores and returns sessions, commands, results. | Core |
| Neon Postgres | Stores runs, commands, results, and any measurements. | Core |
| Render | Hosts the Express app at an HTTPS address, which WebXR requires. | Core |
| Prepared audio clips | Alarms, announcements, ambient sound. ElevenLabs can pre-generate the spoken clips. | Core |
| Presage SmartSpectra | Breathing rate from a webcam through a local Node helper. | Stretch: only if the hour-2 check passes |

References: A-Frame docs, Presage Node SDK, Render Express deployment.

## How the parts connect

The crowd runs in the browser; the server only stores sessions.

- **In the browser (laptop or headset)**
  - A-Frame scene: draws the crowd; mouse and VR input.
  - `simulation.js`: flow fields, exit queues, fixed ticks.
  - Review and ghost replay: re-runs saved commands side by side.
- **Express on Render**: stores and returns sessions; checks write tokens.
- **Neon Postgres**: runs, commands, measurements.
- **Presage helper (stretch)**: laptop webcam to breathing rate, sent to Express by token.

The simulation and replay run entirely in the browser; Express only saves and returns sessions, so a slow network never changes crowd behavior. The optional helper sends derived breathing values to Express; the server never touches the webcam.

## Project layout

The simulation lives in one file with no rendering code, so the live drill, the replay, and the ghost all call the same function.

```text
crowdclear/
  server.js          Express: serve files, save and load sessions
  schema.sql         Neon tables
  public/
    index.html       A-Frame scene and ordinary interface
    styles.css       Menus and review styling
    simulation.js    Grid, flow fields, queues, scoring; step(state, commands) only
    game.js          Input, scenario events, drawing agents each frame
    review.js        Timeline, command editing, ghost replay
    assets/          Models and prepared audio
  sensor.js          Stretch: local Presage helper
```

## Data

| Table | Holds | Key detail |
|---|---|---|
| `runs` | Initial state, simulation version, final results | Results let replay check itself for determinism |
| `commands` | Run ID, tick, order, action, target | Stable event ID makes retries safe |
| `measurements` | Run ID, timestamp, breathing rate, quality | Only created if sensing ships; derived values, never footage |

Keep the Neon connection string in Render environment variables. Validate API input, and require a per-session token for any write.

## Judging targets

Three primary targets that tell one story: a serious game, with saved sessions that make the replay possible. Sponsor rooms each need a teammate present during judging, so every extra room costs demo coverage.

| Target | Priority | Evidence to show |
|---|---|---|
| Full Sail | Primary | A serious training scenario with working flow-field routing and meaningful intervention |
| Neon | Primary | A saved drill reopened from the database and replayed as a ghost comparison |
| Best Game | Primary | A complete loop with clear consequences; Best Overall is considered automatically |
| Encompass | Only if sensing ships | Real breathing readings with visible quality, used in feedback |
| Figma / Adobe | Only if a teammate designs in Figma | Consistent signage, legible controls, a designed review screen |

Confirm opt-in deadlines and room assignments for each sponsor challenge at the opening ceremony.

## Known limitations

- Not yet device-tested. Headset compatibility is confirmed in hour 1; sensing reliability at hour 2.
- Evacuation results are simulation outputs, not validated real-world predictions.
- Replay reproducibility is guaranteed on the same browser and code version. Results may differ slightly across browsers, so run replays on the device that recorded them.
- Breathing sensing, if it ships, needs a still player with face and chest visible. Continuous sensing during VR is out of scope.
