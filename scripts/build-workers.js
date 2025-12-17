#!/usr/bin/env node
import { build } from 'esbuild';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function buildWorker(name) {
  await build({
    entryPoints: [join(rootDir, `apps/${name}/src/index.ts`)],
    bundle: true,
    outfile: join(rootDir, `apps/${name}/.wrangler/index.js`),
    format: 'esm',
    platform: 'browser',
    target: 'esnext',
    conditions: ['worker', 'browser'],
    mainFields: ['browser', 'module', 'main'],
    external: ['cloudflare:*'],
    logLevel: 'error',
  });
}

console.log('Building workers...');
await Promise.all([
  buildWorker('api'),
  buildWorker('worker'),
]);
console.log('✓ Workers built\n');
