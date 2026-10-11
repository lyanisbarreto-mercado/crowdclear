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

test('equipment blockage exposes a red outline when marked as blocking', () => {
  const definition = components.get('equipment-blockage');
  const outline = { setAttribute(name, value) { this[name] = value; } };
  const visual = { data: { outlined: false }, el: { querySelector: () => outline, innerHTML: '' }, outline };
  definition.init.call(visual);
  assert.ok(visual.el.innerHTML.includes('block-outline'));
  assert.ok(visual.el.innerHTML.includes('#e5484d'));
  visual.data.outlined = true;
  definition.update.call(visual);
  assert.equal(outline.visible, true);
  visual.data.outlined = false;
  definition.update.call(visual);
  assert.equal(outline.visible, false);
});

test('floor smoke and flames stay low, become still with reduced motion, and release resources', () => {
  const definitions = new Map();
  const vector = () => ({ set(x, y, z) { Object.assign(this, { x, y, z }); }, setScalar(size) { this.set(size, size, size); } });
  const textures = [];
  const motion = { matches: false };
  const THREE = {
    TextureLoader: class { load() { const texture = { dispose() { this.disposed = true; } }; textures.push(texture); return texture; } },
    Group: class { children = []; add(sprite) { this.children.push(sprite); } },
    SpriteMaterial: class { constructor(data) { Object.assign(this, data); } dispose() { this.disposed = true; } },
    Sprite: class { constructor(material) { this.material = material; this.position = vector(); this.scale = vector(); } }
  };
  vm.runInNewContext(fs.readFileSync('public/environment.js', 'utf8'), {
    window: { matchMedia: () => motion, AFRAME: { THREE, registerComponent: (name, definition) => definitions.set(name, definition) } }
  });
  const effect = Object.assign({ data: { ground: true }, el: {
    object3D: { visible: true, parent: { visible: true } }, setObject3D(name, mesh) { this.mesh = mesh; },
    removeObject3D() { this.mesh = null; }
  } }, definitions.get('hazard-puffs'));
  effect.init();
  assert.equal(effect.el.mesh.children.length, 5);
  for (let time = 0; time < 4000; time += 100) {
    effect.tick(time);
    for (const sprite of effect.el.mesh.children) {
      assert.ok(sprite.position.y - Math.hypot(sprite.scale.x, sprite.scale.y) / 2 >= 0, 'sprites stay above the floor');
      assert.ok(sprite.position.y + Math.hypot(sprite.scale.x, sprite.scale.y) / 2 < 1, 'sprites cannot hide people or doors');
    }
  }
  motion.matches = true;
  effect.tick(0);
  const still = JSON.stringify(effect.el.mesh.children);
  effect.tick(2500);
  assert.equal(JSON.stringify(effect.el.mesh.children), still, 'reduced motion keeps all sprites still');
  motion.matches = false;
  effect.el.object3D.parent.visible = false;
  effect.tick(3100);
  assert.equal(JSON.stringify(effect.el.mesh.children), still, 'hidden incident effects stop updating');
  const sprites = effect.el.mesh.children;
  effect.remove();
  assert.ok(sprites.every(sprite => sprite.material.disposed));
  assert.ok(textures.every(texture => texture.disposed));
  assert.equal(effect.el.mesh, null);
});
