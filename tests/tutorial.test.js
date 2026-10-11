const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const sim = require('../public/simulation');
const review = require('../public/review');
// random picks the drill's blocked exit: 0 → A, 0.4 → B, 0.9 → C.
function setup({ search = '', fetch = async () => ({ ok: true, json: async () => ({}) }), random = 0.4, clips } = {}) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      style: {}, hidden: id === 'drill-btn', disabled: false, textContent: '', value: '',
      listeners: {}, classList: { toggle() {}, add() {} }, children: [],
      closest() { return this.hidden ? this : null; },
      click() { if (!this.disabled) this.listeners.click?.(); },
      setAttribute() {}, append() {}, replaceChildren(...items) { this.children = items; },
      addEventListener(event, listener) { this.listeners[event] = listener; }
    });
    return elements.get(id);
  }
  const scene = element('scene'); scene.hasLoaded = true;
  const requests = [];
  const urls = [];
  const spoken = [];
  const played = [];
  let tones = 0;
  const node = { connect: next => next || node, gain: { setValueAtTime() {} }, frequency: {}, start() { tones++; }, stop() {} };
  const context = vm.createContext({
    window: { CrowdSimulation: sim, CrowdReview: review, CrowdAnnouncements: require('../public/announcements'), CrowdAudioClips: clips, dispatchEvent() {},
      Audio: class { constructor(src) { this.src = src; } play() { played.push(this.src); return Promise.resolve(); } pause() { played.push(`paused ${this.src}`); } },
      speechSynthesis: { cancel() {}, speak: u => spoken.push(u.text) }, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
      AudioContext: class { currentTime = 0; destination = {}; resume() {} createOscillator() { return { ...node }; } createGain() { return node; } } },
    document: { hidden: false, getElementById: element, querySelector: () => scene,
      createElement: () => element(Symbol()) },
    requestAnimationFrame() {}, Event: class {},
    fetch: (...args) => { requests.push(args); return fetch(...args); },
    crypto: { randomUUID: () => '0b9f6c1e-4a57-4d7e-9a8b-2f1c3d4e5f60' },
    location: { search }, URLSearchParams, history: { replaceState: (...args) => { urls.push(args[2]); } }
  });
  vm.runInContext(`Math.random = () => ${random};`, context);
  vm.runInContext(fs.readFileSync('public/game.js', 'utf8'), context);
  const value = expression => vm.runInContext(expression, context);
  let clock = 0;
  return { element, context, value, requests, urls, scene, spoken, played, tones: () => tones, click: id => element(id).listeners.click(),
    play: whileMode => { while (value('mode') === whileMode) value('frame')(clock += 250); },
    playTicks: ticks => { while (value('state.tick') < ticks) value('frame')(clock += 250); } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
function practice(ui) {
  ui.click('start-btn'); ui.click('open-exit-b'); ui.click('redirect-b');
}
// Exit B is blocked (default random): clear and open it at 0 s, redirect to it at 5 s.
function drillWithActions(ui) {
  practice(ui);
  ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  const exit = ui.value('state.hazard').toLowerCase();
  ui.click(`clear-hazard-${exit}`); ui.click(`open-exit-${exit}`);
  ui.playTicks(200); ui.click('redirect-b');
  ui.play('drill');
}
test('practice waits indefinitely for its task and rejected redirect cannot advance it', () => {
  const ui = setup(); ui.click('start-btn');
  vm.runInContext('frame(0); frame(30000);', ui.context);
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.value('state.tick'), 0);
  ui.click('redirect-b');
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.element('drill-btn').hidden, true);
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
  assert.equal(run.commands.map(c => `${c.action}-${c.target}`).join(), 'clear-hazard-C,open-exit-C,redirect-B');
  assert.ok(run.commands[0].tick >= 140);
  assert.ok(run.commands[2].tick >= 50);
  assert.equal(run.result.remaining, 0);
  assert.equal(ui.element('review').hidden, false);
  assert.equal(ui.element('actions').hidden, true);
  assert.equal(ui.element('compare-form').hidden, false);
  assert.equal(ui.element('review-timeline').children.length, 3);
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
  assert.equal(ui.element('review-timeline').children[0].textContent, 'No actions taken during the drill.');
  assert.ok(ui.value('lastRun.result.remaining') > 0);
  assert.equal(ui.value('state.hazard'), 'B', 'random 0 gives hazard tick 100, whose crowd heads for Exit B');
  assert.equal(ui.element('result-message').textContent, 'Keep building your skills!');
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
  assert.match(text, /cleared the venue [\d.]+ s later/);
  assert.equal(ui.value('state.commands.length'), 3);
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
  const commands = [{ tick: 0, action: 'clear-hazard', target: 'A' }, { tick: 0, action: 'open-exit', target: 'A' }, { tick: 45, action: 'redirect', target: 'C' }];
  const state = sim.createState({ blockedExit: 'A' });
  while (!sim.isDone(state)) sim.step(state, commands);
  const saved = { id: '0b9f6c1e-4a57-4d7e-9a8b-2f1c3d4e5f60', version: sim.VERSION, blockedExit: 'A', commands, result: review.result(state) };
  const ui = setup({ search: `?run=${saved.id}`, fetch: async () => ({ ok: true, json: async () => saved }) });
  await settle();
  assert.equal(ui.requests[0][0], `/api/runs/${saved.id}`);
  assert.equal(ui.value('mode'), 'review');
  assert.equal(ui.value('lastRun.initial.blockedExit'), 'A');
  assert.equal(ui.element('review-timeline').children.length, 3);
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
test('clicking the doors plays practice and handles a hazard through the same buttons', () => {
  const ui = setup();
  const door = exit => ui.element(`door-target-${exit.toLowerCase()}`).listeners.click();
  ui.click('start-btn');
  door('A');
  assert.equal(ui.value('practiceStep'), 0, 'practice only uses Exit B');
  door('B');
  assert.equal(ui.value('state.open.B'), true);
  door('B');
  assert.equal(ui.value('practiceStep'), 2, 'second click on the open door redirects people there');
  ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  const hazard = ui.value('state.hazard');
  door(hazard);
  assert.equal(ui.value('state.hazard'), null, 'first click clears the hazard');
  door(hazard);
  assert.equal(ui.value(`state.open.${hazard}`), true, 'second click reopens the door');
  door(hazard);
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
  ui.click(`clear-hazard-${hazard.toLowerCase()}`); ui.click(`open-exit-${hazard.toLowerCase()}`);
  ui.click(`redirect-${hazard.toLowerCase()}`);
  assert.equal(ui.spoken.length, 3, 'nothing more is spoken with sound off');
  assert.equal(ui.element('pa-caption').textContent, `PA: Attention please. Proceed to Exit ${hazard}.`, 'captions continue with sound off');
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
  assert.equal(ui.element('breathing-review').textContent, 'Breathing (laptop camera): 14 /min in practice, 20 /min during the drill.');
});
test('without a breathing sensor nothing about breathing is shown', async () => {
  const ui = setup({ fetch: async url => ({ ok: true, json: async () => (url === '/api/breathing' ? { available: false } : {}) }) });
  ui.click('start-btn');
  await ui.value('pollBreathing()');
  assert.equal(ui.element('breathing').hidden, true);
  practice(ui); ui.click('drill-btn'); ui.play('drill');
  assert.equal(ui.element('breathing-review').hidden, true);
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
  assert.equal(ui.value('state.hazard'), null);
  assert.equal(ui.value(`state.open.${exit}`), false);
  select(2000);
  assert.equal(ui.value(`state.open.${exit}`), true);
});
test('immersive action panel contains only drill navigation, not overlapping exit buttons', () => {
  const ui = setup();
  ui.value('createVrButtons()');
  assert.equal(ui.value('vrButtons.length'), 2);
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
