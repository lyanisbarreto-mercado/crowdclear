# Checkpoint 1: experience direction

Experience direction accepted by Carol. Visual styling remains a draft.

## What the player should understand

You are the venue staff member coordinating an evacuation drill. People are clustering at an exit. You can open an alternative exit and redirect the crowd. Afterward, you see how your decisions changed the simulated outcome.

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
