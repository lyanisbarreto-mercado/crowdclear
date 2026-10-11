const { test } = require('node:test');
const assert = require('node:assert/strict');
const review = require('../public/review');
const cleared = { evacuated: 30, remaining: 0, ticks: 252 };
const expired = { evacuated: 22, remaining: 8, ticks: 900 };
test('outcome distinguishes early completion from time expiry', () => {
  assert.equal(review.outcome(cleared), 'All 30 people got out in 25.2 s.');
  assert.equal(review.outcome(expired), 'Time is up. 22 people got out. 8 are still inside.');
});
test('timeline lists actions in seconds and handles a run with none', () => {
  assert.deepEqual(review.timeline([{ tick: 0, action: 'clear-hazard', target: 'A' }, { tick: 0, action: 'open-exit', target: 'A' }, { tick: 52, action: 'redirect', target: 'C' }]),
    ['0.0 s · Started clearing Exit A', '0.0 s · Opened Exit A', '5.2 s · Sent people to Exit C']);
  assert.deepEqual(review.timeline([]), ['No actions taken.']);
});
test('alternative re-times one action and keeps every other input', () => {
  const commands = [{ tick: 0, action: 'open-exit' }, { tick: 52, action: 'redirect' }];
  assert.deepEqual(review.alternative(commands, 1, 200), [{ tick: 0, action: 'open-exit' }, { tick: 200, action: 'redirect' }]);
  assert.equal(commands[1].tick, 52);
});
test('comparison reports the measured difference and flags an unreproduced original', () => {
  const run = { result: cleared };
  const later = { evacuated: 30, remaining: 0, ticks: 459 };
  assert.deepEqual(review.comparison(run, cleared, later, 0), [
    'Your original run replayed exactly.',
    'Original: All 30 people got out in 25.2 s.',
    'New run: All 30 people got out in 45.9 s.',
    'Everyone got out 20.7 s later in the new run.'
  ]);
  assert.match(review.comparison(run, later, cleared, 0)[0], /^Warning/);
  assert.equal(review.comparison(run, cleared, expired, 0)[3], 'The new run got 8 fewer people out.');
});
test('outcome names the longest line when the run recorded one', () => {
  assert.equal(review.outcome({ evacuated: 30, remaining: 0, ticks: 321, peakQueue: 14, peakExit: 'B' }),
    'All 30 people got out in 32.1 s. Longest line: 14 people at Exit B.');
});
test('timeline labels calm and result tracks calmed and panicking', () => {
  assert.deepEqual(review.timeline([{ tick: 110, action: 'calm', target: 5 }]),
    ['11.0 s · Reassured person 5']);
  const sim = require('../public/simulation');
  const state = sim.createState({ hazardTick: 100 });
  while (state.tick <= 100) sim.step(state);
  const id = state.people.find(p => p.panic).id;
  for (let i = 0; i < 20 && state.people.find(p => p.id === id).panic; i++) {
    sim.act(state, 'calm', id);
    sim.step(state);
  }
  assert.equal(state.people.find(p => p.id === id).panic, false);
  const r = review.result(state);
  assert.ok(r.calmed >= 1);
  assert.ok(r.panicking >= 0);
  assert.match(review.outcome(r), /Calmed/);
});
