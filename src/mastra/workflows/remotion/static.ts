import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { MastraMcpDocsProvider } from '../../agents/docs-provider';
import { SelfCriticAgent, type SuccessCriteria } from '../../agents/self-critic-agent';
import { makeRenderQueue } from '../../../../server/render-queue';
import { remotionWorkflow } from './core';
import {
  explainerInputZ,
  loopRecordZ,
  propsZ,
  batchInputZ,
  monitorInputZ,
} from './schemas';

// Local type helpers
type RenderQueue = ReturnType<typeof makeRenderQueue>;
type ExplainerInput = z.infer<typeof explainerInputZ>;
const batchInitOutputZ = batchInputZ.extend({ renderQueue: z.custom<RenderQueue>() });

// Schemas with strongly-typed additions
const initRemotionOutputZ = explainerInputZ.extend({
  renderQueue: z.custom<RenderQueue>(),
  bundleUrl: z.string(),
});

// ---- Explainer Steps ----
export const initRemotionStep = createStep({
  id: 'initRemotion',
  inputSchema: explainerInputZ,
  outputSchema: initRemotionOutputZ,
  execute: async ({ inputData }) => {
    const { renderQueue, bundleUrl } = await remotionWorkflow.initialize();
    return { ...inputData, renderQueue, bundleUrl };
  },
});

export const buildInitialPropsStep = createStep({
  id: 'buildInitialProps',
  inputSchema: initRemotionOutputZ,
  outputSchema: initRemotionOutputZ.extend({
    workingProps: propsZ,
    iteration: z.number().default(1),
    loop: z.array(loopRecordZ).default([]),
  }),
  execute: async ({ inputData }) => {
    const { title, intro, examples } = inputData as ExplainerInput;
    const workingProps = { title, intro, examples };
    return { ...inputData, workingProps, iteration: 1, loop: [] };
  },
});

const reviewInputZ = buildInitialPropsStep.outputSchema.extend({ workingProps: propsZ });
const reviewOutputZ = buildInitialPropsStep.outputSchema.extend({
  workingProps: propsZ,
  shouldStop: z.boolean().default(false),
  iteration: z.number(),
  loop: z.array(loopRecordZ),
});

export const reviewIterationStep = createStep({
  id: 'reviewIteration',
  inputSchema: reviewInputZ,
  outputSchema: reviewOutputZ,
  execute: async ({ inputData }) => {
    const { topics, fps, criteria, iteration } = inputData as z.infer<typeof reviewInputZ>;
    const docsProvider = new MastraMcpDocsProvider();
    const docsContext = await docsProvider.fetchDocsContext(topics, 4);
    const critic = new SelfCriticAgent({ docsProvider });
    const { review, fixedArtifacts, shouldStop } = await critic.reviewAndFix({
      renderProps: (inputData as z.infer<typeof reviewInputZ>).workingProps,
      fps,
      docsContext,
      criteria: (criteria ?? undefined) as SuccessCriteria | undefined,
      iteration,
    });
    const nextProps: z.infer<typeof propsZ> = fixedArtifacts?.renderProps
      ? { ...(inputData as z.infer<typeof reviewInputZ>).workingProps, ...(fixedArtifacts.renderProps as Partial<z.infer<typeof propsZ>>) }
      : (inputData as z.infer<typeof reviewInputZ>).workingProps;
    const nextIteration = (iteration ?? 1) + 1;
    const loop = [
      ...((inputData as z.infer<typeof reviewInputZ>).loop ?? []),
      { iteration: iteration ?? 1, review, docsContext },
    ];
    return { ...inputData, workingProps: nextProps, shouldStop: Boolean(shouldStop), iteration: nextIteration, loop };
  },
});

export const queueRenderStep = createStep({
  id: 'queueRender',
  inputSchema: reviewOutputZ,
  outputSchema: z.object({ jobId: z.string(), props: propsZ, loop: z.array(loopRecordZ) }),
  execute: async ({ inputData }) => {
    const jobId = (inputData.renderQueue as RenderQueue).createJob({
      compositionId: 'LongestSubstringExplainer',
      props: (inputData as z.infer<typeof reviewOutputZ>).workingProps,
    });
    return { jobId, props: (inputData as z.infer<typeof reviewOutputZ>).workingProps, loop: (inputData as z.infer<typeof reviewOutputZ>).loop };
  },
});

export const explainerReviewedWorkflow = createWorkflow({
  id: 'explainer-reviewed-workflow',
  inputSchema: explainerInputZ,
  outputSchema: queueRenderStep.outputSchema,
  steps: [initRemotionStep, buildInitialPropsStep, reviewIterationStep, queueRenderStep],
})
  .then(initRemotionStep)
  .then(buildInitialPropsStep)
  .dowhile(
    reviewIterationStep,
    async ({ inputData }) => {
      const d = inputData as z.infer<typeof reviewOutputZ> & { maxIterations: number };
      return !d.shouldStop && d.iteration <= d.maxIterations;
    }
  )
  .then(queueRenderStep)
  .commit();

// ---- Batch Steps ----
export const initForBatchStep = createStep({
  id: 'initForBatch',
  inputSchema: batchInputZ,
  outputSchema: batchInitOutputZ,
  execute: async ({ inputData }) => {
    const { renderQueue } = await remotionWorkflow.initialize();
    return { ...inputData, renderQueue };
  },
});

export const createJobsFromTitlesStep = createStep({
  id: 'createJobsFromTitles',
  inputSchema: batchInitOutputZ,
  outputSchema: z.object({ jobIds: z.array(z.string()) }),
  execute: async ({ inputData }) => {
    const rq = (inputData.renderQueue as RenderQueue);
    const jobIds: string[] = [];
    for (const titleText of inputData.titles as string[]) {
      const id = rq.createJob({ titleText });
      jobIds.push(id);
    }
    return { jobIds };
  },
});

export const batchHelloWorkflow = createWorkflow({
  id: 'batch-hello-workflow',
  inputSchema: batchInputZ,
  outputSchema: createJobsFromTitlesStep.outputSchema,
  steps: [initForBatchStep, createJobsFromTitlesStep],
})
  .then(initForBatchStep)
  .then(createJobsFromTitlesStep)
  .commit();

// ---- Monitor & Cancel Steps ----
export const initOnlyStep = createStep({
  id: 'initOnly',
  inputSchema: monitorInputZ,
  outputSchema: monitorInputZ.extend({ renderQueue: z.custom<RenderQueue>() }),
  execute: async ({ inputData }) => {
    const { renderQueue } = await remotionWorkflow.initialize();
    return { ...inputData, renderQueue };
  },
});

const statusZ = z.object({
  jobId: z.string(),
  status: z.enum(['queued', 'in-progress', 'completed', 'failed']),
  progress: z.number().optional(),
  videoUrl: z.string().optional(),
});

type Queued = { status: 'queued'; data: unknown; cancel: () => void };
type InProgress = { status: 'in-progress'; progress: number; data: unknown; cancel: () => void };
type Completed = { status: 'completed'; videoUrl: string; data: unknown };
type Failed = { status: 'failed'; error: Error; data: unknown };
type JobState = Queued | InProgress | Completed | Failed;

export const monitorTickStep = createStep({
  id: 'monitorTick',
  inputSchema: initOnlyStep.outputSchema,
  outputSchema: initOnlyStep.outputSchema.extend({
    summary: z.object({
      completed: z.number(),
      inProgress: z.number(),
      failed: z.number(),
      statuses: z.array(statusZ),
    }),
  }),
  execute: async ({ inputData }) => {
    await new Promise((res) => setTimeout(res, inputData.intervalMs));
    const rq = inputData.renderQueue as RenderQueue;
    const statuses: Array<z.infer<typeof statusZ>> = [];
    for (const jobId of inputData.jobIds) {
      const job = rq.jobs.get(jobId) as JobState | undefined;
      if (!job) continue;
      if (job.status === 'completed') {
        statuses.push({ jobId, status: job.status, videoUrl: job.videoUrl });
      } else if (job.status === 'in-progress') {
        statuses.push({ jobId, status: job.status, progress: job.progress ?? 0 });
      } else {
        statuses.push({ jobId, status: job.status });
      }
    }
    const summary = {
      completed: statuses.filter((s) => s.status === 'completed').length,
      inProgress: statuses.filter((s) => s.status === 'in-progress').length,
      failed: statuses.filter((s) => s.status === 'failed').length,
      statuses,
    };
    return { ...inputData, summary };
  },
});

export const cancelJobsStep = createStep({
  id: 'cancelJobs',
  inputSchema: initOnlyStep.outputSchema,
  outputSchema: z.object({ cancelled: z.array(z.string()), message: z.string() }),
  execute: async ({ inputData }) => {
    const rq = inputData.renderQueue as RenderQueue;
    const cancelled: string[] = [];
    for (const jobId of inputData.jobIds) {
      const job = rq.jobs.get(jobId) as JobState | undefined;
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
      const s = (inputData as z.infer<typeof monitorTickStep.outputSchema>).summary;
      return Boolean(s) && s.inProgress === 0;
    }
  )
  .commit();
