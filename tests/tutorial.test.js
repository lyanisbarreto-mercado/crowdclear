const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const sim = require('../public/simulation');
const review = require('../public/review');
// random picks the drill's blocked exit: 0 → A, 0.4 → B, 0.9 → C.
function setup({ search = '', fetch = async () => ({ ok: true, json: async () => ({}) }), random = 0.4, clips, playback = () => Promise.resolve(), renderStarted = true } = {}) {
  const elements = new Map();
  const components = {};
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      style: {},
      // Match index.html hidden defaults so failed loads do not look like an open results card.
      hidden: typeof id === 'string' && /^(drill-btn|reassure-btn|results|review|vr-btn|breathing|breathing-review|vitals-card|result-peak|clear-hazard-|check-)/.test(id),
      disabled: false, _textContent: '', value: '',
      get textContent() { return this.children.length ? this.children.map(child => child.textContent).join('') : this._textContent; },
      set textContent(value) { this._textContent = value; this.children = []; },
      listeners: {}, attributes: {}, classList: { values: new Set(), toggle() {}, add(...names) { names.forEach(name => this.values.add(name)); }, contains(name) { return this.values.has(name); } }, children: [],
      closest() { return this.hidden ? this : null; },
      click() { if (!this.disabled) this.listeners.click?.(); },
      setAttribute(name, key, value) {
        this.attributes[name] = arguments.length === 3 ? { ...this.attributes[name], [key]: value } : key;
        if (components[name]) this.components[name] = { ...components[name], el: this };
      },
      getAttribute(name) { return this.attributes[name]; },
      components: {}, append(...items) { this.children.push(...items); }, replaceChildren(...items) { this.children = items; },
      addEventListener(event, listener) { this.listeners[event] = listener; }
    });
    return elements.get(id);
  }
  const scene = element('scene'); scene.hasLoaded = true;
  scene.renderStarted = renderStarted;
  scene.isPlaying = true;
  scene.play = () => { scene.isPlaying = true; };
  scene.pause = () => { scene.isPlaying = false; };
  scene.render = time => {
    if (scene.isPlaying) Object.values(scene.components).forEach(component => component.tick?.(time, 250));
  };
  scene.renderer = { loop: scene.render, setAnimationLoop(callback) { this.loop = callback; } };
  const pose = () => ({ clone: pose, copy() {} });
  element('camera').object3D = { position: pose(), rotation: pose() };
  const requests = [];
  const urls = [];
  const spoken = [];
  const played = [];
  const audioClips = [];
  const oscillators = [];
  const callbacks = [];
  let canceled = 0;
  let tones = 0;
  const node = { connect: next => next || node, gain: { setValueAtTime() {} }, frequency: {}, start() { tones++; }, stop() {} };
  const context = vm.createContext({
    window: { CrowdSimulation: sim, CrowdReview: review, CrowdAnnouncements: require('../public/announcements'), CrowdAudioClips: clips, dispatchEvent() {},
      AFRAME: { registerComponent(name, definition) { components[name] = definition; } },
      Audio: class { constructor(src) { this.src = src; this.currentTime = 0; this.paused = true; audioClips.push(this); } play() { played.push(this.src); this.paused = false; return playback(this.src); } pause() { this.paused = true; played.push(`paused ${this.src}`); } },
      speechSynthesis: { cancel() { canceled++; }, speak: u => spoken.push(u.text) }, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
      AudioContext: class { currentTime = 0; destination = {}; resume() {} createOscillator() { const tone = { ...node, stops: [], stop(at) { this.stops.push(at); } }; oscillators.push(tone); return tone; } createGain() { return node; } } },
    document: { hidden: false, getElementById: element, querySelector: () => scene,
      createElement: () => element(Symbol()), createTextNode: text => ({ textContent: text }) },
    requestAnimationFrame(callback) { callbacks.push(callback); }, Event: class {},
    fetch: (...args) => { requests.push(args); return fetch(...args); },
    crypto: { randomUUID: () => '0b9f6c1e-4a57-4d7e-9a8b-2f1c3d4e5f60' },
    location: { search }, URLSearchParams, history: { replaceState: (...args) => { urls.push(args[2]); } }
  });
  vm.runInContext(`Math.random = () => ${random};`, context);
  vm.runInContext(fs.readFileSync('public/game.js', 'utf8'), context);
  if (renderStarted) scene.listeners.renderstart?.();
  const value = expression => vm.runInContext(expression, context);
  let clock = 0;
  const componentTick = time => {
    assert.ok(Object.values(scene.components).some(component => component.tick), 'the scene has a simulation tick component');
    scene.renderer.loop?.(time);
  };
  return { element, context, value, requests, urls, scene, spoken, played, audioClips, oscillators, callbacks, canceled: () => canceled, tones: () => tones, componentTick, click: id => element(id).listeners.click(),
    play: whileMode => { while (value('mode') === whileMode) componentTick(clock += 250); },
    playTicks: ticks => { while (value('state.tick') < ticks) componentTick(clock += 250); } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
function practice(ui) {
  ui.click('start-btn'); ui.click('open-exit-b'); ui.click('redirect-b');
}
// Default incident hits C; start clearing, wait for completion, reopen, redirect to B, calm panickers.
function drillWithActions(ui) {
  practice(ui);
  ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  const exit = ui.value('state.hazard').toLowerCase();
  ui.click(`clear-hazard-${exit}`);
  ui.playTicks(ui.value('state.clearingUntil')); ui.click(`open-exit-${exit}`);
  ui.playTicks(200); ui.click('redirect-b');
  let calmClock = 50_000;
  const panickers = ui.value('state.people.filter(p => p.panic).map(p => p.id)');
  for (const id of panickers) {
    for (let i = 0; i < 16 && ui.value(`state.people[${id}].panic`); i++) {
      ui.value(`perform('calm', ${id})`);
      ui.componentTick(calmClock += 250);
    }
  }
  ui.play('drill');
}
test('practice waits indefinitely for its task and rejected redirect cannot advance it', () => {
  const ui = setup(); ui.click('start-btn');
  ui.componentTick(0); ui.componentTick(30000);
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.value('state.tick'), 0);
  ui.click('redirect-b');
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.element('drill-btn').hidden, true);
});

test('plain action words keep their colors and floor effects follow the blocked exit', () => {
  const ui = setup();
  ui.click('start-btn');
  assert.equal(ui.element('task-copy').textContent, 'Open the middle door, Exit B.');
  assert.ok(ui.element('task-copy').children.find(child => child.textContent === 'Open').classList.contains('word-open'));
  assert.equal(ui.element('floor-effects').getAttribute('visible'), false);
  ui.click('open-exit-b');
  assert.ok(ui.element('task-copy').children.find(child => child.textContent === 'Send people').classList.contains('word-send'));
  ui.click('redirect-b');
  ui.click('drill-btn');
  assert.equal(ui.element('step-label').textContent, `${sim.DURATION}-SECOND DRILL`);
  ui.playTicks(ui.value('state.hazardTick') + 1);
  const exit = ui.value('state.hazard').toLowerCase();
  assert.ok(ui.element('task-copy').children.find(child => child.textContent === 'Clear').classList.contains('word-clear'));
  assert.equal(ui.element('floor-effects').getAttribute('visible'), true);
  ui.click(`clear-hazard-${exit}`);
  assert.equal(ui.element('floor-effects').getAttribute('visible'), true, 'fire and smoke stay during clearing');
  ui.playTicks(ui.value('state.clearingUntil'));
  assert.equal(ui.element('floor-effects').getAttribute('visible'), false, 'clear completion removes incident effects');
  ui.value('fresh("drill", "B", null)');
  assert.equal(ui.element('floor-effects').getAttribute('visible'), true);
  ui.click('stop-btn');
  assert.equal(ui.element('floor-effects').getAttribute('visible'), false, 'restart removes incident effects');
});
test('both successful tasks unlock the drill and starting clears practice state', () => {
  const ui = setup(); ui.click('start-btn'); ui.click('open-exit-b');
  assert.equal(ui.value('practiceStep'), 1);
  assert.equal(ui.element('drill-btn').hidden, true);
  assert.equal(ui.element('redirect-b').disabled, false);
  ui.click('open-exit-b');
  assert.equal(ui.value('practiceStep'), 1);
  ui.click('redirect-b');
  assert.equal(ui.value('practiceStep'), 2);
  assert.equal(ui.element('drill-btn').hidden, false);
  ui.click('drill-btn');
  assert.equal(ui.value('mode'), 'drill');
  assert.equal(ui.value('state.hazard'), null);
  assert.equal(ui.value('Object.values(state.open).every(Boolean)'), true);
  assert.equal(ui.value('state.commands.length'), 0);
  assert.equal(ui.value('state.tick'), 0);
  ui.click('stop-btn');
  assert.equal(ui.value('mode'), 'practice');
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.element('drill-btn').hidden, true);
});
test('yellow completion indicators appear only after successful practice actions and reset', () => {
  const ui = setup(); ui.click('start-btn');
  assert.equal(ui.element('check-open-exit-b').hidden, true);
  ui.click('open-exit-b');
  assert.equal(ui.element('check-open-exit-b').hidden, false);
  assert.equal(ui.element('check-redirect-b').hidden, true);
  ui.click('redirect-b');
  assert.equal(ui.element('check-redirect-b').hidden, false);
  ui.click('stop-btn');
  assert.equal(ui.element('check-open-exit-b').hidden, true);
});
test('a finished drill records only drill decisions and opens the review and results', () => {
  const ui = setup();
  drillWithActions(ui);
  const run = ui.value('lastRun');
  assert.equal(ui.value('mode'), 'review');
  assert.equal(run.version, sim.VERSION);
  assert.equal(JSON.stringify(run.initial), JSON.stringify(sim.createState({ blockedExit: 'C', hazardTick: 140 })));
  assert.equal(run.commands.filter(c => c.action !== 'calm').map(c => `${c.action}-${c.target}`).join(), 'clear-hazard-C,open-exit-C,redirect-B');
  assert.ok(run.commands[0].tick >= 140);
  assert.ok(run.commands.some(c => c.action === 'redirect' && c.target === 'B' && c.tick >= 50));
  assert.ok(run.commands.some(c => c.action === 'calm'));
  assert.equal(run.result.remaining, 0);
  assert.equal(ui.element('review').hidden, false);
  assert.equal(ui.element('actions').hidden, true);
  assert.equal(ui.element('compare-form').hidden, false);
  assert.ok(ui.element('review-timeline').children.length >= 3);
  assert.equal(ui.element('results').hidden, false);
  assert.equal(ui.scene.hidden, true, 'results replace the scene on a laptop');
  assert.match(ui.element('result-message').textContent, /Outstanding!|Great work!/);
});
test('a blocked main exit left alone runs out of time and the review says so', () => {
  const ui = setup({ random: 0 });
  practice(ui);
  ui.click('drill-btn');
  assert.equal(ui.value('state.blockedExit'), null);
  ui.play('drill');
  assert.equal(ui.value('lastRun.commands.length'), 0);
  assert.equal(ui.element('compare-form').hidden, true);
  assert.equal(ui.element('review-timeline').children[0].textContent, 'No actions taken.');
  assert.ok(ui.value('lastRun.result.remaining') > 0);
  assert.equal(ui.value('state.hazard'), 'B', 'random 0 gives hazard tick 100, whose crowd heads for Exit B');
  assert.equal(ui.element('result-message').textContent, 'Try again');
  assert.match(ui.element('task-copy').textContent, /Longest line: \d+ people at Exit B\./);
});
test('comparison replays the original exactly and changes only the chosen action', () => {
  const ui = setup();
  drillWithActions(ui);
  const recorded = ui.value('JSON.stringify(lastRun.result)');
  ui.element('compare-action').value = '1';
  ui.element('compare-time').value = '30';
  ui.element('compare-form').listeners.submit({ preventDefault() {} });
  assert.equal(ui.value('mode'), 'compare');
  assert.equal(ui.element('results').hidden, true);
  assert.equal(ui.scene.hidden, false, 'the replay needs the scene');
  ui.play('compare');
  assert.equal(ui.value('mode'), 'review');
  assert.equal(JSON.stringify(ui.value('review.result(ghost)')), recorded);
  assert.equal(ui.value('state.commands.find(c => c.action === "open-exit").tick'), 300);
  const text = ui.element('compare-result').textContent;
  assert.match(text, /replayed exactly/);
  assert.match(text, /Everyone got out [\d.]+ s later|Both runs got the same number|fewer people out/);
  assert.ok(ui.value('state.commands.filter(c => c.action !== "calm").length') >= 3);
});
test('a finished drill is saved once with its scenario and the page address then reopens it', async () => {
  const ui = setup();
  drillWithActions(ui);
  await settle();
  assert.equal(ui.requests.length, 1);
  const [url, options] = ui.requests[0];
  assert.equal(url, '/api/runs');
  assert.equal(options.method, 'POST');
  assert.equal(options.body, ui.value('JSON.stringify({ id: lastRun.id, version: lastRun.version, blockedExit: "C", hazardTick: 140, commands: lastRun.commands, result: lastRun.result })'));
  assert.deepEqual(ui.urls, [`?run=${ui.value('lastRun.id')}`]);
  assert.match(ui.element('save-status').textContent, /^Saved\./);
});
test('a failed save says so and keeps the review usable', async () => {
  const refused = setup({ fetch: async () => ({ ok: false, status: 503, json: async () => ({ error: 'Saving is not set up on this server.' }) }) });
  drillWithActions(refused);
  await settle();
  assert.equal(refused.element('save-status').textContent, 'Not saved. Saving is not set up on this server.');
  assert.deepEqual(refused.urls, []);
  assert.equal(refused.element('compare-form').hidden, false);
  // A browser's fetch rejects with its own realm's TypeError, so build it inside the page context.
  const offline = setup({ fetch: async () => { throw vm.runInContext("new TypeError('Failed to fetch')", offline.context); } });
  drillWithActions(offline);
  await settle();
  assert.equal(offline.element('save-status').textContent, 'Not saved. The server could not be reached.');
});
test('a saved link opens the review in its scenario and its replay reproduces the saved result', async () => {
  const commands = [{ tick: 0, action: 'clear-hazard', target: 'A' }, { tick: sim.CLEAR_DURATION, action: 'open-exit', target: 'A' }, { tick: 45, action: 'redirect', target: 'C' }];
  const state = sim.createState({ blockedExit: 'A' });
  while (!sim.isDone(state)) sim.step(state, commands);
  const saved = { id: '0b9f6c1e-4a57-4d7e-9a8b-2f1c3d4e5f60', version: sim.VERSION, blockedExit: 'A', commands, result: review.result(state) };
  const ui = setup({ search: `?run=${saved.id}`, fetch: async () => ({ ok: true, json: async () => saved }) });
  await settle();
  assert.equal(ui.requests[0][0], `/api/runs/${saved.id}`);
  assert.equal(ui.value('mode'), 'review');
  assert.equal(ui.value('lastRun.initial.blockedExit'), 'A');
  assert.equal(ui.element('review-timeline').children.length, 3);
  assert.equal(ui.value('state.tick'), state.tick);
  assert.equal(ui.element('evacuated').textContent, `People out: ${saved.result.evacuated} / ${state.people.length}`);
  assert.equal(ui.element('timer').textContent, `Time left: ${Math.ceil(sim.stats(state).seconds)} s`);
  const score = review.score(sim.stats(state), state.open);
  assert.equal(ui.element('result-time').textContent, `${score.seconds} seconds`);
  assert.equal(ui.element('result-score').textContent, String(score.score));
  assert.equal(ui.element('result-exits').textContent, String(score.exits));
  assert.equal(ui.element('results').hidden, false);
  assert.equal(ui.scene.hidden, true);
  assert.equal(ui.value('lastRun.initial.tick'), 0, 'comparison retains the starting snapshot');
  ui.element('compare-action').value = '2';
  ui.element('compare-time').value = '20';
  ui.element('compare-form').listeners.submit({ preventDefault() {} });
  ui.play('compare');
  assert.match(ui.element('compare-result').textContent, /replayed exactly/);
  assert.equal(ui.requests.length, 1, 'reopening does not save a second copy');
});
test('a missing saved run is reported on the start screen', async () => {
  const ui = setup({ search: '?run=nope', fetch: async () => ({ ok: false, status: 404, json: async () => ({ error: 'No saved drill matches this link.' }) }) });
  await settle();
  assert.equal(ui.element('load-status').textContent, 'Could not open the saved drill. No saved drill matches this link.');
  assert.equal(ui.value('mode'), 'intro');
});
test('restarting during clearing removes pending work and resets the visible blockage', () => {
  const ui = setup();
  practice(ui); ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  const hazard = ui.value('state.hazard');
  ui.click(`clear-hazard-${hazard.toLowerCase()}`);
  assert.ok(ui.value('state.clearingUntil') > ui.value('state.tick'));
  ui.click('stop-btn');
  assert.equal(ui.value('state.clearingUntil'), null);
  assert.equal(ui.value('state.hazard'), null);
  assert.equal(ui.element('hazard-marker').getAttribute('visible'), false);
  assert.equal(ui.value('state.commands.length'), 0);
});
test('clicking the doors plays practice and handles a hazard through the same buttons', () => {
  const ui = setup();
  const door = exit => ui.element(`door-target-${exit.toLowerCase()}`).listeners.click();
  ui.click('start-btn');
  assert.equal(ui.element('exit-b').getAttribute('stadium-door').state, 'closed');
  door('A');
  assert.equal(ui.value('practiceStep'), 0, 'practice only uses Exit B');
  door('B');
  assert.equal(ui.value('state.open.B'), true);
  assert.equal(ui.element('exit-b').getAttribute('stadium-door').state, 'open');
  door('B');
  assert.equal(ui.value('practiceStep'), 2, 'second click on the open door redirects people there');
  ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  const hazard = ui.value('state.hazard');
  const visual = ui.element(`exit-${hazard.toLowerCase()}`);
  assert.equal(visual.getAttribute('stadium-door').state, 'blocked');
  assert.equal(ui.element('hazard-marker').getAttribute('visible'), true);
  assert.equal(ui.element('hazard-smoke').getAttribute('visible'), true);
  door(hazard);
  assert.equal(ui.value('state.hazard'), hazard, 'first click starts clearing');
  assert.equal(ui.element(`clear-hazard-${hazard.toLowerCase()}`).disabled, true);
  assert.equal(ui.element('hazard-marker').getAttribute('visible'), true);
  assert.match(ui.element('hazard-label').getAttribute('value'), /^CLEARING/);
  const deadline = ui.value('state.clearingUntil');
  door(hazard);
  assert.equal(ui.value('state.clearingUntil'), deadline, 'another click cannot restart clearing');
  ui.playTicks(deadline);
  assert.equal(ui.value('state.hazard'), null, 'equipment clears when the timer finishes');
  assert.equal(visual.getAttribute('stadium-door').state, 'closed', 'clearing equipment leaves the physical door closed');
  assert.equal(ui.element('hazard-marker').getAttribute('visible'), false);
  assert.equal(ui.element('hazard-smoke').getAttribute('visible'), false);
  door(hazard);
  assert.equal(ui.value(`state.open.${hazard}`), true, 'second click reopens the door');
  assert.equal(visual.getAttribute('stadium-door').state, 'open');
  door(ui.value(`['A','B','C'].find(e => e !== '${hazard}')`));
  assert.equal(ui.value('state.commands.at(-1).action'), 'redirect');
  const commands = ui.value('state.commands.length');
  door(ui.value(`['A','B','C'].find(e => e !== '${hazard}')`));
  assert.equal(ui.value('state.commands.length'), commands, 'redirect cooldown also applies to door clicks');
});
test('the hazard sounds an alarm and both it and redirects are announced, unless sound is off', () => {
  const ui = setup();
  practice(ui);
  assert.deepEqual(ui.spoken, ['Attention please. Proceed to Exit B.']);
  ui.click('drill-btn');
  assert.equal(ui.spoken.at(-1), 'Attention. This is an evacuation drill. Please follow staff directions to the nearest open exit.');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  const hazard = ui.value('state.hazard');
  assert.equal(ui.tones(), 6, 'six alarm tones');
  assert.equal(ui.spoken.at(-1), `Attention. Exit ${hazard} is blocked. Staff, respond now.`);
  ui.click('sound-btn');
  assert.equal(ui.element('sound-btn').textContent, 'Sound: off');
  ui.click(`clear-hazard-${hazard.toLowerCase()}`);
  ui.playTicks(ui.value('state.clearingUntil')); ui.click(`open-exit-${hazard.toLowerCase()}`);
  const target = ['A','B','C'].find(exit => exit !== hazard);
  ui.click(`redirect-${target.toLowerCase()}`);
  assert.equal(ui.spoken.length, 3, 'nothing more is spoken with sound off');
  assert.equal(ui.element('pa-caption').textContent, `PA: Attention please. Proceed to Exit ${target}.`, 'captions continue with sound off');
});
test('generated ElevenLabs clips play instead of the browser voice, with the browser voice for missing ones', () => {
  const ui = setup({ clips: ['redirect-B'] });
  practice(ui);
  assert.deepEqual(ui.played, ['/audio/redirect-B.mp3']);
  assert.deepEqual(ui.spoken, [], 'the clip replaces the browser voice');
  ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  assert.equal(ui.spoken.at(-1), `Attention. Exit ${ui.value('state.hazard')} is blocked. Staff, respond now.`, 'no clip for this line, so the browser voice reads it');
});
test('generated alarm and crowd ambience clips replace the synth beeps and run only during the drill', () => {
  const ui = setup({ clips: ['alarm', 'ambience'] });
  practice(ui);
  assert.equal(ui.played.filter(src => src === '/audio/ambience.mp3').length, 0, 'no crowd noise during practice');
  ui.click('drill-btn');
  assert.ok(ui.played.includes('/audio/ambience.mp3'), 'crowd noise starts with the drill');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  assert.ok(ui.played.includes('/audio/alarm.mp3'));
  assert.equal(ui.tones(), 0, 'the alarm clip replaces the synth beeps');
  ui.play('drill');
  assert.equal(ui.played.at(-1), 'paused /audio/ambience.mp3', 'crowd noise stops when the drill ends');
});
test('breathing from the local sensor shows during play and the review compares practice with the drill', async () => {
  let reading = { available: true, rate: 14, confidence: 90, stable: true, hint: '' };
  const ui = setup({ fetch: async url => ({ ok: true, json: async () => (url === '/api/breathing' ? reading : {}) }) });
  const poll = () => ui.value('pollBreathing()');
  ui.click('start-btn');
  await poll();
  assert.equal(ui.element('breathing').hidden, false);
  assert.equal(ui.element('breathing').textContent, 'Breathing: 14 /min');
  reading = { available: true, rate: 30, confidence: 20, stable: false, hint: '' };
  await poll();
  assert.equal(ui.element('breathing').textContent, 'Breathing: measuring (about 30 s)', 'low confidence only shows progress');
  ui.click('open-exit-b'); ui.click('redirect-b'); ui.click('drill-btn');
  reading = { available: true, rate: 20, confidence: 75, stable: true, hint: '' };
  await poll(); await poll();
  ui.play('drill');
  assert.equal(ui.element('breathing-review').hidden, false);
  assert.equal(ui.element('breathing-review').textContent, 'Breathing (Presage): 14 /min in practice, 20 /min during the drill.');
  assert.equal(ui.element('vitals-card').hidden, false);
});
test('without a breathing sensor nothing about breathing is shown', async () => {
  const ui = setup({ fetch: async url => ({ ok: true, json: async () => (url === '/api/breathing' ? { available: false } : {}) }) });
  ui.click('start-btn');
  await ui.value('pollBreathing()');
  assert.equal(ui.element('breathing').hidden, true);
  practice(ui); ui.click('drill-btn'); ui.play('drill');
  assert.equal(ui.element('breathing-review').hidden, true);
  assert.equal(ui.element('vitals-card').hidden, true);
});


test('immersive hazard requires two selections and then a separate open action', () => {
  const ui = setup();
  practice(ui); ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  ui.value('laptopPose = {}');
  const exit = ui.value('state.hazard');
  const select = timeStamp => ui.value('pressDoor')(exit, { timeStamp });
  select(1000);
  assert.equal(ui.value('state.hazard'), exit, 'one selection must not clear');
  select(1250);
  assert.equal(ui.value('state.hazard'), exit, 'two selections start clearing');
  assert.ok(ui.value('state.clearingUntil') > ui.value('state.tick'));
  select(1400);
  assert.equal(ui.value(`state.open.${exit}`), false, 'cannot reopen during clearing');
  ui.playTicks(ui.value('state.clearingUntil'));
  assert.equal(ui.value('state.hazard'), null);
  assert.equal(ui.value(`state.open.${exit}`), false);
  select(6000);
  assert.equal(ui.value(`state.open.${exit}`), true);
});
test('immersive action panel contains drill navigation and reassure, not overlapping exit buttons', () => {
  const ui = setup();
  ui.value('createVrButtons()');
  assert.equal(ui.value('vrButtons.length'), 3);
  assert.ok(ui.value('vrButtons.some(b => b.source === document.getElementById("reassure-btn"))'));
});

test('immersive score can expand and collapse after the drill and resets for practice', () => {
  const ui = setup(); drillWithActions(ui);
  ui.value('laptopPose = {}');
  ui.click('vr-score-toggle');
  assert.equal(ui.value('scoreExpanded'), true);
  ui.click('vr-score-toggle');
  assert.equal(ui.value('scoreExpanded'), false);
  ui.click('vr-score-toggle');
  ui.click('stop-btn');
  assert.equal(ui.value('scoreExpanded'), false);
  ui.click('vr-score-toggle');
  assert.equal(ui.value('scoreExpanded'), false, 'no stale score opens during practice');
});

function savedRecord(commands = []) {
  const state = sim.createState({ hazardTick: 100 });
  while (!sim.isDone(state)) sim.step(state, commands);
  return { version: sim.VERSION, blockedExit: state.blockedExit, hazardTick: 100, commands: state.commands, result: review.result(state) };
}

test('A-Frame ticks advance visible XR while Window callbacks and the document are suspended', () => {
  const ui = setup();
  practice(ui); ui.click('drill-btn');
  ui.scene.xrSession = { visibilityState: 'visible' };
  ui.scene.listeners['enter-vr']();
  ui.context.document.hidden = true;
  ui.componentTick(0); ui.componentTick(1000);
  assert.ok(ui.value('state.tick') > 0);
  assert.equal(ui.callbacks.some(callback => callback.name === 'frame'), false, 'no Window simulation loop');
  const tick = ui.value('state.tick');
  ui.scene.xrSession.visibilityState = 'hidden';
  ui.componentTick(2000); ui.componentTick(3000);
  assert.equal(ui.value('state.tick'), tick);
  ui.scene.xrSession.visibilityState = 'visible';
  ui.componentTick(5000);
  assert.equal(ui.value('state.tick'), tick, 'resuming discards time spent hidden');
  ui.componentTick(5250);
  assert.ok(ui.value('state.tick') > tick);
});

test('hidden laptop scenes stop components and rendering, then restore the existing loop for comparison', () => {
  const ui = setup({ renderStarted: false });
  assert.equal(ui.scene.hidden, true, 'intro hides the scene before render startup');
  ui.scene.renderStarted = true;
  ui.scene.isPlaying = true;
  ui.scene.renderer.setAnimationLoop(ui.scene.render);
  ui.scene.listeners.renderstart();
  assert.equal(ui.scene.isPlaying, false);
  assert.equal(ui.scene.renderer.loop, null);
  drillWithActions(ui);
  const tick = ui.value('state.tick');
  ui.componentTick(100000);
  assert.equal(ui.value('state.tick'), tick);
  assert.equal(ui.scene.isPlaying, false);
  assert.equal(ui.scene.renderer.loop, null);
  ui.value('compare(0, 20)');
  assert.equal(ui.scene.isPlaying, true);
  assert.equal(ui.scene.renderer.loop, ui.scene.render);
  ui.playTicks(2);
});

test('XR keeps rendering results and exiting XR restores the hidden laptop results state', () => {
  const ui = setup();
  practice(ui); ui.click('drill-btn');
  ui.scene.xrSession = { visibilityState: 'visible' };
  ui.scene.listeners['enter-vr']();
  ui.play('drill');
  assert.equal(ui.element('results').hidden, false);
  assert.equal(ui.scene.hidden, false);
  assert.equal(ui.scene.isPlaying, true);
  assert.equal(ui.scene.renderer.loop, ui.scene.render);
  ui.scene.xrSession = null;
  ui.scene.listeners['exit-vr']();
  assert.equal(ui.scene.hidden, true);
  assert.equal(ui.scene.isPlaying, false);
  assert.equal(ui.scene.renderer.loop, null);
});

test('walking survives same-tick refresh and action but stationary ticks and new states return to idle', () => {
  const ui = setup(); practice(ui);
  ui.componentTick(0); ui.componentTick(250);
  assert.equal(ui.value('figures.some(item => item.model.moving)'), true);
  const moving = ui.value('figures.map(item => item.model.moving).join()');
  ui.value('refresh()'); ui.value('refresh()');
  assert.equal(ui.value('figures.map(item => item.model.moving).join()'), moving);
  ui.value('state.tick++; refresh()');
  assert.equal(ui.value('figures.some(item => item.model.moving)'), false, 'unchanged positions at a new tick are idle');
  ui.click('drill-btn');
  ui.componentTick(500); ui.componentTick(750);
  const walking = ui.value('figures.map(item => item.model.moving).join()');
  ui.click('redirect-b');
  assert.equal(ui.value('figures.map(item => item.model.moving).join()'), walking, 'action refresh preserves movement');
  ui.click('stop-btn');
  assert.equal(ui.value('figures.some(item => item.model.moving)'), false, 'a new state has no previous movement');
});

test('saved zero-action links restore the final HUD and results without offering comparison', async () => {
  const saved = savedRecord();
  const ui = setup({ search: '?run=zero', fetch: async () => ({ ok: true, json: async () => saved }) });
  await settle();
  assert.equal(ui.value('state.tick'), saved.result.ticks);
  assert.equal(ui.element('evacuated').textContent, `People out: ${saved.result.evacuated} / ${sim.POPULATION}`);
  assert.equal(ui.element('timer').textContent, 'Time left: 0 s');
  assert.equal(ui.element('result-score').textContent, String(saved.result.evacuated));
  assert.equal(ui.element('results').hidden, false);
  assert.equal(ui.element('compare-form').hidden, true);
  assert.equal(ui.requests.length, 1);
});

test('saved results and accepted commands must match before a link is presented as reopened', async () => {
  for (const corrupt of [saved => saved.result.evacuated++, saved => saved.commands.push({ tick: 0, action: 'open-exit', target: 'A' })]) {
    const saved = savedRecord(); corrupt(saved);
    const ui = setup({ search: '?run=bad', fetch: async () => ({ ok: true, json: async () => saved }) });
    await settle();
    assert.equal(ui.value('lastRun'), null);
    assert.match(ui.element('load-status').textContent, /Could not open/);
    assert.equal(ui.element('results').hidden, true);
  }
});

test('a new drill invalidates pending saved-link successes and failures', async () => {
  for (const fail of [false, true]) {
    let resolve;
    const response = new Promise(done => { resolve = done; });
    const ui = setup({ search: '?run=slow', fetch: () => response });
    practice(ui); ui.click('drill-btn'); ui.click('redirect-b');
    const state = ui.value('state');
    const status = ui.element('load-status').textContent;
    resolve({ ok: !fail, status: 404, json: async () => fail ? { error: 'Gone' } : savedRecord() });
    await settle();
    assert.equal(ui.value('state'), state);
    assert.equal(ui.value('mode'), 'drill');
    assert.equal(ui.value('state.commands.length'), 1);
    assert.equal(ui.element('load-status').textContent, status, 'stale error and success leave status alone');
  }
});

test('mute and restart pause and rewind every cached clip and cancel scheduled alarm oscillators', () => {
  const ui = setup({ clips: ['alarm', 'ambience', 'drill-start'] });
  practice(ui); ui.click('drill-btn'); ui.playTicks(ui.value('state.hazardTick') + 1);
  ui.audioClips.forEach(clip => { clip.currentTime = 2; });
  ui.click('sound-btn');
  assert.ok(ui.audioClips.every(clip => clip.paused && clip.currentTime === 0));
  ui.click('sound-btn');
  ui.value('alarm(); announce("drill-start")');
  ui.click('stop-btn');
  assert.ok(ui.audioClips.every(clip => clip.paused && clip.currentTime === 0));
  const synth = setup(); practice(synth); synth.click('drill-btn');
  synth.playTicks(synth.value('state.hazardTick') + 1);
  assert.equal(synth.oscillators.length, 6);
  const cancels = synth.canceled();
  synth.click('sound-btn');
  assert.ok(synth.oscillators.every(tone => tone.stops.includes(undefined)), 'scheduled tones are canceled immediately');
  assert.ok(synth.canceled() > cancels);
});

test('rejected playback cannot revive speech or beeps after mute-unmute, restart, or a newer announcement', async () => {
  const pending = [];
  const ui = setup({ clips: ['alarm', 'redirect-A', 'redirect-B'], playback: src => new Promise((resolve, reject) => pending.push({ src, reject })) });
  ui.click('start-btn');
  ui.value('announce("redirect-A"); alarm()');
  ui.click('sound-btn'); ui.click('sound-btn');
  pending.splice(0).forEach(item => item.reject(new Error('no audio')));
  await settle();
  assert.deepEqual(ui.spoken, []);
  assert.equal(ui.tones(), 0);
  ui.value('announce("redirect-A"); announce("redirect-B"); announce("redirect-A")');
  pending[0].reject(new Error('obsolete A')); pending[1].reject(new Error('obsolete B'));
  await settle();
  assert.deepEqual(ui.spoken, [], 'cached A identity cannot revive its first announcement');
  pending[2].reject(new Error('current A'));
  await settle();
  assert.deepEqual(ui.spoken, ['Attention please. Proceed to Exit A.']);
  ui.value('announce("redirect-B"); alarm()');
  const canceled = ui.canceled();
  ui.click('stop-btn');
  assert.ok(ui.canceled() > canceled, 'restart cancels synthesized speech too');
  pending.slice(3).forEach(item => item.reject(new Error('old session')));
  await settle();
  assert.equal(ui.spoken.length, 1);
  assert.equal(ui.tones(), 0);
});

test('headset mirrors actual captions with sound off and only visible breathing text', async () => {
  let reading = { available: false };
  const ui = setup({ fetch: async () => ({ ok: true, json: async () => reading }) });
  ui.click('start-btn');
  ui.scene.xrSession = { visibilityState: 'visible' }; ui.scene.listeners['enter-vr']();
  ui.click('sound-btn'); ui.click('open-exit-b'); ui.click('redirect-b');
  assert.ok(ui.element('vr-text').getAttribute('value').includes(ui.element('pa-caption').textContent));
  await ui.value('pollBreathing()');
  assert.doesNotMatch(ui.element('vr-text').getAttribute('value'), /Breathing:/);
  reading = { available: true, rate: 18, confidence: 85 };
  await ui.value('pollBreathing()');
  assert.match(ui.element('vr-text').getAttribute('value'), /Breathing: 18 \/min/);
  reading = { available: true, rate: null, confidence: 0, hint: 'Face not visible' };
  await ui.value('pollBreathing()');
  assert.match(ui.element('vr-text').getAttribute('value'), /Breathing: Face not visible/);
  assert.equal(ui.value('breathingLog.practice.length'), 1, 'invalid sample is not averaged');
  reading = { available: true, rate: 40, confidence: 20 };
  await ui.value('pollBreathing()');
  assert.equal(ui.value('breathingLog.practice.length'), 1, 'low confidence is not averaged');
});

test('immersive PA captions stay silent while laptop still speaks', () => {
  const ui = setup({ clips: ['redirect-A'] });
  practice(ui);
  const spokenBefore = ui.spoken.length;
  const playedBefore = ui.played.length;
  ui.value('laptopPose = {}');
  ui.value('announce("redirect-A")');
  assert.equal(ui.spoken.length, spokenBefore);
  assert.equal(ui.played.length, playedBefore);
  assert.match(ui.element('pa-caption').textContent, /Proceed to Exit A/);
  ui.value('laptopPose = null');
  ui.value('announce("redirect-B")');
  assert.equal(ui.spoken.at(-1), 'Attention please. Proceed to Exit B.');
});

test('headset practice copy points at Exit B and reassure calms a panicker', () => {
  const ui = setup();
  ui.click('start-btn');
  ui.scene.xrSession = { visibilityState: 'visible' }; ui.scene.listeners['enter-vr']();
  assert.match(ui.element('vr-text').getAttribute('value'), /STEP 1 OF 2/);
  assert.match(ui.element('vr-text').getAttribute('value'), /Point at Exit B/);
  ui.click('open-exit-b');
  assert.match(ui.element('vr-text').getAttribute('value'), /STEP 2 OF 2/);
  assert.match(ui.element('vr-text').getAttribute('value'), /send people/);
  ui.click('redirect-b');
  assert.match(ui.element('vr-text').getAttribute('value'), /PRACTICE DONE/);
  ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  assert.match(ui.element('vr-text').getAttribute('value'), /Orange rings|panicking/i);
  assert.match(ui.element('vr-text').getAttribute('value'), /SECOND DRILL|Help people|BLOCKED/i);
  const id = ui.value('state.people.find(p => p.panic).id');
  ui.value(`selectPerson(${id})`);
  assert.match(ui.element('feedback').textContent, new RegExp(`Reassure ${id}`));
  let clock = 80_000;
  for (let i = 0; i < 20 && ui.value(`state.people[${id}].panic`); i++) {
    ui.click('reassure-btn');
    ui.componentTick(clock += 250);
  }
  assert.equal(ui.value(`state.people[${id}].panic`), false);
  assert.ok(ui.value('state.commands.some(c => c.action === "calm")'));
});

test('headset results text includes score fields after the drill', () => {
  const ui = setup();
  drillWithActions(ui);
  ui.value('laptopPose = {}');
  ui.value('scoreExpanded = true');
  ui.value('syncHeadset()');
  const panel = ui.element('vr-score-text').getAttribute('value');
  assert.match(panel, /Score:/);
  assert.match(panel, /Calmed:/);
  assert.match(panel, /Still panicking:/);
  assert.match(panel, /Actions:/);
  assert.match(panel, /Clear hazard|Open door|Redirect crowd|Reassure guest/);
  assert.match(ui.element('vr-text').getAttribute('value'), /Drill complete|People out/);
  assert.equal(ui.element('result-outcome').textContent, ui.value('review.outcome(lastRun.result)'));
});

test('headset score panel mirrors Presage vitals from the laptop review', async () => {
  let reading = { available: true, rate: 16, confidence: 90, stable: true, hint: '' };
  const ui = setup({ fetch: async url => ({ ok: true, json: async () => (url === '/api/breathing' ? reading : {}) }) });
  ui.click('start-btn');
  await ui.value('pollBreathing()');
  ui.click('open-exit-b'); ui.click('redirect-b'); ui.click('drill-btn');
  reading = { available: true, rate: 18, confidence: 80, stable: true, hint: '' };
  await ui.value('pollBreathing()');
  ui.play('drill');
  ui.value('laptopPose = {}');
  ui.value('scoreExpanded = true');
  ui.value('syncHeadset()');
  const vitals = 'Breathing (Presage): 16 /min in practice, 18 /min during the drill.';
  assert.equal(ui.element('breathing-review').textContent, vitals);
  assert.match(ui.element('vr-score-text').getAttribute('value'), /Breathing \(Presage\): 16 \/min in practice, 18 \/min during the drill/);
  assert.match(ui.element('vr-text').getAttribute('value'), /Breathing \(Presage\)/);
});
