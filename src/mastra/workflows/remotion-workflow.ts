/*
// Simple workflow for Remotion video rendering using MCP
import { makeRenderQueue } from '../../../server/render-queue';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { ensureBrowser } from '@remotion/renderer';
import fs from 'node:fs';
import { MastraMcpDocsProvider, NoopDocsProvider, type DocsProvider } from '../agents/docs-provider';
import { SelfCriticAgent, type SuccessCriteria } from '../agents/self-critic-agent';
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

// Workflow for automated video creation
export class RemotionWorkflow {
  private renderQueue: ReturnType<typeof makeRenderQueue> | null = null;
  private remotionBundleUrl: string | null = null;
  private docsProvider: MastraMcpDocsProvider | NoopDocsProvider;
  private selfCritic: SelfCriticAgent;

  constructor() {
    // Default to Mastra MCP docs provider placeholder; can be swapped for a real MCP client later
    this.docsProvider = new MastraMcpDocsProvider();
    this.selfCritic = new SelfCriticAgent({ docsProvider: this.docsProvider });
  }

  // Allow host to inject a real MCP-backed docs provider (e.g., using @mastra/mcp)
  setDocsProvider(provider: DocsProvider) {
    this.docsProvider = provider as any;
    // keep selfCritic in sync with new provider
    this.selfCritic = new SelfCriticAgent({ docsProvider: provider });
  }

  async initialize(): Promise<{ renderQueue: ReturnType<typeof makeRenderQueue>; bundleUrl: string }> {
    if (!this.remotionBundleUrl) {
      await ensureBrowser();
      const { REMOTION_SERVE_URL } = process.env;
      this.remotionBundleUrl = REMOTION_SERVE_URL
        ? REMOTION_SERVE_URL
        : await bundle({
            entryPoint: path.resolve('remotion/index.ts'),
            onProgress(progress) {
              console.info(`Bundling Remotion project: ${progress}%`);
            },
          });
    }

    if (!this.renderQueue) {
      const rendersDir = path.resolve('renders');
      try {
        fs.mkdirSync(rendersDir, { recursive: true });
      } catch {}
      this.renderQueue = makeRenderQueue({
        port: 0,
        serveUrl: this.remotionBundleUrl as string,
        rendersDir,
      });
    }

    return { renderQueue: this.renderQueue, bundleUrl: this.remotionBundleUrl as string };
  }

  // Create explainer workflow for Longest Substring composition
  async createExplainerWorkflow({
    examples = ["abcabcbb", "bbbbb", "pwwkew"],
    title = "Longest Substring Without Repeating Characters",
    intro = "We use the Sliding Window technique. Move right to expand, move left to remove duplicates.",
  }: {
    examples?: string[];
    title?: string;
    intro?: string;
  }) {
    const { renderQueue } = await this.initialize();
    const jobId = renderQueue.createJob({
      compositionId: "LongestSubstringExplainer",
      props: { title, intro, examples },
    });

    return {
      workflowId: `explainer-${Date.now()}`,
      jobs: [
        {
          jobId,
          compositionId: "LongestSubstringExplainer",
          props: { title, intro, examples },
          status: 'queued',
        },
      ],
      totalJobs: 1,
    };
  }

  // Create explainer workflow with docs-grounded self-critique step
  async createExplainerWorkflowReviewed({
    examples = ["abcabcbb", "bbbbb", "pwwkew"],
    title = "Longest Substring Without Repeating Characters",
    intro = "We use the Sliding Window technique. Move right to expand, move left to remove duplicates.",
    topics = ["agents", "workflows", "tools", "voice"],
    fps = 60,
    maxIterations = 2,
    criteria,
  }: {
    examples?: string[];
    title?: string;
    intro?: string;
    topics?: string[];
    fps?: number;
    maxIterations?: number;
    criteria?: SuccessCriteria;
  }) {
    const { renderQueue } = await this.initialize();

    let workingProps: Record<string, unknown> = { title, intro, examples };
    const loop: Array<{ iteration: number; review: any; docsContext: any }> = [];

    for (let i = 1; i <= Math.max(1, maxIterations); i++) {
      // Fetch docs context each iteration to allow topic refinement later
      const docsContext = await this.docsProvider.fetchDocsContext(topics, 4);

      const { review, fixedArtifacts, shouldStop } = await this.selfCritic.reviewAndFix({
        renderProps: workingProps,
        fps,
        docsContext,
        criteria,
        iteration: i,
      });

      loop.push({ iteration: i, review, docsContext });

      // Apply any fixes
      if (fixedArtifacts?.renderProps) {
        workingProps = { ...workingProps, ...fixedArtifacts.renderProps };
      }

      if (shouldStop) break;
    }

    const finalProps = workingProps as { title: string; intro: string; examples: string[] };

    const jobId = renderQueue.createJob({
      compositionId: "LongestSubstringExplainer",
      props: finalProps,
    });

    return {
      workflowId: `explainer-reviewed-${Date.now()}`,
      jobs: [
        {
          jobId,
          compositionId: "LongestSubstringExplainer",
          props: finalProps,
          status: 'queued',
        },
      ],
      totalJobs: 1,
      loop,
    };
  }

  // Create video workflow
  async createVideoWorkflow(titleTexts: string[]) {
    const { renderQueue } = await this.initialize();
    const jobs = [];

    for (const titleText of titleTexts) {
      const jobId = renderQueue.createJob({ titleText });
      jobs.push({
        jobId,
        titleText,
        status: 'queued',
      });
    }

    return {
      workflowId: `batch-${Date.now()}`,
      jobs,
      totalJobs: jobs.length,
    };
  }

  // Monitor workflow progress
  async monitorWorkflow(jobIds: string[]) {
    const { renderQueue } = await this.initialize();
    const statuses = [];

    for (const jobId of jobIds) {
      const job = renderQueue.jobs.get(jobId);
      if (job) {
        const videoUrl = (job as any).videoUrl;
        const progress = (job as any).progress ?? 0;
        statuses.push({
          jobId,
          status: (job as any).status,
          progress,
          videoUrl,
        });
      }
    }

    return {
      completed: statuses.filter(s => s.status === 'completed').length,
      inProgress: statuses.filter(s => s.status === 'in-progress').length,
      failed: statuses.filter(s => s.status === 'failed').length,
      statuses,
    };
  }

  // Cancel workflow
  async cancelWorkflow(jobIds: string[]) {
    const { renderQueue } = await this.initialize();
    const cancelled = [];

    for (const jobId of jobIds) {
      const job = renderQueue.jobs.get(jobId);
      if (job && (job.status === 'queued' || job.status === 'in-progress')) {
        job.cancel();
        cancelled.push(jobId);
      }
    }

    return {
      cancelled,
      message: `Cancelled ${cancelled.length} jobs`,
    };
  }
}

// Export singleton instance
export const remotionWorkflow = new RemotionWorkflow();

// =========================
// Mastra workflow primitives
// =========================

// Zod schemas for inputs/outputs
const successCriteriaZ = z.object({
  minScore: z.number().optional(),
  maxIssues: z.number().optional(),
  requireNoErrors: z.boolean().optional(),
  requiredCitations: z.number().optional(),
});

const explainerInputZ = z.object({
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

const loopRecordZ = z.object({
  iteration: z.number(),
  review: z.any(),
  docsContext: z.any(),
});

const propsZ = z.object({
  title: z.string(),
  intro: z.string(),
  examples: z.array(z.string()),
});

// Step: Initialize Remotion (bundle + queue)
export const initRemotionStep = createStep({
  id: "initRemotion",
  inputSchema: explainerInputZ,
  outputSchema: explainerInputZ.extend({
    renderQueue: z.any(),
    bundleUrl: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { renderQueue, bundleUrl } = await remotionWorkflow.initialize();
    return { ...inputData, renderQueue, bundleUrl } as any;
  },
});

// Step: Build initial props from input
export const buildInitialPropsStep = createStep({
  id: "buildInitialProps",
  inputSchema: initRemotionStep.outputSchema,
  outputSchema: initRemotionStep.outputSchema.extend({
    workingProps: propsZ,
    iteration: z.number().default(1),
    loop: z.array(loopRecordZ).default([]),
  }),
  execute: async ({ inputData }) => {
    const { title, intro, examples } = inputData;
    const workingProps = { title, intro, examples };
    return {
      ...inputData,
      workingProps,
      iteration: 1,
      loop: [],
    } as any;
  },
});

// Step: One review iteration using docs + self-critic
export const reviewIterationStep = createStep({
  id: "reviewIteration",
  inputSchema: buildInitialPropsStep.outputSchema.extend({
    workingProps: propsZ,
  }),
  outputSchema: buildInitialPropsStep.outputSchema.extend({
    workingProps: propsZ,
    shouldStop: z.boolean().default(false),
    iteration: z.number(),
    loop: z.array(loopRecordZ),
  }),
  execute: async ({ inputData }) => {
    const { topics, fps, criteria, iteration } = inputData;

    // Fetch docs snippets (MCP-backed provider; placeholder behavior falls back to cache or empty)
    const docsProvider = new MastraMcpDocsProvider();
    const docsContext = await docsProvider.fetchDocsContext(topics, 4);

    // Run review/repair
    const critic = new SelfCriticAgent({ docsProvider });
    const { review, fixedArtifacts, shouldStop } = await critic.reviewAndFix({
      renderProps: inputData.workingProps,
      fps,
      docsContext,
      criteria: (criteria ?? undefined) as SuccessCriteria | undefined,
      iteration,
    });

    const nextProps = fixedArtifacts?.renderProps
      ? { ...(inputData.workingProps as any), ...(fixedArtifacts.renderProps as any) }
      : inputData.workingProps;

    const nextIteration = (iteration ?? 1) + 1;
    const loop = [...(inputData.loop ?? []), { iteration: iteration ?? 1, review, docsContext }];

    return {
      ...inputData,
      workingProps: nextProps as any,
      shouldStop: Boolean(shouldStop),
      iteration: nextIteration,
      loop,
    } as any;
  },
});

// Step: Queue the render
export const queueRenderStep = createStep({
  id: "queueRender",
  inputSchema: reviewIterationStep.outputSchema,
  outputSchema: z.object({
    jobId: z.string(),
    props: propsZ,
    loop: z.array(loopRecordZ),
  }),
  execute: async ({ inputData }) => {
    const jobId = (inputData.renderQueue as ReturnType<typeof makeRenderQueue>).createJob({
      compositionId: "LongestSubstringExplainer",
      props: inputData.workingProps,
    });
    return { jobId, props: inputData.workingProps, loop: inputData.loop } as any;
  },
});

// Workflow: Reviewed Explainer with iterative self-critique
export const explainerReviewedWorkflow = createWorkflow({
  id: "explainer-reviewed-workflow",
  inputSchema: explainerInputZ,
  outputSchema: queueRenderStep.outputSchema,
  steps: [initRemotionStep, buildInitialPropsStep, reviewIterationStep, queueRenderStep],
})
  .then(initRemotionStep)
  .then(buildInitialPropsStep)
  .dowhile(
    reviewIterationStep,
    async ({ inputData }) => !(inputData as any).shouldStop && (inputData as any).iteration <= (inputData as any).maxIterations
  )
  .then(queueRenderStep)
  .commit();
*/

// Barrel re-exports for backward compatibility
export * from './remotion/core';
export * from './remotion/schemas';
export * from './remotion/static';
export * from './remotion/factories';

// =========================
// Configurable factories (Separation of Concerns)
// =========================
/*
const DEFAULT_EXPLAINER_COMPOSITION_ID = 'LongestSubstringExplainer';

export interface ExplainerWorkflowConfig {
  compositionId?: string;
  docsProvider?: DocsProvider;
  selfCritic?: SelfCriticAgent;
  idPrefix?: string; // to avoid step-id collisions when composing
  docsLimit?: number; // max docs snippets per iteration
  propsBuilder?: (input: z.infer<typeof explainerInputZ>) => z.infer<typeof propsZ>;
  queueJobBuilder?: (inputData: any) => { compositionId: string; props: any };
  // Stop if returns true for a given iteration state
  stopPredicate?: (state: {
    iteration: number;
    maxIterations: number;
    shouldStop?: boolean;
  }) => boolean;
}

export function makeInitRemotionStep(config?: ExplainerWorkflowConfig) {
  const prefix = config?.idPrefix ?? '';
  return createStep({
    id: `${prefix}initRemotion`,
    inputSchema: explainerInputZ,
    outputSchema: explainerInputZ.extend({ renderQueue: z.any(), bundleUrl: z.string() }),
    execute: async ({ inputData }) => {
      const { renderQueue, bundleUrl } = await remotionWorkflow.initialize();
      return { ...inputData, renderQueue, bundleUrl } as any;
    },
  });
}

export function makeBuildInitialPropsStep(config?: ExplainerWorkflowConfig) {
  const prefix = config?.idPrefix ?? '';
  const initStep = makeInitRemotionStep(config);
  return {
    initStep,
    buildStep: createStep({
      id: `${prefix}buildInitialProps`,
      inputSchema: initStep.outputSchema,
      outputSchema: initStep.outputSchema.extend({
        workingProps: propsZ,
        iteration: z.number().default(1),
        loop: z.array(loopRecordZ).default([]),
      }),
      execute: async ({ inputData }) => {
        const workingProps = config?.propsBuilder
          ? config.propsBuilder(inputData as any)
          : ({ title: (inputData as any).title, intro: (inputData as any).intro, examples: (inputData as any).examples } as any);
        return { ...inputData, workingProps, iteration: 1, loop: [] } as any;
      },
    }),
  };
}

export function makeReviewIterationStep(config?: ExplainerWorkflowConfig) {
  const prefix = config?.idPrefix ?? '';
  const provider = config?.docsProvider ?? new MastraMcpDocsProvider();
  const critic = config?.selfCritic ?? new SelfCriticAgent({ docsProvider: provider });
  const { initStep, buildStep } = makeBuildInitialPropsStep(config);

  const reviewStep = createStep({
    id: `${prefix}reviewIteration`,
    inputSchema: buildStep.outputSchema.extend({ workingProps: propsZ }),
    outputSchema: buildStep.outputSchema.extend({
      workingProps: propsZ,
      shouldStop: z.boolean().default(false),
      iteration: z.number(),
      loop: z.array(loopRecordZ),
    }),
    execute: async ({ inputData }) => {
      const { topics, fps, criteria, iteration } = inputData as any;
      const docsContext = await provider.fetchDocsContext(topics, config?.docsLimit ?? 4);
      const { review, fixedArtifacts, shouldStop } = await critic.reviewAndFix({
        renderProps: (inputData as any).workingProps,
        fps,
        docsContext,
        criteria: (criteria ?? undefined) as SuccessCriteria | undefined,
        iteration,
      });
      const nextProps = fixedArtifacts?.renderProps
        ? { ...((inputData as any).workingProps as any), ...(fixedArtifacts.renderProps as any) }
        : (inputData as any).workingProps;
      const nextIteration = (iteration ?? 1) + 1;
      const loop = [...(((inputData as any).loop ?? []) as any[]), { iteration: iteration ?? 1, review, docsContext }];
      return { ...(inputData as any), workingProps: nextProps as any, shouldStop: Boolean(shouldStop), iteration: nextIteration, loop } as any;
    },
  });

  return { initStep, buildStep, reviewStep };
}

export function makeQueueRenderStep(config?: ExplainerWorkflowConfig) {
  const prefix = config?.idPrefix ?? '';
  const compositionId = config?.compositionId ?? DEFAULT_EXPLAINER_COMPOSITION_ID;
  const { reviewStep } = makeReviewIterationStep(config);
  const queueStep = createStep({
    id: `${prefix}queueRender`,
    inputSchema: reviewStep.outputSchema,
    outputSchema: z.object({ jobId: z.string(), props: propsZ, loop: z.array(loopRecordZ) }),
    execute: async ({ inputData }) => {
      const payload = config?.queueJobBuilder
        ? config.queueJobBuilder(inputData)
        : { compositionId, props: (inputData as any).workingProps };
      const jobId = (inputData.renderQueue as ReturnType<typeof makeRenderQueue>).createJob(payload as any);
      return { jobId, props: (inputData as any).workingProps, loop: (inputData as any).loop } as any;
    },
  });
  return { reviewStep, queueStep };
}

export function buildExplainerReviewedWorkflow(config?: ExplainerWorkflowConfig) {
  const cfg = { idPrefix: 'cfg.', ...(config ?? {}) };
  const { initStep } = makeInitRemotionStep(cfg) as any; // for type locality
  const { buildStep } = makeBuildInitialPropsStep(cfg);
  const { reviewStep } = makeReviewIterationStep(cfg);
  const { queueStep } = makeQueueRenderStep(cfg);
  const stop = cfg.stopPredicate ?? ((s: { iteration: number; maxIterations: number; shouldStop?: boolean }) => s.shouldStop || s.iteration > s.maxIterations);

  return createWorkflow({
    id: 'explainer-reviewed-workflow-configurable',
    inputSchema: explainerInputZ,
    outputSchema: queueStep.outputSchema,
    steps: [initStep, buildStep, reviewStep, queueStep],
  })
    .then(initStep)
    .then(buildStep)
    .dowhile(
      reviewStep,
      async ({ inputData }) => {
        const s = inputData as any;
        return !stop({ iteration: s.iteration, maxIterations: s.maxIterations, shouldStop: s.shouldStop });
      }
    )
    .then(queueStep)
    .commit();
}

// Batch factories
export function makeInitForBatchStep() {
  return createStep({
    id: 'initForBatch',
    inputSchema: z.object({ titles: z.array(z.string()) }),
    outputSchema: z.object({ titles: z.array(z.string()), renderQueue: z.any() }),
    execute: async ({ inputData }) => {
      const { renderQueue } = await remotionWorkflow.initialize();
      return { ...inputData, renderQueue } as any;
    },
  });
}

export function makeCreateJobsFromTitlesStep() {
  const init = makeInitForBatchStep();
  const create = createStep({
    id: 'createJobsFromTitles',
    inputSchema: init.outputSchema,
    outputSchema: z.object({ jobIds: z.array(z.string()) }),
    execute: async ({ inputData }) => {
      const rq = inputData.renderQueue as ReturnType<typeof makeRenderQueue>;
      const jobIds: string[] = [];
      for (const titleText of inputData.titles) {
        const id = rq.createJob({ titleText });
        jobIds.push(id);
      }
      return { jobIds };
    },
  });
  return { init, create };
}

export function buildBatchHelloWorkflow() {
  const { init, create } = makeCreateJobsFromTitlesStep();
  return createWorkflow({ id: 'batch-hello-workflow-configurable', inputSchema: z.object({ titles: z.array(z.string()) }), outputSchema: create.outputSchema, steps: [init, create] })
    .then(init)
    .then(create)
    .commit();
}

export interface MonitorWorkflowConfig {
  donePredicate?: (summary: { inProgress: number; completed: number; failed: number; statuses: any[] }) => boolean;
  defaultIntervalMs?: number;
  idPrefix?: string;
}

export function makeInitOnlyStep(config?: MonitorWorkflowConfig) {
  const prefix = config?.idPrefix ?? '';
  return createStep({
    id: `${prefix}initOnly`,
    inputSchema: z.object({ jobIds: z.array(z.string()), intervalMs: z.number().int().min(100).max(60000).default(1000) }),
    outputSchema: z.object({ jobIds: z.array(z.string()), intervalMs: z.number(), renderQueue: z.any() }),
    execute: async ({ inputData }) => {
      const { renderQueue } = await remotionWorkflow.initialize();
      return { ...inputData, renderQueue } as any;
    },
  });
}

export function makeMonitorTickStep(config?: MonitorWorkflowConfig) {
  const prefix = config?.idPrefix ?? '';
  const init = makeInitOnlyStep(config);
  const tick = createStep({
    id: `${prefix}monitorTick`,
    inputSchema: init.outputSchema,
    outputSchema: init.outputSchema.extend({ summary: z.object({ completed: z.number(), inProgress: z.number(), failed: z.number(), statuses: z.array(z.any()) }) }),
    execute: async ({ inputData }) => {
      const interval = inputData.intervalMs ?? (config?.defaultIntervalMs ?? 1000);
      await new Promise((res) => setTimeout(res, interval));
      const rq = inputData.renderQueue as ReturnType<typeof makeRenderQueue>;
      const statuses: Array<{ jobId: string; status: string; progress?: number; videoUrl?: string }> = [];
      for (const jobId of inputData.jobIds) {
        const job = rq.jobs.get(jobId) as any;
        if (job) {
          statuses.push({ jobId, status: job.status, progress: job.progress ?? 0, videoUrl: job.videoUrl });
        }
      }
      const summary = {
        completed: statuses.filter((s) => s.status === 'completed').length,
        inProgress: statuses.filter((s) => s.status === 'in-progress').length,
        failed: statuses.filter((s) => s.status === 'failed').length,
        statuses,
      };
      return { ...inputData, summary } as any;
    },
  });
  return { init, tick };
}

export function makeCancelJobsStep(config?: MonitorWorkflowConfig) {
  const prefix = config?.idPrefix ?? '';
  const init = makeInitOnlyStep(config);
  const cancel = createStep({
    id: `${prefix}cancelJobs`,
    inputSchema: init.outputSchema,
    outputSchema: z.object({ cancelled: z.array(z.string()), message: z.string() }),
    execute: async ({ inputData }) => {
      const rq = inputData.renderQueue as ReturnType<typeof makeRenderQueue>;
      const cancelled: string[] = [];
      for (const jobId of inputData.jobIds) {
        const job = rq.jobs.get(jobId) as any;
        if (job && (job.status === 'queued' || job.status === 'in-progress')) {
          job.cancel();
          cancelled.push(jobId);
        }
      }
      return { cancelled, message: `Cancelled ${cancelled.length} jobs` };
    },
  });
  return { init, cancel };
}

export function buildMonitorUntilDoneWorkflow(config?: MonitorWorkflowConfig) {
  const cfg = { idPrefix: 'cfg.', ...(config ?? {}) };
  const { init, tick } = makeMonitorTickStep(cfg);
  const done = cfg.donePredicate ?? ((s: { inProgress: number }) => s.inProgress === 0);
  return createWorkflow({ id: 'monitor-until-done-configurable', inputSchema: z.object({ jobIds: z.array(z.string()), intervalMs: z.number().int().min(100).max(60000).default(1000) }), outputSchema: tick.outputSchema, steps: [init, tick] })
    .then(init)
    .dountil(
      tick,
      async ({ inputData }) => {
        const s = (inputData as any).summary;
        return Boolean(s) && done(s);
      }
    )
    .commit();
}
*/

/*
// Simple batch workflow: create multiple HelloWorld renders from titles
const batchInputZ = z.object({
  titles: z.array(z.string()),
});

const batchInitZ = batchInputZ.extend({
  renderQueue: z.any(),
});

export const initForBatchStep = createStep({
  id: "initForBatch",
  inputSchema: batchInputZ,
  outputSchema: batchInitZ,
  execute: async ({ inputData }) => {
    const { renderQueue } = await remotionWorkflow.initialize();
    return { ...inputData, renderQueue } as any;
  },
});

export const createJobsFromTitlesStep = createStep({
  id: "createJobsFromTitles",
  inputSchema: batchInitZ,
  outputSchema: z.object({
    jobIds: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const rq = inputData.renderQueue as ReturnType<typeof makeRenderQueue>;
    const jobIds: string[] = [];
    for (const titleText of inputData.titles) {
      const id = rq.createJob({ titleText });
      jobIds.push(id);
    }
    return { jobIds };
  },
});

export const batchHelloWorkflow = createWorkflow({
  id: "batch-hello-workflow",
  inputSchema: batchInputZ,
  outputSchema: createJobsFromTitlesStep.outputSchema,
  steps: [initForBatchStep, createJobsFromTitlesStep],
})
  .then(initForBatchStep)
  .then(createJobsFromTitlesStep)
  .commit();
*/
/*
// Monitoring & cancellation tools as reusable steps/workflows
const monitorInputZ = z.object({
  jobIds: z.array(z.string()),
  intervalMs: z.number().int().min(100).max(60000).default(1000),
});

export const initOnlyStep = createStep({
  id: "initOnly",
  inputSchema: monitorInputZ,
  outputSchema: monitorInputZ.extend({ renderQueue: z.any() }),
  execute: async ({ inputData }) => {
    const { renderQueue } = await remotionWorkflow.initialize();
    return { ...inputData, renderQueue } as any;
  },
});

export const monitorTickStep = createStep({
  id: "monitorTick",
  inputSchema: initOnlyStep.outputSchema,
  outputSchema: initOnlyStep.outputSchema.extend({
    summary: z.object({
      completed: z.number(),
      inProgress: z.number(),
      failed: z.number(),
      statuses: z.array(z.any()),
    }),
  }),
  execute: async ({ inputData }) => {
    await new Promise((res) => setTimeout(res, inputData.intervalMs));
    const rq = inputData.renderQueue as ReturnType<typeof makeRenderQueue>;
    const statuses: Array<{ jobId: string; status: string; progress?: number; videoUrl?: string }> = [];
    for (const jobId of inputData.jobIds) {
      const job = rq.jobs.get(jobId) as any;
      if (job) {
        statuses.push({
          jobId,
          status: job.status,
          progress: job.progress ?? 0,
          videoUrl: job.videoUrl,
        });
      }
    }
    const summary = {
      completed: statuses.filter((s) => s.status === 'completed').length,
      inProgress: statuses.filter((s) => s.status === 'in-progress').length,
      failed: statuses.filter((s) => s.status === 'failed').length,
      statuses,
    };
    return { ...inputData, summary } as any;
  },
});

export const cancelJobsStep = createStep({
  id: "cancelJobs",
  inputSchema: initOnlyStep.outputSchema,
  outputSchema: z.object({
    cancelled: z.array(z.string()),
    message: z.string(),
  }),
  execute: async ({ inputData }) => {
    const rq = inputData.renderQueue as ReturnType<typeof makeRenderQueue>;
    const cancelled: string[] = [];
    for (const jobId of inputData.jobIds) {
      const job = rq.jobs.get(jobId) as any;
      if (job && (job.status === 'queued' || job.status === 'in-progress')) {
        job.cancel();
        cancelled.push(jobId);
      }
    }
    return { cancelled, message: `Cancelled ${cancelled.length} jobs` };
  },
});

export const monitorUntilDoneWorkflow = createWorkflow({
  id: 'monitor-until-done',
  inputSchema: monitorInputZ,
  outputSchema: monitorTickStep.outputSchema,
  steps: [initOnlyStep, monitorTickStep],
})
  .then(initOnlyStep)
  .dountil(
    monitorTickStep,
    async ({ inputData }) => {
      const d = inputData as any;
      const s = d.summary;
      return Boolean(s) && s.inProgress === 0;
    }
  )
  .commit();
*/
/*
// Monitoring & cancellation tools as reusable steps/workflows
const monitorInputZ = z.object({
  jobIds: z.array(z.string()),
  intervalMs: z.number().int().min(100).max(60000).default(1000),
});

export const initOnlyStep = createStep({
  id: "initOnly",
  inputSchema: monitorInputZ,
  outputSchema: monitorInputZ.extend({ renderQueue: z.any() }),
  execute: async ({ inputData }) => {
    const { renderQueue } = await remotionWorkflow.initialize();
    return { ...inputData, renderQueue } as any;
  },
});

export const monitorTickStep = createStep({
  id: "monitorTick",
  inputSchema: initOnlyStep.outputSchema,
  outputSchema: initOnlyStep.outputSchema.extend({
    summary: z.object({
      completed: z.number(),
      inProgress: z.number(),
      failed: z.number(),
      statuses: z.array(z.any()),
    }),
  }),
  execute: async ({ inputData }) => {
    await new Promise((res) => setTimeout(res, inputData.intervalMs));
    const rq = inputData.renderQueue as ReturnType<typeof makeRenderQueue>;
    const statuses: Array<{ jobId: string; status: string; progress?: number; videoUrl?: string }> = [];
    for (const jobId of inputData.jobIds) {
      const job = rq.jobs.get(jobId) as any;
      if (job) {
        statuses.push({
          jobId,
          status: job.status,
          progress: job.progress ?? 0,
          videoUrl: job.videoUrl,
        });
      }
    }
    const summary = {
      completed: statuses.filter((s) => s.status === 'completed').length,
      inProgress: statuses.filter((s) => s.status === 'in-progress').length,
      failed: statuses.filter((s) => s.status === 'failed').length,
      statuses,
    };
    return { ...inputData, summary } as any;
  },
});

export const cancelJobsStep = createStep({
  id: "cancelJobs",
  inputSchema: initOnlyStep.outputSchema,
  outputSchema: z.object({
    cancelled: z.array(z.string()),
    message: z.string(),
  }),
  execute: async ({ inputData }) => {
    const rq = inputData.renderQueue as ReturnType<typeof makeRenderQueue>;
    const cancelled: string[] = [];
    for (const jobId of inputData.jobIds) {
      const job = rq.jobs.get(jobId) as any;
      if (job && (job.status === 'queued' || job.status === 'in-progress')) {
        job.cancel();
        cancelled.push(jobId);
      }
    }
    return { cancelled, message: `Cancelled ${cancelled.length} jobs` };
  },
});

export const monitorUntilDoneWorkflow = createWorkflow({
  id: 'monitor-until-done',
  inputSchema: monitorInputZ,
  outputSchema: monitorTickStep.outputSchema,
  steps: [initOnlyStep, monitorTickStep],
})
  .then(initOnlyStep)
  .dountil(
    monitorTickStep,
    async ({ inputData }) => {
      const d = inputData as any;
      const s = d.summary;
      return Boolean(s) && s.inProgress === 0;
    }
  )
  .commit();
*/
