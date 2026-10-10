const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const sim = require('../public/simulation');
const review = require('../public/review');
const app = require('../server');

let server;
let base;
const commands = [{ tick: 0, action: 'clear-hazard', target: 'B' }, { tick: 0, action: 'open-exit', target: 'B' }, { tick: 45, action: 'redirect', target: 'B' }];
function played(schedule, blockedExit = 'B') {
  const state = sim.createState({ blockedExit });
  while (!sim.isDone(state)) sim.step(state, schedule);
  return review.result(state);
}
const run = { id: '0b9f6c1e-4a57-4d7e-9a8b-2f1c3d4e5f60', version: sim.VERSION, blockedExit: 'B', commands, result: played(commands) };
const post = body => fetch(`${base}/api/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

before(async () => {
  app.locals.db = new PGlite();
  await app.locals.db.query(fs.readFileSync('schema.sql', 'utf8'));
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});
after(async () => {
  server.close();
  server.closeAllConnections();
  await app.locals.db?.close();
});

test('a saved run reopens with the same commands and result, and a retried save stores no duplicate', async () => {
  assert.equal((await post(run)).status, 201);
  assert.equal((await post(run)).status, 200);
  const { rows } = await app.locals.db.query('SELECT count(*)::int AS n FROM runs');
  assert.equal(rows[0].n, 1);
  const res = await fetch(`${base}/api/runs/${run.id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), run);
});

test('the server refuses records its own replay cannot reproduce', async () => {
  const id = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
  const early = [{ tick: 0, action: 'open-exit', target: 'B' }, { tick: 5, action: 'clear-hazard', target: 'B' }];
  assert.equal((await post({ ...run, id, commands: early, result: played(early) })).status, 400, 'opening Exit B before its hazard is cleared');
  assert.equal((await post({ ...run, id, blockedExit: 'A' })).status, 400, 'clearing Exit B fails when the hazard is at Exit A');
  assert.equal((await post({ ...run, id, blockedExit: 'D' })).status, 400, 'unknown scenario');
  assert.equal((await post({ ...run, id, result: { ...run.result, ticks: 1 } })).status, 422, 'tampered result');
  assert.equal((await post({ ...run, id, version: sim.VERSION + 1 })).status, 400, 'other simulation version');
  assert.equal((await post({ ...run, id: 'not-a-uuid' })).status, 400);
  assert.equal((await post({ ...run, id, commands: [null] })).status, 400);
  assert.equal((await fetch(`${base}/api/runs/${id}`)).status, 404);
  assert.equal((await fetch(`${base}/api/runs/not-a-uuid`)).status, 404);
});

test('without a database, saving reports that it is not set up instead of pretending', async () => {
  const db = app.locals.db;
  app.locals.db = null;
  try {
    const res = await post(run);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /not set up/);
  } finally {
    app.locals.db = db;
  }
});
