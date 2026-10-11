// Reads breathing (+ pulse when authorized) from the laptop webcam with Presage SmartSpectra
// and posts to the CrowdClear server on localhost. Metrics are on-device; Presage only gates the API key.
// On Windows ARM, start via `npm run sensor` so scripts/run-sensor.js uses portable x64 Node.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
if (process.platform === 'win32' && !process.env.SMARTSPECTRA_CAPI_PATH) {
  const x64 = path.join(here, 'node_modules', '@smartspectra', 'node-sdk-win32-x64', 'smartspectra_capi.dll');
  process.env.SMARTSPECTRA_CAPI_PATH = x64;
}

const {
  SmartSpectraSDK, CameraSelection, ValidationCode, SmartSpectraErrorCode, breathingMetrics, cardioMetrics, decodeMetrics
} = await import('@smartspectra/node-sdk');

const apiKey = process.env.PRESAGE_API_KEY || process.env.SMARTSPECTRA_API_KEY;
if (!apiKey) {
  console.error('Set PRESAGE_API_KEY (or SMARTSPECTRA_API_KEY) in .env or .env.local first.');
  process.exit(1);
}
if (process.platform === 'win32' && process.arch === 'arm64') {
  console.error('Presage native runtime needs x64 Node. Use `npm run sensor` (portable x64 under tools/).');
  process.exit(1);
}

const endpoint = process.env.BREATHING_URL
  || process.env.PRESAGE_ENDPOINT
  || `http://localhost:${process.env.PORT || 3000}/api/breathing`;
const postHeaders = {
  'Content-Type': 'application/json',
  ...(process.env.BREATHING_TOKEN ? { 'x-breathing-token': process.env.BREATHING_TOKEN } : {})
};
let reading = {
  rate: null, pulse: null, amplitude: null, stress: null,
  confidence: 0, stable: false, hint: 'Starting the camera…'
};
let lastPost = 0;

async function post() {
  lastPost = Date.now();
  try {
    const body = JSON.stringify(reading);
    // Fetch must start after returning from the native SDK callback.
    await new Promise(resolve => setImmediate(resolve));
    const response = await fetch(endpoint, { method: 'POST', headers: postHeaders, body });
    if (!response.ok) console.error(`Breathing upload rejected: HTTP ${response.status}. Check server access and BREATHING_TOKEN.`);
  } catch (error) {
    console.error(`Breathing upload failed: ${error.cause?.code || error.code || 'network error'}. Check the CrowdClear server connection.`);
  }
}

const sdk = new SmartSpectraSDK({
  apiKey,
  requestedMetrics: [...breathingMetrics, ...cardioMetrics]
});
sdk.on('metrics', buf => {
  const metrics = decodeMetrics(buf);
  const breath = metrics.breathing?.rate?.at(-1);
  const pulse = metrics.cardio?.pulseRate?.at(-1);
  const amplitude = metrics.breathing?.amplitude?.at(-1);
  const hrv = metrics.cardio?.hrv?.at(-1);
  if (!breath && !pulse && !amplitude && !hrv) return;
  const sample = breath || pulse || amplitude || hrv;
  reading = {
    ...reading,
    rate: breath ? breath.value : reading.rate,
    pulse: pulse ? pulse.value : reading.pulse,
    amplitude: amplitude ? amplitude.value : reading.amplitude,
    // Baevsky stress index from HRV — higher means more autonomic stress.
    stress: hrv && hrv.baevsky != null ? hrv.baevsky : reading.stress,
    confidence: sample.confidence ?? reading.confidence,
    stable: sample.stable ?? reading.stable
  };
  if (Date.now() - lastPost > 1000) post();
});
sdk.on('validationStatus', (code, ts, hint) => {
  if (code === ValidationCode.kOk) {
    reading = { ...reading, hint: '' };
    if (reading.rate !== null || reading.pulse !== null || reading.amplitude !== null) return;
  } else {
    reading = {
      rate: null, pulse: null, amplitude: null, stress: null,
      confidence: 0, stable: false, hint: String(hint || '').slice(0, 200)
    };
  }
  post();
});
sdk.on('error', (code, message, retryable) => {
  console.error(`SmartSpectra error ${code} (retryable=${retryable}): ${message}`);
  let hint = `SmartSpectra error ${code}: `;
  if (code === SmartSpectraErrorCode.kNetworkError) hint += 'Presage network verification failed. ';
  if (code === SmartSpectraErrorCode.kProcessingFailed && process.platform === 'win32') {
    hint += 'Processing failed. Use a supported USB camera on Windows. ';
  }
  reading = {
    rate: null, pulse: null, amplitude: null, stress: null,
    confidence: 0, stable: false, hint: (hint + String(message || 'Sensor unavailable.')).slice(0, 200)
  };
  post();
});

sdk.useCamera(CameraSelection.default);
sdk.start();
console.log(`Measuring vitals from the default camera (${process.arch}); uploading to CrowdClear. Ctrl+C to stop.`);
process.on('SIGINT', async () => {
  reading = {
    rate: null, pulse: null, amplitude: null, stress: null,
    confidence: 0, stable: false, hint: 'Breathing sensor stopped.'
  };
  await post();
  await sdk.stopAsync();
  await sdk.destroy();
  process.exit(0);
});
