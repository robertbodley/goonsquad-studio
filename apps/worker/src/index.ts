import { createClient } from '@supabase/supabase-js';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

interface QueueMessage {
  jobId: string;
}

async function processJob(jobId: string, env: Bindings): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    console.log(`Processing job ${jobId}`);

    // Update job status to running
    await supabase
      .from('jobs')
      .update({
        status: 'running',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update job status to succeeded
    await supabase
      .from('jobs')
      .update({
        status: 'succeeded',
        result: { message: 'Job completed successfully', timestamp: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);

    // Update job status to failed
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Bindings): Promise<void> {
    console.log(`Processing batch of ${batch.messages.length} messages`);

    for (const message of batch.messages) {
      await processJob(message.body.jobId, env);
      message.ack();
    }
  },
};
