const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});
after(() => {
  server.close();
  server.closeAllConnections();
});
const post = body => fetch(`${base}/api/breathing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('the local Presage helper can post a breathing reading and the page can read it back', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/breathing`)).json(), { available: false }, 'nothing before the helper posts');
  assert.equal((await post({ rate: 15.5, confidence: 82, stable: true, hint: '' })).status, 204);
  const reading = await (await fetch(`${base}/api/breathing`)).json();
  assert.equal(reading.available, true);
  assert.equal(reading.rate, 15.5);
  assert.equal(reading.confidence, 82);
});
test('readings that are not breathing data are refused', async () => {
  assert.equal((await post({ rate: 500, confidence: 80 })).status, 400);
  assert.equal((await post({ rate: 15, confidence: 900 })).status, 400);
  assert.equal((await post({ rate: 'fast', confidence: 80 })).status, 400);
});
