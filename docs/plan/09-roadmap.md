# 09 · Roadmap

Every risky piece is settled by hour 12; features freeze at hour 28. Status is tracked in [CHECKLIST.md](../../CHECKLIST.md).

## Build schedule

If a gate isn't met on time, cut scope from the next phase rather than pushing the gate back.

| Hours | Phase | Work | Gate |
|---|---|---|---|
| 0–2 | Prove the platform | Deploy to Render; test the HTTPS URL on headset and laptop. One person tries the Presage sample on the demo laptop. | **Go / no-go:** VR works from the live URL; Presage reads, or it is cut |
| 2–12 | Core simulation | Lobby, grid, flow fields, exit queues, two player actions. In parallel: Neon schema and save/load API. | **Crowd reroutes:** opening an exit changes paths; a run saves to Neon |
| 12–22 | Full loop | Emergency round, review screen, ghost replay. Determinism check against saved results. | **Loop works live:** start to replay runs on the published URL |
| 22–28 | Clarity and stretch | Audio, captions, signage, failure handling. Breathing feedback only if the first gate passed. | **Feature freeze:** no new features after hour 28 |
| 28–36 | Ship | Bug fixes, sleep in shifts, backup screen recording. Rehearse the 3-minute demo at least three times. | **Judging:** open the URL first to wake the server |

## Build steps

The order puts everything risky or foundational first, so the last third of the event is polish, not rescue.

1. **Deploy first, in hour 1.** Push a bare Express server and an A-Frame example scene to Render. Open the published HTTPS URL on the actual headset: enter VR, select an object, play audio. Confirm mouse selection on the laptop. Connect Neon and write one test row. From here on, every merge is tested on the live URL.
   - WebXR needs HTTPS, so the headset cannot test against plain localhost anyway.
   - Check Render's current free-tier behavior. Free services have historically spun down when idle, which makes the first load slow.
2. **Run the Presage go/no-go (hours 0–2, one person).** Try the SDK sample on the demo laptop with the real lighting. If it doesn't produce usable breathing readings by hour 2, drop sensing and the Encompass target. No second attempt.
3. **Create one readable lobby.** A floor plane, box walls, three clearly marked exits, and simple crowd figures. The player stands at a fixed command position with a clear view of all three exits.
4. **Implement crowd routing with flow fields.** Divide the walkable floor into equal grid cells. For each open exit, run one breadth-first search outward from the exit cells and store, in every cell, the next cell toward that exit.
   - Each agent reads the field of its assigned exit and steps to the next cell, keeping basic spacing.
   - Exits release agents at a fixed rate, so queues form naturally.
   - When an exit opens or closes, recompute only the affected fields (three searches over a small grid are instant).
   - A cell with no route stores nothing; an agent standing there waits instead of walking through walls.
   - Visit neighbor cells in a fixed order so ties always break the same way. This keeps replay reproducible.
5. **Add two player actions.** Open an available alternative exit, and assign a marked crowd group to a different open exit using preset directional markers. Route desktop clicks and VR controller selection to the same action handlers. Put essential VR instructions and controls inside the 3D scene.
6. **Save sessions to Neon.** This is small, so it lands in the first half. Store the initial scene state, simulation version, each command with its tick and order, and final results. Batch uploads without blocking gameplay, and give every event a stable ID so a retried upload never duplicates it.
7. **Create the emergency round.** At a fixed tick in the 90-second drill, an incident blocks the familiar exit. The crowd queues, and the player must redirect it. The hazard schedule never changes; only the player's commands do.
8. **Build the review and ghost replay.** Show people evacuated before the deadline, maximum queue size, and time to redirect the blocked stream, with commands on one timeline.
   - The player changes one command; the browser re-runs both versions from the same initial state and hazard schedule.
   - Draw the original crowd as faded figures and the alternative as solid ones, in the same scene, at the same tick. Show both sets of results side by side and label the alternative a simulated outcome.
   - Re-simulate the original from its saved commands rather than storing positions. If its final result matches the saved one, you have proof of determinism to show judges.
   - Use fixed simulation ticks; frame rate must never change crowd behavior.
9. **Add sound and visual clarity.** Prepared announcements tied to scenario events, environmental sounds at their sources, radio speech at the player's radio. Add captions, an accessible pause, and signage that uses symbols and text as well as color.
10. **Add breathing feedback, only if step 2 passed.** Desktop mode: the player sits facing the webcam for a 30-second warm-up and baseline, then sees breathing rate and status during the drill. VR mode: measure before and after the drill only, since the headset hides the face. Missing or stale readings display as unavailable. Sensing never affects the score or blocks emergency controls.
11. **Freeze features at hour 28.** Everything after that is fixing, rehearsal, and sleep.

## Judge demonstration

Aim for about three minutes, with the judge holding the controls.

1. **Problem (20 seconds).** Venue staff rarely rehearse evacuations, and real drills are expensive and disruptive.
2. **Drill (90 seconds).** The familiar exit is blocked and a queue builds. The judge opens an alternative exit and redirects a crowd group.
3. **Review (30 seconds).** Show evacuated count, maximum queue, and time to redirect, with commands on the timeline.
4. **Ghost replay (40 seconds).** Change one decision, for example redirecting 15 seconds earlier. Play both together: faded original, solid alternative, results side by side.

For technical questions, show the flow-field grid overlay, explain how the saved run re-simulates to the same result, and how sessions are stored in Neon.

Open the published URL a few minutes before judging so the server is awake. Keep a screen recording of a full round as a backup in case the venue Wi-Fi fails.
