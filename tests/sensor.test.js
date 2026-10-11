const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function sensor({ platform = 'linux', response = { ok: true }, failure } = {}) {
  const callbacks = {};
  const posts = [];
  const logs = [];
  const pending = [];
  const fetchInCallback = [];
  let inCallback = false;
  let now = 10000;
  class FakeSDK {
    on(name, callback) {
      callbacks[name] = (...args) => {
        inCallback = true;
        try { return callback(...args); } finally { inCallback = false; }
      };
    }
    useCamera() {}
    start() {}
  }
  const source = fs.readFileSync(path.join(__dirname, '../sensor/presage.mjs'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^const require = createRequire\(import\.meta\.url\);\r?\n/m, '')
    .replace(/^const here = path\.dirname\(fileURLToPath\(import\.meta\.url\)\);\r?\n/m, '')
    .replace(/^if \(process\.platform === 'win32' && !process\.env\.SMARTSPECTRA_CAPI_PATH\) \{\r?\n[\s\S]*?\r?\n\}\r?\n/m, '')
    .replace(/^const \{\s*[\s\S]*?\}\s*=\s*await import\([^)]+\);\r?\n/m, '');
  vm.runInNewContext(source, {
    SmartSpectraSDK: FakeSDK, CameraSelection: { default: 0 }, ValidationCode: { kOk: 0 },
    SmartSpectraErrorCode: { kNetworkError: 5, kProcessingFailed: 8 },
    breathingMetrics: [], cardioMetrics: [], decodeMetrics: sample => sample,
    Date: { now: () => now },
    setImmediate: callback => pending.push(callback),
    fetch: async (url, options) => {
      fetchInCallback.push(inCallback);
      posts.push({ at: now, ...JSON.parse(options.body) });
      if (failure) throw failure;
      return response;
    },
    console: { log: message => logs.push(message), error: message => logs.push(message) },
    process: {
      env: {
        PRESAGE_API_KEY: 'test-only-key', BREATHING_TOKEN: 'test-only-token',
        BREATHING_URL: 'https://test-user:test-password@example.test/api/breathing?secret=test-secret'
      },
      platform, arch: 'x64',
      on() {}, exit() { throw new Error('Unexpected sensor exit'); }
    }
  });
  return {
    callbacks, posts, logs, fetchInCallback,
    async flush() {
      while (pending.length) pending.shift()();
      await new Promise(resolve => setImmediate(resolve));
    },
    at(time) { now = time; },
    metrics() {
      callbacks.metrics({
        breathing: {
          rate: [{ value: 20.1, confidence: 80, stable: true }],
          amplitude: [{ value: 1.2, stable: true }]
        },
        cardio: {
          pulseRate: [{ value: 78, confidence: 75, stable: true }],
          hrv: [{ baevsky: 35, confidence: 60, stable: true }]
        }
      });
    }
  };
}

const cleared = {
  rate: null, pulse: null, amplitude: null, stress: null,
  confidence: 0, stable: false
};

test('failed readiness clears a confident sample and kOk cannot resurrect it without metrics', async () => {
  const helper = sensor();
  helper.metrics();
  await helper.flush();
  assert.equal(helper.posts.at(-1).rate, 20.1);
  assert.equal(helper.posts.at(-1).amplitude, 1.2);
  assert.equal(helper.posts.at(-1).stress, 35);
  for (const [time, code, hint] of [[20000, 1, 'No face found'], [50000, 7, 'Chest not visible']]) {
    helper.at(time);
    helper.callbacks.validationStatus(code, 0, hint);
    await helper.flush();
    assert.deepEqual(helper.posts.at(-1), { at: time, ...cleared, hint });
    helper.at(time + 10000);
    helper.callbacks.validationStatus(0, 0, '');
    await helper.flush();
    assert.deepEqual(helper.posts.at(-1), { at: time + 10000, ...cleared, hint: '' });
    helper.at(time + 20000);
    helper.metrics();
    await helper.flush();
    assert.equal(helper.posts.at(-1).rate, 20.1, 'new metrics can establish a new reading');
  }
});

test('kOk hint callbacks do not repost an aging numeric sample as fresh', async () => {
  const helper = sensor();
  helper.metrics();
  await helper.flush();
  helper.at(20000);
  helper.callbacks.validationStatus(0, 0, '');
  await helper.flush();
  helper.at(30000);
  helper.callbacks.validationStatus(0, 0, '');
  await helper.flush();
  assert.equal(helper.posts.length, 1, 'only a metrics event may renew numeric sample freshness');
  assert.equal(helper.posts[0].at, 10000);
});

test('SDK errors clear numeric samples and publish their hint', async () => {
  const helper = sensor();
  helper.metrics();
  await helper.flush();
  helper.at(20000);
  helper.callbacks.error(7, 'Camera disconnected');
  await helper.flush();
  assert.deepEqual(helper.posts.at(-1), { at: 20000, ...cleared, hint: 'SmartSpectra error 7: Camera disconnected' });
  helper.at(30000);
  helper.callbacks.validationStatus(0, 0, '');
  await helper.flush();
  assert.equal(helper.posts.at(-1).rate, null);
});

test('long SDK hints still fit the server boundary so invalidation is accepted', async () => {
  const helper = sensor();
  const hint = 'Camera unavailable. '.repeat(30);
  helper.metrics();
  helper.callbacks.validationStatus(1, 0, hint);
  await helper.flush();
  assert.equal(helper.posts.at(-1).hint, hint.slice(0, 200));
  assert.equal(helper.posts.at(-1).rate, null);
  helper.at(20000);
  helper.metrics();
  helper.callbacks.error(7, hint);
  await helper.flush();
  assert.equal(helper.posts.at(-1).hint, `SmartSpectra error 7: ${hint}`.slice(0, 200));
  assert.equal(helper.posts.at(-1).rate, null);
});

test('uploads leave the native callback and preserve each event snapshot', async () => {
  const helper = sensor();
  helper.metrics();
  helper.metrics();
  helper.callbacks.validationStatus(1, 0, 'No face found');
  helper.callbacks.error(4, 'Credit exhausted');
  assert.equal(helper.posts.length, 0, 'fetch must wait until native callbacks return');
  await helper.flush();
  assert.deepEqual(helper.fetchInCallback, [false, false, false]);
  assert.equal(helper.posts[0].rate, 20.1);
  assert.deepEqual(helper.posts[1], { at: 10000, ...cleared, hint: 'No face found' });
  assert.deepEqual(helper.posts[2], { at: 10000, ...cleared, hint: 'SmartSpectra error 4: Credit exhausted' });
  assert.equal(helper.posts.length, 3, 'same-tick metrics stay throttled before fetch starts');
});

test('upload errors distinguish HTTP rejection from connection failure without leaking secrets', async () => {
  const denied = sensor({ response: { ok: false, status: 403 } });
  denied.metrics();
  await denied.flush();
  assert.match(denied.logs.join('\n'), /upload rejected.*HTTP 403/i);
  const disconnected = sensor({ failure: Object.assign(new Error('https://test-user:test-password@example.test/?secret=test-secret'), { cause: { code: 'ECONNRESET' } }) });
  disconnected.metrics();
  await disconnected.flush();
  assert.match(disconnected.logs.join('\n'), /upload failed.*ECONNRESET/i);
  const unknown = sensor({ failure: new Error('https://test-user:test-password@example.test/?secret=test-secret') });
  unknown.metrics();
  await unknown.flush();
  assert.match(unknown.logs.join('\n'), /upload failed/i);
  for (const helper of [denied, disconnected, unknown]) {
    assert.doesNotMatch(helper.logs.join('\n'), /test-user|test-password|test-secret|test-only-key|test-only-token|example\.test/);
  }
});

test('SDK hints distinguish network verification from Windows processing failure and remain bounded', async () => {
  const helper = sensor({ platform: 'win32' });
  helper.metrics();
  await helper.flush();
  helper.callbacks.error(5, 'Entitlement unavailable', true);
  await helper.flush();
  assert.match(helper.posts.at(-1).hint, /error 5.*Presage network verification/i);
  assert.equal(helper.posts.at(-1).rate, null);
  assert.match(helper.logs.join('\n'), /error 5.*retryable=true.*Entitlement unavailable/);
  helper.callbacks.error(8, 'Processing failed. '.repeat(30), false);
  await helper.flush();
  assert.match(helper.posts.at(-1).hint, /error 8.*processing failed.*supported USB camera/i);
  assert.equal(helper.posts.at(-1).hint.length, 200);
  assert.equal(helper.posts.at(-1).rate, null);
  const otherPlatform = sensor();
  otherPlatform.callbacks.error(8, 'Processing failed', false);
  await otherPlatform.flush();
  assert.doesNotMatch(otherPlatform.posts.at(-1).hint, /USB camera/);
});
