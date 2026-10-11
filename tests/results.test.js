const { test } = require('node:test');
const assert = require('node:assert/strict');
const review = require('../public/review');
test('score rewards completed evacuation timing independently of open-door count', () => {
  const result = review.score({ evacuated: 30, remaining: 0, seconds: 45 }, { A: true, B: true, C: true });
  assert.equal(result.score, 75);
  assert.equal(review.score({ evacuated: 30, remaining: 0, seconds: 45 }, { A: true, B: false, C: true }).score, 75);
  assert.equal(review.score({ evacuated: 30, remaining: 0, seconds: 20 }, {}).score, 50);
  assert.equal(review.score({ evacuated: 20, remaining: 10, seconds: 45 }, {}).score, 20);
  assert.equal(result.message, 'Outstanding!');
  const unfinished = review.score({ evacuated: 0, remaining: 30, seconds: 0 }, { A: true, B: false, C: true });
  assert.match(unfinished.tip, /clear the blocked door early/i);
});
