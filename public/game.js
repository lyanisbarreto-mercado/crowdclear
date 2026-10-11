const sim = window.CrowdSimulation;
const review = window.CrowdReview;
const el = id => document.getElementById(id);
const clone = value => JSON.parse(JSON.stringify(value));
const EXITS = ['A', 'B', 'C'];
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

// Live crowd: CC0 characters from Kenney's Mini Characters (public/models/kenney/License.txt), each with walk
// and idle animations. The comparison's ghost crowd keeps simple wireframe shapes so the two crowds stay distinct.
const CHARACTERS = ['female-a', 'male-a', 'female-b', 'male-b', 'female-c', 'male-c', 'female-d', 'male-d', 'female-e', 'male-e', 'female-f', 'male-f'];
// All characters share one colour-map texture. Loaded once here: when models decoded it in parallel, only one got
// image data and three.js warned every frame about the rest.
let characterTexture = null;
function shareCharacterTexture(model) {
  model.traverse(node => {
    if (!node.isMesh || !node.material.map) return;
    if (!characterTexture) {
      const original = node.material.map;
      characterTexture = new window.AFRAME.THREE.TextureLoader().load('/models/kenney/Textures/colormap.png');
      Object.assign(characterTexture, { flipY: false, colorSpace: original.colorSpace, magFilter: original.magFilter, minFilter: original.minFilter });
    }
    node.material.map = characterTexture;
  });
}
window.AFRAME?.registerComponent('walker', {
  init() {
    this.el.addEventListener('model-loaded', () => {
      const model = this.el.getObject3D('mesh');
      shareCharacterTexture(model);
      const clip = name => model.animations.find(a => a.name === name);
      this.mixer = new window.AFRAME.THREE.AnimationMixer(model);
      this.walk = this.mixer.clipAction(clip('walk'));
      this.idle = this.mixer.clipAction(clip('idle'));
      this.idle.play();
      // Start each person at a different point in the cycle so the crowd does not move in lockstep.
      this.mixer.setTime(Math.random() * 2);
    });
  },
  tick(time, delta) {
    if (!this.mixer) return;
    const moving = !!this.el.moving;
    if (moving !== this.wasMoving) {
      const [on, off] = moving ? [this.walk, this.idle] : [this.idle, this.walk];
      on.reset().fadeIn(0.2).play();
      off.fadeOut(0.2);
      this.wasMoving = moving;
    }
    this.mixer.update(delta / 1000 * (this.el.pace ?? 1));
  },
});
function createFigures(list, container, faded) {
  if (list.length) return;
  state.people.forEach((_, i) => {
    const figure = document.createElement('a-entity');
    if (faded) {
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
      body.setAttribute('segments-radial', '6');
      body.setAttribute('segments-height', '1');
      head.setAttribute('segments-width', '6');
      head.setAttribute('segments-height', '4');
      [body, head].forEach(part => part.setAttribute('material', { wireframe: true, transparent: true, opacity: 0.6 }));
      figure.append(body, head);
      list.push({ figure, body });
    } else {
      // The ring at the feet carries the exit colour the cylinders used to; the model shows a person.
      const ring = document.createElement('a-ring');
      ring.setAttribute('radius-inner', '0.3');
      ring.setAttribute('radius-outer', '0.46');
      ring.setAttribute('rotation', '-90 0 0');
      ring.setAttribute('position', '0 0.03 0');
      const model = document.createElement('a-entity');
      model.setAttribute('gltf-model', `/models/kenney/character-${CHARACTERS[i % CHARACTERS.length]}.glb`);
      model.setAttribute('scale', '1.6 1.6 1.6');
      model.setAttribute('walker', '');
      figure.append(ring, model);
      list.push({ figure, body: ring, model, x: null, z: null });
    }
    el(container).append(figure);
  });
}
function createAllFigures() {
  createFigures(figures, 'crowd', false);
  createFigures(ghostFigures, 'ghost-crowd', true);
}
function place(list, s) {
  list.forEach((item, i) => {
    const { figure, body, model } = item;
    const person = s.people[i];
    figure.setAttribute('visible', !person.evacuated);
    figure.setAttribute('position', `${person.x} 0 ${person.z}`);
    body.setAttribute('color', { A: '#f1d673', B: '#76bcff', C: '#d6a9ed' }[person.exit]);
    if (!model) return;
    // Face the direction of travel; the walker component plays walk while moving and idle otherwise.
    const dx = person.x - (item.x ?? person.x);
    const dz = person.z - (item.z ?? person.z);
    model.moving = Math.hypot(dx, dz) > 0.001;
    model.pace = person.speed / 2.4;
    if (model.moving) figure.setAttribute('rotation', `0 ${Math.atan2(dx, dz) * 180 / Math.PI} 0`);
    item.x = person.x;
    item.z = person.z;
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
  const active = mode === 'practice' || mode === 'drill';
  for (const exit of EXITS) {
    const suffix = exit.toLowerCase();
    el(`exit-controls-${suffix}`).hidden = mode === 'practice' && exit !== 'B';
    const hazard = state.hazard === exit;
    const clearing = hazard && state.clearingUntil !== null;
    const seconds = clearing ? ((state.clearingUntil - state.tick) * sim.DT).toFixed(1) : null;
    el(`status-${suffix}`).setAttribute('data-state', hazard ? 'hazard' : state.open[exit] ? 'open' : 'closed');
    el(`state-${suffix}`).textContent = clearing ? `Clearing: ${seconds} s` : hazard ? 'Hazard: clear first' : state.open[exit] ? 'Open' : 'Closed';
    el(`count-${suffix}`).textContent = `${stats.queues[exit]} heading here`;
    el(`exit-${suffix}`).setAttribute('stadium-door', 'state', hazard ? 'blocked' : state.open[exit] ? 'open' : 'closed');
    const available = active && (mode !== 'practice' || exit === 'B');
    const clear = el(`clear-hazard-${suffix}`);
    clear.hidden = mode === 'practice';
    clear.disabled = !available || !hazard || clearing;
    clear.textContent = clearing ? `Clearing ${exit}: ${seconds} s` : `Clear hazard at ${exit}`;
    const open = el(`open-exit-${suffix}`);
    const redirect = el(`redirect-${suffix}`);
    open.hidden = mode === 'practice' && exit !== 'B';
    redirect.hidden = mode === 'practice' && exit !== 'B';
    open.disabled = !available || state.open[exit] || hazard;
    redirect.disabled = !available || !state.open[exit] || hazard || state.lastRedirect === exit || stats.remaining === 0 || state.tick < state.redirectReady;
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
  el('hazard-smoke').setAttribute('visible', !!state.hazard);
  if (state.hazard) {
    el('hazard-label').setAttribute('value', state.clearingUntil === null ? 'BLOCKED - CLEAR EQUIPMENT'
      : `CLEARING - ${((state.clearingUntil - state.tick) * sim.DT).toFixed(1)} s`);
    const x = { A: -8, B: 0, C: 8 }[state.hazard];
    el('hazard-marker').setAttribute('position', `${x} 0 -11`);
    el('hazard-label').setAttribute('position', `${x} 3.8 -10.8`);
    el('hazard-smoke').setAttribute('position', `${x} 0 -11`);
  }
  el('actions').hidden = !active;
  el('review').hidden = !lastRun || active;
  place(figures, state);
  el('ghost-crowd').setAttribute('visible', !!ghost);
  if (ghost) place(ghostFigures, ghost);
  syncHeadset();
}
// Audio plays the ElevenLabs clips from scripts/generate-audio.js when present, else the browser's own synth
// and speech. Every announcement is also captioned in #pa-caption and the headset panel, even with sound off.
let soundOn = true;
let audio = null;
let playingClip = null;
const clipIds = new Set(window.CrowdAudioClips || []);
const clips = {};
const clip = id => (clipIds.has(id) ? (clips[id] ??= new window.Audio(`/audio/${id}.mp3`)) : null);
function beep() {
  if (!audio) return;
  for (let i = 0; i < 6; i++) {
    const at = audio.currentTime + i * 0.25;
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = 'square';
    tone.frequency.value = i % 2 ? 660 : 880;
    gain.gain.setValueAtTime(0.06, at);
    gain.gain.setValueAtTime(0, at + 0.2);
    tone.connect(gain).connect(audio.destination);
    tone.start(at);
    tone.stop(at + 0.22);
  }
}
function alarm() {
  if (!soundOn) return;
  const siren = clip('alarm');
  if (!siren) return beep();
  // Quieter than the announcement that follows, so the voice stays clear over it.
  siren.volume = 0.45;
  siren.currentTime = 0;
  siren.play().catch(beep);
}
function ambience(on) {
  const crowd = clip('ambience');
  if (!crowd) return;
  if (!on || !soundOn) return crowd.pause();
  crowd.loop = true;
  crowd.volume = 0.25;
  crowd.play().catch(() => {});
}
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(text));
}
function announce(id) {
  const text = window.CrowdAnnouncements[id];
  el('pa-caption').textContent = `PA: ${text}`;
  if (!soundOn) return;
  const voice = clip(id);
  if (!voice) return speak(text);
  playingClip?.pause();
  playingClip = voice;
  voice.currentTime = 0;
  voice.play().catch(() => speak(text));
}
function fresh(nextMode, blockedExit = null, hazardTick = nextMode === 'drill' ? 100 + Math.floor(Math.random() * 101) : null) {
  // Browsers only start audio after a user gesture; practice and drills begin from a click.
  if (!audio && window.AudioContext) audio = new window.AudioContext();
  audio?.resume();
  mode = nextMode;
  ambience(mode === 'drill');
  if (mode === 'practice') breathingLog.practice = [];
  breathingLog.drill = [];
  el('pa-caption').textContent = '';
  state = sim.createState({ blockedExit, hazardTick });
  initial = clone(state);
  ghost = null;
  lastRun = null;
  accumulator = 0;
  previousTime = null;
  practiceStep = 0;
  el('results').hidden = true;
  scene.hidden = false;
  el('intro').hidden = true;
  el('game').style.display = 'block';
  // Lets a headset browser show its own Enter VR prompt; A-Frame offers once and ignores browsers without it.
  checkHeadset().then(ok => { if (ok && !laptopPose) scene.enterVR(false, true); });
  el('drill-btn').hidden = true;
  el('mode-title').textContent = mode === 'practice' ? 'Guided practice' : 'Stadium evacuation drill';
  if (mode === 'practice') {
    instructions('TASK 1 OF 2', 'Open an alternative route', 'Open Exit B to give the crowd another route. Use the highlighted control for the closed exit in the middle.');
    el('feedback').textContent = 'No timer is running. Complete the task when you are ready.';
  } else {
    instructions('INDEPENDENT DRILL', 'Watch the crowd and stay ready', 'All exits start open. Between 10 and 20 seconds, a hazard will block the route most people are heading toward. Clear it, reopen the door, or redirect people to another route.');
    el('feedback').textContent = 'A fresh drill has started. Your practice actions have been cleared.';
    if (mode === 'drill') announce('drill-start');
  }
  createAllFigures();
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
    el('feedback').textContent = `Clearing equipment at Exit ${target} takes ${sim.CLEAR_DURATION * sim.DT} seconds. Keep people moving through another open route while staff work.`;
  } else if (action === 'open-exit') {
    el('feedback').textContent = `Good work! Exit ${target} is open. Direct people toward the new route.`;
    if (mode === 'practice' && practiceStep === 0 && state.open.B) {
      practiceStep = 1;
      instructions('TASK 2 OF 2', 'Direct people to the new route', 'Redirect the crowd to Exit B. Watch the blue figures move toward the middle exit.');
    }
  } else {
    el('feedback').textContent = mode === 'drill'
      ? `Well done! Part of the crowd is now heading to Exit ${target}. Staff can give the next direction in ${sim.REDIRECT_COOLDOWN * sim.DT} seconds.`
      : `Well done! Part of the crowd is now heading to Exit ${target}. Watch them take the new route.`;
    announce(`redirect-${target}`);
    if (mode === 'practice' && practiceStep === 1 && state.redirected) {
      practiceStep = 2;
      instructions('PRACTICE COMPLETE', 'You have tried both actions', 'Opening an exit makes a route available; redirecting sends people toward it. Watch the response, then start a fresh timed drill when ready.');
      el('drill-btn').textContent = 'Start timed drill';
      el('drill-btn').hidden = false;
    }
  }
  refresh();
}
// Presage breathing from the local sensor helper. Readings below 50% confidence only show progress, and only
// confident ones count toward the practice/drill comparison. Nothing here is saved.
let breathing = { available: false };
let breathingSeen = false;
const breathingLog = { practice: [], drill: [] };
async function pollBreathing() {
  try {
    breathing = await (await fetch('/api/breathing')).json();
  } catch {
    breathing = { available: false };
  }
  breathingSeen ||= breathing.available;
  if (breathing.available && breathing.rate !== null && breathing.confidence >= 50 && breathingLog[mode]) breathingLog[mode].push(breathing.rate);
  el('breathing').hidden = !breathingSeen;
  el('breathing').textContent = !breathing.available ? 'Breathing: sensor off'
    : breathing.rate !== null && breathing.confidence >= 50 ? `Breathing: ${Math.round(breathing.rate)} /min`
    : `Breathing: ${breathing.hint || 'measuring (about 30 s)'}`;
  syncHeadset();
}
const average = list => list.reduce((a, b) => a + b, 0) / list.length;
function breathingSummary() {
  const { practice, drill } = breathingLog;
  if (!drill.length) return 'Breathing (laptop camera): not enough steady readings during the drill.';
  const during = `${Math.round(average(drill))} /min during the drill`;
  return `Breathing (laptop camera): ${practice.length ? `${Math.round(average(practice))} /min in practice, ` : ''}${during}.`;
}
function finish() {
  ambience(false);
  el('breathing-review').hidden = !breathingSeen;
  el('breathing-review').textContent = breathingSeen ? breathingSummary() : '';
  showResults(state);
  showReview({ version: sim.VERSION, initial, commands: clone(state.commands), result: review.result(state) });
  save(lastRun);
}
function showResults(s) {
  const stats = sim.stats(s);
  const score = review.score(stats, s.open);
  el('result-evacuated').textContent = `${stats.evacuated} / ${s.people.length}`;
  el('result-time').textContent = `${score.seconds} seconds`;
  el('result-exits').textContent = `${score.exits}`;
  el('result-score').textContent = `${score.score}`;
  el('result-message').textContent = score.message;
  el('result-tip').textContent = score.tip;
  el('results').hidden = false;
  // The results card replaces the scene on a laptop; in a headset the scene is the only view.
  scene.hidden = !laptopPose;
}
// fetch rejects with a TypeError only when the request never reached the server.
const reason = error => (error instanceof TypeError ? 'The server could not be reached.' : error.message);
async function save(run) {
  el('save-status').textContent = 'Saving this drill…';
  try {
    run.id = crypto.randomUUID();
    const res = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: run.id, version: run.version, blockedExit: run.initial.blockedExit, hazardTick: run.initial.hazardTick, commands: run.commands, result: run.result }) });
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
    fresh('review', saved.blockedExit, saved.hazardTick ?? null);
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
  el('feedback').textContent = 'Every drill is a chance to improve. Try another hazard scenario when you are ready. Results describe this simplified simulation only.';
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
  el('compare-time').max = String(sim.DURATION);
  el('compare-time').value = lastRun.commands.length ? (lastRun.commands[0].tick * sim.DT).toFixed(1) : '';
  el('compare-result').textContent = lastRun.commands.length
    ? 'Pick one action and a new time. Every other action stays the same.'
    : 'With no actions there is nothing to re-time. Start another drill and try clearing the blocked exit.';
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
  el('results').hidden = true;
  scene.hidden = false;
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
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
el('sound-btn').addEventListener('click', () => {
  soundOn = !soundOn;
  if (!soundOn) { window.speechSynthesis?.cancel(); playingClip?.pause(); }
  ambience(mode === 'drill');
  el('sound-btn').textContent = `Sound: ${soundOn ? 'on' : 'off'}`;
  el('sound-btn').setAttribute('aria-pressed', String(soundOn));
});
for (const exit of EXITS) {
  for (const action of ['clear-hazard', 'open-exit', 'redirect']) {
    el(`${action}-${exit.toLowerCase()}`).addEventListener('click', () => perform(action, exit));
  }
}
el('compare-form').addEventListener('submit', event => {
  event.preventDefault();
  compare(Number(el('compare-action').value), Number(el('compare-time').value));
});
// In a headset the page is out of sight: the rig lifts the player onto a raised command post, an in-scene
// panel mirrors the side panel, and controller clicks press the page's own buttons so both inputs share handlers.
// ponytail: post and panel positions are first guesses; tune them on the headset.
const VR_POST = '0 6 13';
const VR_LABELS = { 'clear-hazard': 'Clear', 'open-exit': 'Open', redirect: 'Redirect to' };
const shown = button => !button.closest('[hidden]');
let vrButtons = [];
let laptopPose = null;
function syncHeadset() {
  if (!laptopPose) return;
  const timeline = el('review').hidden ? [] : [...el('review-timeline').children].map(item => item.textContent);
  const results = el('results').hidden ? [] : [`${el('result-message').textContent} Score: ${el('result-score').textContent}`];
  el('vr-text').setAttribute('value', ['Point at a door and pull the trigger to act on it.', ...['task-title', 'task-copy', 'feedback'].map(id => el(id).textContent),
    el('pa-caption').textContent, ...results, ...timeline, el('evacuated').textContent, el('timer').textContent, el('breathing').hidden ? '' : el('breathing').textContent].filter(Boolean).join('\n\n').replace(/·/g, '-')); // A-Frame's default font has no middle dot.
  vrButtons.forEach(({ source, button, label }) => {
    button.setAttribute('visible', shown(source));
    button.setAttribute('material', 'color', source.disabled ? '#4a5260' : '#2f7de1');
    button.setAttribute('text', 'value', label || source.textContent);
  });
}
function createVrButtons() {
  // One column per exit (clear, open, redirect), then the drill and restart buttons on the last row.
  const layout = EXITS.flatMap((exit, col) => Object.keys(VR_LABELS).map((action, row) =>
    ({ id: `${action}-${exit.toLowerCase()}`, label: `${VR_LABELS[action]} ${exit}`, col, row })))
    .concat({ id: 'drill-btn', col: 0, row: 3 }, { id: 'stop-btn', col: 2, row: 3 });
  vrButtons = layout.map(({ id, label, col, row }) => {
    const source = el(id);
    const button = document.createElement('a-entity');
    button.classList.add('vr-control');
    button.setAttribute('geometry', { primitive: 'plane', width: 0.36, height: 0.1 });
    button.setAttribute('position', `${(col - 1) * 0.38} ${-0.08 - row * 0.12} 0.01`);
    button.setAttribute('text', { align: 'center', width: 0.34, wrapCount: 18, color: '#ffffff' });
    // The raycaster can still hit an invisible button, so check the page button is actually showing.
    button.addEventListener('click', evt => { if (shown(source) && !source.disabled) { source.click(); buzz(evt); } });
    el('vr-panel').append(button);
    return { source, button, label };
  });
}
// Doors are controls too: clicking one (mouse on a laptop, controller in a headset) presses the page button
// for that door's next step, so both inputs share the same handlers and availability rules.
// A short controller pulse confirms a press that did something (no-op on a mouse or without haptics).
function buzz(evt) {
  evt?.detail?.cursorEl?.components?.['tracked-controls']?.controller?.gamepad?.hapticActuators?.[0]?.pulse?.(0.4, 40);
}
function pressDoor(exit, evt) {
  const x = exit.toLowerCase();
  const button = el(state.hazard === exit ? `clear-hazard-${x}` : state.open[exit] ? `redirect-${x}` : `open-exit-${x}`);
  if (shown(button) && !button.disabled) { button.click(); buzz(evt); }
}
for (const exit of EXITS) {
  const door = el(`exit-${exit.toLowerCase()}`);
  const target = el(`door-target-${exit.toLowerCase()}`);
  target.addEventListener('click', evt => pressDoor(exit, evt));
  target.addEventListener('mouseenter', () => door.setAttribute('stadium-door', 'hovered', true));
  target.addEventListener('mouseleave', () => door.setAttribute('stadium-door', 'hovered', false));
}
scene.setAttribute('raycaster', 'objects: .vr-control');
scene.setAttribute('cursor', 'rayOrigin: mouse; fuse: false');
// A-Frame and this script both ask for VR support at page load, but an emulator such as the Immersive Web
// Emulator installs its XR runtime later. Ask again when practice starts, and let a fresh yes count for A-Frame,
// whose enterVR otherwise only goes fullscreen with no XR session.
let headsetReady = false;
function checkHeadset() {
  const asked = window.navigator?.xr?.isSessionSupported?.('immersive-vr');
  return asked ? asked.then(ok => { headsetReady = ok; el('vr-btn').hidden = !ok; return ok; }, () => false) : Promise.resolve(false);
}
checkHeadset();
const aframeHeadset = scene.checkHeadsetConnected?.bind(scene);
scene.checkHeadsetConnected = () => headsetReady || !!aframeHeadset?.();
el('vr-btn').addEventListener('click', () => {
  if (scene.checkHeadsetConnected()) scene.enterVR();
  else el('feedback').textContent = 'Headset view could not start in this browser. Reload the page with the headset connected.';
});
scene.addEventListener('enter-vr', () => {
  // Laptop fullscreen (A-Frame's "f" key) also emits enter-vr; only a real XR session moves the player.
  if (!scene.xrSession) return;
  if (!vrButtons.length) createVrButtons();
  const camera = el('camera').object3D;
  laptopPose = { position: camera.position.clone(), rotation: camera.rotation.clone() };
  el('rig').setAttribute('position', VR_POST);
  el('vr-post').setAttribute('visible', true);
  scene.hidden = false;
  syncHeadset();
});
scene.addEventListener('exit-vr', () => {
  if (!laptopPose) return;
  el('rig').setAttribute('position', '0 0 0');
  el('vr-post').setAttribute('visible', false);
  el('camera').object3D.position.copy(laptopPose.position);
  el('camera').object3D.rotation.copy(laptopPose.rotation);
  laptopPose = null;
  scene.hidden = !el('results').hidden;
});
function tick() {
  if (mode === 'compare') {
    if (!sim.isDone(state)) sim.step(state, altSchedule);
    if (!sim.isDone(ghost)) sim.step(ghost, lastRun.commands);
    if (sim.isDone(state) && sim.isDone(ghost)) finishCompare();
    return;
  }
  const incidentNow = mode === 'drill' && state.hazardTick !== null && state.tick === state.hazardTick;
  const clearingExit = state.clearingUntil !== null ? state.hazard : null;
  sim.step(state);
  if (clearingExit && !state.hazard) {
    instructions('HAZARD CLEARED', `Exit ${clearingExit} is ready to reopen`, 'The equipment is clear. Open the door to make this route usable again.');
    el('feedback').textContent = `The hazard at Exit ${clearingExit} is cleared. You can open that exit now.`;
  }
  if (incidentNow) {
    // Fix the original incident in the initial snapshot; alternatives face the same event.
    initial.blockedExit = state.blockedExit;
    instructions('HAZARD DETECTED', `Exit ${state.hazard} is blocked`, 'Clear the striped equipment, then reopen the closed door. You can also direct people to another open exit.');
    el('feedback').textContent = `Stay focused: Exit ${state.hazard} needs your attention. Choose a route to keep the crowd moving.`;
    alarm();
    announce(`hazard-${state.hazard}`);
  }
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
window.setInterval?.(pollBreathing, 2000);
const savedRun = new URLSearchParams(location.search).get('run');
if (savedRun) reopen(savedRun);
if (scene.hasLoaded) createAllFigures();
else scene.addEventListener('loaded', createAllFigures, { once: true });
requestAnimationFrame(frame);
