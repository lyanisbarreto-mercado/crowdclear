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
test('closed exit refuses redirection and repeated actions are not recorded', () => {
  const state = sim.createState();
  assert.equal(sim.act(state, 'redirect'), false);
  assert.equal(state.commands.length, 0);
  assert.equal(sim.act(state, 'open-exit'), true);
  assert.equal(sim.act(state, 'open-exit'), false);
  assert.equal(sim.act(state, 'redirect'), true);
  assert.equal(sim.act(state, 'redirect'), false);
  assert.equal(sim.stats(state).queues.B, 12);
  assert.deepEqual(state.commands.map(c => c.action), ['open-exit', 'redirect']);
});
test('opening and redirecting improves throughput over the unchanged scenario', () => {
  assert.ok(sim.stats(run(true)).evacuated > sim.stats(run(false)).evacuated);
});
test('same initial state and tick-stamped commands reproduce the full run', () => {
  const original = run(true);
  const replay = sim.createState();
  for (let tick = 0; tick < original.tick; tick++) {
    original.commands.filter(c => c.tick === tick).forEach(c => sim.act(replay, c.action));
    sim.step(replay);
  }
  assert.deepEqual(replay, original);
});
test('a fresh drill resets every practice decision and agent', () => {
  const practice = run(true);
  const fresh = sim.createState();
  assert.notDeepEqual(practice, fresh);
  assert.equal(fresh.tick, 0);
  assert.equal(fresh.open.B, false);
  assert.equal(fresh.commands.length, 0);
  assert.equal(sim.stats(fresh).remaining, 30);
});
