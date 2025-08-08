import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { makeRenderQueue } from '../../../../server/render-queue';
import { MastraMcpDocsProvider, type DocsProvider } from '../../agents/docs-provider';
import { SelfCriticAgent, type SuccessCriteria } from '../../agents/self-critic-agent';
import { remotionWorkflow } from './core';
import { explainerInputZ, propsZ, loopRecordZ } from './schemas';

export const DEFAULT_EXPLAINER_COMPOSITION_ID = 'LongestSubstringExplainer';

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

// Monitor factories
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
      const interval = (inputData as any).intervalMs ?? (config?.defaultIntervalMs ?? 1000);
      await new Promise((res) => setTimeout(res, interval));
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
        const s = ((inputData as any).summary) as any;
        return Boolean(s) && done(s);
      }
    )
    .commit();
}
