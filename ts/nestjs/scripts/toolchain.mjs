#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = readFileSync(
  new URL('../.node-version', import.meta.url),
  'utf8',
).trim();
const { packageManager } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const child = spawn(
  'npm',
  [
    'exec',
    '--yes',
    `--package=node@${version}`,
    `--package=${packageManager}`,
    '--',
    'pnpm',
    ...process.argv.slice(2),
  ],
  { cwd: root, stdio: 'inherit' },
);
child.on('error', () => {
  process.stderr.write('Toolchain launch failed\n');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
