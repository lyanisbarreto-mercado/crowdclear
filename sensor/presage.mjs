// Reads breathing rate from the laptop webcam with Presage SmartSpectra and posts it to the CrowdClear server
// on this machine, which only accepts readings from localhost. Metrics are computed on-device; Presage's
// backend only checks the API key. Run from the repo root with `npm run sensor`, next to `npm start`.
import { SmartSpectraSDK, CameraSelection, ValidationCode, breathingMetrics, decodeMetrics } from '@smartspectra/node-sdk';

const apiKey = process.env.PRESAGE_API_KEY || process.env.SMARTSPECTRA_API_KEY;
if (!apiKey) {
  console.error('Set PRESAGE_API_KEY in .env or .env.local first.');
  process.exit(1);
}
const endpoint = `http://localhost:${process.env.PORT || 3000}/api/breathing`;
let reading = { rate: null, confidence: 0, stable: false, hint: 'Starting the camera…' };
let lastPost = 0;

async function post() {
  lastPost = Date.now();
  try {
    await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reading) });
  } catch {
    console.error(`Could not reach ${endpoint}; is npm start running?`);
  }
}

const sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: [...breathingMetrics] });
sdk.on('metrics', buf => {
  const sample = decodeMetrics(buf).breathing?.rate?.at(-1);
  if (!sample) return;
  reading = { ...reading, rate: sample.value, confidence: sample.confidence, stable: sample.stable };
  if (Date.now() - lastPost > 1000) post();
});
sdk.on('validationStatus', (code, ts, hint) => {
  reading = { ...reading, hint: code === ValidationCode.kOk ? '' : hint };
  post();
});
sdk.on('error', (code, message) => console.error(`SmartSpectra error ${code}: ${message}`));

sdk.useCamera(CameraSelection.default);
sdk.start();
console.log(`Measuring breathing from the default camera; posting to ${endpoint}. Ctrl+C to stop.`);
process.on('SIGINT', async () => {
  reading = { rate: null, confidence: 0, stable: false, hint: 'Breathing sensor stopped.' };
  await post();
  await sdk.stopAsync();
  await sdk.destroy();
  process.exit(0);
});
