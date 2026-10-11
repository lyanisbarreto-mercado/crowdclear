# Checkpoint 1: experience direction

Experience direction accepted by Carol. Visual styling remains a draft.

## What the player should understand

You are the venue staff member coordinating an evacuation drill. People are clustering at an exit. You can open an alternative exit, redirect the crowd, and reassure panicking guests (orange rings; mic volume or Hold Reassure). In VR, point at doors and people; spoken PA is off while captions stay. Afterward, you see how your decisions changed the simulated outcome (including calmed / still panicking). Simulation version 9.

The experience should feel calm and legible even when the scenario is urgent. Keep the existing dark palette as a starting point. Use explicit exit labels and status text alongside color. Decide typography and final colors with Carol before broad styling changes.

## Proposed screens

| Screen | Most important content | Primary action |
| --- | --- | --- |
| Briefing | Your role, the scenario, two available interventions, camera instructions | Start drill |
| Guided practice | One task beside the scene; the relevant control; visible action feedback | Perform the requested action |
| Active drill | Large venue view; labeled exits; remaining time; evacuated/remaining people; visible queue | Open Exit B; redirect crowd |
| Review | Outcome; when you acted; plain-language explanation tied to observed behavior | Compare another decision |
| Comparison | Clearly labeled original and alternative crowds; shared time; measured difference | Change intervention timing; replay |

Proposed laptop layout: scenario title above a large scene, a compact status strip, and labeled action buttons near the scene. Avoid covering the crowd with instructions. Put restart in a secondary position so it is not confused with an intervention.

## How checkpoints work

At each visible milestone, the agent provides a runnable location, a short action sequence, expected behavior, and the specific decision Carol can influence. Carol can give visual feedback in ordinary language: “make the exit status easier to spot,” “this feels too dense,” or “I don't understand why redirect helped.” The agent translates that feedback into changes and verifies the behavior.

Confirmed: laptop first, then headset; pause for Carol’s feedback at each visible milestone. Working deadline: October 11 at 10 a.m. Eastern local time. At this checkpoint, settle the experience direction; next, review the playable drill before elaborate assets.

## Laptop drill wireframe

```text
CrowdClear                         Stadium drill
Your role: manage the crowd and keep routes clear

Time remaining   Evacuated / total   Drill status
┌──────────────────────────────────────────────┐
│ EXIT A: OPEN   EXIT B: CLOSED   EXIT C: OPEN  │
│                                              │
│           Stadium scene and crowd            │
│        Visible queue / congestion cue        │
│                                              │
└──────────────────────────────────────────────┘
[Open Exit B]   [Redirect crowd]       Restart
Action feedback: Exit B is open; watch the queue.
```

This is a composition proposal, not a functioning drill. The crowd should be the main visual focus. Keep status and actions outside the scene so a player can read them without moving the camera. Start with an elevated camera aimed at the exits so the player can see decisions take effect.

## Guided practice: learn through action

Carol's decision: each interactive tutorial step waits for the player to perform its task. A Next button or elapsed time cannot complete an interactive step.

Show one instruction at a time beside the scene. Keep the target exit and relevant control easy to identify, using labels and highlighting together. After a successful action, show a short explanation and its visible effect before presenting the next task.

| Step | Instruction | Completion condition | Visible feedback |
| --- | --- | --- | --- |
| Open an alternative route | “Open Exit B to give the crowd another route.” | Exit B changes from closed to open through the player's action | Exit label changes to OPEN; the route becomes available |
| Redirect the crowd | “Redirect the crowd toward Exit B.” | The redirect command is accepted while Exit B is open and changes the crowd's target route | Crowd changes direction; feedback explains where people are heading |

Completion comes from confirmed game state, not a button click alone. A failed, unavailable, or repeated action does not advance the step. Explain what is needed and allow another attempt. A redirect attempt with a closed exit should explain that the exit must be opened first.

Practice has no countdown pressure or score penalty. Start the timed independent drill only after both tasks are complete and the player chooses Start Drill. Resetting practice restores the initial scene and first task. Tutorial actions are kept separate from the scored drill and its replay.

Next visible checkpoint: try these two tasks in the laptop prototype and check whether the crowd's response makes each interaction understandable.

## Accepted drill and results changes

- Each timed drill chooses one hazard-blocked exit (A, B, or C) at its start. Keep that scenario on the run for reproducible replay. Other exits begin open.
- Each exit has Clear hazard, Open exit, and Redirect crowd controls. Clearing is immediate, as Carol requested; the door remains closed until opened. A hazard-blocked exit cannot open or receive redirection.
- The tutorial remains a predictable two-task Exit B practice. Completed controls retain a yellow checkmark and an accessible completed label until reset.
- Results replace the scene at drill completion with evacuated people, whole seconds remaining, usable open exits, total score, and encouraging feedback.
- Score formula: (evacuated + whole seconds remaining) × usable open exits. Thus 30 evacuated, 45 seconds, and 3 open exits gives 225. The sketch's 165 does not match that breakdown; display the formula explicitly.
- Every outcome receives praise or an improvement tip. An incomplete evacuation invites another attempt and explains a specific action to try; no failure labels.

## Latest scoring and hazard presentation

Carol chose timing over open-door count: score is people evacuated plus whole seconds remaining when everyone finishes; incomplete runs receive points for people evacuated without a timing bonus. Open-exit count remains informational. Hazard obstruction and label are yellow; blocked/closed door is red and remains inaccessible until cleared and opened.

Accepted end-screen hierarchy: lead with the score and encouraging outcome, then the action timeline and comparison controls as the learning follow-up. The score and encouragement lead; the action timeline and comparison controls follow directly below. Restart remains available after the review.

## Mid-drill hazard: accepted refinement

The independent drill starts with every exit open. Select the incident time between 10 and 20 seconds once per run. At that time, block the exit with the largest number of non-evacuated people heading toward it; ties use A/B/C order. Show the yellow obstruction, red inaccessible door, and a clear reaction instruction. Clearing remains immediate and reopening remains separate. Practice retains its predictable untimed Exit B tasks.

Record incident time and the actual chosen exit. Original and alternative replay face that same fixed event even when a changed decision shifts the alternative crowd distribution. Saved-run validation re-simulates the original to verify the target was its busiest route. Simulation version is now 3; older versioned runs stay stored but are not replayed against new rules.

## Approved concourse assets

The user approved the Higgsfield lobby and blockage references and requested their integration. The playable scene now follows their concrete walls, navy protective panels and doors, restrained terrazzo floor, green EXIT housings, striped equipment cases and trolley, and separate drifting smoke. The concession shutter, venue map, bench, bin, and exterior beyond the doors give the lobby context while preserving the crowd's routes.

Door leaves animate with live simulation state. Labels explicitly say OPEN, CLOSED, or BLOCKED, and clearing equipment does not open a door. The existing floor guidance, overhead laptop camera, raised headset post, controller targets, and ghost comparison remain in place. Architectural props use lightweight geometry; texture artwork is served locally. Physical headset comfort and performance still need checking.

## Timed clearing and larger crowd

The user requested a clearing delay and selected 60 people with restrained panic cues. Clearing now takes four simulated seconds. Keep the equipment and smoke visible and the door inaccessible during work; show the countdown on the gate controls and above the blocked exit. Ignore repeated clearing presses, then explicitly invite the player to reopen the door when work finishes. Other open routes remain available while clearing proceeds.

Scatter starting positions and vary individual speeds; one quarter of the crowd hesitates briefly at the incident. Some guests panic and wander (orange rings) until calmed with mic volume or Hold Reassure; redirects skip panickers. Staff directions remain reliable for calm guests. Stable three-column queues fit the crowd inside the lobby, and flow is balanced so prompt clearing, redirection, and calming can evacuate everyone within the existing 60-second drill. All variation is seeded and repeatable for comparison; these are game cues, not validated crowd-psychology rules. Simulation version 9 includes panic/calm, multiple incidents, and the version-7 incident-tick command order, and prevents inaccurate replay of older drills.

## Immersive input and results

In the emulator/headset, point at doors rather than a mirrored per-exit button grid. Spoken PA is off; captions stay on the raised instruction panel. Single-select a closed door to open it, or an open door to redirect the crowd. Two selections on the same blocked door within 450 ms start four seconds of clearing; reopening remains a separate selection. Select orange-ring panickers, then speak or Hold Reassure. Available doors highlight on pointer hover; navigation, reassure, and score controls change color on hover.

Instructions occupy their own raised panel above side-rail height (no front rail bar). Practice steps use the same STEP 1/2 / PRACTICE DONE labels as the laptop. Start/restart and Reassure sit below the copy panel; View score expands upward on the other side with the same after-action analytics as the laptop (score, people out, time left, open exits, calmed / still panicking, outcome, action log, and Presage breathing vitals when the local sensor was used). Desktop buttons and results/review remain available. Emulator panel spacing still requires visual verification.

## Repeated incidents and immersive placement

Each new timed drill chooses two or three incidents. The first strikes between 10 and 20 seconds; later incidents use the same scenario seed to choose times at least 10 seconds apart. Each targets the busiest route that is not already blocked. Multiple hazards persist independently; one clearing operation can be underway at a time. Comparison retains the original incident times and exits.

The teammate’s layout keeps panels toward the player, removes the front rail, and expands results upward. All three panel groups are lowered 0.2 m from that layout: instructions 2.35 m, navigation 1.55 m, score 2.15 m. Entering VR from the intro or completed laptop results starts fresh practice.
