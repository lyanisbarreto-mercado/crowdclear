// Runs the Presage helper. On Windows ARM, uses the portable x64 Node under tools/
// because @smartspectra/node-sdk only ships a win32-x64 native runtime.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const x64 = path.join(root, 'tools', 'node-win-x64', 'node.exe');
const node = process.platform === 'win32' && process.arch === 'arm64' && fs.existsSync(x64)
  ? x64
  : process.execPath;
const child = spawn(node, [
  '--env-file-if-exists=../.env',
  '--env-file-if-exists=../.env.local',
  'presage.mjs'
], { cwd: path.join(root, 'sensor'), stdio: 'inherit', env: process.env });
child.on('exit', code => process.exit(code ?? 1));
