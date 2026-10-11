const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const sim = require('../public/simulation');
const review = require('../public/review');
const app = require('../server');

let server;
let base;

before(async () => {
  app.locals.db = new PGlite();
  await app.locals.db.exec(fs.readFileSync('schema.sql', 'utf8'));
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  server.closeAllConnections();
  await app.locals.db.close();
});

test('a live incident-tick redirect saves and reopens as the same run', async () => {
  const state = sim.createState({ hazardTick: 100 });
  while (state.tick < state.hazardTick) sim.step(state);
  assert.equal(sim.act(state, 'redirect', 'B'), true);
  while (!sim.isDone(state)) sim.step(state);
  const run = { id: 'fd29e8fb-1505-4d28-b0b5-b5fb0efc2d80', version: sim.VERSION,
    blockedExit: state.blockedExit, hazardTick: state.hazardTick,
    commands: state.commands, result: review.result(state) };
  const response = await fetch(`${base}/api/runs`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(run) });
  assert.equal(response.status, 201, 'the server must accept a valid live boundary record');
  assert.deepEqual(await response.json(), { id: run.id });
  const reopened = await fetch(`${base}/api/runs/${run.id}`);
  assert.equal(reopened.status, 200);
  assert.deepEqual(await reopened.json(), run);
});
