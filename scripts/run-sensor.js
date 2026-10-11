const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
function sensorCommand() {
  const armWindows = process.platform === 'win32' && process.arch === 'arm64';
  const node = process.env.PRESAGE_NODE_PATH
    ? path.resolve(root, process.env.PRESAGE_NODE_PATH)
    : armWindows ? path.join(root, 'tools', 'node-win-x64', 'node.exe') : process.execPath;
  if (!fs.existsSync(node)) throw new Error('Presage needs an x64 Node runtime. Set PRESAGE_NODE_PATH or install it under tools/node-win-x64.');
  return { command: node, args: ['--env-file-if-exists=../.env', '--env-file-if-exists=../.env.local', 'presage.mjs'], cwd: path.join(root, 'sensor') };
}

if (require.main === module) {
  try {
    const { command, args, cwd } = sensorCommand();
    const child = spawn(command, args, { cwd, stdio: 'inherit', env: process.env, windowsHide: true });
    process.once('SIGINT', () => child.kill('SIGINT'));
    process.once('SIGTERM', () => child.kill('SIGTERM'));
    child.once('error', error => { console.error(`Presage could not start: ${error.message}`); process.exitCode = 1; });
    child.once('exit', code => { process.exitCode = code ?? 1; });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { sensorCommand };
