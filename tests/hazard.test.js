const { test } = require('node:test');
const assert = require('node:assert/strict');
const sim = require('../public/simulation');
const review = require('../public/review');
test('each exit can be selected as the fixed hazard scenario', () => {
  for (const exit of ['A', 'B', 'C']) {
    const state = sim.createState({ blockedExit: exit });
    assert.equal(state.blockedExit, exit);
    assert.equal(state.open[exit], false);
    assert.equal(sim.act(state, 'open-exit', exit), false);
    assert.equal(sim.act(state, 'redirect', exit), false);
    assert.equal(sim.act(state, 'clear-hazard', exit), true);
    assert.equal(state.hazard, exit, 'equipment remains while clearing');
    assert.equal(sim.act(state, 'clear-hazard', exit), false, 'repeated clicks cannot restart clearing');
    assert.equal(sim.act(state, 'open-exit', exit), false);
    for (let i = 0; i < sim.CLEAR_DURATION - 1; i++) sim.step(state);
    assert.equal(state.hazard, exit, 'still blocked just before completion');
    assert.equal(sim.act(state, 'open-exit', exit), false);
    sim.step(state);
    assert.equal(state.hazard, null, 'clears after four seconds of simulation time');
    assert.equal(state.open[exit], false, 'clearing does not open the door');
    assert.equal(sim.act(state, 'open-exit', exit), true);
    assert.equal(sim.act(state, 'clear-hazard', exit), false);
  }
});
test('blocked routes never evacuate people until cleared and opened', () => {
  const state = sim.createState({ blockedExit: 'A' });
  for (let i = 0; i < 300; i++) sim.step(state);
  assert.equal(state.people.filter(p => p.exit === 'A' && p.evacuated).length, 0);
  sim.act(state, 'clear-hazard', 'A');
  for (let i = 0; i < sim.CLEAR_DURATION; i++) sim.step(state);
  sim.act(state, 'open-exit', 'A');
  for (let i = 0; i < 300; i++) sim.step(state);
  assert.ok(state.people.some(p => p.exit === 'A' && p.evacuated));
});
test('a drill ending during clearing retains its obstruction and closed door', () => {
  const state = sim.createState({ blockedExit: 'A' });
  state.tick = 590;
  sim.act(state, 'clear-hazard', 'A');
  while (!sim.isDone(state)) sim.step(state);
  assert.equal(state.hazard, 'A');
  assert.equal(state.open.A, false);
  assert.equal(state.clearingUntil, 630);
});
test('targeted commands reproduce a hazard run without rerolling the scenario', () => {
  const state = sim.createState({ blockedExit: 'C' });
  sim.act(state, 'clear-hazard', 'C');
  for (let i = 0; i < sim.CLEAR_DURATION; i++) sim.step(state);
  sim.act(state, 'open-exit', 'C');
  sim.act(state, 'redirect', 'C');
  const replay = sim.createState({ blockedExit: state.blockedExit });
  while (replay.tick < state.tick) sim.step(replay, state.commands);
  for (const c of state.commands.filter(c => c.tick === state.tick)) sim.act(replay, c.action, c.target);
  assert.deepEqual(replay, state);
});

test('mid-drill hazard waits for its tick and blocks the busiest exit', () => {
  const state = sim.createState({ hazardTick: 100 });
  assert.deepEqual(state.open, { A: true, B: true, C: true });
  for (let i = 0; i < 100; i++) sim.step(state);
  assert.equal(state.hazard, null);
  sim.step(state);
  assert.equal(state.hazard, 'B', 'hazard tick 100 sends most people to Exit B');
  assert.equal(state.open.B, false);
  assert.equal(state.hazardTick, 100);
});
test('hazard targets the actual busiest crowd after pre-incident redirection', () => {
  const state = sim.createState({ hazardTick: 150 });
  sim.act(state, 'redirect', 'B');
  sim.act(state, 'redirect', 'C');
  while (state.tick < 150) sim.step(state);
  const q = sim.stats(state).queues;
  const busiest = ['A', 'B', 'C'].reduce((best, e) => q[e] > q[best] ? e : best, 'A');
  sim.step(state);
  assert.equal(state.hazard, busiest);
});
test('incident-tick live redirects replay with identical commands, state, and results', () => {
  for (const target of ['B', 'C']) {
    const state = sim.createState({ hazardTick: 100 });
    while (state.tick < state.hazardTick) sim.step(state);
    assert.equal(sim.act(state, 'redirect', target), true);
    sim.step(state);
    const replay = sim.createState({ hazardTick: 100 });
    while (replay.tick < state.tick) sim.step(replay, state.commands);
    assert.deepEqual(replay.commands, state.commands, 'accepted live input must remain accepted in replay');
    assert.deepEqual(replay, state, 'incident selection and motion must agree at the boundary');
    while (!sim.isDone(state)) sim.step(state);
    while (!sim.isDone(replay)) sim.step(replay, state.commands);
    assert.deepEqual(review.result(replay), review.result(state));
    assert.deepEqual(replay, state);
  }
});
test('incident-tick redirects change the busiest exit before live and scheduled selection', () => {
  const live = sim.createState({ hazardTick: 100 });
  while (live.tick < live.hazardTick) sim.step(live);
  assert.ok(sim.stats(live).queues.B > sim.stats(live).queues.C);
  assert.equal(sim.act(live, 'redirect', 'C'), true);
  const queues = sim.stats(live).queues;
  assert.ok(queues.C > queues.A && queues.C > queues.B);
  sim.step(live);
  assert.equal(live.blockedExit, 'C');
  const replay = sim.createState({ hazardTick: 100 });
  while (replay.tick < live.tick) sim.step(replay, live.commands);
  assert.equal(replay.blockedExit, 'C');
  assert.deepEqual(replay, live);
});
test('comparison replays retain the original incident exit when alternative redirects change the busiest exit', () => {
  const original = sim.createState({ hazardTick: 100 });
  while (original.tick < original.hazardTick) sim.step(original);
  assert.equal(sim.act(original, 'redirect', 'B'), true);
  while (!sim.isDone(original)) sim.step(original);
  const fixed = sim.createState({ blockedExit: original.blockedExit, hazardTick: original.hazardTick });
  while (!sim.isDone(fixed)) sim.step(fixed, original.commands);
  assert.deepEqual(fixed, original);
  const alternative = sim.createState({ blockedExit: original.blockedExit, hazardTick: original.hazardTick });
  const changed = [{ tick: 100, action: 'redirect', target: 'C' }];
  while (alternative.tick <= alternative.hazardTick) sim.step(alternative, changed);
  assert.deepEqual(alternative.commands, changed);
  assert.equal(alternative.blockedExit, 'B', 'comparison uses the original incident, not a rerolled one');
  assert.equal(alternative.hazard, 'B');
});
test('scheduled commands at the same tick preserve live input order', () => {
  const live = sim.createState();
  assert.equal(sim.act(live, 'open-exit', 'B'), true);
  assert.equal(sim.act(live, 'redirect', 'B'), true);
  sim.step(live);
  const replay = sim.createState();
  sim.step(replay, live.commands);
  assert.deepEqual(replay, live);
  const reversed = sim.createState();
  sim.step(reversed, [...live.commands].reverse());
  assert.deepEqual(reversed.commands, [{ tick: 0, action: 'open-exit', target: 'B' }]);
});
test('an unattended mid-drill incident leaves people waiting for a reaction', () => {
  for (const hazardTick of [100, 150, 200]) {
    const state = sim.createState({ hazardTick });
    while (!sim.isDone(state)) sim.step(state);
    assert.ok(sim.stats(state).remaining > 0);
  }
});
test('the hazard tick picks which exit most people start toward, so drills hit different exits', () => {
  const majority = hazardTick => {
    const counts = {};
    for (const p of sim.createState({ hazardTick }).people) counts[p.exit] = (counts[p.exit] || 0) + 1;
    return Object.keys(counts).find(e => counts[e] === 48);
  };
  assert.deepEqual([100, 101, 102].map(majority), ['B', 'C', 'A']);
  assert.equal(sim.createState().people.filter(p => p.exit === 'A').length, 48, 'practice keeps its Exit A crowd');
});
test('after a redirect, staff need the cooldown before the next one', () => {
  const state = sim.createState({ hazardTick: 200 });
  assert.equal(sim.act(state, 'redirect', 'B'), true);
  for (let i = 0; i < sim.REDIRECT_COOLDOWN - 1; i++) sim.step(state);
  assert.equal(sim.act(state, 'redirect', 'C'), false, 'still cooling down');
  sim.step(state);
  assert.equal(sim.act(state, 'redirect', 'C'), true);
});
test('spreading the crowd early shortens the longest line and clears the venue sooner', () => {
  const play = schedule => {
    const state = sim.createState({ hazardTick: 150 });
    const fix = exit => [{ tick: 151, action: 'clear-hazard', target: exit }, { tick: 151 + sim.CLEAR_DURATION, action: 'open-exit', target: exit }];
    const probe = sim.createState({ hazardTick: 150 });
    while (probe.tick <= 150) sim.step(probe, schedule);
    while (!sim.isDone(state)) sim.step(state, [...schedule, ...fix(probe.blockedExit)]);
    return { peak: state.peak.size, ticks: state.tick, remaining: sim.stats(state).remaining };
  };
  const waited = play([]);
  const spread = play([{ tick: 10, action: 'redirect', target: 'B' }]);
  assert.ok(waited.remaining > 0, 'fixing the single busy route is insufficient for 60 people');
  assert.equal(spread.remaining, 0);
  assert.ok(spread.peak < waited.peak, `longest line ${spread.peak} vs ${waited.peak}`);
  assert.ok(spread.ticks < waited.ticks, `cleared at ${spread.ticks} vs ${waited.ticks}`);
});
test('people keep a body width apart instead of walking through each other', () => {
  const state = sim.createState({ hazardTick: 150 });
  const schedule = [{ tick: 10, action: 'redirect', target: 'B' }];
  let closest = Infinity;
  while (!sim.isDone(state)) {
    if (state.tick === 151) schedule.push({ tick: 151, action: 'clear-hazard', target: state.blockedExit }, { tick: 151 + sim.CLEAR_DURATION, action: 'open-exit', target: state.blockedExit });
    sim.step(state, schedule);
    const present = state.people.filter(p => !p.evacuated);
    for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) {
      closest = Math.min(closest, Math.hypot(present[i].x - present[j].x, present[i].z - present[j].z));
    }
  }
  assert.ok(closest >= 0.45, `closest pair ${closest.toFixed(2)} m`);
  assert.equal(sim.stats(state).remaining, 0);
});
