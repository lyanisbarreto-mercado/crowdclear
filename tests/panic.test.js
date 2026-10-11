const { test } = require('node:test');
const assert = require('node:assert/strict');
const sim = require('../public/simulation');
const review = require('../public/review');

test('combined panic and multiple-incident rules use VERSION 9', () => {
  assert.equal(sim.VERSION, 9);
});

test('incident sets panic on every fifth person; they wander and do not evacuate', () => {
  const state = sim.createState({ hazardTick: 100 });
  assert.ok(state.people.every(p => p.panic === false));
  while (state.tick < 100) sim.step(state);
  sim.step(state);
  const panickers = state.people.filter(p => p.panic);
  assert.ok(panickers.length >= 10, `expected ~12 panickers, got ${panickers.length}`);
  assert.ok(panickers.every(p => p.id % 5 === 0));
  const before = panickers.map(p => ({ id: p.id, x: p.x, z: p.z }));
  for (let i = 0; i < 40; i++) sim.step(state);
  assert.ok(before.some((b, i) => Math.hypot(panickers[i].x - b.x, panickers[i].z - b.z) > 0.05),
    'panickers must wander');
  assert.ok(panickers.every(p => !p.evacuated && Math.abs(p.x) <= 10 && p.z >= 0 && p.z <= 11));
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

test('calm succeeds and fails deterministically and records every accepted attempt', () => {
  const state = sim.createState({ hazardTick: 100 });
  while (state.tick <= 100) sim.step(state);
  const panickers = state.people.filter(p => p.panic);
  assert.ok(panickers.length);
  let successes = 0;
  let failures = 0;
  for (const p of panickers) {
    const wasPanic = p.panic;
    assert.equal(sim.act(state, 'calm', p.id), true);
    if (p.panic) failures++;
    else {
      successes++;
      assert.ok(p.pauseUntil > state.tick, 'calmed people pause briefly');
    }
    assert.ok(wasPanic);
  }
  assert.ok(successes > 0 && failures > 0, `need both outcomes (~45%); got ${successes}/${failures}`);
  assert.equal(state.commands.filter(c => c.action === 'calm').length, panickers.length);
  assert.equal(sim.act(state, 'calm', 999), false);
  assert.equal(sim.act(state, 'calm', panickers.find(p => !p.panic).id), false);
  const rate = successes / (successes + failures);
  assert.ok(rate > 0.25 && rate < 0.7, `calm rate ${rate} should be near 45%`);
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
