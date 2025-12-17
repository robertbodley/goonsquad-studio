import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface Job {
  id?: string;
  user_id: string;
  status: string;
  payload?: unknown;
  result?: unknown;
  error?: string;
  created_at?: string;
  updated_at?: string;
}

export async function createJob(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  payload: unknown
): Promise<Job> {
  const supabase = getSupabaseClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      status: 'pending',
      payload,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  return data;
}

export async function getJob(
  supabaseUrl: string,
  serviceRoleKey: string,
  jobId: string,
  userId: string
): Promise<Job | null> {
  const supabase = getSupabaseClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get job: ${error.message}`);
  }

  return data;
}

export async function getUserJobs(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string
): Promise<Job[]> {
  const supabase = getSupabaseClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get jobs: ${error.message}`);
  }

  return data || [];
}
