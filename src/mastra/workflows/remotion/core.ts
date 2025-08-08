import { makeRenderQueue } from '../../../../server/render-queue';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { ensureBrowser } from '@remotion/renderer';
import fs from 'node:fs';
import { MastraMcpDocsProvider, NoopDocsProvider, type DocsProvider } from '../../agents/docs-provider';
import { SelfCriticAgent, type SuccessCriteria } from '../../agents/self-critic-agent';

// Workflow for automated video creation (class-based, kept for backward compatibility)
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
    const jobs = [] as Array<{ jobId: string; titleText: string; status: string }>;

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
    const statuses: Array<{ jobId: string; status: string; progress?: number; videoUrl?: string }> = [];

    for (const jobId of jobIds) {
      const job = renderQueue.jobs.get(jobId) as any;
      if (job) {
        const videoUrl = (job as any).videoUrl;
        const progress = (job as any).progress ?? 0;
        statuses.push({ jobId, status: (job as any).status, progress, videoUrl });
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
    const cancelled: string[] = [];

    for (const jobId of jobIds) {
      const job = renderQueue.jobs.get(jobId) as any;
      if (job && (job.status === 'queued' || job.status === 'in-progress')) {
        job.cancel();
        cancelled.push(jobId);
      }
    }

    return { cancelled, message: `Cancelled ${cancelled.length} jobs` };
  }
}

// Export singleton instance
export const remotionWorkflow = new RemotionWorkflow();
