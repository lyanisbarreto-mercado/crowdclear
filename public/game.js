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
    const suffix = exit.toLowerCase();
    el(`exit-controls-${suffix}`).hidden = mode === 'practice' && exit !== 'B';
    const hazard = state.hazard === exit;
    const status = hazard ? 'HAZARD · clear before opening' : state.open[exit] ? 'OPEN' : 'CLOSED';
    el(`status-${suffix}`).textContent = `Exit ${exit} · ${status} · ${stats.queues[exit]} heading here`;
    el(`exit-${suffix}`).setAttribute('color', hazard ? '#e6da78' : state.open[exit] ? '#2ecc71' : '#e74c3c');
    const active = mode === 'practice' || mode === 'drill';
    const available = active && (mode !== 'practice' || exit === 'B');
    const clear = el(`clear-hazard-${suffix}`);
    clear.hidden = mode === 'practice';
    clear.disabled = !available || !hazard;
    const open = el(`open-exit-${suffix}`);
    const redirect = el(`redirect-${suffix}`);
    open.hidden = mode === 'practice' && exit !== 'B';
    redirect.hidden = mode === 'practice' && exit !== 'B';
    open.disabled = !available || state.open[exit] || hazard;
    redirect.disabled = !available || !state.open[exit] || hazard || state.lastRedirect === exit || stats.remaining === 0;
    open.classList.toggle('task-target', mode === 'practice' && practiceStep === 0 && exit === 'B');
    redirect.classList.toggle('task-target', mode === 'practice' && practiceStep === 1 && exit === 'B');
    for (const kind of ['open-exit', 'redirect']) {
      const complete = mode === 'practice' && exit === 'B' && practiceStep >= (kind === 'open-exit' ? 1 : 2);
      el(`check-${kind}-${suffix}`).hidden = !complete;
      el(`${kind}-${suffix}`).setAttribute('aria-label', `${kind === 'open-exit' ? 'Open Exit' : 'Redirect crowd to'} ${exit}${complete ? ', completed' : ''}`);
    }
  }
  el('hazard-marker').setAttribute('visible', !!state.hazard);
  el('hazard-label').setAttribute('visible', !!state.hazard);
  if (state.hazard) {
    const x = { A: -8, B: 0, C: 8 }[state.hazard];
    el('hazard-marker').setAttribute('position', `${x} 0.6 -10.5`);
    el('hazard-label').setAttribute('position', `${x} 4.5 -11`);
  }
  figures.forEach(({ figure, body }, i) => {
    const person = state.people[i];
    figure.setAttribute('visible', !person.evacuated);
    figure.setAttribute('position', `${person.x} 0 ${person.z}`);
    body.setAttribute('color', { A: '#f1d673', B: '#76bcff', C: '#d6a9ed' }[person.exit]);
  });
}
function fresh(nextMode) {
  mode = nextMode;
  state = sim.createState(nextMode === 'drill' ? { blockedExit: ['A', 'B', 'C'][Math.floor(Math.random() * 3)] } : {});
  el('results').hidden = true;
  scene.hidden = false;
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
    instructions('INDEPENDENT DRILL', 'Restore the blocked route', `A hazard blocks Exit ${state.hazard}. Clear it, open the exit, and direct people toward available routes. You can also use the other open exits.`);
    el('feedback').textContent = 'A fresh drill has started. Your practice actions have been cleared.';
  }
  createFigures();
  refresh();
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}
function perform(action, target = 'B') {
  if (mode !== 'practice' && mode !== 'drill') return;
  if (mode === 'practice' && (target !== 'B' || (action !== 'open-exit' && action !== 'redirect'))) return;
  if (!sim.act(state, action, target)) {
    el('feedback').textContent = `You can try another route. Clear any hazard and open Exit ${target} before directing people there.`;
    return;
  }
  if (action === 'clear-hazard') {
    el('feedback').textContent = `Nice work! The hazard at Exit ${target} is cleared. You can open that exit now.`;
  } else if (action === 'open-exit') {
    el('feedback').textContent = `Good work! Exit ${target} is open. Direct people toward the new route.`;
    if (mode === 'practice' && practiceStep === 0 && state.open.B) {
      practiceStep = 1;
      instructions('TASK 2 OF 2', 'Direct people to the new route', 'Redirect the crowd to Exit B. Watch the blue figures move toward the middle exit.');
    }
  } else {
    el('feedback').textContent = `Well done! Part of the crowd is now heading to Exit ${target}. Watch them take the new route.`;
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
  instructions('DRILL COMPLETE', 'Your first drill is finished', `${stats.evacuated} of ${state.people.length} people evacuated; ${stats.remaining} remain. See your score and a practice tip in the results panel.`);
  window.CrowdReview.show(state, stats);
  scene.hidden = true;
  el('feedback').textContent = 'Every drill is a chance to improve. Try another hazard scenario when you are ready.';
  el('drill-btn').textContent = 'Try another drill';
  el('drill-btn').hidden = false;
  refresh();
}
el('start-btn').addEventListener('click', () => fresh('practice'));
el('stop-btn').addEventListener('click', () => fresh('practice'));
el('drill-btn').addEventListener('click', () => fresh('drill'));
for (const exit of ['A', 'B', 'C']) {
  for (const action of ['clear-hazard', 'open-exit', 'redirect']) {
    el(`${action}-${exit.toLowerCase()}`).addEventListener('click', () => perform(action, exit));
  }
}
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
