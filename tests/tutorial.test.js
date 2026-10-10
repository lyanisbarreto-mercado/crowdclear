const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const sim = require('../public/simulation');
function setup() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      style: {}, hidden: id === 'drill-btn', disabled: false, textContent: '',
      listeners: {}, classList: { toggle() {} },
      setAttribute() {}, append() {},
      addEventListener(event, listener) { this.listeners[event] = listener; }
    });
    return elements.get(id);
  }
  const scene = element('scene'); scene.hasLoaded = true;
  const context = vm.createContext({
    window: { CrowdSimulation: sim, dispatchEvent() {} },
    document: { hidden: false, getElementById: element, querySelector: () => scene,
      createElement: () => element(Symbol()) },
    requestAnimationFrame() {}, Event: class {}
  });
  vm.runInContext(fs.readFileSync('public/game.js', 'utf8'), context);
  return { element, context, click: id => element(id).listeners.click(),
    value: expression => vm.runInContext(expression, context) };
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
  assert.equal(ui.value('state.open[state.blockedExit]'), false);
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
