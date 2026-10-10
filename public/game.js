const sim = window.CrowdSimulation;
const el = id => document.getElementById(id);
let state = sim.createState();
let mode = 'intro';
let practiceStep = 0;
let accumulator = 0;
let previousTime = null;
const figures = [];
const scene = document.querySelector('a-scene');

function createFigures() {
  if (figures.length) return;
  state.people.forEach(() => {
    const figure = document.createElement('a-entity');
    const body = document.createElement('a-cylinder');
    body.setAttribute('radius', '0.22');
    body.setAttribute('height', '0.9');
    body.setAttribute('position', '0 0.65 0');
    const head = document.createElement('a-sphere');
    head.setAttribute('radius', '0.23');
    head.setAttribute('position', '0 1.3 0');
    head.setAttribute('color', '#f4f7fb');
    figure.append(body, head);
    el('crowd').append(figure);
    figures.push({ figure, body });
  });
}
function instructions(label, title, copy) {
  el('step-label').textContent = label;
  el('task-title').textContent = title;
  el('task-copy').textContent = copy;
}
function refresh() {
  const stats = sim.stats(state);
  el('evacuated').textContent = `Evacuated: ${stats.evacuated} / ${state.people.length}`;
  el('remaining').textContent = `Remaining: ${stats.remaining}`;
  el('timer').textContent = mode === 'drill' || mode === 'finished'
    ? `Time remaining: ${Math.ceil(stats.seconds)} seconds` : 'Practice · no time limit';
  for (const exit of ['A', 'B', 'C']) {
    el(`status-${exit.toLowerCase()}`).textContent = `Exit ${exit} · ${state.open[exit] ? 'OPEN' : 'CLOSED'} · ${stats.queues[exit]} heading here`;
  }
  el('exit-b').setAttribute('color', state.open.B ? '#2ecc71' : '#e74c3c');
  const active = mode === 'practice' || mode === 'drill';
  el('open-exit').disabled = !active || state.open.B;
  el('redirect').disabled = !active || !state.open.B || state.redirected;
  el('open-exit').classList.toggle('task-target', mode === 'practice' && practiceStep === 0);
  el('redirect').classList.toggle('task-target', mode === 'practice' && practiceStep === 1);
  figures.forEach(({ figure, body }, i) => {
    const person = state.people[i];
    figure.setAttribute('visible', !person.evacuated);
    figure.setAttribute('position', `${person.x} 0 ${person.z}`);
    body.setAttribute('color', person.exit === 'B' ? '#76bcff' : '#f1d673');
  });
}
function fresh(nextMode) {
  mode = nextMode;
  state = sim.createState();
  accumulator = 0;
  previousTime = null;
  practiceStep = 0;
  el('intro').hidden = true;
  el('game').style.display = 'block';
  el('drill-btn').hidden = true;
  el('mode-title').textContent = mode === 'practice' ? 'Guided practice' : 'Stadium evacuation drill';
  if (mode === 'practice') {
    instructions('TASK 1 OF 2', 'Open an alternative route', 'Open Exit B to give the crowd another route. Use the highlighted control for the closed exit in the middle.');
    el('feedback').textContent = 'No timer is running. Complete the task when you are ready.';
  } else {
    instructions('INDEPENDENT DRILL', 'Reduce the queue', 'Most people are heading to Exit A. Open Exit B, then redirect part of the crowd to spread the flow.');
    el('feedback').textContent = 'A fresh drill has started. Your practice actions have been cleared.';
  }
  createFigures();
  refresh();
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}
function perform(action) {
  if (mode !== 'practice' && mode !== 'drill') return;
  if (!sim.act(state, action)) return;
  if (action === 'open-exit') {
    el('feedback').textContent = 'Exit B is open. People still need direction to use the new route.';
    if (mode === 'practice' && practiceStep === 0 && state.open.B) {
      practiceStep = 1;
      instructions('TASK 2 OF 2', 'Direct people to the new route', 'Redirect the crowd to Exit B. Watch the blue figures move toward the middle exit.');
    }
  } else {
    el('feedback').textContent = 'Part of the crowd is now heading to Exit B. Watch the blue figures take the new route.';
    if (mode === 'practice' && practiceStep === 1 && state.redirected) {
      practiceStep = 2;
      instructions('PRACTICE COMPLETE', 'You have tried both actions', 'Opening an exit makes a route available; redirecting sends people toward it. Watch the response, then start a fresh timed drill when ready.');
      el('drill-btn').textContent = 'Start timed drill';
      el('drill-btn').hidden = false;
    }
  }
  refresh();
}
function finish() {
  mode = 'finished';
  const stats = sim.stats(state);
  instructions('DRILL COMPLETE', 'Your first drill is finished', `${stats.evacuated} of ${state.people.length} people evacuated; ${stats.remaining} remain. Decision review and comparison replay are coming in the next checkpoints.`);
  el('feedback').textContent = 'These results describe this simplified simulation only.';
  el('drill-btn').textContent = 'Try another drill';
  el('drill-btn').hidden = false;
  refresh();
}
el('start-btn').addEventListener('click', () => fresh('practice'));
el('stop-btn').addEventListener('click', () => fresh('practice'));
el('drill-btn').addEventListener('click', () => fresh('drill'));
el('open-exit').addEventListener('click', () => perform('open-exit'));
el('redirect').addEventListener('click', () => perform('redirect'));
function frame(now) {
  if (previousTime === null) previousTime = now;
  const delta = (now - previousTime) / 1000;
  previousTime = now;
  const running = mode === 'drill' || (mode === 'practice' && practiceStep === 2);
  if (running && !document.hidden) {
    accumulator += Math.min(delta, 0.25);
    while (accumulator >= sim.DT) {
      accumulator -= sim.DT;
      sim.step(state);
      if (mode === 'drill' && (sim.stats(state).remaining === 0 || state.tick >= sim.DURATION / sim.DT)) {
        finish();
        break;
      }
    }
    refresh();
  }
  requestAnimationFrame(frame);
}
if (scene.hasLoaded) createFigures();
else scene.addEventListener('loaded', createFigures, { once: true });
requestAnimationFrame(frame);
