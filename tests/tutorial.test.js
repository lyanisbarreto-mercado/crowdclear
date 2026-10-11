const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const sim = require('../public/simulation');
const review = require('../public/review');
const ALL_CLIPS = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '../public/audio/clips.js'), 'utf8').match(/\[[\s\S]*\]/)[0]);
// random picks the drill's blocked exit: 0 → A, 0.4 → B, 0.9 → C.
function setup({ search = '', fetch = async () => ({ ok: true, json: async () => ({}) }), random = 0.4, clips = ALL_CLIPS, playback = () => Promise.resolve(), renderStarted = true } = {}) {
  const elements = new Map();
  const components = {};
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      style: {},
      // Match index.html hidden defaults so failed loads do not look like an open results card.
      hidden: typeof id === 'string' && /^(drill-btn|reassure-btn|results|review|vr-btn|breathing|result-vitals|result-peak|compare-form|clear-hazard-|check-|actions)/.test(id),
      disabled: false, _textContent: '', value: '',
      get textContent() { return this.children.length ? this.children.map(child => child.textContent).join('') : this._textContent; },
      set textContent(value) { this._textContent = value; this.children = []; },
      listeners: {}, attributes: {}, classList: { values: new Set(), toggle() {}, add(...names) { names.forEach(name => this.values.add(name)); }, remove(...names) { names.forEach(name => this.values.delete(name)); }, contains(name) { return this.values.has(name); } }, children: [],
      closest() { return this.hidden ? this : null; },
      click() { if (!this.disabled) this.listeners.click?.(); },
      setAttribute(name, key, value) {
        this.attributes[name] = arguments.length === 3 ? { ...this.attributes[name], [key]: value } : key;
        if (components[name]) this.components[name] = { ...components[name], el: this };
      },
      getAttribute(name) { return this.attributes[name]; },
      removeAttribute(name) { delete this.attributes[name]; },
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
  const storage = new Map();
  const context = vm.createContext({
    window: { CrowdSimulation: sim, CrowdReview: review, CrowdAnnouncements: require('../public/announcements'), CrowdAudioClips: clips, dispatchEvent() {},
      AFRAME: { registerComponent(name, definition) { components[name] = definition; } },
      Audio: class { constructor(src) { this.src = src; this.currentTime = 0; this.paused = true; audioClips.push(this); } play() { played.push(this.src); this.paused = false; return playback(this.src); } pause() { this.paused = true; played.push(`paused ${this.src}`); } },
      speechSynthesis: { cancel() { canceled++; }, speak: u => spoken.push(u.text) }, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
      AudioContext: class { currentTime = 0; destination = {}; resume() {} createOscillator() { const tone = { ...node, stops: [], stop(at) { this.stops.push(at); } }; oscillators.push(tone); return tone; } createGain() { return node; } } },
    document: { hidden: false, getElementById: element, querySelector: () => scene,
      createElement: () => element(Symbol()), createTextNode: text => ({ textContent: text }) },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
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
  ui.value('fresh("drill", null, 140, 1)'); // Single-incident fixture for the original flow checks.
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
  // Second send spreads the backlog so the single-incident fixture still clears.
  ui.playTicks(ui.value('state.redirectReady'));
  if (!ui.element('redirect-a').disabled) ui.click('redirect-a');
  else if (!ui.element('redirect-c').disabled) ui.click('redirect-c');
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
  assert.match(ui.element('task-copy').textContent, /middle door, Exit B/);
  assert.ok(ui.element('task-copy').children.find(child => child.textContent === 'Open')?.classList.contains('word-open'));
  assert.equal(ui.element('floor-effects').getAttribute('visible'), false);
  ui.click('open-exit-b');
  assert.ok(ui.element('task-copy').children.find(child => child.textContent === 'Send people')?.classList.contains('word-send'));
  ui.click('redirect-b');
  ui.click('drill-btn');
  assert.equal(ui.element('step-label').textContent, `${sim.DURATION}-SECOND DRILL`);
  ui.playTicks(ui.value('state.hazardTick') + 1);
  const exit = ui.value('state.hazard').toLowerCase();
  assert.ok(ui.element('task-copy').children.find(child => /clear/i.test(child.textContent))?.classList.contains('word-clear'));
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
  assert.equal(ui.element('stop-btn').hidden, true, 'Restart hidden at PRACTICE DONE so Start drill is unambiguous');
  assert.equal(ui.value('state.redirectReady'), ui.value('state.tick'), 'practice Send cooldown clears so Exit A works');
  assert.equal(ui.element('redirect-a').disabled, false, 'Exit A send unlocks after PRACTICE DONE');
  assert.equal(ui.element('exit-b').getAttribute('stadium-door').guided, false, 'green guide leaves B after the tutorial steps');
  ui.element('door-target-a').listeners.click();
  assert.equal(ui.value('state.commands.at(-1).action'), 'redirect');
  assert.equal(ui.value('state.commands.at(-1).target'), 'A');
  assert.ok(ui.value('state.people.some(p => !p.evacuated && p.exit === "A")'));
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
test('practice highlights Exit B with a green guide ring until both steps are done', () => {
  const ui = setup(); ui.click('start-btn');
  assert.equal(ui.element('exit-b').getAttribute('stadium-door').guided, true);
  assert.equal(ui.element('exit-a').getAttribute('stadium-door').guided, false);
  ui.click('open-exit-b');
  assert.equal(ui.element('exit-b').getAttribute('stadium-door').guided, true, 'Send step still guides B');
  ui.click('redirect-b');
  assert.equal(ui.element('exit-b').getAttribute('stadium-door').guided, false);
});
test('practice advances through door clicks without a visible action button bank', () => {
  const ui = setup(); ui.click('start-btn');
  assert.equal(ui.element('actions').hidden, true);
  assert.equal(ui.value('practiceStep'), 0);
  ui.element('door-target-b').listeners.click();
  assert.equal(ui.value('practiceStep'), 1);
  ui.element('door-target-b').listeners.click();
  assert.equal(ui.value('practiceStep'), 2);
  ui.click('stop-btn');
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.element('actions').hidden, true);
});
test('a finished drill records only drill decisions and opens the review and results', () => {
  const ui = setup();
  drillWithActions(ui);
  const run = ui.value('lastRun');
  assert.equal(ui.value('mode'), 'review');
  assert.equal(run.version, sim.VERSION);
  assert.equal(JSON.stringify(run.initial), JSON.stringify(sim.createState({ blockedExit: 'C', hazardTick: 140, fixedIncidents: [{ tick: 140, exit: 'C' }] })));
  assert.equal(run.commands.filter(c => c.action !== 'calm').map(c => `${c.action}-${c.target}`).join(), 'clear-hazard-C,open-exit-C,redirect-B,redirect-A');
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
  assert.equal(ui.element('compare-form').hidden, false, 'time scrubber stays available even with no actions');
  assert.equal(ui.element('review-timeline').children[0].textContent, 'No actions taken.');
  assert.ok(ui.value('lastRun.result.remaining') > 0);
  assert.ok(ui.value('state.hazards.includes("B")'), 'the first blocked exit remains inaccessible');
  assert.equal(ui.element('result-message').textContent, 'Try again');
  assert.match(ui.element('result-peak').textContent, /Longest line: \d+ people at Exit B/);
  assert.match(ui.element('task-copy').textContent, /analysis|scrub|side-by-side/i);
  assert.match(ui.element('run-analysis').textContent, /people got out/i);
});
test('best-vs-current analysis shows immediately and the when-slider seeks the replay', () => {
  const ui = setup();
  drillWithActions(ui);
  assert.equal(ui.element('compare-result').hidden, false, 'analysis is available before replay');
  assert.match(ui.element('compare-result').textContent, /baseline|best|People out|Score/i);
  assert.equal(ui.element('compare-legend').hidden, false);
  assert.equal(ui.element('drill-btn').hidden, true, 'Try another drill waits until after play on laptop');
  assert.equal(ui.element('stop-btn').hidden, true, 'Restart stays hidden on review');
  ui.element('compare-when').value = '30';
  ui.element('compare-when').listeners.input();
  assert.equal(ui.value('mode'), 'compare');
  assert.equal(ui.value('comparePlaying'), false, 'scrubbing pauses playback');
  assert.equal(ui.element('results').hidden, true);
  assert.equal(ui.scene.hidden, false, 'the replay needs the scene');
  assert.ok(ui.value('state.tick') >= 300);
  ui.element('compare-form').listeners.submit({ preventDefault() {} });
  assert.equal(ui.value('comparePlaying'), true);
  ui.play('compare');
  assert.equal(ui.value('mode'), 'review');
  assert.ok(ui.value('state.tick') >= Math.round(ui.value('sim.DURATION') / ui.value('sim.DT')) - 1);
  assert.equal(ui.element('drill-btn').hidden, false);
});
test('a finished drill is saved once with its scenario and the page address then reopens it', async () => {
  const ui = setup();
  drillWithActions(ui);
  await settle();
  assert.equal(ui.requests.length, 1);
  const [url, options] = ui.requests[0];
  assert.equal(url, '/api/runs');
  assert.equal(options.method, 'POST');
  assert.equal(options.body, ui.value('JSON.stringify({ id: lastRun.id, version: lastRun.version, blockedExit: "C", hazardTick: 140, incidentCount: 1, commands: lastRun.commands, result: lastRun.result })'));
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
  assert.equal(ui.element('result-calmed').textContent, String(saved.result.calmed));
  assert.equal(ui.element('results').hidden, false);
  assert.equal(ui.scene.hidden, true);
  assert.equal(ui.value('lastRun.initial.tick'), 0, 'comparison retains the starting snapshot');
  assert.match(ui.element('compare-result').textContent, /People out|Score|baseline|best/i);
  ui.element('compare-when').value = '20';
  ui.element('compare-form').listeners.submit({ preventDefault() {} });
  ui.play('compare');
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
  ui.value('fresh("drill", null, 140, 1)'); // Single-incident fixture for the original flow checks.
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
  assert.ok(ui.played.includes('/audio/redirect-B.mp3'));
  assert.deepEqual(ui.spoken, [], 'no Windows narrator');
  ui.click('drill-btn');
  assert.ok(ui.played.includes('/audio/drill-start.mp3'));
  ui.playTicks(ui.value('state.hazardTick') + 1);
  const hazard = ui.value('state.hazard');
  assert.ok(ui.played.includes('/audio/alarm.mp3'));
  assert.ok(ui.played.includes(`/audio/hazard-${hazard}.mp3`));
  const clipsBeforeMute = ui.played.filter(src => !String(src).startsWith('paused')).length;
  ui.click('sound-btn');
  assert.equal(ui.element('sound-btn').textContent, 'Sound: off');
  ui.click(`clear-hazard-${hazard.toLowerCase()}`);
  ui.playTicks(ui.value('state.clearingUntil')); ui.click(`open-exit-${hazard.toLowerCase()}`);
  const target = ['A','B','C'].find(exit => exit !== hazard);
  ui.click(`redirect-${target.toLowerCase()}`);
  assert.equal(ui.played.filter(src => !String(src).startsWith('paused')).length, clipsBeforeMute, 'nothing more plays with sound off');
  assert.deepEqual(ui.spoken, [], 'mute never falls back to narrator');
  assert.equal(ui.element('pa-caption').textContent, '', 'PA crawl stays off-screen');
  assert.equal(ui.element('cooldown-toast').hidden, false, 'send cooldown shows as a popup toast');
  assert.match(ui.element('cooldown-toast-label').textContent, /Send cooldown/i);
});
test('generated ElevenLabs clips play; missing clips stay silent with no browser voice', () => {
  const ui = setup({ clips: ['redirect-B'] });
  practice(ui);
  assert.deepEqual(ui.played, ['/audio/redirect-B.mp3']);
  assert.deepEqual(ui.spoken, [], 'ElevenLabs only — no narrator fallback');
  ui.click('drill-btn');
  ui.value('fresh("drill", null, 140, 1)'); // Single-incident fixture for the original flow checks.
  ui.playTicks(ui.value('state.hazardTick') + 1);
  assert.deepEqual(ui.spoken, [], 'missing hazard clip stays silent');
  assert.ok(!ui.played.some(src => String(src).includes('hazard-')), 'no hazard clip when not in the manifest');
});
test('generated alarm and crowd ambience clips replace the synth beeps and run only during the drill', () => {
  const ui = setup({ clips: ['alarm', 'ambience', 'redirect-B', 'drill-start'] });
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
  assert.equal(ui.element('breathing').textContent, 'Presage: 14 /min');
  reading = { available: true, rate: 30, confidence: 20, stable: false, hint: '' };
  await poll();
  assert.equal(ui.element('breathing').textContent, 'Presage: measuring (face + chest in view)', 'low confidence only shows progress');
  ui.click('open-exit-b'); ui.click('redirect-b'); ui.click('drill-btn');
  reading = { available: true, rate: 20, confidence: 75, stable: true, hint: '' };
  await poll(); await poll();
  ui.play('drill');
  assert.match(ui.element('result-breathing').textContent, /^Presage \d+\/10 · /);
  assert.equal(ui.element('result-vitals').hidden, false);
  assert.ok(Number.parseFloat(ui.element('calm-scale-fill').style.width) > 0);
});
test('without a Presage sensor the calmness UI stays hidden', async () => {
  const ui = setup({ fetch: async url => ({ ok: true, json: async () => (url === '/api/breathing' ? { available: false } : {}) }) });
  ui.click('start-btn');
  await ui.value('pollBreathing()');
  assert.equal(ui.element('breathing').hidden, true);
  practice(ui); ui.click('drill-btn'); ui.play('drill');
  assert.equal(ui.element('result-vitals').hidden, true);
  assert.equal(ui.element('result-breathing').textContent || '', '');
  assert.doesNotMatch(ui.element('results').textContent || '', /npm run sensor/i);
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
test('immersive action panel contains drill navigation only — VR calm is voice, not Reassure', () => {
  const ui = setup();
  ui.value('createVrButtons()');
  assert.equal(ui.value('vrButtons.length'), 2);
  assert.ok(!ui.value('vrButtons.some(b => b.source === document.getElementById("reassure-btn"))'));
  assert.ok(ui.value('vrButtons.every(b => b.source === document.getElementById("drill-btn") || b.source === document.getElementById("stop-btn"))'));
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

test('entering VR after a completed laptop round starts fresh practice', () => {
  const ui = setup(); drillWithActions(ui);
  assert.equal(ui.value('mode'), 'review');
  ui.value('scoreExpanded = true');
  ui.scene.xrSession = { visibilityState: 'visible' };
  ui.scene.listeners['enter-vr']();
  assert.equal(ui.value('mode'), 'practice');
  assert.equal(ui.value('state.tick'), 0);
  assert.equal(ui.value('sim.stats(state).evacuated'), 0);
  assert.equal(ui.value('state.commands.length'), 0);
  assert.equal(ui.value('state.hazards.length'), 0);
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.value('lastRun'), null);
  assert.equal(ui.element('results').hidden, true);
  assert.equal(ui.element('review').hidden, true);
  assert.equal(ui.element('vr-score-details').getAttribute('visible'), false);
  assert.equal(ui.scene.isPlaying, true);
  assert.equal(ui.element('open-exit-b').disabled, false);
  assert.equal(ui.value('figures.every(item => item.figure.getAttribute("visible"))'), true);
  // The headset's actual restart control must reset a completed immersive round too.
  ui.click('open-exit-b'); ui.click('redirect-b'); ui.click('drill-btn');
  ui.play('drill');
  assert.equal(ui.element('results').hidden, false);
  ui.value('vrButtons[1].button.click()');
  assert.equal(ui.value('mode'), 'practice');
  assert.equal(ui.value('state.tick'), 0);
  assert.equal(ui.element('results').hidden, true);
  assert.equal(ui.element('review').hidden, true);
});

test('entering VR directly after page load starts interactive practice and unlocks the drill through doors', () => {
  const ui = setup();
  assert.equal(ui.value('mode'), 'intro');
  assert.equal(ui.scene.isPlaying, false);
  ui.scene.xrSession = { visibilityState: 'visible' };
  ui.scene.listeners['enter-vr']();
  assert.equal(ui.value('mode'), 'practice');
  assert.equal(ui.scene.hidden, false);
  assert.equal(ui.scene.isPlaying, true);
  assert.equal(ui.scene.renderer.loop, ui.scene.render);
  assert.equal(ui.element('open-exit-b').disabled, false);
  assert.equal(ui.element('stop-btn').hidden, true, 'default practice has nothing to restart');
  assert.equal(ui.value('vrButtons[1].button.getAttribute("visible")'), false);
  ui.element('door-target-b').listeners.click({ timeStamp: 1000 });
  assert.equal(ui.value('practiceStep'), 1);
  assert.equal(ui.element('stop-btn').hidden, false);
  ui.element('door-target-b').listeners.click({ timeStamp: 2000 });
  assert.equal(ui.value('practiceStep'), 2);
  assert.equal(ui.value('vrButtons[0].button.getAttribute("visible")'), true);
  ui.value('vrButtons[0].button.click()');
  assert.equal(ui.value('mode'), 'drill', 'Start timed drill VR button starts the drill');
  ui.value('vrButtons[1].button.click()');
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.value('state.open.B'), false);
  assert.equal(ui.element('open-exit-b').disabled, false);
  assert.equal(ui.scene.isPlaying, true);
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
  assert.equal(ui.element('compare-form').hidden, false, 'scrubber remains for zero-action replays');
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
  const ui = setup({ clips: ['alarm', 'ambience', 'drill-start', 'redirect-B'] });
  practice(ui); ui.click('drill-btn'); ui.playTicks(ui.value('state.hazardTick') + 1);
  ui.audioClips.forEach(clip => { clip.currentTime = 2; });
  ui.click('sound-btn');
  assert.ok(ui.audioClips.every(clip => clip.paused && clip.currentTime === 0));
  ui.click('sound-btn');
  ui.value('alarm(); announce("drill-start")');
  ui.click('stop-btn');
  assert.ok(ui.audioClips.every(clip => clip.paused && clip.currentTime === 0));
  const synth = setup({ clips: [] }); practice(synth); synth.click('drill-btn');
  synth.playTicks(synth.value('state.hazardTick') + 1);
  assert.equal(synth.oscillators.length, 6, 'missing alarm clip still uses the synth beeps');
  synth.click('sound-btn');
  assert.ok(synth.oscillators.every(tone => tone.stops.includes(undefined)), 'scheduled tones are canceled immediately');
});

test('rejected playback cannot revive clips after mute-unmute, restart, or a newer announcement', async () => {
  const pending = [];
  const ui = setup({ clips: ['alarm', 'redirect-A', 'redirect-B'], playback: src => new Promise((resolve, reject) => pending.push({ src, reject })) });
  ui.click('start-btn');
  ui.value('announce("redirect-A"); alarm()');
  ui.click('sound-btn'); ui.click('sound-btn');
  pending.splice(0).forEach(item => item.reject(new Error('no audio')));
  await settle();
  assert.deepEqual(ui.spoken, [], 'rejected clips never fall back to narrator');
  assert.equal(ui.tones(), 0);
  ui.value('announce("redirect-A"); announce("redirect-B"); announce("redirect-A")');
  pending[0].reject(new Error('obsolete A')); pending[1].reject(new Error('obsolete B'));
  await settle();
  assert.deepEqual(ui.spoken, []);
  pending[2].reject(new Error('current A'));
  await settle();
  assert.deepEqual(ui.spoken, [], 'failed ElevenLabs play stays silent');
  ui.value('announce("redirect-B"); alarm()');
  ui.click('stop-btn');
  assert.ok(ui.audioClips.every(clip => clip.paused && clip.currentTime === 0));
  pending.slice(3).forEach(item => item.reject(new Error('old session')));
  await settle();
  assert.deepEqual(ui.spoken, []);
  assert.equal(ui.tones(), 0);
});

test('headset mirrors instructions with sound off and only visible breathing text', async () => {
  let reading = { available: false };
  const ui = setup({ fetch: async () => ({ ok: true, json: async () => reading }) });
  ui.click('start-btn');
  ui.scene.xrSession = { visibilityState: 'visible' }; ui.scene.listeners['enter-vr']();
  ui.click('sound-btn'); ui.click('open-exit-b'); ui.click('redirect-b');
  assert.doesNotMatch(ui.element('vr-text').getAttribute('value'), /PA:|Attention please/);
  assert.equal(ui.element('pa-caption').textContent, '');
  await ui.value('pollBreathing()');
  assert.doesNotMatch(ui.element('vr-text').getAttribute('value'), /Breathing:/);
  reading = { available: true, rate: 18, confidence: 85 };
  await ui.value('pollBreathing()');
  assert.match(ui.element('vr-text').getAttribute('value'), /Presage: 18 \/min/);
  reading = { available: true, rate: null, confidence: 0, hint: 'Face not visible' };
  await ui.value('pollBreathing()');
  assert.match(ui.element('vr-text').getAttribute('value'), /Presage: Face not visible/);
  assert.equal(ui.value('breathingLog.practice.length'), 1, 'invalid sample is not averaged');
  reading = { available: true, rate: 40, confidence: 20 };
  await ui.value('pollBreathing()');
  assert.equal(ui.value('breathingLog.practice.length'), 1, 'low confidence is not logged');
});

test('new drills choose two or three incidents and retain all events for comparison', () => {
  for (const random of [0.1, 0.9]) {
    const ui = setup({ random }); practice(ui); ui.click('drill-btn');
    assert.equal(ui.value('state.incidentCount'), random < 0.5 ? 2 : 3);
    ui.play('drill');
    assert.equal(ui.value('lastRun.initial.fixedIncidents.length'), random < 0.5 ? 2 : 3);
    const replay = sim.createState({ hazardTick: ui.value('lastRun.initial.hazardTick'), incidentCount: ui.value('state.incidentCount'), fixedIncidents: ui.value('lastRun.initial.fixedIncidents') });
    while (!sim.isDone(replay)) sim.step(replay);
    assert.equal(JSON.stringify(replay.incidents), ui.value('JSON.stringify(state.incidents)'));
  }
});

test('clearing an earlier blockage prompts reopening while a later hazard and panic remain active', () => {
  const ui = setup(); practice(ui);
  ui.value('fresh("drill", null, 140, 3)');
  ui.playTicks(ui.value('state.incidentTicks[1] + 1'));
  const first = ui.value('state.hazards[0]');
  const latest = ui.value('state.hazard');
  assert.notEqual(first, latest);
  ui.click(`clear-hazard-${first.toLowerCase()}`);
  ui.playTicks(ui.value('state.clearingUntil'));
  assert.equal(ui.value('state.hazard'), latest);
  assert.equal(ui.element('task-title').textContent, `Open Exit ${first}`);
  assert.equal(ui.element(`open-exit-${first.toLowerCase()}`).disabled, false);
  assert.equal(ui.element(`open-exit-${latest.toLowerCase()}`).disabled, true);
  assert.ok(ui.value('state.people.some(p => p.panic)'));
});

test('immersive PA stays silent while laptop still plays ElevenLabs clips', () => {
  const ui = setup({ clips: ['redirect-A', 'redirect-B'] });
  practice(ui);
  const playedBefore = ui.played.length;
  ui.value('laptopPose = {}');
  ui.value('announce("redirect-A")');
  assert.equal(ui.played.length, playedBefore, 'VR session does not play PA audio');
  assert.deepEqual(ui.spoken, []);
  assert.equal(ui.element('pa-caption').textContent, '');
  ui.value('laptopPose = null');
  ui.value('announce("redirect-B")');
  assert.ok(ui.played.at(-1) === '/audio/redirect-B.mp3' || ui.played.includes('/audio/redirect-B.mp3'));
  assert.deepEqual(ui.spoken, [], 'laptop uses the clip, not narrator');
});

test('headset practice copy points at Exit B and mic voice calms a panicker', () => {
  const ui = setup();
  ui.click('start-btn');
  ui.scene.xrSession = { visibilityState: 'visible' }; ui.scene.listeners['enter-vr']();
  assert.match(ui.element('vr-text').getAttribute('value'), /STEP 1 OF 2/);
  assert.match(ui.element('vr-text').getAttribute('value'), /Open Exit B/);
  assert.match(ui.element('vr-text').getAttribute('value'), /Point at Open on the middle door, Exit B/);
  ui.click('open-exit-b');
  assert.match(ui.element('vr-text').getAttribute('value'), /STEP 2 OF 2/);
  assert.match(ui.element('vr-text').getAttribute('value'), /Send people/);
  ui.click('redirect-b');
  assert.match(ui.element('vr-text').getAttribute('value'), /PRACTICE DONE/);
  ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  assert.doesNotMatch(ui.element('vr-text').getAttribute('value'), /Orange rings|speak to reassure|person \d+/i);
  assert.match(ui.element('vr-text').getAttribute('value'), /SECOND DRILL|Help people|BLOCKED/i);
  assert.equal(ui.element('reassure-btn').hidden, true, 'Hold Reassure is not the VR calm path');
  assert.equal(ui.element('feedback').textContent, '', 'drill stays quiet — no person-X chatter');
  const before = ui.value('state.people.filter(p => p.panic).length');
  ui.value('lastCalmAt = 0');
  ui.value('hearCalmWord("please stay calm")');
  assert.ok(ui.value('state.commands.some(c => c.action === "calm")'));
  assert.ok(ui.value('state.people.filter(p => p.panic).length') < before, 'saying calm reduces panickers');
  assert.equal(ui.element('feedback').textContent, '', 'calm does not write drill feedback');
  ui.value('lastCalmAt = 0');
  assert.equal(ui.value('heardCalm("quiet please")'), false);
  assert.equal(ui.value('heardCalm("calm down")'), true);
});

test('headset results text includes score fields after the drill without redundant outcome prose', () => {
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
  assert.equal(panel.includes('Time is up.') || /people got out/.test(panel) && /still inside/.test(panel), false,
    'long outcome prose must not clutter the VR score panel');
  assert.match(ui.element('vr-text').getAttribute('value'), /Drill complete/);
  assert.ok(!/PA:/.test(ui.element('vr-text').getAttribute('value') || ''), 'end-state VR brief must not show PA captions');
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
  assert.match(ui.element('result-breathing').textContent, /^Presage \d+\/10 · /);
  assert.equal(ui.element('result-vitals').hidden, false);
  assert.match(ui.element('vr-score-text').getAttribute('value'), /Presage \d+\/10/);
  assert.match(ui.element('vr-analysis-text').getAttribute('value'), /Presage \d+\/10|people got out/i);
  assert.equal(ui.element('vr-analysis').getAttribute('visible'), true);
  assert.equal(ui.element('vr-compare').getAttribute('visible'), true);
  assert.equal(ui.element('vr-compare-btn').getAttribute('visible'), true);
  assert.equal(ui.element('vr-compare-minus').getAttribute('visible'), true);
  assert.equal(ui.element('vr-compare-plus').getAttribute('visible'), true);
});

test('laptop door click clears a hazard on one click and shows a red outline', () => {
  const ui = setup();
  practice(ui); ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  const hazard = ui.value('state.hazard');
  assert.equal(ui.element('hazard-marker').getAttribute('equipment-blockage').outlined, true);
  ui.element(`door-target-${hazard.toLowerCase()}`).listeners.click();
  assert.ok(ui.value('state.clearingUntil') > ui.value('state.tick'), 'laptop single-click starts clearing');
  ui.element('hazard-marker').listeners.click();
  assert.ok(ui.value('state.clearingUntil') > ui.value('state.tick'), 'blockage click is the same clear action');
});

test('laptop Reassure plays a voice line and attempts calm; drill shake is sparse', () => {
  const ui = setup();
  practice(ui); ui.click('drill-btn');
  ui.playTicks(ui.value('state.hazardTick') + 1);
  assert.equal(ui.element('reassure-btn').hidden, false);
  ui.click('reassure-btn');
  assert.ok(ui.played.includes('/audio/reassure.mp3'), 'Reassure uses the ElevenLabs clip');
  assert.deepEqual(ui.spoken, [], 'Reassure never uses Windows narrator');
  assert.ok(ui.value('state.commands.some(c => c.action === "calm")'));
  assert.equal(ui.element('reassure-btn').disabled, true, 'short reassure cooldown disables the button');
  assert.doesNotMatch(ui.element('reassure-btn').textContent || 'Reassure', /up to 3/i);
  assert.equal(ui.element('cooldown-toast').hidden, false, 'reassure cooldown uses the popup toast');
  const calmCount = ui.value('state.commands.filter(c => c.action === "calm").length');
  assert.ok(calmCount >= 2 && calmCount <= 3, 'one Reassure attempt calms 2–3 guests when several are panicking');
  const panicIdx = ui.value('state.people.findIndex(p => p.panic && !p.evacuated)');
  assert.ok(panicIdx >= 0, 'some guests still panicking after one Reassure');
  assert.equal(ui.value(`figures[${panicIdx}].body.getAttribute("color")`), '#e5484d', 'panickers use red foot rings');
  ui.click('reassure-btn');
  assert.equal(ui.value('state.commands.filter(c => c.action === "calm").length'), calmCount, 'cooldown blocks a second reassure');
  ui.value('lastCalmAt = 0');
  ui.value('refresh()');
  assert.equal(ui.element('reassure-btn').disabled, false, 'reassure re-enables after cooldown clears');
  let clock = 200_000;
  const shakeAt = 225;
  while (ui.value('state.tick') < shakeAt && ui.value('mode') === 'drill') ui.componentTick(clock += 250);
  assert.equal(ui.value('lastShakeTick'), shakeAt, 'world shake fires on sparse drill ticks without touching sim RNG');
});

test('results omit scoring formula and long outcome prose; Presage stays on the results card', async () => {
  let reading = { available: true, rate: 14, confidence: 90, stable: true, hint: '' };
  const ui = setup({ fetch: async url => ({ ok: true, json: async () => (url === '/api/breathing' ? reading : {}) }) });
  ui.click('start-btn');
  await ui.value('pollBreathing()');
  practice(ui); ui.click('drill-btn');
  reading = { available: true, rate: 20, confidence: 80, stable: true, hint: '' };
  await ui.value('pollBreathing()');
  ui.play('drill');
  assert.equal(ui.element('result-vitals').hidden, false);
  assert.match(ui.element('result-breathing').textContent, /Presage/);
  assert.doesNotMatch(ui.element('run-analysis').textContent || '', /Presage \d+\/10/, 'calmness scale is not repeated in after-action analysis prose');
  assert.equal(ui.element('pa-caption').textContent, '', 'PA captions clear at end-state');
  assert.match(ui.element('task-copy').textContent, /analysis|scrub|side-by-side/i);
  assert.match(ui.element('run-analysis').textContent, /people got out/i);
  assert.ok(!/1 point per person/i.test(ui.element('results').textContent || ''));
  assert.ok(!/Open exits|How calm it felt|Crowd calmness/i.test(ui.element('results').textContent || ''));
  assert.equal(ui.element('compare-result').hidden, false);
  assert.match(ui.element('compare-result').textContent, /People out|Score/i);
});
