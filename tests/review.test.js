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
    ['0.0 s  Clear hazard · Exit A', '0.0 s  Open door · Exit A', '5.2 s  Redirect crowd · Exit C']);
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
    ['11.0 s  Reassure guest #5']);
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
test('vitals are a short Presage scale and always compare to the best run', () => {
  assert.equal(review.vitals({ practice: [], drill: [] }), '');
  assert.match(review.vitals({ practice: [14, 14], drill: [20, 20] }), /^Presage \d+\/10 · .+ · baseline$/);
  const tense = review.vitals({
    practice: [{ rate: 14, pulse: 70 }, { rate: 14, pulse: 72 }],
    drill: [{ rate: 18, pulse: 88 }, { rate: 20, pulse: 90 }]
  }, { rate: 14, pulse: 70 });
  assert.match(tense, /^Presage \d+\/10 · /);
  assert.match(tense, /best \d+\/10/);
  assert.equal(review.calmerThan({ rate: 13, pulse: 68 }, { rate: 16, pulse: 80 }), true);
});
test('compareBest summarizes current against the stored best with metric tones', () => {
  const baseline = review.compareBest(
    { evacuated: 40, remaining: 20, ticks: 900, calmed: 2, panicking: 3 },
    null,
    { seconds: 0, score: 40 }
  );
  assert.match(baseline.headline, /baseline/);
  assert.equal(baseline.rows.find(r => r.label === 'Score').tone, 'signal');
  const vs = review.compareBest(
    { evacuated: 50, remaining: 10, ticks: 900, calmed: 4, panicking: 1 },
    { evacuated: 40, remaining: 20, ticks: 900, calmed: 2, panicking: 3 },
    { seconds: 0, score: 50 },
    { seconds: 0, score: 40 }
  );
  assert.match(vs.headline, /beats your best|more people out/i);
  assert.equal(vs.rows.find(r => r.label === 'People out').best, 40);
  assert.equal(vs.rows.find(r => r.label === 'Still panicking').tone, 'stop');
});
test('report mirrors laptop analytics fields for VR score text', () => {
  const report = review.report({
    result: { evacuated: 30, remaining: 0, ticks: 300, peakQueue: 12, peakExit: 'B', calmed: 2, panicking: 1 },
    score: { seconds: 30, exits: 3, score: 60, message: 'Outstanding!', tip: 'Everyone got out. Try another drill.' },
    total: 30,
    commands: [{ tick: 50, action: 'open-exit', target: 'B' }, { tick: 110, action: 'calm', target: 4 }],
    vitalsText: 'Presage 8/10 · Steady · baseline'
  });
  assert.equal(report.vitals, 'Presage 8/10 · Steady · baseline');
  assert.match(report.analysis, /slider|side-by-side|scrub/i);
  assert.ok(!report.metrics.some(line => /Open exits/i.test(line)));
  assert.deepEqual(report.briefLines, ['Drill complete', 'Outstanding!', 'Analysis is in the center panel. Compare is on your right.']);
});
