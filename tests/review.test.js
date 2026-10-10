const { test } = require('node:test');
const assert = require('node:assert/strict');
const review = require('../public/review');
const cleared = { evacuated: 30, remaining: 0, ticks: 252 };
const expired = { evacuated: 22, remaining: 8, ticks: 900 };
test('outcome distinguishes early completion from time expiry', () => {
  assert.equal(review.outcome(cleared), 'All 30 people evacuated in 25.2 s.');
  assert.equal(review.outcome(expired), 'Time ran out after 90.0 s. 22 of 30 people evacuated; 8 still inside.');
});
test('timeline lists actions in seconds and handles a run with none', () => {
  assert.deepEqual(review.timeline([{ tick: 0, action: 'open-exit' }, { tick: 52, action: 'redirect' }]),
    ['0.0 s · Opened Exit B', '5.2 s · Redirected crowd to Exit B']);
  assert.deepEqual(review.timeline([]), ['No actions taken during the drill.']);
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
    'Original: All 30 people evacuated in 25.2 s.',
    'Alternative: All 30 people evacuated in 45.9 s.',
    'The alternative cleared the venue 20.7 s later.'
  ]);
  assert.match(review.comparison(run, later, cleared, 0)[0], /^Warning/);
  assert.equal(review.comparison(run, cleared, expired, 0)[3], 'The alternative evacuated 8 fewer people.');
});
