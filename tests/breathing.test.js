const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
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

test('network clients cannot read or replace local breathing data', async t => {
  const address = Object.values(os.networkInterfaces()).flat().find(info => !info.internal && info.family === 'IPv4')?.address;
  if (!address) return t.skip('No non-loopback IPv4 interface is available.');
  await post({ rate: 18, confidence: 83, stable: true, hint: '' });
  const url = `http://${address}:${server.address().port}/api/breathing`;
  for (const method of ['GET', 'POST']) {
    const res = await fetch(url, {
      method, signal: AbortSignal.timeout(3000),
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '127.0.0.1' },
      ...(method === 'POST' ? { body: JSON.stringify({ rate: 1, confidence: 99 }) } : {})
    });
    assert.equal(res.status, 403, `${method} must use the socket address, not forwarded headers`);
    const body = await res.json();
    assert.deepEqual(Object.keys(body), ['error'], 'denial must contain no biometric fields');
    assert.equal(typeof body.error, 'string');
  }
  const local = await (await fetch(`${base}/api/breathing`)).json();
  assert.equal(local.rate, 18, 'a denied write leaves the local reading intact');
});
