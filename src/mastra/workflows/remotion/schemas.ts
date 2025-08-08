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

// Docs & Review schemas (to avoid z.any)
export const docsSnippetZ = z.object({
  path: z.string(),
  excerpt: z.string(),
});

export const docsContextZ = z.object({
  topics: z.array(z.string()),
  snippets: z.array(docsSnippetZ),
  fetchedAt: z.string(),
});

export const reviewIssueZ = z.object({
  severity: z.enum(['info', 'warn', 'error']),
  message: z.string(),
  path: z.string().optional(),
});

export const reviewZ = z.object({
  issues: z.array(reviewIssueZ),
  score: z.number().optional(),
  audit: z
    .object({
      citations: z.array(docsSnippetZ).optional(),
      notes: z.array(z.string()).optional(),
    })
    .optional(),
});

// Loop record for review iterations
export const loopRecordZ = z.object({
  iteration: z.number(),
  review: reviewZ,
  docsContext: docsContextZ,
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

// Avoid specifying renderQueue shape here; steps use z.custom for it locally

// Monitoring workflow schemas
export const monitorInputZ = z.object({
  jobIds: z.array(z.string()),
  intervalMs: z.number().int().min(100).max(60000).default(1000),
});
