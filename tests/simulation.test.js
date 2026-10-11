const { test } = require('node:test');
const assert = require('node:assert/strict');
const sim = require('../public/simulation');
function run(intervene) {
  const state = sim.createState();
  for (let tick = 0; tick < 250; tick++) {
    if (intervene && tick === 10) sim.act(state, 'open-exit');
    if (intervene && tick === 20) sim.act(state, 'redirect');
    sim.step(state);
  }
  return state;
}
test('60 people start scattered inside the lobby with repeatable, varied walking speeds', () => {
  const first = sim.createState({ hazardTick: 140 });
  assert.equal(first.people.length, 60);
  assert.deepEqual(sim.createState({ hazardTick: 140 }), first);
  assert.notDeepEqual(sim.createState({ hazardTick: 141 }).people, first.people);
  assert.ok(first.people.every(p => Math.abs(p.x) < 11 && p.z > 0 && p.z < 11 && p.speed >= 1.8 && p.speed <= 3));
  assert.ok(new Set(first.people.map(p => p.speed)).size > 50);
  assert.ok(new Set(first.people.map(p => p.z)).size > 50, 'people do not start in uniform rows');
});

test('some people briefly hesitate at the incident, then resume while others keep moving', () => {
  const state = sim.createState({ blockedExit: 'A', hazardTick: 150 });
  state.people = state.people.slice(48, 50); // These two use open Exit C, away from the blocked route.
  state.tick = 150;
  const [hesitates, continues] = state.people;
  const before = state.people.map(p => ({ x: p.x, z: p.z }));
  sim.step(state);
  assert.deepEqual({ x: hesitates.x, z: hesitates.z }, before[0]);
  assert.notDeepEqual({ x: continues.x, z: continues.z }, before[1]);
  assert.ok(hesitates.pauseUntil - 150 >= 4 && hesitates.pauseUntil - 150 <= 13);
  while (state.tick <= hesitates.pauseUntil) sim.step(state);
  assert.notDeepEqual({ x: hesitates.x, z: hesitates.z }, before[0]);
});
test('closed exit refuses redirection and repeated actions are not recorded', () => {
  const state = sim.createState();
  assert.equal(sim.act(state, 'redirect'), false);
  assert.equal(state.commands.length, 0);
  assert.equal(sim.act(state, 'open-exit'), true);
  assert.equal(sim.act(state, 'open-exit'), false);
  assert.equal(sim.act(state, 'redirect'), true);
  assert.equal(sim.act(state, 'redirect'), false);
  assert.equal(sim.stats(state).queues.B, 24);
  assert.deepEqual(state.commands.map(c => c.action), ['open-exit', 'redirect']);
});
test('opening and redirecting improves throughput over the unchanged scenario', () => {
  assert.ok(sim.stats(run(true)).evacuated > sim.stats(run(false)).evacuated);
});
test('same initial state and tick-stamped commands reproduce the full run', () => {
  const original = run(true);
  const replay = sim.createState();
  while (replay.tick < original.tick) sim.step(replay, original.commands);
  assert.deepEqual(replay, original);
});
test('a fresh drill resets every practice decision and agent', () => {
  const practice = run(true);
  const fresh = sim.createState();
  assert.notDeepEqual(practice, fresh);
  assert.equal(fresh.tick, 0);
  assert.equal(fresh.open.B, false);
  assert.equal(fresh.commands.length, 0);
  assert.equal(sim.stats(fresh).remaining, 60);
});
