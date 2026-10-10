const { test } = require('node:test');
const assert = require('node:assert/strict');
const sim = require('../public/simulation');
test('each exit can be selected as the fixed hazard scenario', () => {
  for (const exit of ['A', 'B', 'C']) {
    const state = sim.createState({ blockedExit: exit });
    assert.equal(state.blockedExit, exit);
    assert.equal(state.open[exit], false);
    assert.equal(sim.act(state, 'open-exit', exit), false);
    assert.equal(sim.act(state, 'redirect', exit), false);
    assert.equal(sim.act(state, 'clear-hazard', exit), true);
    assert.equal(state.tick, 0, 'clearing has no delay');
    assert.equal(state.open[exit], false, 'clearing does not open the door');
    assert.equal(sim.act(state, 'open-exit', exit), true);
    assert.equal(sim.act(state, 'clear-hazard', exit), false);
  }
});
test('blocked routes never evacuate people until cleared and opened', () => {
  const state = sim.createState({ blockedExit: 'A' });
  for (let i = 0; i < 300; i++) sim.step(state);
  assert.equal(state.people.filter(p => p.exit === 'A' && p.evacuated).length, 0);
  sim.act(state, 'clear-hazard', 'A'); sim.act(state, 'open-exit', 'A');
  for (let i = 0; i < 300; i++) sim.step(state);
  assert.ok(state.people.some(p => p.exit === 'A' && p.evacuated));
});
test('targeted commands reproduce a hazard run without rerolling the scenario', () => {
  const state = sim.createState({ blockedExit: 'C' });
  sim.act(state, 'clear-hazard', 'C'); sim.act(state, 'open-exit', 'C');
  sim.act(state, 'redirect', 'C');
  const replay = sim.createState({ blockedExit: state.blockedExit });
  for (const c of state.commands) sim.act(replay, c.action, c.target);
  assert.deepEqual(replay, state);
});
