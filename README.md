# __PROJECT_NAME__

A Cloudflare + Supabase Turborepo project with automatic deployments.

## Stack

- **Monorepo**: Turborepo + pnpm
- **Frontend**: React + Vite SPA (Cloudflare Pages)
- **API**: Cloudflare Worker with Hono
- **Background Jobs**: Cloudflare Queue consumer worker
- **Database**: Supabase Postgres
- **Auth**: Supabase Auth

## Project Structure

```
.
├── apps/
│   ├── web/          # React SPA
│   ├── api/          # API Worker
│   └── worker/       # Queue consumer
├── packages/
│   └── shared/       # Shared types and schemas
└── supabase/
    └── migrations/   # Database migrations
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase CLI
- Wrangler CLI

### Local Development

1. Install dependencies:
```bash
pnpm install
```

2. Start Supabase locally:
```bash
pnpm supabase:start
```

3. Generate local environment files:
```bash
pnpm env:local
```

4. Start all apps:
```bash
pnpm dev
```

The apps will be available at:
- Web: http://localhost:5173
- API: http://localhost:8787
- Worker: http://localhost:8788

## Deployment

Deployments happen automatically on push to `main` via GitHub Actions:

1. Runs database migrations
2. Deploys API worker
3. Deploys queue consumer worker
4. Deploys web app

View workflows: [GitHub Actions](__GITHUB_REPO_URL__/actions)

## Environment Variables

### Local Development
Generated automatically by `pnpm env:local` from `supabase status`.

### Production
Configured via GitHub Secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Database Migrations

### Local
```bash
# Create a new migration
supabase migration new migration_name

# Apply migrations
supabase db push
```

### Production
Migrations run automatically in CI before deployment.

## Architecture

### Authentication Flow
1. SPA uses `@supabase/supabase-js` for auth
2. User signs in, receives JWT
3. SPA sends JWT in `Authorization` header to API
4. API verifies JWT via Supabase JWKS
5. API uses service role key for database operations

### Queue Flow
1. API receives POST /jobs
2. Creates job record in database
3. Enqueues message to Cloudflare Queue
4. Queue consumer processes job
5. Updates job status in database

## Scripts

- `pnpm dev` - Start all apps in parallel
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all apps
- `pnpm supabase:start` - Start local Supabase
- `pnpm env:local` - Generate local .env files
- `pnpm clean` - Clean all build artifacts
