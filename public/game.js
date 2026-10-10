const sim = window.CrowdSimulation;
const review = window.CrowdReview;
const el = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));
let state = sim.createState();
let initial = null;
let lastRun = null;
let ghost = null;
let altSchedule = null;
let mode = 'intro';
let practiceStep = 0;
let accumulator = 0;
let previousTime = null;
const figures = [];
const ghostFigures = [];
const scene = document.querySelector('a-scene');

function createFigures(list, container, faded) {
  if (list.length) return;
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
    // Low-poly wireframe, not just a paler color, so the original crowd reads as different without color vision.
    // Default segment counts make a wireframe so dense it looks solid at this camera distance.
    if (faded) {
      body.setAttribute('segments-radial', '6');
      body.setAttribute('segments-height', '1');
      head.setAttribute('segments-width', '6');
      head.setAttribute('segments-height', '4');
      [body, head].forEach(part => part.setAttribute('material', { wireframe: true, transparent: true, opacity: 0.6 }));
    }
    figure.append(body, head);
    el(container).append(figure);
    list.push({ figure, body });
  });
}
function createAllFigures() {
  createFigures(figures, 'crowd', false);
  createFigures(ghostFigures, 'ghost-crowd', true);
}
function place(list, s) {
  list.forEach(({ figure, body }, i) => {
    const person = s.people[i];
    figure.setAttribute('visible', !person.evacuated);
    figure.setAttribute('position', `${person.x} 0 ${person.z}`);
    body.setAttribute('color', person.exit === 'B' ? '#76bcff' : '#f1d673');
  });
}
function instructions(label, title, copy) {
  el('step-label').textContent = label;
  el('task-title').textContent = title;
  el('task-copy').textContent = copy;
}
function refresh() {
  const stats = sim.stats(state);
  const total = state.people.length;
  el('evacuated').textContent = ghost
    ? `Alternative: ${stats.evacuated} / ${total} · Original: ${sim.stats(ghost).evacuated} / ${total}`
    : `Evacuated: ${stats.evacuated} / ${total}`;
  el('remaining').textContent = `Remaining: ${stats.remaining}`;
  const clock = ghost ? Math.max(state.tick, ghost.tick) : state.tick;
  el('timer').textContent = mode === 'practice' || mode === 'intro'
    ? 'Practice · no time limit' : `Time remaining: ${Math.ceil(Math.max(0, sim.DURATION - clock * sim.DT))} seconds`;
  for (const exit of ['A', 'B', 'C']) {
    el(`status-${exit.toLowerCase()}`).textContent = `Exit ${exit} · ${state.open[exit] ? 'OPEN' : 'CLOSED'} · ${stats.queues[exit]} heading here`;
  }
  el('exit-b').setAttribute('color', state.open.B ? '#2ecc71' : '#e74c3c');
  const active = mode === 'practice' || mode === 'drill';
  el('actions').hidden = !active;
  el('review').hidden = !lastRun || active;
  el('open-exit').disabled = !active || state.open.B;
  el('redirect').disabled = !active || !state.open.B || state.redirected;
  el('open-exit').classList.toggle('task-target', mode === 'practice' && practiceStep === 0);
  el('redirect').classList.toggle('task-target', mode === 'practice' && practiceStep === 1);
  place(figures, state);
  el('ghost-crowd').setAttribute('visible', !!ghost);
  if (ghost) place(ghostFigures, ghost);
}
function fresh(nextMode) {
  mode = nextMode;
  state = sim.createState();
  initial = clone(state);
  ghost = null;
  lastRun = null;
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
  createAllFigures();
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
  showReview({ version: sim.VERSION, initial, commands: clone(state.commands), result: review.result(state) });
  save(lastRun);
}
// fetch rejects with a TypeError only when the request never reached the server.
const reason = error => (error instanceof TypeError ? 'The server could not be reached.' : error.message);
async function save(run) {
  el('save-status').textContent = 'Saving this drill…';
  try {
    run.id = crypto.randomUUID();
    const res = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: run.id, version: run.version, commands: run.commands, result: run.result }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server error ${res.status}.`);
    if (lastRun !== run) return;
    history.replaceState(null, '', `?run=${run.id}`);
    el('save-status').textContent = 'Saved. Reload or share this page address to reopen this drill.';
  } catch (error) {
    if (lastRun === run) el('save-status').textContent = `Not saved. ${reason(error)}`;
  }
}
async function reopen(id) {
  el('load-status').textContent = 'Opening the saved drill…';
  try {
    const res = await fetch(`/api/runs/${encodeURIComponent(id)}`);
    const saved = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(saved.error || `Server error ${res.status}.`);
    if (saved.version !== sim.VERSION) throw new Error('It was recorded with a different simulation version, so it cannot be replayed.');
    fresh('review');
    showReview({ ...saved, initial });
    el('save-status').textContent = 'Opened from the database. Replay checks that it reproduces its saved result.';
  } catch (error) {
    el('load-status').textContent = `Could not open the saved drill. ${reason(error)}`;
  }
}
function showReview(run) {
  mode = 'review';
  lastRun = run;
  instructions('DRILL COMPLETE', 'Decision review', review.outcome(lastRun.result));
  el('feedback').textContent = 'These results describe this simplified simulation only.';
  el('review-timeline').replaceChildren(...review.timeline(lastRun.commands).map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  el('compare-action').replaceChildren(...lastRun.commands.map((c, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = review.timeline([c])[0];
    return option;
  }));
  el('compare-form').hidden = !lastRun.commands.length;
  el('compare-time').value = lastRun.commands.length ? (lastRun.commands[0].tick * sim.DT).toFixed(1) : '';
  el('compare-result').textContent = lastRun.commands.length
    ? 'Pick one action and a new time. Every other action stays the same.'
    : 'With no actions there is nothing to re-time. Start another drill and try opening Exit B.';
  el('drill-btn').textContent = 'Try another drill';
  el('drill-btn').hidden = false;
  refresh();
}
function compare(index, seconds) {
  if (!lastRun || !lastRun.commands[index] || !(seconds >= 0 && seconds <= sim.DURATION)) return;
  altSchedule = review.alternative(lastRun.commands, index, Math.round(seconds / sim.DT));
  state = clone(lastRun.initial);
  ghost = clone(lastRun.initial);
  mode = 'compare';
  accumulator = 0;
  previousTime = null;
  el('compare-result').textContent = 'Replaying both runs from the same start.';
  refresh();
}
function finishCompare() {
  mode = 'review';
  const rejected = altSchedule.length - state.commands.length;
  el('compare-result').textContent = review.comparison(lastRun, review.result(ghost), review.result(state), rejected).join('\n');
  refresh();
}
el('start-btn').addEventListener('click', () => fresh('practice'));
el('stop-btn').addEventListener('click', () => fresh('practice'));
el('drill-btn').addEventListener('click', () => fresh('drill'));
el('open-exit').addEventListener('click', () => perform('open-exit'));
el('redirect').addEventListener('click', () => perform('redirect'));
el('compare-form').addEventListener('submit', event => {
  event.preventDefault();
  compare(Number(el('compare-action').value), Number(el('compare-time').value));
});
function tick() {
  if (mode === 'compare') {
    if (!sim.isDone(state)) sim.step(state, altSchedule);
    if (!sim.isDone(ghost)) sim.step(ghost, lastRun.commands);
    if (sim.isDone(state) && sim.isDone(ghost)) finishCompare();
    return;
  }
  sim.step(state);
  if (mode === 'drill' && sim.isDone(state)) finish();
}
function frame(now) {
  if (previousTime === null) previousTime = now;
  const delta = (now - previousTime) / 1000;
  previousTime = now;
  const running = () => mode === 'drill' || mode === 'compare' || (mode === 'practice' && practiceStep === 2);
  if (running() && !document.hidden) {
    accumulator += Math.min(delta, 0.25);
    while (accumulator >= sim.DT && running()) {
      accumulator -= sim.DT;
      tick();
    }
    refresh();
  }
  requestAnimationFrame(frame);
}
const savedRun = new URLSearchParams(location.search).get('run');
if (savedRun) reopen(savedRun);
if (scene.hasLoaded) createAllFigures();
else scene.addEventListener('loaded', createAllFigures, { once: true });
requestAnimationFrame(frame);
