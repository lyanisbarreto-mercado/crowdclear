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
      // Hit volume for laptop click and VR ray select of panicking guests.
      const hit = document.createElement('a-cylinder');
      hit.classList.add('vr-control');
      hit.setAttribute('radius', '0.45');
      hit.setAttribute('height', '1.6');
      hit.setAttribute('position', '0 0.8 0');
      hit.setAttribute('material', 'visible: false');
      hit.addEventListener('click', evt => { selectPerson(i, evt); });
      figure.append(ring, model, hit);
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
function selectPerson(id, evt) {
  if (mode !== 'drill' && mode !== 'practice') return;
  const person = state.people[id];
  if (!person || person.evacuated) return;
  selectedPersonId = id;
  el('feedback').textContent = person.panic
    ? (laptopPose ? `Panicking guest ${id} — speak to reassure.` : `Panicking guest ${id} — press Reassure.`)
    : `Selected person ${id}. Orange rings need reassurance.`;
  buzz(evt);
  refresh();
}
function place(list, s) {
  list.forEach((item, i) => {
    const { figure, body, model } = item;
    const person = s.people[i];
    figure.setAttribute('visible', !person.evacuated);
    figure.setAttribute('position', `${person.x} 0 ${person.z}`);
    const exitColor = { A: '#f1d673', B: '#76bcff', C: '#d6a9ed' }[person.exit];
    body.setAttribute('color', person.panic ? '#ff8a3d' : selectedPersonId === person.id ? '#ffe08a' : exitColor);
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
    const available = active && (mode !== 'practice' || exit === 'B');
    const clear = el(`clear-hazard-${suffix}`);
    clear.disabled = !available || !hazard || state.clearingUntil !== null;
    clear.textContent = clearing ? `Clearing: ${seconds} s` : `Clear ${exit} · 4 s`;
    el(`open-exit-${suffix}`).disabled = !available || state.open[exit] || hazard;
    el(`redirect-${suffix}`).disabled = !available || !state.open[exit] || hazard || state.lastRedirect === exit || stats.remaining === 0 || state.tick < state.redirectReady;
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
  el('reassure-btn').hidden = mode !== 'drill' || !!laptopPose;
  el('reassure-btn').disabled = mode !== 'drill' || !panicking;
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
let audioGeneration = 0;
let voiceSequence = 0;
const tones = new Set();
const clipIds = new Set(window.CrowdAudioClips || []);
const clips = {};
const clip = id => (clipIds.has(id) ? (clips[id] ??= new window.Audio(`/audio/${id}.mp3`)) : null);
function stopAudio() {
  audioGeneration++;
  voiceSequence++;
  window.speechSynthesis?.cancel();
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
function speak(text) {
  if (!soundOn || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(text));
}
function announce(id) {
  const text = window.CrowdAnnouncements[id];
  el('pa-caption').textContent = `PA: ${text}`;
  // Headset: captions + panel text only — spoken PA stays on the laptop.
  if (!soundOn || laptopPose) return;
  const generation = audioGeneration;
  const sequence = ++voiceSequence;
  const voice = clip(id);
  if (!voice) return speak(text);
  playingClip?.pause();
  playingClip = voice;
  voice.currentTime = 0;
  voice.play().catch(() => {
    if (soundOn && generation === audioGeneration && sequence === voiceSequence) speak(text);
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
  el('vitals-card').hidden = true;
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
    el('feedback').textContent = 'Take your time. There is no timer. Click doors in the scene.';
  } else {
    instructions(`${sim.DURATION}-SECOND DRILL`, 'Help people get out', [`${incidentCount} blockages can strike during the drill. The first exit becomes `, { word: 'blocked', tone: 'clear' }, ' after 10 to 20 seconds. Click the red blockage to ', { word: 'Clear', tone: 'clear' }, ' it, then click to ', { word: 'open', tone: 'open' }, ' it. Or click another open door to ', { word: 'send people', tone: 'send' }, ' there.']);
    el('feedback').textContent = 'All exits are open. Watch for a blocked door.';
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
    if (!sim.act(state, action, target)) {
      el('feedback').textContent = laptopPose
        ? 'Point at an orange-ring guest, then speak to reassure.'
        : 'No panicking guest to reassure right now.';
      return;
    }
    const person = state.people.find(p => p.id === Number(target));
    el('feedback').textContent = person?.panic
      ? `Still panicking — keep reassuring person ${target}.`
      : `Person ${target} is calming down.`;
    if (person && !person.panic) {
      selectedPersonId = null;
      showCalmEffect(person);
    }
    refresh();
    return;
  }
  if (mode === 'practice' && (target !== 'B' || (action !== 'open-exit' && action !== 'redirect'))) return;
  if (!sim.act(state, action, target)) {
    el('feedback').textContent = `Not ready yet. Use another open exit, or wait for the current action to finish.`;
    return;
  }
  if (action === 'clear-hazard') {
    el('feedback').textContent = `Clearing Exit ${target} takes ${sim.CLEAR_DURATION * sim.DT} seconds. Use another open exit while you wait.`;
  } else if (action === 'open-exit') {
    el('feedback').textContent = `Exit ${target} is open. Send people there.`;
    if (mode === 'practice' && practiceStep === 0 && state.open.B) {
      practiceStep = 1;
      instructions('STEP 2 OF 2', 'Send people to B', ['Click Exit B again to ', { word: 'Send people', tone: 'send' }, ' there. Watch them head to the middle door.']);
    }
  } else {
    el('feedback').textContent = mode === 'drill'
      ? `Some people are heading to Exit ${target}. Wait ${sim.REDIRECT_COOLDOWN * sim.DT} seconds before sending more.`
      : `Some people are heading to Exit ${target}. Watch them move.`;
    announce(`redirect-${target}`);
    if (mode === 'practice' && practiceStep === 1 && state.redirected) {
      practiceStep = 2;
      instructions('PRACTICE DONE', 'Ready for the drill', ['Click a door to ', { word: 'open', tone: 'open' }, ' it, then click again to ', { word: 'send people', tone: 'send' }, ' there. Start the timed drill when ready.']);
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
function breathingSummary() {
  return review.vitals(breathingLog);
}
function analyticsFor(s, commands = s.commands) {
  const stats = sim.stats(s);
  const score = review.score(stats, s.open);
  const summary = review.result(s);
  const vitalsText = breathingSeen ? breathingSummary() : '';
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
  // One Presage block on the results card; mirrored for the review section id used by older tests.
  const show = !!text;
  for (const id of ['result-vitals', 'vitals-card']) {
    const card = el(id);
    if (card) card.hidden = !show;
  }
  for (const id of ['result-breathing', 'breathing-review']) {
    const node = el(id);
    if (!node) continue;
    node.textContent = text || '';
    node.hidden = !show;
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
  const report = analyticsFor(s, commands);
  el('result-message').textContent = report.headline;
  el('result-tip').textContent = report.tip;
  el('result-tip').hidden = !report.tip;
  el('result-peak').textContent = report.peak;
  el('result-peak').hidden = !report.peak;
  el('result-evacuated').textContent = report.values.evacuated;
  el('result-time').textContent = report.values.time;
  el('result-exits').textContent = report.values.exits;
  el('result-calmed').textContent = report.values.calmed;
  el('result-panicking').textContent = report.values.panicking;
  el('result-score').textContent = report.values.score;
  fillActionLog(report.timeline);
  showVitals(report.vitals);
  el('results').hidden = false;
  // The results card replaces the scene on a laptop; in a headset the scene is the only view.
  syncSceneLifecycle();
  return report;
}
let micStream = null;
let micAnalyser = null;
let micData = null;
let micLoudFor = 0;
let lastCalmAt = 0;
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
function calmTarget() {
  if (selectedPersonId !== null) {
    const selected = state.people[selectedPersonId];
    if (selected && !selected.evacuated && selected.panic) return selectedPersonId;
  }
  const panickers = state.people.filter(p => !p.evacuated && p.panic);
  if (!panickers.length) return null;
  // Nearest to lobby centre / camera aim — deterministic tie-break by id.
  return panickers.reduce((best, p) => {
    const d = Math.hypot(p.x, p.z - 4);
    const bd = Math.hypot(best.x, best.z - 4);
    return d < bd - 1e-9 || (Math.abs(d - bd) < 1e-9 && p.id < best.id) ? p : best;
  }).id;
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
  const text = window.CrowdAnnouncements.reassure;
  el('pa-caption').textContent = text;
  if (!soundOn || laptopPose) return;
  const generation = audioGeneration;
  const sequence = ++voiceSequence;
  const voice = clip('reassure');
  if (!voice) return speak(text);
  playingClip?.pause();
  playingClip = voice;
  voice.currentTime = 0;
  voice.play().catch(() => {
    if (soundOn && generation === audioGeneration && sequence === voiceSequence) speak(text);
  });
}
function tryReassureFromMic(dt) {
  // VR calm path: volume-based speaking. Laptop may still use the mic as a secondary path.
  if (mode !== 'drill') { micLoudFor = 0; return; }
  const id = calmTarget();
  if (id === null) { micLoudFor = 0; return; }
  if (micRms() > 0.08) micLoudFor += dt;
  else micLoudFor = 0;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (micLoudFor >= 0.4 && now - lastCalmAt >= 800) {
    lastCalmAt = now;
    micLoudFor = 0;
    selectedPersonId = id;
    perform('calm', id);
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
  const report = analyticsFor(state, lastRun.commands);
  instructions('DRILL DONE', 'Your drill', 'Review the action log below, or try a different time.');
  el('feedback').textContent = 'Try again, or change when you took one action. These results are for this game only.';
  fillActionLog(report.timeline);
  showVitals(report.vitals);
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
    : 'No actions to compare. Try another drill.';
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
  syncSceneLifecycle();
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
el('reassure-btn').addEventListener('click', () => {
  if (laptopPose) return;
  const id = calmTarget();
  if (id === null) {
    el('feedback').textContent = 'No panicking guest to reassure right now.';
    return;
  }
  selectedPersonId = id;
  playReassureVoice();
  perform('calm', id);
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
el('compare-form').addEventListener('submit', event => {
  event.preventDefault();
  compare(Number(el('compare-action').value), Number(el('compare-time').value));
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
function syncHeadset() {
  if (!laptopPose) return;
  const hasResults = !el('results').hidden;
  const caption = el('pa-caption').textContent;
  const liveBreathing = el('breathing').hidden ? '' : el('breathing').textContent;
  let lines;
  if (hasResults) {
    const report = lastRun ? analyticsFor(state, lastRun.commands) : null;
    // End-state: analytics only — no PA captions, no repeated metric prose, Presage from session report.
    lines = report?.briefLines || ['Drill complete', el('result-message').textContent, 'Score panel is on your right.',
      el('result-breathing')?.textContent || el('breathing-review').textContent].filter(Boolean);
    el('vr-score-text').setAttribute('value', (report?.scoreLines || [
      el('result-message').textContent,
      `Score: ${el('result-score').textContent}`,
      `People out: ${el('result-evacuated').textContent}`,
      `Time left: ${el('result-time').textContent}`,
      `Open exits: ${el('result-exits').textContent}`,
      `Calmed: ${el('result-calmed').textContent}`,
      `Still panicking: ${el('result-panicking').textContent}`,
      el('result-tip').textContent,
      el('result-breathing')?.textContent || el('breathing-review').textContent
    ]).filter(Boolean).join('\n\n').replace(/·/g, '-'));
  } else if (mode === 'practice') {
    // Mirror laptop step labels: STEP 1/2 → open B, STEP 2/2 → send to B, then start drill.
    lines = [
      ...(practiceStep === 0
        ? ['STEP 1 OF 2', 'Open Exit B', 'Point at Exit B and select to open it.']
        : practiceStep === 1
          ? ['STEP 2 OF 2', 'Send people to B', 'Point at Exit B and select to send people there.']
          : ['PRACTICE DONE', 'Ready for the drill', 'Start the timed drill when ready.']),
      caption, liveBreathing];
    el('vr-score-text').setAttribute('value', ' ');
  } else {
    lines = [
      el('step-label').textContent || `${sim.DURATION}-SECOND DRILL`,
      el('task-title').textContent,
      'Point at doors to clear (select twice), open, or send people.',
      'Orange rings are panicking. Speak to calm them.',
      el('feedback').textContent, caption, liveBreathing];
    el('vr-score-text').setAttribute('value', ' ');
  }
  const hud = hasResults ? [] : [el('evacuated').textContent, el('timer').textContent];
  el('vr-text').setAttribute('value', [...lines, ...hud].filter(Boolean).join('\n\n').replace(/·/g, '-'));
  el('vr-score-toggle').setAttribute('visible', hasResults);
  el('vr-score-toggle').setAttribute('text', 'value', scoreExpanded ? 'Hide score [-]' : 'View score [+]');
  el('vr-score-details').setAttribute('visible', hasResults && scoreExpanded);
  vrButtons.forEach(({ source, button, label }) => {
    button.setAttribute('visible', shown(source));
    button.setAttribute('material', 'color', source.disabled ? '#4a5260' : button.hovered ? '#e6da78' : '#2f7de1');
    button.setAttribute('text', 'value', label || source.textContent);
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
  const layout = [
    { id: 'drill-btn', col: 0, row: 0 },
    { id: 'stop-btn', col: 1, row: 0 }
  ];
  vrButtons = layout.map(({ id, label, col, row }) => {
    const source = el(id);
    const button = document.createElement('a-entity');
    button.classList.add('vr-control');
    button.setAttribute('geometry', { primitive: 'plane', width: 0.6, height: 0.16 });
    button.setAttribute('position', `${(col - 0.5) * 0.65} ${-row * 0.2} 0.01`);
    button.setAttribute('text', { align: 'center', width: 0.56, wrapCount: 22, color: '#ffffff' });
    // The raycaster can still hit an invisible button, so check the page button is actually showing.
    button.addEventListener('click', evt => { if (shown(source) && !source.disabled) { source.click(); buzz(evt); } });
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
  if (button.disabled || (mode !== 'practice' && mode !== 'drill')) return;
  // VR only: double-select to start clearing. Laptop single-clicks the door or red-outlined blockage.
  if (laptopPose && action === 'clear-hazard') {
    const now = evt?.timeStamp ?? Date.now();
    if (!lastDoorSelection || lastDoorSelection.exit !== exit || now - lastDoorSelection.time > 450 || now < lastDoorSelection.time) {
      lastDoorSelection = { exit, time: now };
      el('feedback').textContent = `Select Exit ${exit} again now to start clearing.`;
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
  el('vr-post').setAttribute('visible', true);
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
  el('camera').object3D.position.copy(laptopPose.position);
  el('camera').object3D.rotation.copy(laptopPose.rotation);
  laptopPose = null;
  syncSceneLifecycle();
});
function tick() {
  if (mode === 'compare') {
    if (!sim.isDone(state)) sim.step(state, altSchedule);
    if (!sim.isDone(ghost)) sim.step(ghost, lastRun.commands);
    if (sim.isDone(state) && sim.isDone(ghost)) finishCompare();
    return;
  }
  const incidentNow = mode === 'drill' && state.incidentTicks.includes(state.tick);
  const clearingExit = state.clearingExit;
  sim.step(state);
  maybeWorldShake();
  if (clearingExit && !state.hazards.includes(clearingExit)) {
    instructions('CLEARED', `Open Exit ${clearingExit}`, ['Click to ', { word: 'Open', tone: 'open' }, ` Exit ${clearingExit}, then click to `, { word: 'Send people', tone: 'send' }, ' there.']);
    el('feedback').textContent = `Exit ${clearingExit} is clear. Open it now.`;
  }
  if (incidentNow) {
    // Fix the original incident in the initial snapshot; alternatives face the same event.
    initial.blockedExit = state.blockedExit;
    initial.fixedIncidents = clone(state.incidents);
    instructions('BLOCKED EXIT', `Exit ${state.hazard} is blocked`, ['Click the red blockage to ', { word: 'Clear', tone: 'clear' }, ' it. Wait 4 seconds, then click to ', { word: 'open', tone: 'open' }, ' it. Or click another open door to ', { word: 'send people', tone: 'send' }, ' there.']);
    el('feedback').textContent = `Exit ${state.hazard} is blocked. Click the red outline to clear it.`;
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
window.setInterval?.(pollBreathing, 2000);
const savedRun = new URLSearchParams(location.search).get('run');
if (savedRun) reopen(savedRun);
if (scene.hasLoaded) createAllFigures();
else scene.addEventListener('loaded', createAllFigures, { once: true });
