const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('score breakdown adds evacuated people and time before applying open-exit multiplier', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync('public/review.js', 'utf8'), context);
  assert.equal(typeof context.window.CrowdReview?.result, 'function');
  const result = context.window.CrowdReview.result({ evacuated: 30, remaining: 0, seconds: 45 }, { A: true, B: true, C: true });
  assert.equal(result.score, 225);
  assert.equal(result.message, 'Outstanding!');
  const unfinished = context.window.CrowdReview.result({ evacuated: 0, remaining: 30, seconds: 0 }, { A: true, B: false, C: true });
  assert.match(unfinished.tip, /try/i);
});
