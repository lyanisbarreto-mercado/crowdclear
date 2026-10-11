const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const components = new Map();
vm.runInNewContext(fs.readFileSync('public/environment.js', 'utf8'), {
  window: { AFRAME: { registerComponent: (name, definition) => components.set(name, definition) } }
});
function door() {
  const attributes = {};
  const events = [];
  const definition = components.get('stadium-door');
  const visual = {
    hinges: [0, 1].map(() => ({ setAttribute() {}, emit: event => events.push(event) })),
    status: { setAttribute: (name, value) => { attributes[name] = value; } },
    light: { setAttribute: (name, key, value) => { attributes.light = value; } }
  };
  let previous = {};
  return { attributes, events, update(state, hovered = false) {
    visual.data = { state, hovered };
    definition.update.call(visual, previous);
    previous = { ...visual.data };
  } };
}

test('a cleared blockage leaves the visual door closed until the separate open action', () => {
  const visual = door();
  visual.update('open');
  visual.update('blocked');
  assert.equal(visual.attributes.value, 'BLOCKED');
  assert.deepEqual(visual.events, ['door-close', 'door-close']);
  visual.events.length = 0;
  visual.update('closed');
  assert.equal(visual.attributes.value, 'CLOSED');
  assert.ok(!visual.events.includes('door-open'));
  visual.events.length = 0;
  visual.update('open');
  assert.equal(visual.attributes.value, 'OPEN');
  assert.deepEqual(visual.events, ['door-open', 'door-open']);
});

test('hover feedback preserves door motion and restores its current status', () => {
  const visual = door();
  visual.update('closed');
  visual.update('open');
  visual.events.length = 0;
  visual.update('open', true);
  assert.equal(visual.attributes.light, '#eef3f8');
  visual.update('open', false);
  assert.equal(visual.attributes.light, '#2fbf71');
  assert.deepEqual(visual.events, [], 'hover must not restart the opening animation');
});
