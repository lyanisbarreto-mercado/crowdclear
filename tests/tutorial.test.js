const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const sim = require('../public/simulation');
function setup() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      style: {}, hidden: id === 'drill-btn', disabled: false, textContent: '', value: '',
      listeners: {}, classList: { toggle() {} }, children: [],
      setAttribute() {}, append() {}, replaceChildren(...items) { this.children = items; },
      addEventListener(event, listener) { this.listeners[event] = listener; }
    });
    return elements.get(id);
  }
  const scene = element('scene'); scene.hasLoaded = true;
  const context = vm.createContext({
    window: { CrowdSimulation: sim, CrowdReview: require('../public/review'), dispatchEvent() {} },
    document: { hidden: false, getElementById: element, querySelector: () => scene,
      createElement: () => element(Symbol()) },
    requestAnimationFrame() {}, Event: class {}
  });
  vm.runInContext(fs.readFileSync('public/game.js', 'utf8'), context);
  const value = expression => vm.runInContext(expression, context);
  let clock = 0;
  return { element, context, value, click: id => element(id).listeners.click(),
    play: whileMode => { while (value('mode') === whileMode) value('frame')(clock += 250); },
    playTicks: ticks => { while (value('state.tick') < ticks) value('frame')(clock += 250); } };
}
test('practice waits indefinitely for its task and rejected redirect cannot advance it', () => {
  const ui = setup(); ui.click('start-btn');
  vm.runInContext('frame(0); frame(30000);', ui.context);
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.value('state.tick'), 0);
  ui.click('redirect');
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.element('drill-btn').hidden, true);
});
test('both successful tasks unlock the drill and starting clears practice state', () => {
  const ui = setup(); ui.click('start-btn'); ui.click('open-exit');
  assert.equal(ui.value('practiceStep'), 1);
  assert.equal(ui.element('drill-btn').hidden, true);
  assert.equal(ui.element('redirect').disabled, false);
  ui.click('open-exit');
  assert.equal(ui.value('practiceStep'), 1);
  ui.click('redirect');
  assert.equal(ui.value('practiceStep'), 2);
  assert.equal(ui.element('drill-btn').hidden, false);
  ui.click('drill-btn');
  assert.equal(ui.value('mode'), 'drill');
  assert.equal(ui.value('state.open.B'), false);
  assert.equal(ui.value('state.commands.length'), 0);
  assert.equal(ui.value('state.tick'), 0);
  ui.click('stop-btn');
  assert.equal(ui.value('mode'), 'practice');
  assert.equal(ui.value('practiceStep'), 0);
  assert.equal(ui.element('drill-btn').hidden, true);
});
test('a finished drill records only drill decisions and opens the review', () => {
  const ui = setup(); ui.click('start-btn'); ui.click('open-exit'); ui.click('redirect');
  ui.click('drill-btn'); ui.click('open-exit');
  ui.playTicks(50); ui.click('redirect');
  ui.play('drill');
  const run = ui.value('lastRun');
  assert.equal(ui.value('mode'), 'review');
  assert.equal(run.version, sim.VERSION);
  assert.equal(JSON.stringify(run.initial), JSON.stringify(sim.createState()));
  assert.equal(run.commands.map(c => c.action).join(), 'open-exit,redirect');
  assert.equal(run.commands[0].tick, 0);
  assert.ok(run.commands[1].tick >= 50);
  assert.equal(run.result.remaining, 0);
  assert.ok(run.result.ticks < sim.DURATION / sim.DT, 'cleared before time ran out');
  assert.equal(ui.element('review').hidden, false);
  assert.equal(ui.element('actions').hidden, true);
  assert.equal(ui.element('compare-form').hidden, false);
  assert.equal(ui.element('review-timeline').children.length, 2);
});
test('a drill with no actions is reviewed without offering a re-time', () => {
  const ui = setup(); ui.click('start-btn'); ui.click('open-exit'); ui.click('redirect');
  ui.click('drill-btn'); ui.play('drill');
  assert.equal(ui.value('lastRun.commands.length'), 0);
  assert.equal(ui.element('compare-form').hidden, true);
  assert.equal(ui.element('review-timeline').children[0].textContent, 'No actions taken during the drill.');
  assert.match(ui.element('task-copy').textContent, /All 30 people evacuated/);
});
test('comparison replays the original exactly and changes only the chosen action', () => {
  const ui = setup(); ui.click('start-btn'); ui.click('open-exit'); ui.click('redirect');
  ui.click('drill-btn'); ui.click('open-exit');
  ui.playTicks(50); ui.click('redirect');
  ui.play('drill');
  const recorded = ui.value('JSON.stringify(lastRun.result)');
  ui.element('compare-action').value = '0';
  ui.element('compare-time').value = '30';
  ui.element('compare-form').listeners.submit({ preventDefault() {} });
  assert.equal(ui.value('mode'), 'compare');
  ui.play('compare');
  assert.equal(ui.value('mode'), 'review');
  assert.equal(JSON.stringify(ui.value('review.result(ghost)')), recorded);
  assert.equal(ui.value('state.commands.map(c => c.action + "@" + c.tick).join()'), 'open-exit@300');
  const text = ui.element('compare-result').textContent;
  assert.match(text, /replayed exactly/);
  assert.match(text, /cleared the venue [\d.]+ s later/);
  assert.match(text, /1 scheduled action\(s\) could not happen/);
});
