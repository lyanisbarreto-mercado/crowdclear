const { test } = require('node:test');
const assert = require('node:assert/strict');
const sim = require('../public/simulation');
const review = require('../public/review');

test('continuous panic movement uses VERSION 12', () => {
  assert.equal(sim.VERSION, 12);
});

test('incident limits panic to three eligible people; they wander and do not evacuate', () => {
  const state = sim.createState({ hazardTick: 100 });
  assert.ok(state.people.every(p => p.panic === false));
  while (state.tick < 100) sim.step(state);
  sim.step(state);
  const panickers = state.people.filter(p => p.panic);
  assert.equal(panickers.length, 3);
  assert.ok(panickers.every(p => p.id % 5 === 0));
  const before = panickers.map(p => ({ id: p.id, x: p.x, z: p.z }));
  for (let i = 0; i < 40; i++) sim.step(state);
  assert.ok(before.some((b, i) => Math.hypot(panickers[i].x - b.x, panickers[i].z - b.z) > 0.05),
    'panickers must wander');
  assert.ok(panickers.every(p => !p.evacuated && Math.abs(p.x) <= 10 && p.z >= -10 && p.z <= 11));
  while (!sim.isDone(state)) sim.step(state);
  assert.ok(state.people.some(p => p.panic && !p.evacuated), 'untreated panickers stay inside');
  assert.ok(sim.stats(state).panicking > 0);
});

test('redirects ignore panickers until they are calmed', () => {
  const state = sim.createState({ hazardTick: 100 });
  while (state.tick <= 100) sim.step(state);
  const panicker = state.people.find(p => p.panic);
  const exitBefore = panicker.exit;
  const open = ['A', 'B', 'C'].find(e => state.open[e] && e !== exitBefore && state.hazard !== e);
  assert.ok(open);
  assert.equal(sim.act(state, 'redirect', open), true);
  assert.equal(panicker.exit, exitBefore, 'panic keeps original exit through redirect');
});

test('one calm action succeeds for every panicker and rejects invalid targets', () => {
  const state = sim.createState({ hazardTick: 100 });
  while (state.tick <= 100) sim.step(state);
  const panickers = state.people.filter(p => p.panic);
  assert.equal(panickers.length, 3);
  for (const person of panickers) {
    assert.equal(sim.act(state, 'calm', person.id), true);
    assert.equal(person.panic, false);
    assert.ok(person.pauseUntil > state.tick);
    assert.equal(sim.act(state, 'calm', person.id), false);
  }
  assert.equal(state.commands.filter(c => c.action === 'calm').length, 3);
  assert.equal(sim.act(state, 'calm', 999), false);
});

test('panic calm schedule replays with identical state and review result', () => {
  const state = sim.createState({ hazardTick: 100 });
  while (state.tick <= 100) sim.step(state);
  const id = state.people.find(p => p.panic).id;
  assert.equal(sim.act(state, 'calm', id), true);
  sim.act(state, 'clear-hazard', state.hazard);
  while (state.clearingUntil !== null && state.tick < state.clearingUntil) sim.step(state);
  sim.act(state, 'open-exit', state.blockedExit);
  const open = ['A', 'B', 'C'].find(e => state.open[e] && e !== state.hazard);
  if (open) sim.act(state, 'redirect', open);
  while (!sim.isDone(state)) sim.step(state);
  const replay = sim.createState({ hazardTick: 100 });
  while (replay.tick < state.tick) sim.step(replay, state.commands);
  for (const c of state.commands.filter(c => c.tick === state.tick)) sim.act(replay, c.action, c.target);
  assert.deepEqual(replay, state);
  assert.deepEqual(review.result(replay), review.result(state));
  assert.ok('calmed' in review.result(state));
  assert.ok('panicking' in review.result(state));
});

for (const calmOne of [false, true]) {
  test(`later incidents respect the panic cap${calmOne ? ' after calming someone' : ''}`, () => {
    const state = sim.createState({ hazardTick: 100, incidentCount: 3 });
    while (state.tick <= 100) sim.step(state);
    assert.equal(sim.stats(state).panicking, 3);
    if (calmOne) {
      const person = state.people.find(p => p.panic);
      while (person.panic) {
        sim.act(state, 'calm', person.id);
        if (person.panic) sim.step(state);
      }
      assert.equal(sim.stats(state).panicking, 2);
    }
    while (!sim.isDone(state)) {
      const incidentsBefore = state.incidents.length;
      sim.step(state);
      assert.ok(sim.stats(state).panicking <= 3, `panic cap exceeded at tick ${state.tick}`);
      if (state.incidents.length > incidentsBefore) assert.equal(sim.stats(state).panicking, 3);
    }
    assert.equal(state.incidents.length, 3);
  });
}

test('existing pedestrians start panicking without jumping away from the doors', () => {
  const state = sim.createState({ hazardTick: 100 });
  while (state.tick < 100) sim.step(state);
  const people = state.people.slice();
  const panicker = state.people.find(p => !p.evacuated && p.id % 5 === 0);
  panicker.z = -9;
  const before = { x: panicker.x, z: panicker.z };
  sim.step(state);
  assert.equal(state.people.length, 60);
  assert.ok(state.people.every((person, i) => person === people[i]));
  assert.equal(panicker.panic, true);
  assert.ok(Math.hypot(panicker.x - before.x, panicker.z - before.z) < 0.5);
  for (let i = 0; i < 30; i++) {
    const position = { x: panicker.x, z: panicker.z };
    sim.step(state);
    assert.ok(Math.hypot(panicker.x - position.x, panicker.z - position.z) < 0.5,
      'panic moves an existing person gradually');
  }
});
