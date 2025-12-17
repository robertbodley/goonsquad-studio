import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requireAuth } from './auth';
import { createJob, getJob, getUserJobs } from './db';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  JOB_QUEUE: Queue<{ jobId: string }>;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for local development
app.use('/*', cors({
  origin: (origin) => origin, // Allow all origins in dev
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Create a new job
app.post('/jobs', async (c) => {
  const authResult = await requireAuth(c);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const body = await c.req.json();
    const { payload } = body;

    if (!payload) {
      return c.json({ error: 'Payload is required' }, 400);
    }

    // Create job in database
    const job = await createJob(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      authResult.sub,
      payload
    );

    // Enqueue message
    console.log(`[API] Sending job ${job.id} to queue`);
    await c.env.JOB_QUEUE.send({ jobId: job.id! });
    console.log(`[API] Job ${job.id} queued successfully`);

    return c.json({ job }, 201);
  } catch (error) {
    console.error('Error creating job:', error);
    return c.json({ error: 'Failed to create job' }, 500);
  }
});

// Get a specific job
app.get('/jobs/:id', async (c) => {
  const authResult = await requireAuth(c);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const jobId = c.req.param('id');
    const job = await getJob(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      jobId,
      authResult.sub
    );

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    return c.json({ job });
  } catch (error) {
    console.error('Error getting job:', error);
    return c.json({ error: 'Failed to get job' }, 500);
  }
});

// Get all jobs for the user
app.get('/jobs', async (c) => {
  const authResult = await requireAuth(c);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const jobs = await getUserJobs(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      authResult.sub
    );

    return c.json({ jobs });
  } catch (error) {
    console.error('Error getting jobs:', error);
    return c.json({ error: 'Failed to get jobs' }, 500);
  }
});

export default app;
