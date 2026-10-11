const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const sim = require('../public/simulation');
const review = require('../public/review');
const app = require('../server');

let server;
let base;
const commands = [{ tick: 0, action: 'clear-hazard', target: 'B' }, { tick: sim.CLEAR_DURATION, action: 'open-exit', target: 'B' }, { tick: 45, action: 'redirect', target: 'B' }];
function played(schedule, blockedExit = 'B') {
  const state = sim.createState({ blockedExit });
  while (!sim.isDone(state)) sim.step(state, schedule);
  return review.result(state);
}
const run = { id: '0b9f6c1e-4a57-4d7e-9a8b-2f1c3d4e5f60', version: sim.VERSION, blockedExit: 'B', commands, result: played(commands) };
const post = body => fetch(`${base}/api/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

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

test('retries compare canonical content with JSONB equality regardless of object key order', async () => {
  const reordered = {
    ...run,
    commands: commands.map(({ tick, action, target }) => ({ target, action, tick, ignored: true })),
    result: { ...Object.fromEntries(Object.entries(run.result).reverse()), ignored: true }
  };
  assert.equal((await post(reordered)).status, 200);
  assert.deepEqual(await (await fetch(`${base}/api/runs/${run.id}`)).json(), run);
});

test('reusing an id for a different valid record returns conflict and preserves the original', async () => {
  const changed = { ...run, commands: [], result: played([]) };
  const res = await post(changed);
  assert.equal(res.status, 409);
  assert.equal(typeof (await res.json()).error, 'string');
  assert.deepEqual(await (await fetch(`${base}/api/runs/${run.id}`)).json(), run);
});

test('scenario and nullable incident onset are part of retry identity', async () => {
  const id = '4c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
  const initial = { ...run, id, blockedExit: 'A', commands: [], result: played([], 'A') };
  assert.equal((await post(initial)).status, 201);
  assert.equal((await post({ ...initial, hazardTick: null })).status, 200);
  assert.equal((await post({ ...initial, blockedExit: 'C', result: played([], 'C') })).status, 409);
  const timed = sim.createState({ hazardTick: 150 });
  while (!sim.isDone(timed)) sim.step(timed);
  assert.equal((await post({ ...initial, blockedExit: timed.blockedExit, hazardTick: 150, result: review.result(timed) })).status, 409);
  assert.deepEqual(await (await fetch(`${base}/api/runs/${id}`)).json(), initial);
});

test('concurrent identical retries store once, and differing retries report the losing conflict', async () => {
  const identical = { ...run, id: '5c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f' };
  const retries = await Promise.all([post(identical), post(identical)]);
  assert.deepEqual(retries.map(res => res.status).sort(), [200, 201]);
  assert.deepEqual(await (await fetch(`${base}/api/runs/${identical.id}`)).json(), identical);
  const first = { ...run, id: '6c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f' };
  const second = { ...first, commands: [], result: played([]) };
  const attempts = await Promise.all([post(first), post(second)]);
  assert.deepEqual(attempts.map(res => res.status).sort(), [201, 409]);
  const winner = attempts[0].status === 201 ? first : second;
  assert.deepEqual(await (await fetch(`${base}/api/runs/${first.id}`)).json(), winner);
  const { rows } = await app.locals.db.query('SELECT count(*)::int AS n FROM runs WHERE id IN ($1, $2)', [identical.id, first.id]);
  assert.equal(rows[0].n, 2);
});

test('the server refuses records its own replay cannot reproduce', async () => {
  const id = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
  const early = [{ tick: 0, action: 'open-exit', target: 'B' }, { tick: 5, action: 'clear-hazard', target: 'B' }];
  assert.equal((await post({ ...run, id, commands: early, result: played(early) })).status, 400, 'opening Exit B before its hazard is cleared');
  assert.equal((await post({ ...run, id, blockedExit: 'A' })).status, 400, 'clearing Exit B fails when the hazard is at Exit A');
  assert.equal((await post({ ...run, id, blockedExit: 'D' })).status, 400, 'unknown scenario');
  assert.equal((await post({ ...run, id, result: { ...run.result, ticks: 1 } })).status, 422, 'tampered result');
  assert.equal((await post({ ...run, id, version: sim.VERSION + 1 })).status, 400, 'other simulation version');
  assert.equal((await post({ ...run, id, version: sim.VERSION - 1 })).status, 400, 'older crowd rules');
  assert.equal((await post({ ...run, id: 'not-a-uuid' })).status, 400);
  assert.equal((await post({ ...run, id, commands: [null] })).status, 400);
  assert.equal((await fetch(`${base}/api/runs/${id}`)).status, 404);
  assert.equal((await fetch(`${base}/api/runs/not-a-uuid`)).status, 404);
});
test('saved commands cannot reopen a door before its clearing work has finished', async () => {
  const id = '3c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
  const early = [{ tick: 0, action: 'clear-hazard', target: 'B' }, { tick: sim.CLEAR_DURATION - 1, action: 'open-exit', target: 'B' }];
  assert.equal((await post({ ...run, id, commands: early, result: played(early) })).status, 400);
  assert.equal((await fetch(`${base}/api/runs/${id}`)).status, 404);
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

test('timed incident saves and reopens with its fixed exit and onset', async () => {
  const state = sim.createState({ hazardTick: 150 });
  const schedule = [
    { tick: 151, action: 'clear-hazard', target: 'A' },
    { tick: 151 + sim.CLEAR_DURATION, action: 'open-exit', target: 'A' },
    { tick: 160, action: 'redirect', target: 'B' }
  ];
  while (!sim.isDone(state)) sim.step(state, schedule);
  const timed = { id: '2c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f', version: sim.VERSION,
    blockedExit: 'A', hazardTick: 150, commands: state.commands, result: review.result(state) };
  assert.equal((await post(timed)).status, 201);
  assert.deepEqual(await (await fetch(`${base}/api/runs/${timed.id}`)).json(), timed);
  assert.equal((await post({ ...timed, hazardTick: 50 })).status, 400);
  assert.equal((await post({ ...timed, blockedExit: 'C' })).status, 400);
});

test('multiple-incident scenario saves and reloads its count without losing blockages', async () => {
  const state = sim.createState({ hazardTick: 140, incidentCount: 3 });
  while (!sim.isDone(state)) sim.step(state);
  const record = { id: '3c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f', version: sim.VERSION,
    blockedExit: state.blockedExit, hazardTick: 140, incidentCount: 3, commands: [], result: review.result(state) };
  assert.equal((await post(record)).status, 201);
  assert.equal((await post(record)).status, 200);
  const reopened = await (await fetch(`${base}/api/runs/${record.id}`)).json();
  assert.deepEqual(reopened, record);
  assert.equal((await post({ ...record, incidentCount: 4 })).status, 400);
});
