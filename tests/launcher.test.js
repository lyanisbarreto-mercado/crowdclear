const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const os = require('node:os');

const root = path.join(__dirname, '..');
function launcher({ env = { PRESAGE_API_KEY: 'test-key' }, installed = true, runtime = true } = {}) {
  const proc = Object.assign(new EventEmitter(), { env, execPath: '/node' });
  const children = [];
  const messages = [];
  const module = { exports: {} };
  const dependencies = {
    'node:path': path,
    'node:fs': { existsSync: () => installed },
    './run-sensor': { sensorCommand() {
      if (!runtime) throw Error('Presage needs an x64 Node runtime.');
      return { command: '/x64-node', args: ['presage.mjs'], cwd: path.join(root, 'sensor') };
    } },
    'node:child_process': { spawn(command, args, options) {
      const child = new EventEmitter();
      Object.assign(child, { command, args, options, signals: [], kill(signal) {
        child.signals.push(signal);
        queueMicrotask(() => child.emit('close', null));
      } });
      children.push(child);
      return child;
    } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'scripts/run-all.js'), 'utf8'), {
    require: name => dependencies[name], module, __dirname: path.join(root, 'scripts'), process: proc,
    console: { log: text => messages.push(text), error: text => messages.push(text) },
    fetch: async () => ({ ok: true, json: async () => ({ status: 'ok', app: 'CrowdClear' }) }),
    AbortSignal, setTimeout, Date
  });
  return { start: module.exports.start, proc, children, messages };
}

test('one launcher starts the game and direct sensor, and one stop shuts down both', async () => {
  const app = launcher();
  await app.start();
  assert.equal(app.children.length, 2);
  assert.equal(app.children[0].args[0], 'server.js');
  assert.equal(app.children[1].command, '/x64-node');
  assert.equal(app.children[1].args[0], 'presage.mjs');
  assert.equal(app.children[1].options.cwd, path.join(root, 'sensor'));
  assert.equal(app.children[1].options.windowsHide, true);
  assert.ok(app.messages.some(text => text.includes('http://localhost:3000')));
  assert.equal(app.messages.some(text => text.includes('test-key')), false);
  app.proc.emit('SIGINT');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(app.children.map(child => child.signals), [['SIGINT'], ['SIGINT']]);
  assert.equal(app.proc.exitCode, 0);
});

test('missing optional sensor requirements leave the game available with a setup message', async () => {
  for (const [options, message] of [[{ env: {} }, /PRESAGE_API_KEY/], [{ installed: false }, /dependencies/], [{ runtime: false }, /x64 Node/]]) {
    const app = launcher(options);
    await app.start();
    assert.equal(app.children.length, 1);
    assert.ok(app.messages.some(text => message.test(text)));
    app.proc.emit('SIGTERM');
  }
});

test('a sensor failure leaves the game running, but a server failure stops the sensor', async () => {
  const optional = launcher();
  await optional.start();
  optional.children[1].emit('close', 1);
  assert.deepEqual(optional.children[0].signals, []);
  assert.ok(optional.messages.some(text => text.includes('game is still running')));
  optional.proc.emit('SIGINT');
  const required = launcher();
  await required.start();
  required.children[0].emit('close', 3);
  assert.deepEqual(required.children[1].signals, ['SIGINT']);
  assert.equal(required.proc.exitCode, 3);
});

test('invalid PORT fails before launching children', async () => {
  const app = launcher({ env: { PORT: 'not-a-port' } });
  await app.start();
  assert.equal(app.children.length, 0);
  assert.equal(app.proc.exitCode, 1);
});

test('the sensor command selects portable Windows ARM Node or an explicit runtime without starting it', () => {
  for (const [platform, arch, override] of [['win32', 'arm64', null], ['linux', 'x64', null], ['win32', 'arm64', 'custom/node.exe']]) {
    const module = { exports: {} };
    const dependencies = { child_process: { spawn() { assert.fail('Importing the command must not open the camera'); } }, fs: { existsSync: () => true }, path };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'scripts/run-sensor.js'), 'utf8'), {
      require: name => dependencies[name], module, __dirname: path.join(root, 'scripts'),
      process: { platform, arch, execPath: '/current-node', env: override ? { PRESAGE_NODE_PATH: override } : {} }
    });
    const command = module.exports.sensorCommand();
    assert.equal(command.command, override ? path.resolve(root, override) : platform === 'win32' ? path.join(root, 'tools/node-win-x64/node.exe') : '/current-node');
    assert.equal(command.cwd, path.join(root, 'sensor'));
    assert.deepEqual(Array.from(command.args), ['--env-file-if-exists=../.env', '--env-file-if-exists=../.env.local', 'presage.mjs']);
  }
});

test('the sensor npm command loads a local runtime override before selecting Node', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'crowdclear-sensor-'));
  const file = path.join(cwd, '.env.local');
  try {
    fs.writeFileSync(file, `PRESAGE_NODE_PATH="${process.execPath.replaceAll('\\', '/')}"\n`);
    const script = require('../package.json').scripts.sensor;
    const flags = script.split(' ').slice(1, -1);
    const code = `console.log(require(${JSON.stringify(path.join(root, 'scripts/run-sensor.js'))}).sensorCommand().command)`;
    const env = { ...process.env };
    delete env.PRESAGE_NODE_PATH;
    const result = spawnSync(process.execPath, [...flags, '-e', code], {
      cwd, encoding: 'utf8', windowsHide: true, env
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), process.execPath);
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(cwd);
  }
});

test('the real launcher serves the frontend and API and releases the port on stop', { timeout: 20000 }, async () => {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const code = "const {start}=require('./scripts/run-all');process.on('message',m=>{if(m==='stop'){process.emit('SIGINT');process.disconnect();}});start().then(()=>process.send('ready'));";
  const child = spawn(process.execPath, ['-e', code], {
    cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env, PORT: String(port), DATABASE_URL: '', PRESAGE_API_KEY: '', SMARTSPECTRA_API_KEY: '' }
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const exit = new Promise(resolve => child.once('exit', code => resolve(code)));
  try {
    await new Promise((resolve, reject) => {
      child.once('message', resolve);
      child.once('error', reject);
      child.once('exit', code => reject(Error(`Launcher exited ${code}: ${output}`)));
    });
    assert.deepEqual(await (await fetch(`http://localhost:${port}/api/health`)).json(), { status: 'ok', app: 'CrowdClear' });
    const html = await (await fetch(`http://localhost:${port}`)).text();
    assert.match(html, /<a-scene/);
    assert.match(html, /CrowdClear/);
    assert.match(output, /Presage skipped/);
  } finally {
    if (child.connected) child.send('stop');
    assert.equal(await exit, 0, output);
  }
  const available = net.createServer();
  await new Promise((resolve, reject) => { available.once('error', reject); available.listen(port, '127.0.0.1', resolve); });
  await new Promise(resolve => available.close(resolve));
});
