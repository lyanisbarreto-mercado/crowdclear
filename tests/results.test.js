const { test } = require('node:test');
const assert = require('node:assert/strict');
const review = require('../public/review');
test('score breakdown adds evacuated people and time before applying open-exit multiplier', () => {
  const result = review.score({ evacuated: 30, remaining: 0, seconds: 45 }, { A: true, B: true, C: true });
  assert.equal(result.score, 225);
  assert.equal(result.message, 'Outstanding!');
  const unfinished = review.score({ evacuated: 0, remaining: 30, seconds: 0 }, { A: true, B: false, C: true });
  assert.match(unfinished.tip, /try/i);
});
