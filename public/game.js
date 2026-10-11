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
let bestCommands = null;
let comparePlaying = false;
// Prior best frozen for this review so saving a new best does not erase the side-by-side ghost.
let reviewBest = null;
let mode = 'intro';
let practiceStep = 0;
let accumulator = 0;
let previousTime = null;
let sessionGeneration = 0;
let sceneActive = null;
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
      // People are not click targets — door hit volumes must stay free for Open/Send.
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
let selectedPersonId = null;
function setFeedback(text) {
  // Drill stays quiet: task card + toast only, no "person X" / send chatter.
  el('feedback').textContent = mode === 'drill' ? '' : text;
}
function place(list, s) {
  list.forEach((item, i) => {
    const { figure, body, model } = item;
    const person = s.people[i];
    figure.setAttribute('visible', !person.evacuated);
    figure.setAttribute('position', `${person.x} 0 ${person.z}`);
    const exitColor = { A: '#f1d673', B: '#76bcff', C: '#d6a9ed' }[person.exit];
    body.setAttribute('color', person.panic ? '#e5484d' : exitColor);
    if (!model) return;
    // Face the direction of travel; the walker component plays walk while moving and idle otherwise.
    // Same state/tick refreshes keep the last moving flag so walk clips are not restarted every display frame.
    if (item.state !== s) {
      item.state = s;
      item.tick = s.tick;
      item.x = person.x;
      item.z = person.z;
      model.moving = false;
    } else if (item.tick !== s.tick) {
      item.tick = s.tick;
      const dx = person.x - (item.x ?? person.x);
      const dz = person.z - (item.z ?? person.z);
      model.moving = Math.hypot(dx, dz) > 0.001;
      if (model.moving) figure.setAttribute('rotation', `0 ${Math.atan2(dx, dz) * 180 / Math.PI} 0`);
      item.x = person.x;
      item.z = person.z;
    }
    model.pace = person.speed / 2.4;
  });
}
function instructions(label, title, copy) {
  el('step-label').textContent = label;
  el('task-title').textContent = title;
  el('task-copy').replaceChildren(...(Array.isArray(copy) ? copy : [copy]).map(part => {
    if (typeof part === 'string') return document.createTextNode(part);
    const word = document.createElement('strong');
    word.classList.add(`word-${part.tone}`);
    word.textContent = part.word;
    return word;
  }));
}
function refresh() {
  const stats = sim.stats(state);
  const total = state.people.length;
  el('evacuated').textContent = ghost
    ? `New run: ${stats.evacuated} / ${total} · Original: ${sim.stats(ghost).evacuated} / ${total}`
    : `People out: ${stats.evacuated} / ${total}`;
  el('remaining').textContent = `Still inside: ${stats.remaining}`;
  const clock = ghost ? Math.max(state.tick, ghost.tick) : state.tick;
  el('timer').textContent = mode === 'practice' || mode === 'intro'
    ? 'Practice · no timer' : `Time left: ${Math.ceil(Math.max(0, sim.DURATION - clock * sim.DT))} s`;
  const active = mode === 'practice' || mode === 'drill';
  for (const exit of EXITS) {
    const suffix = exit.toLowerCase();
    const hazard = state.hazards.includes(exit);
    const clearing = hazard && state.clearingExit === exit;
    const seconds = clearing ? ((state.clearingUntil - state.tick) * sim.DT).toFixed(1) : null;
    el(`status-${suffix}`).setAttribute('data-state', hazard ? 'hazard' : state.open[exit] ? 'open' : 'closed');
    el(`state-${suffix}`).textContent = clearing ? `Clearing: ${seconds} s` : hazard ? 'Blocked' : state.open[exit] ? 'Open' : 'Closed';
    el(`count-${suffix}`).textContent = `${stats.queues[exit]} heading here`;
    el(`exit-${suffix}`).setAttribute('stadium-door', 'state', hazard ? 'blocked' : state.open[exit] ? 'open' : 'closed');
    // Hidden button bank stays in sync so tests and any residual handlers share availability with door clicks.
    // Guided practice steps 0–1 only unlock B; after PRACTICE DONE (step 2) and in drill, all exits work.
    const available = active && (mode === 'drill' || practiceStep >= 2 || exit === 'B');
    const clear = el(`clear-hazard-${suffix}`);
    clear.disabled = !available || !hazard || state.clearingUntil !== null;
    clear.textContent = clearing ? `Clearing: ${seconds} s` : `Clear ${exit} · 4 s`;
    el(`open-exit-${suffix}`).disabled = !available || state.open[exit] || hazard;
    el(`redirect-${suffix}`).disabled = !available || !state.open[exit] || hazard || stats.remaining === 0 || state.tick < state.redirectReady;
    el(`exit-${suffix}`).setAttribute('stadium-door', 'guided', mode === 'practice' && practiceStep < 2 && exit === 'B');
  }
  for (const exit of EXITS) el(`multi-hazard-${exit.toLowerCase()}`).setAttribute('visible', state.hazards.includes(exit));
  el('hazard-marker').setAttribute('visible', !!state.hazard);
  el('hazard-marker').setAttribute('equipment-blockage', 'outlined', !!state.hazard);
  el('hazard-label').setAttribute('visible', !!state.hazard);
  el('hazard-smoke').setAttribute('visible', !!state.hazard);
  el('floor-effects').setAttribute('visible', !!state.hazard);
  if (state.hazard) {
    el('hazard-label').setAttribute('value', state.clearingExit !== state.hazard ? 'BLOCKED - CLEAR FIRST'
      : `CLEARING - ${((state.clearingUntil - state.tick) * sim.DT).toFixed(1)} s`);
    const x = { A: -8, B: 0, C: 8 }[state.hazard];
    el('hazard-marker').setAttribute('position', `${x} 0 -11`);
    el('hazard-label').setAttribute('position', `${x} 3.8 -10.8`);
    el('hazard-smoke').setAttribute('position', `${x} 0 -11`);
  }
  el('actions').hidden = true;
  el('review').hidden = !lastRun || active;
  // Laptop: Reassure button + voice line. VR: mic only — hide the button (and its VR mirror).
  const panicking = state.people.some(p => p.panic && !p.evacuated);
  const reassureCooling = mode === 'drill' && lastCalmAt > 0 && (nowMs() - lastCalmAt) < REASSURE_COOLDOWN_MS;
  el('reassure-btn').hidden = mode !== 'drill' || !!laptopPose;
  el('reassure-btn').disabled = mode !== 'drill' || !panicking || reassureCooling;
  // Restart: mid-practice step 1, or headset review (laptop review keeps Restart hidden).
  el('stop-btn').hidden = mode === 'compare'
    || (mode === 'review' && !laptopPose)
    || (mode === 'practice' && practiceStep !== 1);
  el('drill-btn').classList.toggle('guide-pulse', mode === 'practice' && practiceStep >= 2 && !el('drill-btn').hidden);
  el('reassure-btn').classList.toggle('guide-pulse', mode === 'drill' && panicking && !reassureCooling && !laptopPose);
  place(figures, state);
  el('ghost-crowd').setAttribute('visible', !!ghost);
  if (ghost) place(ghostFigures, ghost);
  syncCooldownToast();
  syncHeadset();
}
// Audio is ElevenLabs clips only (public/audio via scripts/generate-audio.js) — no Windows/browser TTS fallback.
let soundOn = true;
let audio = null;
let playingClip = null;
let audioGeneration = 0;
let voiceSequence = 0;
const tones = new Set();
const clipIds = new Set(window.CrowdAudioClips || []);
const clips = {};
const clip = id => (clipIds.has(id) ? (clips[id] ??= new window.Audio(`/audio/${id}.mp3`)) : null);
function stopAudio() {
  audioGeneration++;
  voiceSequence++;
  for (const item of Object.values(clips)) {
    item.pause();
    item.currentTime = 0;
  }
  playingClip = null;
  for (const tone of tones) {
    try { tone.stop(); } catch { /* already stopped */ }
  }
  tones.clear();
}
function beep() {
  if (!soundOn || !audio) return;
  for (let i = 0; i < 6; i++) {
    const at = audio.currentTime + i * 0.25;
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = 'square';
    tone.frequency.value = i % 2 ? 660 : 880;
    gain.gain.setValueAtTime(0.06, at);
    gain.gain.setValueAtTime(0, at + 0.2);
    tone.connect(gain).connect(audio.destination);
    tones.add(tone);
    tone.onended = () => tones.delete(tone);
    tone.start(at);
    tone.stop(at + 0.22);
  }
}
function alarm() {
  if (!soundOn) return;
  const generation = audioGeneration;
  const siren = clip('alarm');
  if (!siren) return beep();
  // Quieter than the announcement that follows, so the voice stays clear over it.
  siren.volume = 0.45;
  siren.currentTime = 0;
  siren.play().catch(() => { if (soundOn && generation === audioGeneration) beep(); });
}
function ambience(on) {
  const crowd = clip('ambience');
  if (!crowd) return;
  if (!on || !soundOn) return crowd.pause();
  crowd.loop = true;
  crowd.volume = 0.25;
  crowd.play().catch(() => {});
}
function announce(id) {
  el('pa-caption').textContent = '';
  // Headset stays silent; laptop plays the ElevenLabs clip only (no narrator fallback).
  if (!soundOn || laptopPose) return;
  const voice = clip(id);
  if (!voice) return;
  const generation = audioGeneration;
  const sequence = ++voiceSequence;
  playingClip?.pause();
  playingClip = voice;
  voice.currentTime = 0;
  voice.play().catch(() => {
    if (generation === audioGeneration && sequence === voiceSequence) playingClip = null;
  });
}
function fresh(nextMode, blockedExit = null, hazardTick = nextMode === 'drill' ? 100 + Math.floor(Math.random() * 101) : null, incidentCount = nextMode === 'drill' ? 2 + Math.floor(Math.random() * 2) : 1) {
  // Browsers only start audio after a user gesture; practice and drills begin from a click.
  sessionGeneration++;
  stopAudio();
  if (!audio && window.AudioContext) audio = new window.AudioContext();
  audio?.resume();
  mode = nextMode;
  scoreExpanded = false;
  lastDoorSelection = null;
  selectedPersonId = null;
  micLoudFor = 0;
  lastCalmAt = 0;
  stopMic();
  ambience(mode === 'drill');
  if (mode === 'practice') breathingLog.practice = [];
  breathingLog.drill = [];
  el('pa-caption').textContent = '';
  state = sim.createState({ blockedExit, hazardTick, incidentCount });
  initial = clone(state);
  ghost = null;
  lastRun = null;
  accumulator = 0;
  previousTime = null;
  practiceStep = 0;
  if (mode === 'drill') startMic();
  el('results').hidden = true;
  el('intro').hidden = true;
  el('game').style.display = 'block';
  syncSceneLifecycle();
  // Lets a headset browser show its own Enter VR prompt; A-Frame offers once and ignores browsers without it.
  const generation = sessionGeneration;
  checkHeadset().then(ok => { if (ok && !laptopPose && generation === sessionGeneration) scene.enterVR(false, true); });
  el('drill-btn').hidden = true;
  el('mode-title').textContent = mode === 'practice' ? 'Practice' : 'Timed drill';
  if (mode === 'practice') {
    instructions('STEP 1 OF 2', 'Open Exit B', ['Click ', { word: 'Open', tone: 'open' }, ' on the middle door, Exit B.']);
    setFeedback('Take your time. There is no timer. Click doors in the scene.');
  } else {
    instructions(`${sim.DURATION}-SECOND DRILL`, 'Help people get out', [`${incidentCount} blockages can strike during the drill. The first exit becomes `, { word: 'blocked', tone: 'clear' }, ' after 10 to 20 seconds. Click the red blockage to ', { word: 'Clear', tone: 'clear' }, ' it, then click to ', { word: 'open', tone: 'open' }, ' it. Or click another open door to ', { word: 'send people', tone: 'send' }, ' there.']);
    setFeedback('');
    if (mode === 'drill') announce('drill-start');
  }
  createAllFigures();
  refresh();
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}
function perform(action, target = 'B') {
  if (mode !== 'practice' && mode !== 'drill') return;
  if (action === 'calm') {
    if (mode !== 'drill') return;
    if (!sim.act(state, action, target)) return;
    const person = state.people.find(p => p.id === Number(target));
    if (person && !person.panic) {
      selectedPersonId = null;
      showCalmEffect(person);
    }
    refresh();
    return;
  }
  if (mode === 'practice' && practiceStep < 2 && (target !== 'B' || (action !== 'open-exit' && action !== 'redirect'))) return;
  if (!sim.act(state, action, target)) {
    setFeedback('Not ready yet. Use another open exit, or wait for the current action to finish.');
    return;
  }
  if (action === 'clear-hazard') {
    setFeedback(`Clearing Exit ${target} takes ${sim.CLEAR_DURATION * sim.DT} seconds. Use another open exit while you wait.`);
  } else if (action === 'open-exit') {
    setFeedback(`Exit ${target} is open. Send people there.`);
    if (mode === 'practice' && practiceStep === 0 && state.open.B) {
      practiceStep = 1;
      instructions('STEP 2 OF 2', 'Send people to B', ['Click Exit B again to ', { word: 'Send people', tone: 'send' }, ' there. Watch them head to the middle door.']);
    }
  } else {
    setFeedback(`Some people are heading to Exit ${target}. Watch them move.`);
    announce(`redirect-${target}`);
    if (mode === 'practice' && practiceStep === 1 && state.redirected) {
      practiceStep = 2;
      // Free A/C exploration: drop the practice Send cooldown so Exit A is not silently dead.
      state.redirectReady = state.tick;
      instructions('PRACTICE DONE', 'Ready for the drill', ['Click a door to ', { word: 'open', tone: 'open' }, ' it, then click again to ', { word: 'send people', tone: 'send' }, ' there. Start the timed drill when ready.']);
      el('drill-btn').textContent = 'Start timed drill';
      el('drill-btn').hidden = false;
    }
  }
  refresh();
}
// Presage webcam vitals = how calm the trainee looked (pulse/breathing/movement). No crowd fallback.
let breathing = { available: false };
let breathingSeen = false;
const breathingLog = { practice: [], drill: [] };
const VITALS_LOG_CONFIDENCE = 40; // log for review a bit earlier than the "ready" HUD threshold
const BEST_VITALS_KEY = 'crowdclear-best-vitals';
const BEST_RUN_KEY = 'crowdclear-best-run';
function loadBestVitals() {
  try { return JSON.parse(localStorage.getItem(BEST_VITALS_KEY) || 'null'); } catch { return null; }
}
function saveBestVitals(snap) {
  try { localStorage.setItem(BEST_VITALS_KEY, JSON.stringify(snap)); } catch { /* private mode */ }
}
function loadBestRun() {
  try { return JSON.parse(localStorage.getItem(BEST_RUN_KEY) || 'null'); } catch { return null; }
}
function saveBestRun(run, score) {
  try {
    localStorage.setItem(BEST_RUN_KEY, JSON.stringify({
      version: run.version, result: run.result, commands: run.commands, initial: run.initial, score
    }));
  } catch { /* private mode */ }
}
async function pollBreathing() {
  try {
    breathing = await (await fetch('/api/breathing')).json();
  } catch {
    breathing = { available: false };
  }
  breathingSeen ||= breathing.available;
  const ready = breathing.available && breathing.confidence >= 50;
  const loggable = breathing.available && breathing.confidence >= VITALS_LOG_CONFIDENCE
    && (breathing.rate != null || breathing.pulse != null || breathing.amplitude != null);
  if (loggable && breathingLog[mode]) {
    breathingLog[mode].push({
      rate: breathing.rate, pulse: breathing.pulse,
      amplitude: breathing.amplitude, stress: breathing.stress
    });
  }
  // Only show Presage when the webcam helper is actually posting readings.
  el('breathing').hidden = !breathing.available && !breathingSeen;
  if (!breathing.available) {
    if (breathingSeen) el('breathing').textContent = 'Presage: reconnecting…';
    syncHeadset();
    return;
  }
  breathingSeen = true;
  const breathLine = ready && breathing.rate != null ? `Presage: ${Math.round(breathing.rate)} /min`
    : `Presage: ${breathing.hint || 'measuring (face + chest in view)'}`;
  const pulseLine = ready && breathing.pulse != null ? ` · Pulse ${Math.round(breathing.pulse)}` : '';
  el('breathing').textContent = breathLine + pulseLine;
  syncHeadset();
}
function analyticsFor(s, commands = s.commands, { rememberBest = false } = {}) {
  const stats = sim.stats(s);
  const score = review.score(stats, s.open);
  const summary = review.result(s);
  const best = loadBestVitals();
  const snap = review.vitalsSnapshot(breathingLog.drill) || review.vitalsSnapshot(breathingLog.practice);
  const vitalsText = review.vitals(breathingLog, best);
  // Persist after the line is built so the same finish does not immediately treat itself as "worse than best".
  if (rememberBest && snap && review.calmerThan(snap, best)) saveBestVitals(snap);
  return review.report({
    result: summary,
    score,
    total: s.people.length,
    commands,
    vitalsText
  });
}
function finish() {
  ambience(false);
  stopMic();
  el('pa-caption').textContent = '';
  // Headset has no page chrome — open the score panel once when the drill ends.
  if (laptopPose) scoreExpanded = true;
  showResults(state);
  showReview({ version: sim.VERSION, initial, commands: clone(state.commands), result: review.result(state) });
  save(lastRun);
}
function showVitals(text) {
  // Presage card only when the webcam helper produced a score — never developer setup copy.
  const show = !!text;
  const card = el('result-vitals');
  if (card) card.hidden = !show;
  const node = el('result-breathing');
  if (node) {
    node.textContent = text || '';
    node.hidden = !show;
  }
  const fill = el('calm-scale-fill');
  if (fill?.style) {
    const score = Number((text || '').match(/(\d+)\/10/)?.[1]);
    fill.style.width = score ? `${score * 10}%` : '0%';
    fill.classList?.remove?.('num-exit', 'num-clear', 'num-stop');
    if (score >= 8) fill.classList?.add?.('num-exit');
    else if (score >= 5) fill.classList?.add?.('num-clear');
    else if (score) fill.classList?.add?.('num-stop');
  }
}
function fillActionLog(entries) {
  el('review-timeline').replaceChildren(...entries.map(entry => {
    const item = document.createElement('li');
    if (entry.time) {
      const time = document.createElement('span');
      time.className = 'log-time';
      time.textContent = entry.time;
      const label = document.createElement('span');
      label.className = 'log-label';
      label.textContent = entry.label;
      item.append(time, label);
    } else {
      item.textContent = entry.label;
    }
    return item;
  }));
}
function showResults(s, commands = s.commands) {
  const report = analyticsFor(s, commands, { rememberBest: true });
  el('result-message').textContent = report.headline;
  el('result-tip').textContent = report.tip;
  el('result-tip').hidden = !report.tip;
  el('result-peak').textContent = report.peak;
  el('result-peak').hidden = !report.peak;
  el('result-evacuated').textContent = report.values.evacuated;
  el('result-evacuated').className = 'num-exit';
  el('result-time').textContent = report.values.time;
  el('result-time').className = 'num-send';
  el('result-calmed').textContent = report.values.calmed;
  el('result-calmed').className = 'num-open';
  el('result-panicking').textContent = report.values.panicking;
  el('result-panicking').className = 'num-stop';
  el('result-score').textContent = report.values.score;
  el('result-score').className = 'num-signal';
  fillActionLog(report.timeline);
  showVitals(report.vitals);
  el('results').hidden = false;
  // The results card replaces the scene on a laptop; in a headset the scene is the only view.
  syncSceneLifecycle();
  return report;
}
function syncCompareReadout() {
  const when = Math.max(0, Math.min(sim.DURATION, Number(el('compare-when').value) || 0));
  el('compare-when').value = String(when);
  el('compare-when-readout').textContent = `${when} s`;
  const vrWhen = el('vr-compare-when');
  if (vrWhen) vrWhen.setAttribute('value', `At ${when} s`);
  return when;
}
function toneClass(tone) {
  return ({ exit: 'num-exit', send: 'num-send', open: 'num-open', stop: 'num-stop', signal: 'num-signal', clear: 'num-clear' })[tone] || 'num-send';
}
function fillCompareAnalysis(currentResult, currentScore) {
  const cmp = review.compareBest(currentResult, reviewBest?.result || null, currentScore, reviewBest?.score || null);
  const box = el('compare-result');
  box.replaceChildren();
  const head = document.createElement('p');
  head.className = 'compare-headline';
  head.textContent = cmp.headline;
  box.append(head);
  const list = document.createElement('dl');
  list.className = 'compare-metrics';
  for (const row of cmp.rows) {
    const rowEl = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = row.label;
    const dd = document.createElement('dd');
    const cur = document.createElement('span');
    cur.className = toneClass(row.tone);
    cur.textContent = row.unit ? `${row.current}${row.unit}` : String(row.current);
    dd.append(cur);
    if (row.best != null) {
      dd.append(document.createTextNode(' · best '));
      const bestEl = document.createElement('span');
      const won = row.better === 'lower' ? row.current <= row.best : row.current >= row.best;
      bestEl.className = won ? 'num-muted' : toneClass(row.tone);
      bestEl.textContent = row.unit ? `${row.best}${row.unit}` : String(row.best);
      dd.append(bestEl);
    }
    rowEl.append(dt, dd);
    list.append(rowEl);
  }
  box.append(list);
  if (cmp.note) {
    const note = document.createElement('p');
    note.className = 'compare-note';
    note.textContent = cmp.note;
    box.append(note);
  }
  box.hidden = false;
  return cmp;
}
function replayTo(initial, commands, targetTick) {
  const s = clone(initial);
  const maxTick = Math.min(targetTick, Math.round(sim.DURATION / sim.DT));
  while (s.tick < maxTick) sim.step(s, commands || []);
  return s;
}
function seekCompare(seconds = syncCompareReadout()) {
  if (!lastRun) return;
  comparePlaying = false;
  const target = Math.round(Math.max(0, Math.min(sim.DURATION, seconds)) / sim.DT);
  state = replayTo(lastRun.initial, lastRun.commands, target);
  ghost = reviewBest?.initial ? replayTo(reviewBest.initial, reviewBest.commands, target) : null;
  bestCommands = reviewBest?.commands || null;
  mode = 'compare';
  el('results').hidden = true;
  el('compare-legend').hidden = false;
  el('compare-legend').textContent = reviewBest
    ? 'Wireframe = best run. Solid = this run.'
    : 'Solid = this run. Scrub 0–60s (including after everyone is out).';
  el('drill-btn').hidden = true;
  syncSceneLifecycle();
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  instructions('SIDE BY SIDE', 'Comparing runs', reviewBest
    ? `At ${seconds}s — wireframe is your best run, solid is this run.`
    : `At ${seconds}s — this run.`);
  refresh();
  syncHeadset();
}
let micStream = null;
let micAnalyser = null;
let micData = null;
let micLoudFor = 0;
let lastCalmAt = 0;
const REASSURE_COOLDOWN_MS = 1200;
function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
function syncCooldownToast() {
  const toast = el('cooldown-toast');
  let label = '';
  let remaining = 0;
  let total = 1;
  if (state.clearingUntil !== null && state.tick < state.clearingUntil) {
    label = `Clearing Exit ${state.clearingExit}`;
    remaining = (state.clearingUntil - state.tick) * sim.DT;
    total = sim.CLEAR_DURATION * sim.DT;
  } else if ((mode === 'practice' || mode === 'drill') && state.tick < state.redirectReady) {
    label = 'Send cooldown';
    remaining = (state.redirectReady - state.tick) * sim.DT;
    total = sim.REDIRECT_COOLDOWN * sim.DT;
  } else if (mode === 'drill' && lastCalmAt > 0 && nowMs() - lastCalmAt < REASSURE_COOLDOWN_MS) {
    label = 'Reassure cooldown';
    remaining = (REASSURE_COOLDOWN_MS - (nowMs() - lastCalmAt)) / 1000;
    total = REASSURE_COOLDOWN_MS / 1000;
  }
  const vrCd = el('vr-cooldown');
  if (!label) {
    toast.hidden = true;
    vrCd?.setAttribute('visible', false);
    return;
  }
  const left = Math.min(1, Math.max(0, remaining / total));
  toast.hidden = false;
  el('cooldown-toast-label').textContent = label;
  el('cooldown-toast-time').textContent = `${remaining.toFixed(1)}s`;
  el('cooldown-toast-fill').style.transform = `scaleX(${left})`;
  // Same wait on the world-fixed VR panel overlay.
  vrCd?.setAttribute('visible', !!laptopPose);
  el('vr-cooldown-text')?.setAttribute('value', `${label} · ${remaining.toFixed(1)}s`);
}
function stopMic() {
  micStream?.getTracks?.().forEach(track => track.stop());
  micStream = null;
  micAnalyser = null;
  micData = null;
  micLoudFor = 0;
}
async function startMic() {
  stopMic();
  try {
    const media = window.navigator?.mediaDevices?.getUserMedia;
    if (!media) return;
    if (!audio && window.AudioContext) audio = new window.AudioContext();
    await audio?.resume?.();
    micStream = await media.call(window.navigator.mediaDevices, { audio: true });
    if (!audio?.createAnalyser || !audio.createMediaStreamSource) return;
    const source = audio.createMediaStreamSource(micStream);
    micAnalyser = audio.createAnalyser();
    micAnalyser.fftSize = 512;
    source.connect(micAnalyser);
    micData = new Uint8Array(micAnalyser.frequencyBinCount);
  } catch {
    stopMic();
  }
}
function micRms() {
  if (!micAnalyser || !micData) return 0;
  micAnalyser.getByteTimeDomainData(micData);
  let sum = 0;
  for (let i = 0; i < micData.length; i++) {
    const v = (micData[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / micData.length);
}
function reducedMotion() {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}
function calmTargets(limit = 3) {
  const panickers = state.people.filter(p => !p.evacuated && p.panic);
  if (!panickers.length) return [];
  // Deterministic shuffle from the current tick so Reassure picks a random batch, replay-stable.
  const list = [...panickers];
  let seed = (Math.imul(state.tick + 17, 1664525) + 1013904223) >>> 0;
  for (let i = list.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, limit).map(p => p.id);
}
function calmTarget() {
  return calmTargets(1)[0] ?? null;
}
function applyReassure() {
  const panicking = state.people.filter(p => !p.evacuated && p.panic).length;
  if (!panicking) return false;
  // With 2+ panickers always calm at least 2; with 3+ pick 2 or 3 (never a lonely single).
  const seed = (Math.imul(state.tick + 1, 1664525) >>> 0);
  const batch = panicking >= 3 ? 2 + (seed % 2) : panicking;
  const ids = calmTargets(batch);
  let calmed = 0;
  for (const id of ids) {
    if (!sim.act(state, 'calm', id)) continue;
    const person = state.people.find(p => p.id === id);
    if (person && !person.panic) {
      calmed++;
      showCalmEffect(person);
    }
  }
  selectedPersonId = null;
  setFeedback('');
  refresh();
  return calmed > 0;
}
function showCalmEffect(person) {
  const fx = el('calm-fx');
  if (!fx || reducedMotion()) return;
  fx.setAttribute('position', `${person.x} 1.15 ${person.z}`);
  fx.setAttribute('visible', true);
  fx.setAttribute('scale', '0.7 0.7 0.7');
  fx.setAttribute('material', 'opacity', 0.9);
  fx.setAttribute('animation__grow', 'property: scale; to: 2.1 2.1 2.1; dur: 650; easing: easeOutQuad');
  fx.setAttribute('animation__fade', 'property: material.opacity; to: 0; dur: 650; easing: easeOutQuad');
  window.setTimeout?.(() => fx.setAttribute('visible', false), 700);
}
function playReassureVoice() {
  if (!soundOn || laptopPose) return;
  const voice = clip('reassure');
  if (!voice) return;
  const generation = audioGeneration;
  const sequence = ++voiceSequence;
  playingClip?.pause();
  playingClip = voice;
  voice.currentTime = 0;
  voice.play().catch(() => {
    if (generation === audioGeneration && sequence === voiceSequence) playingClip = null;
  });
}
function tryReassureFromMic(dt) {
  // Moderate calm speech — not silence, not shouting. Brief pauses do not reset the hold.
  if (mode !== 'drill') { micLoudFor = 0; return; }
  if (!calmTargets(1).length) { micLoudFor = 0; return; }
  const rms = micRms();
  if (rms >= 0.02 && rms <= 0.22) micLoudFor += dt;
  else micLoudFor = Math.max(0, micLoudFor - dt * 1.5);
  const now = nowMs();
  if (micLoudFor >= 0.22 && now - lastCalmAt >= REASSURE_COOLDOWN_MS) {
    lastCalmAt = now;
    micLoudFor = 0;
    applyReassure();
  }
}
let lastShakeTick = null;
function maybeWorldShake() {
  // Sparse, comfort-safe jolts during the drill only — never continuous; skip reduced-motion.
  if (mode !== 'drill' || reducedMotion()) return;
  if (state.tick < 40 || state.tick > 520) return;
  if (state.tick % 150 !== 75) return;
  if (lastShakeTick === state.tick) return;
  lastShakeTick = state.tick;
  const rig = el('rig');
  const base = laptopPose ? VR_POST : '0 0 0';
  rig.setAttribute('animation__shake', {
    property: 'position',
    from: base,
    to: laptopPose ? '0.04 6 13.03' : '0.05 0 0.04',
    dur: 70,
    dir: 'alternate',
    loop: 2,
    easing: 'easeInOutSine'
  });
}
// fetch rejects with a TypeError only when the request never reached the server.
const reason = error => (error instanceof TypeError ? 'The server could not be reached.' : error.message);
async function save(run) {
  el('save-status').textContent = 'Saving this drill…';
  try {
    run.id = crypto.randomUUID();
    const res = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: run.id, version: run.version, blockedExit: run.initial.blockedExit, hazardTick: run.initial.hazardTick, incidentCount: run.initial.incidentCount, commands: run.commands, result: run.result }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server error ${res.status}.`);
    if (lastRun !== run) return;
    history.replaceState(null, '', `?run=${run.id}`);
    el('save-status').textContent = 'Saved. Reload or share this page address to reopen this drill.';
  } catch (error) {
    if (lastRun === run) el('save-status').textContent = `Not saved. ${reason(error)}`;
  }
}
async function reopen(id) {
  const generation = sessionGeneration;
  el('load-status').textContent = 'Opening the saved drill…';
  try {
    const res = await fetch(`/api/runs/${encodeURIComponent(id)}`);
    const saved = await res.json().catch(() => ({}));
    if (generation !== sessionGeneration) return;
    if (!res.ok) throw new Error(saved.error || `Server error ${res.status}.`);
    if (saved.version !== sim.VERSION) throw new Error('It was recorded with a different simulation version, so it cannot be replayed.');
    const hazardTick = saved.hazardTick ?? null;
    const incidentCount = saved.incidentCount ?? 1;
    const probe = sim.createState({ blockedExit: hazardTick === null ? saved.blockedExit : null, hazardTick, incidentCount });
    while (!sim.isDone(probe)) sim.step(probe, saved.commands || []);
    const sent = (saved.commands || []).map(({ tick, action, target }) => ({ tick, action, target }));
    const actual = review.result(probe);
    if (probe.blockedExit !== saved.blockedExit
      || JSON.stringify(probe.commands) !== JSON.stringify(sent)
      || !saved.result
      || !Object.keys(actual).every(key => saved.result[key] === actual[key])) {
      throw new Error('The saved drill could not be reproduced.');
    }
    if (generation !== sessionGeneration) return;
    fresh('review', saved.blockedExit, hazardTick, incidentCount);
    const start = clone(initial);
    while (!sim.isDone(state)) sim.step(state, saved.commands);
    start.blockedExit = state.blockedExit;
    start.fixedIncidents = clone(state.incidents);
    showResults(state);
    showReview({ ...saved, initial: start });
    el('save-status').textContent = 'Opened from the database. Replay checks that it reproduces its saved result.';
    el('load-status').textContent = '';
  } catch (error) {
    if (generation !== sessionGeneration) return;
    el('load-status').textContent = `Could not open the saved drill. ${reason(error)}`;
  }
}
function showReview(run) {
  mode = 'review';
  lastRun = run;
  reviewBest = loadBestRun();
  const report = analyticsFor(state, lastRun.commands);
  const score = review.score(sim.stats(state), state.open);
  instructions('DRILL DONE', 'Your drill', 'Read the best-vs-this-run analysis, then scrub or play the side-by-side.');
  el('feedback').textContent = '';
  el('run-analysis').textContent = report.analysis;
  fillActionLog(report.timeline);
  fillCompareAnalysis(lastRun.result, score);
  el('compare-form').hidden = false;
  el('compare-legend').hidden = false;
  el('compare-legend').textContent = reviewBest
    ? 'Wireframe = best run. Solid = this run.'
    : 'Solid = this run. Scrub 0–60s (including after everyone is out).';
  el('compare-when').value = '0';
  syncCompareReadout();
  el('drill-btn').textContent = 'Try another drill';
  el('drill-btn').hidden = !laptopPose;
  if (!reviewBest || score.score >= (reviewBest.score?.score ?? 0)) saveBestRun(lastRun, score);
  refresh();
  syncHeadset();
}
function compare(fromSeconds = syncCompareReadout()) {
  if (!lastRun) return;
  seekCompare(fromSeconds);
  comparePlaying = true;
  accumulator = 0;
  previousTime = null;
  instructions('SIDE BY SIDE', 'Comparing runs', 'Playing — wireframe is your best run, solid is this run. Drag the slider to jump.');
  syncHeadset();
}
function finishCompare() {
  comparePlaying = false;
  mode = 'review';
  el('drill-btn').textContent = 'Try another drill';
  el('drill-btn').hidden = false;
  instructions('DRILL DONE', 'Your drill', 'Scrub the timeline or play again, or try another drill.');
  refresh();
  syncHeadset();
}
el('start-btn').addEventListener('click', () => fresh('practice'));
el('stop-btn').addEventListener('click', () => fresh('practice'));
el('drill-btn').addEventListener('click', () => fresh('drill'));
el('reassure-btn').addEventListener('click', () => {
  if (laptopPose) return;
  const now = nowMs();
  if (now - lastCalmAt < REASSURE_COOLDOWN_MS) return;
  lastCalmAt = now;
  playReassureVoice();
  applyReassure();
});
el('sound-btn').addEventListener('click', () => {
  soundOn = !soundOn;
  if (!soundOn) stopAudio();
  else ambience(mode === 'drill');
  el('sound-btn').textContent = `Sound: ${soundOn ? 'on' : 'off'}`;
  el('sound-btn').setAttribute('aria-pressed', String(soundOn));
});
for (const exit of EXITS) {
  for (const action of ['clear-hazard', 'open-exit', 'redirect']) {
    el(`${action}-${exit.toLowerCase()}`).addEventListener('click', () => perform(action, exit));
  }
}
el('compare-when').addEventListener('input', () => {
  syncCompareReadout();
  if (lastRun && (mode === 'review' || mode === 'compare')) seekCompare();
  syncHeadset();
});
el('compare-form').addEventListener('submit', event => {
  event.preventDefault();
  compare(0);
});
// In a headset the page is out of sight: the rig lifts the player onto a raised command post, an in-scene
// panel mirrors the side panel, and controller clicks press the page's own buttons so both inputs share handlers.
// ponytail: post and panel positions are first guesses; tune them on the headset.
const VR_POST = '0 6 13';
const shown = button => !button.closest('[hidden]');
let vrButtons = [];
let laptopPose = null;
let scoreExpanded = false;
let lastDoorSelection = null;
function vrCopy(text) {
  // Same steps as the laptop card; only the verb changes for pointing.
  return String(text || '')
    .replace(/\bClick\b/g, 'Point at')
    .replace(/\bclick\b/g, 'point at')
    .replace(/Point at the red blockage to Clear/g, 'Point at the red blockage and select twice to Clear')
    .replace(/press Reassure/gi, 'speak to reassure');
}
function syncHeadset() {
  if (!laptopPose) return;
  const hasResults = !el('results').hidden || mode === 'review' || mode === 'compare';
  const liveBreathing = el('breathing').hidden ? '' : el('breathing').textContent;
  const report = lastRun && hasResults ? analyticsFor(state, lastRun.commands) : null;
  let lines;
  if (hasResults) {
    lines = report?.briefLines || ['Drill complete', el('result-message').textContent];
    const analysis = (el('run-analysis').textContent || report?.analysis || '').replace(/·/g, '-');
    const vitals = el('result-breathing')?.textContent || report?.vitals || '';
    el('vr-analysis-text').setAttribute('value', [el('result-message').textContent, analysis, vitals,
      `Score ${el('result-score').textContent}`, `People out ${el('result-evacuated').textContent}`]
      .filter(Boolean).join('\n\n').replace(/·/g, '-'));
    const when = syncCompareReadout();
    const compareBody = (el('compare-result').textContent || '').slice(0, 280);
    const compareNote = mode === 'compare'
      ? `${comparePlaying ? 'Playing' : 'Paused'} at ${when}s\nWireframe = best\nSolid = this run\nUse -5s / +5s to jump`
      : `Best vs this run\nJump with -5s / +5s\nNow at ${when}s\n\n${compareBody}`;
    el('vr-compare-text').setAttribute('value', compareNote.replace(/·/g, '-'));
    el('vr-score-text').setAttribute('value', (report?.scoreLines || []).join('\n\n').replace(/·/g, '-'));
  } else {
    // Mirror the laptop instruction card; drill stays quiet (no person-X / speak directives).
    const task = vrCopy(el('task-copy').textContent);
    const feedback = mode === 'drill' ? '' : vrCopy(el('feedback').textContent);
    lines = [el('step-label').textContent, el('task-title').textContent, task, feedback, liveBreathing];
    el('vr-score-text').setAttribute('value', ' ');
    el('vr-analysis-text').setAttribute('value', ' ');
    el('vr-compare-text').setAttribute('value', ' ');
  }
  const hud = hasResults ? [] : [el('evacuated').textContent, el('timer').textContent];
  el('vr-text').setAttribute('value', [...lines, ...hud].filter(Boolean).join('\n\n').replace(/·/g, '-'));
  // Middle analysis hides while the side-by-side replay is up.
  el('vr-analysis').setAttribute('visible', hasResults && mode !== 'compare');
  el('vr-compare').setAttribute('visible', hasResults);
  el('vr-compare-btn').setAttribute('visible', hasResults && !el('compare-form').hidden);
  el('vr-compare-minus').setAttribute('visible', hasResults && !el('compare-form').hidden);
  el('vr-compare-plus').setAttribute('visible', hasResults && !el('compare-form').hidden);
  el('vr-score-toggle').setAttribute('visible', false);
  el('vr-score-details').setAttribute('visible', false);
  const visibleNav = vrButtons.filter(({ source }) => shown(source));
  vrButtons.forEach(({ source, button, label }, index) => {
    const on = shown(source);
    button.setAttribute('visible', on);
    // Center a lone button; keep a two-up row when both Restart and Start drill are up.
    const slot = visibleNav.length === 1 ? 0 : visibleNav.indexOf(vrButtons[index]) - (visibleNav.length - 1) / 2;
    if (on) button.setAttribute('position', `${slot * 0.62} 0 0`);
    button.setAttribute('material', 'color', source.disabled ? '#4a5260' : button.hovered ? '#e6da78' : '#2f7de1');
    button.setAttribute('text', 'value', label || source.textContent.trim());
    button.setAttribute('text', 'color', button.hovered ? '#182230' : '#ffffff');
  });
}
function hoverControl(button, canInteract) {
  button.addEventListener('mouseenter', () => {
    button.hovered = canInteract();
    if (button.hovered) {
      button.setAttribute('material', 'color', '#e6da78');
      button.setAttribute('text', 'color', '#182230');
    }
  });
  button.addEventListener('mouseleave', () => {
    button.hovered = false;
    button.setAttribute('material', 'color', '#2f7de1');
    button.setAttribute('text', 'color', '#ffffff');
  });
}
function createVrButtons() {
  // Navigation only — VR calms via microphone, not a Hold Reassure control.
  // Buttons sit on the instruction panel plane so controller rays hit the visible mesh.
  const layout = [
    { id: 'drill-btn' },
    { id: 'stop-btn' }
  ];
  vrButtons = layout.map(({ id, label }) => {
    const source = el(id);
    const button = document.createElement('a-entity');
    button.classList.add('vr-control');
    button.setAttribute('geometry', { primitive: 'plane', width: 0.58, height: 0.22 });
    button.setAttribute('position', '0 0 0');
    button.setAttribute('material', { color: '#2f7de1', shader: 'flat', opacity: 1, transparent: false });
    button.setAttribute('text', { align: 'center', width: 0.54, wrapCount: 18, color: '#ffffff', zOffset: 0.012 });
    // Prefer the page button's own click path so Start timed drill / Restart share laptop handlers.
    button.addEventListener('click', evt => {
      evt?.stopPropagation?.();
      if (!shown(source) || source.disabled) return;
      source.click();
      buzz(evt);
    });
    hoverControl(button, () => shown(source) && !source.disabled);
    el('vr-navigation').append(button);
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
  // #actions stays hidden for the laptop UI; availability is the button disabled flag, not shown().
  const action = state.hazards.includes(exit) ? 'clear-hazard' : state.open[exit] ? 'redirect' : 'open-exit';
  const button = el(`${action}-${exit.toLowerCase()}`);
  if (mode !== 'practice' && mode !== 'drill') return;
  if (button.disabled) {
    if (action === 'redirect' && state.tick < state.redirectReady) {
      setFeedback(`Wait ${(Math.max(0, state.redirectReady - state.tick) * sim.DT).toFixed(1)} s before sending again.`);
      syncCooldownToast();
      syncHeadset();
    }
    return;
  }
  // VR only: double-select to start clearing. Laptop single-clicks the door or red-outlined blockage.
  if (laptopPose && action === 'clear-hazard') {
    const now = evt?.timeStamp ?? Date.now();
    if (!lastDoorSelection || lastDoorSelection.exit !== exit || now - lastDoorSelection.time > 450 || now < lastDoorSelection.time) {
      lastDoorSelection = { exit, time: now };
      syncHeadset();
      return;
    }
  }
  lastDoorSelection = null;
  button.click();
  buzz(evt);
}
for (const exit of EXITS) {
  const door = el(`exit-${exit.toLowerCase()}`);
  const target = el(`door-target-${exit.toLowerCase()}`);
  target.addEventListener('click', evt => pressDoor(exit, evt));
  target.addEventListener('mouseenter', () => {
    const action = state.hazards.includes(exit) ? 'clear-hazard' : state.open[exit] ? 'redirect' : 'open-exit';
    const button = el(`${action}-${exit.toLowerCase()}`);
    if (!button.disabled) door.setAttribute('stadium-door', 'hovered', true);
  });
  target.addEventListener('mouseleave', () => door.setAttribute('stadium-door', 'hovered', false));
}
el('hazard-marker').addEventListener('click', evt => {
  if (state.hazard) pressDoor(state.hazard, evt);
});
el('vr-score-toggle').addEventListener('click', evt => {
  if (!laptopPose || el('results').hidden) return;
  scoreExpanded = !scoreExpanded;
  syncHeadset();
  buzz(evt);
});
hoverControl(el('vr-score-toggle'), () => !!laptopPose && !el('results').hidden);
el('vr-compare-btn').addEventListener('click', evt => {
  if (!laptopPose || el('compare-form').hidden) return;
  compare(syncCompareReadout());
  buzz(evt);
});
hoverControl(el('vr-compare-btn'), () => !!laptopPose && !el('compare-form').hidden);
function nudgeCompare(delta) {
  if (!laptopPose || el('compare-form').hidden) return;
  el('compare-when').value = String(Math.max(0, Math.min(sim.DURATION, syncCompareReadout() + delta)));
  seekCompare();
}
el('vr-compare-minus').addEventListener('click', evt => { nudgeCompare(-5); buzz(evt); });
el('vr-compare-plus').addEventListener('click', evt => { nudgeCompare(5); buzz(evt); });
hoverControl(el('vr-compare-minus'), () => !!laptopPose && !el('compare-form').hidden);
hoverControl(el('vr-compare-plus'), () => !!laptopPose && !el('compare-form').hidden);
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
  else el('feedback').textContent = 'VR could not start. Connect your headset and reload.';
});
function syncSceneLifecycle() {
  // Laptop results hide the scene; an active XR session always keeps it running.
  const wanted = mode !== 'intro' && (!!scene.xrSession || el('results').hidden);
  scene.hidden = !wanted;
  if (!scene.renderer || !scene.renderStarted) {
    sceneActive = null;
    return;
  }
  if (wanted === sceneActive) return;
  sceneActive = wanted;
  previousTime = null;
  accumulator = 0;
  if (wanted) {
    scene.play();
    scene.renderer.setAnimationLoop(scene.render);
  } else {
    scene.pause();
    scene.renderer.setAnimationLoop(null);
  }
}
scene.addEventListener('enter-vr', () => {
  // Laptop fullscreen (A-Frame's "f" key) also emits enter-vr; only a real XR session moves the player.
  if (!scene.xrSession) return;
  if (!vrButtons.length) createVrButtons();
  const camera = el('camera').object3D;
  laptopPose = { position: camera.position.clone(), rotation: camera.rotation.clone() };
  el('rig').setAttribute('position', VR_POST);
  // Drop the laptop overhead camera so the post UI sits at chest height in the headset view.
  const cam = el('camera');
  Object.assign(cam.object3D.position, { x: 0, y: 1.6, z: 0 });
  Object.assign(cam.object3D.rotation, { x: 0, y: 0, z: 0 });
  cam.setAttribute('position', '0 1.6 0');
  cam.setAttribute('rotation', '0 0 0');
  el('vr-post').setAttribute('visible', true);
  el('vr-ui').setAttribute('visible', true);
  // The intro and a completed laptop run are not interactive starting points for a headset test.
  // Set the XR pose first so fresh() keeps the current session instead of offering another one.
  if (mode === 'intro' || !el('results').hidden) fresh('practice');
  syncSceneLifecycle();
  syncHeadset();
});
scene.addEventListener('exit-vr', () => {
  if (!laptopPose) return;
  el('rig').setAttribute('position', '0 0 0');
  el('vr-post').setAttribute('visible', false);
  el('vr-ui').setAttribute('visible', false);
  el('vr-analysis').setAttribute('visible', false);
  el('vr-compare').setAttribute('visible', false);
  el('camera').object3D.position.copy(laptopPose.position);
  el('camera').object3D.rotation.copy(laptopPose.rotation);
  laptopPose = null;
  syncSceneLifecycle();
});
function tick() {
  if (mode === 'compare') {
    if (!comparePlaying) return;
    const maxTick = Math.round(sim.DURATION / sim.DT);
    if (state.tick < maxTick) sim.step(state, lastRun.commands);
    if (ghost && ghost.tick < maxTick) sim.step(ghost, bestCommands || []);
    el('compare-when').value = String(Math.min(sim.DURATION, Math.floor(state.tick * sim.DT)));
    syncCompareReadout();
    if (state.tick >= maxTick && (!ghost || ghost.tick >= maxTick)) finishCompare();
    return;
  }
  const incidentNow = mode === 'drill' && state.incidentTicks.includes(state.tick);
  const clearingExit = state.clearingExit;
  sim.step(state);
  maybeWorldShake();
  if (clearingExit && !state.hazards.includes(clearingExit)) {
    instructions('CLEARED', `Open Exit ${clearingExit}`, ['Click to ', { word: 'Open', tone: 'open' }, ` Exit ${clearingExit}, then click to `, { word: 'Send people', tone: 'send' }, ' there.']);
    setFeedback('');
  }
  if (incidentNow) {
    // Fix the original incident in the initial snapshot; alternatives face the same event.
    initial.blockedExit = state.blockedExit;
    initial.fixedIncidents = clone(state.incidents);
    instructions('BLOCKED EXIT', `Exit ${state.hazard} is blocked`, ['Click the red blockage to ', { word: 'Clear', tone: 'clear' }, ' it. Wait 4 seconds, then click to ', { word: 'open', tone: 'open' }, ' it. Or click another open door to ', { word: 'send people', tone: 'send' }, ' there.']);
    setFeedback('');
    alarm();
    announce(`hazard-${state.hazard}`);
  }
  if (mode === 'drill' && sim.isDone(state)) finish();
}
function frame(now) {
  if (previousTime === null) previousTime = now;
  const delta = (now - previousTime) / 1000;
  previousTime = now;
  const running = () => mode === 'drill' || (mode === 'compare' && comparePlaying) || (mode === 'practice' && practiceStep === 2);
  // XR owns visibility while a session exists; document.hidden alone must not freeze a visible headset.
  const visible = scene.xrSession ? scene.xrSession.visibilityState === 'visible' : !document.hidden;
  if (!running() || !visible) {
    previousTime = null;
    return;
  }
  accumulator += Math.min(delta, 0.25);
  tryReassureFromMic(Math.min(delta, 0.25));
  let stepped = false;
  while (accumulator >= sim.DT && running()) {
    accumulator -= sim.DT;
    tick();
    stepped = true;
  }
  if (stepped) refresh();
}
window.AFRAME?.registerComponent('sim-driver', {
  tick(time) { frame(time); },
});
scene.setAttribute('sim-driver', '');
scene.addEventListener('renderstart', syncSceneLifecycle);
syncSceneLifecycle();
window.setInterval?.(pollBreathing, 1000);
const savedRun = new URLSearchParams(location.search).get('run');
if (savedRun) reopen(savedRun);
if (scene.hasLoaded) createAllFigures();
else scene.addEventListener('loaded', createAllFigures, { once: true });
