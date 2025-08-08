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
  batchInitZ,
  monitorInputZ,
} from './schemas';

// ---- Explainer Steps ----
export const initRemotionStep = createStep({
  id: 'initRemotion',
  inputSchema: explainerInputZ,
  outputSchema: explainerInputZ.extend({ renderQueue: z.any(), bundleUrl: z.string() }),
  execute: async ({ inputData }) => {
    const { renderQueue, bundleUrl } = await remotionWorkflow.initialize();
    return { ...inputData, renderQueue, bundleUrl } as any;
  },
});

export const buildInitialPropsStep = createStep({
  id: 'buildInitialProps',
  inputSchema: initRemotionStep.outputSchema,
  outputSchema: initRemotionStep.outputSchema.extend({
    workingProps: propsZ,
    iteration: z.number().default(1),
    loop: z.array(loopRecordZ).default([]),
  }),
  execute: async ({ inputData }) => {
    const { title, intro, examples } = inputData as any;
    const workingProps = { title, intro, examples };
    return { ...inputData, workingProps, iteration: 1, loop: [] } as any;
  },
});

export const reviewIterationStep = createStep({
  id: 'reviewIteration',
  inputSchema: buildInitialPropsStep.outputSchema.extend({ workingProps: propsZ }),
  outputSchema: buildInitialPropsStep.outputSchema.extend({
    workingProps: propsZ,
    shouldStop: z.boolean().default(false),
    iteration: z.number(),
    loop: z.array(loopRecordZ),
  }),
  execute: async ({ inputData }) => {
    const { topics, fps, criteria, iteration } = inputData as any;
    const docsProvider = new MastraMcpDocsProvider();
    const docsContext = await docsProvider.fetchDocsContext(topics, 4);
    const critic = new SelfCriticAgent({ docsProvider });
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

export const queueRenderStep = createStep({
  id: 'queueRender',
  inputSchema: reviewIterationStep.outputSchema,
  outputSchema: z.object({ jobId: z.string(), props: propsZ, loop: z.array(loopRecordZ) }),
  execute: async ({ inputData }) => {
    const jobId = (inputData.renderQueue as ReturnType<typeof makeRenderQueue>).createJob({
      compositionId: 'LongestSubstringExplainer',
      props: (inputData as any).workingProps,
    });
    return { jobId, props: (inputData as any).workingProps, loop: (inputData as any).loop } as any;
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
    async ({ inputData }) => !(inputData as any).shouldStop && (inputData as any).iteration <= (inputData as any).maxIterations
  )
  .then(queueRenderStep)
  .commit();

// ---- Batch Steps ----
export const initForBatchStep = createStep({
  id: 'initForBatch',
  inputSchema: batchInputZ,
  outputSchema: batchInitZ,
  execute: async ({ inputData }) => {
    const { renderQueue } = await remotionWorkflow.initialize();
    return { ...inputData, renderQueue } as any;
  },
});

export const createJobsFromTitlesStep = createStep({
  id: 'createJobsFromTitles',
  inputSchema: batchInitZ,
  outputSchema: z.object({ jobIds: z.array(z.string()) }),
  execute: async ({ inputData }) => {
    const rq = (inputData as any).renderQueue as ReturnType<typeof makeRenderQueue>;
    const jobIds: string[] = [];
    for (const titleText of (inputData as any).titles) {
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
  outputSchema: monitorInputZ.extend({ renderQueue: z.any() }),
  execute: async ({ inputData }) => {
    const { renderQueue } = await remotionWorkflow.initialize();
    return { ...inputData, renderQueue } as any;
  },
});

export const monitorTickStep = createStep({
  id: 'monitorTick',
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
    await new Promise((res) => setTimeout(res, (inputData as any).intervalMs));
    const rq = (inputData as any).renderQueue as ReturnType<typeof makeRenderQueue>;
    const statuses: Array<{ jobId: string; status: string; progress?: number; videoUrl?: string }> = [];
    for (const jobId of (inputData as any).jobIds) {
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

export const cancelJobsStep = createStep({
  id: 'cancelJobs',
  inputSchema: initOnlyStep.outputSchema,
  outputSchema: z.object({ cancelled: z.array(z.string()), message: z.string() }),
  execute: async ({ inputData }) => {
    const rq = (inputData as any).renderQueue as ReturnType<typeof makeRenderQueue>;
    const cancelled: string[] = [];
    for (const jobId of (inputData as any).jobIds) {
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
