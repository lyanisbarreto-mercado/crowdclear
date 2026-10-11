const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function sensor() {
  const callbacks = {};
  const posts = [];
  let now = 10000;
  class FakeSDK {
    on(name, callback) { callbacks[name] = callback; }
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
    breathingMetrics: [], cardioMetrics: [], decodeMetrics: sample => sample,
    Date: { now: () => now },
    fetch: async (url, options) => { posts.push({ at: now, ...JSON.parse(options.body) }); return { ok: true }; },
    console: { log() {}, error() {} },
    process: {
      env: { PRESAGE_API_KEY: 'test-only-key' },
      platform: 'linux', arch: 'x64',
      on() {}, exit() { throw new Error('Unexpected sensor exit'); }
    }
  });
  return {
    callbacks, posts,
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

test('failed readiness clears a confident sample and kOk cannot resurrect it without metrics', () => {
  const helper = sensor();
  helper.metrics();
  assert.equal(helper.posts.at(-1).rate, 20.1);
  assert.equal(helper.posts.at(-1).amplitude, 1.2);
  assert.equal(helper.posts.at(-1).stress, 35);
  for (const [time, code, hint] of [[20000, 1, 'No face found'], [50000, 7, 'Chest not visible']]) {
    helper.at(time);
    helper.callbacks.validationStatus(code, 0, hint);
    assert.deepEqual(helper.posts.at(-1), { at: time, ...cleared, hint });
    helper.at(time + 10000);
    helper.callbacks.validationStatus(0, 0, '');
    assert.deepEqual(helper.posts.at(-1), { at: time + 10000, ...cleared, hint: '' });
    helper.at(time + 20000);
    helper.metrics();
    assert.equal(helper.posts.at(-1).rate, 20.1, 'new metrics can establish a new reading');
  }
});

test('kOk hint callbacks do not repost an aging numeric sample as fresh', () => {
  const helper = sensor();
  helper.metrics();
  helper.at(20000);
  helper.callbacks.validationStatus(0, 0, '');
  helper.at(30000);
  helper.callbacks.validationStatus(0, 0, '');
  assert.equal(helper.posts.length, 1, 'only a metrics event may renew numeric sample freshness');
  assert.equal(helper.posts[0].at, 10000);
});

test('SDK errors clear numeric samples and publish their hint', () => {
  const helper = sensor();
  helper.metrics();
  helper.at(20000);
  helper.callbacks.error(4, 'Camera disconnected');
  assert.deepEqual(helper.posts.at(-1), { at: 20000, ...cleared, hint: 'Camera disconnected' });
  helper.at(30000);
  helper.callbacks.validationStatus(0, 0, '');
  assert.equal(helper.posts.at(-1).rate, null);
});

test('long SDK hints still fit the server boundary so invalidation is accepted', () => {
  const helper = sensor();
  const hint = 'Camera unavailable. '.repeat(30);
  helper.metrics();
  helper.callbacks.validationStatus(1, 0, hint);
  assert.equal(helper.posts.at(-1).hint, hint.slice(0, 200));
  assert.equal(helper.posts.at(-1).rate, null);
  helper.at(20000);
  helper.metrics();
  helper.callbacks.error(4, hint);
  assert.equal(helper.posts.at(-1).hint, hint.slice(0, 200));
  assert.equal(helper.posts.at(-1).rate, null);
});
