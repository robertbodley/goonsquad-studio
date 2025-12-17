#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Fetching Supabase local status...');

try {
  const output = execSync('supabase status --output json', {
    cwd: rootDir,
    encoding: 'utf-8',
  });

  const status = JSON.parse(output);

  // Extract values
  const apiUrl = status.find((s) => s.name === 'API URL')?.value || '';
  const anonKey = status.find((s) => s.name === 'anon key')?.value || '';
  const serviceRoleKey = status.find((s) => s.name === 'service_role key')?.value || '';

  // Generate apps/web/.env.local
  const webEnv = `VITE_SUPABASE_URL=${apiUrl}
VITE_SUPABASE_ANON_KEY=${anonKey}
VITE_API_URL=http://localhost:8787
`;

  fs.writeFileSync(path.join(rootDir, 'apps/web/.env.local'), webEnv);
  console.log('✓ Created apps/web/.env.local');

  // Generate apps/api/.dev.vars
  const apiVars = `SUPABASE_URL=${apiUrl}
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}
`;

  fs.writeFileSync(path.join(rootDir, 'apps/api/.dev.vars'), apiVars);
  console.log('✓ Created apps/api/.dev.vars');

  // Generate apps/worker/.dev.vars
  const workerVars = `SUPABASE_URL=${apiUrl}
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}
`;

  fs.writeFileSync(path.join(rootDir, 'apps/worker/.dev.vars'), workerVars);
  console.log('✓ Created apps/worker/.dev.vars');

  console.log('\nLocal environment files generated successfully!');
  console.log('Run "pnpm dev" to start development.');
} catch (error) {
  console.error('Error generating local environment files:', error.message);
  console.error('\nMake sure Supabase is running: pnpm supabase:start');
  process.exit(1);
}
