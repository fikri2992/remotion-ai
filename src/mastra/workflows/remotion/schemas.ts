import { z } from 'zod';

// Success criteria for self-critique
export const successCriteriaZ = z.object({
  minScore: z.number().optional(),
  maxIssues: z.number().optional(),
  requireNoErrors: z.boolean().optional(),
  requiredCitations: z.number().optional(),
});

// Explainer input schema
export const explainerInputZ = z.object({
  examples: z.array(z.string()).default(["abcabcbb", "bbbbb", "pwwkew"]),
  title: z.string().default(
    "Longest Substring Without Repeating Characters"
  ),
  intro: z
    .string()
    .default(
      "We use the Sliding Window technique. Move right to expand, move left to remove duplicates."
    ),
  topics: z.array(z.string()).default(["agents", "workflows", "tools", "voice"]),
  fps: z.number().int().default(60),
  maxIterations: z.number().int().min(1).max(10).default(2),
  criteria: successCriteriaZ.optional(),
});

// Loop record for review iterations
export const loopRecordZ = z.object({
  iteration: z.number(),
  review: z.any(),
  docsContext: z.any(),
});

// Render props for the explainer composition
export const propsZ = z.object({
  title: z.string(),
  intro: z.string(),
  examples: z.array(z.string()),
});

// Batch workflow schemas
export const batchInputZ = z.object({
  titles: z.array(z.string()),
});

export const batchInitZ = batchInputZ.extend({
  renderQueue: z.any(),
});

// Monitoring workflow schemas
export const monitorInputZ = z.object({
  jobIds: z.array(z.string()),
  intervalMs: z.number().int().min(100).max(60000).default(1000),
});
