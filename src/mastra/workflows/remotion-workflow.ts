// Simple workflow for Remotion video rendering using MCP
import { makeRenderQueue } from '../../../server/render-queue';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { ensureBrowser } from '@remotion/renderer';

// Workflow for automated video creation
export class RemotionWorkflow {
  private renderQueue: any = null;
  private remotionBundleUrl: string | null = null;

  async initialize() {
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
      this.renderQueue = makeRenderQueue({
        port: 0,
        serveUrl: this.remotionBundleUrl,
        rendersDir,
      });
    }

    return { renderQueue: this.renderQueue, bundleUrl: this.remotionBundleUrl };
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
        statuses.push({
          jobId,
          status: job.status,
          progress: job.progress || 0,
          url: job.url,
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
