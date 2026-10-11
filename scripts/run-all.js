const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { sensorCommand } = require('./run-sensor');

const root = path.join(__dirname, '..');

async function start() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be a number from 1 to 65535.');
    process.exitCode = 1;
    return;
  }
  const children = new Set();
  let stopping = false;
  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    for (const child of children) child.kill('SIGINT');
    if (!children.size) return;
    const timeout = setTimeout(() => {
      for (const child of children) child.kill('SIGKILL');
    }, 3000);
    timeout.unref();
  }
  function launch(name, command, args, cwd, required) {
    const child = spawn(command, args, { cwd, stdio: 'inherit', env: process.env, windowsHide: true });
    children.add(child);
    child.once('error', error => {
      console.error(`${name} could not start: ${error.message}`);
      if (required) stop(1);
    });
    child.once('close', code => {
      children.delete(child);
      if (stopping) return;
      if (required) {
        console.error(`${name} stopped. Shutting down the launcher.`);
        stop(code || 1);
      } else {
        console.error(`Presage stopped with code ${code ?? 1}. The game is still running.`);
      }
    });
    return child;
  }
  process.once('SIGINT', () => stop());
  process.once('SIGTERM', () => stop());
  launch('CrowdClear', process.execPath, ['server.js'], root, true);
  const url = `http://localhost:${port}`;
  const deadline = Date.now() + 10000;
  let ready = false;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) });
      const health = await response.json();
      if (response.ok && health.status === 'ok' && health.app === 'CrowdClear') { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  if (stopping) return;
  if (!ready) {
    console.error('CrowdClear did not become ready within 10 seconds. Check the server output and PORT.');
    stop(1);
    return;
  }
  console.log(`Open ${url}. Press Ctrl+C to stop the game and sensor.`);
  if (!process.env.PRESAGE_API_KEY && !process.env.SMARTSPECTRA_API_KEY) {
    console.log('Presage skipped. Set PRESAGE_API_KEY in .env.local to enable the webcam helper.');
    return;
  }
  if (!fs.existsSync(path.join(root, 'sensor', 'node_modules', '@smartspectra', 'node-sdk', 'package.json'))) {
    console.log('Presage skipped. Install the sensor dependencies first; see README.md.');
    return;
  }
  try {
    const { command, args, cwd } = sensorCommand();
    if (process.env.BREATHING_URL || process.env.PRESAGE_ENDPOINT) console.log('Presage uses your configured endpoint; the local game may not receive those readings.');
    launch('Presage', command, args, cwd, false);
    console.log('Presage started. Face the laptop camera and allow about 30 seconds for readings.');
  } catch (error) {
    console.log(`Presage skipped. ${error.message}`);
  }
}

if (require.main === module) start().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { start };
