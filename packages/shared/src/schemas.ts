import { z } from 'zod';

export const JobStatusSchema = z.enum(['pending', 'running', 'succeeded', 'failed']);

export const JobSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  status: JobStatusSchema,
  payload: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateJobRequestSchema = z.object({
  payload: z.unknown(),
});

export type JobStatus = z.infer<typeof JobStatusSchema>;
export type Job = z.infer<typeof JobSchema>;
export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;
