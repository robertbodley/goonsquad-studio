#!/usr/bin/env node
import { Miniflare } from 'miniflare';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { watch } from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load env vars
function loadDevVars(appPath) {
  const devVarsPath = join(rootDir, 'apps', appPath, '.dev.vars');
  const vars = {};
  if (fs.existsSync(devVarsPath)) {
    const content = fs.readFileSync(devVarsPath, 'utf-8');
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        vars[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
  return vars;
}

// Build workers
console.log('🔨 Building workers...');
execSync('node scripts/build-workers.js', { cwd: rootDir, stdio: 'inherit' });

console.log('🚀 Starting development servers...\n');

const apiVars = loadDevVars('api');
const workerVars = loadDevVars('worker');

// Start Miniflare with shared queue
// IMPORTANT: The first worker receives HTTP traffic, so API must be first
const mf = new Miniflare({
  workers: [
    {
      name: 'api',
      modules: true,
      scriptPath: join(rootDir, 'apps/api/.wrangler/index.js'),
      compatibilityDate: '2023-12-01',
      compatibilityFlags: ['nodejs_compat'],
      bindings: apiVars,
      queueProducers: {
        JOB_QUEUE: 'jobs',
      },
    },
    {
      name: 'worker',
      modules: true,
      scriptPath: join(rootDir, 'apps/worker/.wrangler/index.js'),
      compatibilityDate: '2023-12-01',
      compatibilityFlags: ['nodejs_compat'],
      bindings: workerVars,
      queueConsumers: {
        jobs: {
          maxBatchSize: 1,
          maxBatchTimeout: 1,
        },
      },
    },
  ],
  host: '127.0.0.1',
  port: 8787,
});

// Wait for Miniflare to be ready
const url = await mf.ready;
console.log(`✓ Miniflare ready at ${url}`);

// Start web app
const web = spawn('pnpm', ['run', 'dev'], {
  cwd: join(rootDir, 'apps/web'),
  stdio: 'inherit',
  shell: true,
});

console.log('\n✨ All services ready!\n');
console.log('  📱 Web:    http://localhost:5173');
console.log('  🔌 API:    http://localhost:8787');
console.log('  📮 Queue:  Local Miniflare\n');

// Watch for changes and rebuild
console.log('👀 Watching for changes...\n');
const watcher = watch([
  join(rootDir, 'apps/api/src/**/*.ts'),
  join(rootDir, 'apps/worker/src/**/*.ts'),
], {
  ignoreInitial: true,
});

watcher.on('change', async (path) => {
  console.log(`\n🔄 Rebuilding due to change in ${path}...`);
  try {
    execSync('node scripts/build-workers.js', { cwd: rootDir, stdio: 'pipe' });
    console.log('✓ Rebuilt, reloading workers...');

    // Reload Miniflare with updated scripts (API first for HTTP traffic)
    await mf.setOptions({
      workers: [
        {
          name: 'api',
          modules: true,
          scriptPath: join(rootDir, 'apps/api/.wrangler/index.js'),
          compatibilityDate: '2023-12-01',
          compatibilityFlags: ['nodejs_compat'],
          bindings: apiVars,
          queueProducers: {
            JOB_QUEUE: 'jobs',
          },
        },
        {
          name: 'worker',
          modules: true,
          scriptPath: join(rootDir, 'apps/worker/.wrangler/index.js'),
          compatibilityDate: '2023-12-01',
          compatibilityFlags: ['nodejs_compat'],
          bindings: workerVars,
          queueConsumers: {
            jobs: {
              maxBatchSize: 1,
              maxBatchTimeout: 1,
            },
          },
        },
      ],
    });
    console.log('✓ Workers reloaded\n');
  } catch (error) {
    console.error('Build/reload error:', error.message);
  }
});

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');
  watcher.close();
  web.kill();
  await mf.dispose();
  console.log('✓ All services stopped\n');
  process.exit(0);
});
