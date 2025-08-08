import {
  makeCancelSignal,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";
import { randomUUID } from "node:crypto";
import path from "node:path";

interface JobData {
  // If provided, target this composition
  compositionId?: string;
  // Props to pass to the composition
  props?: Record<string, unknown>;
  // Back-compat with the HelloWorld demo composition
  titleText?: string;
}

type JobState =
  | {
      status: "queued";
      data: JobData;
      cancel: () => void;
    }
  | {
      status: "in-progress";
      progress: number;
      data: JobData;
      cancel: () => void;
    }
  | {
      status: "completed";
      videoUrl: string;
      data: JobData;
    }
  | {
      status: "failed";
      error: Error;
      data: JobData;
    };

const DEFAULT_HELLO = "HelloWorld";
const DEFAULT_EXPLAINER = "LongestSubstringExplainer";

export const makeRenderQueue = ({
  port,
  serveUrl,
  rendersDir,
}: {
  port: number;
  serveUrl: string;
  rendersDir: string;
}) => {
  const jobs = new Map<string, JobState>();
  let queue: Promise<unknown> = Promise.resolve();

  const processRender = async (jobId: string) => {
    const job = jobs.get(jobId);
    if (!job) {
      throw new Error(`Render job ${jobId} not found`);
    }

    const { cancel, cancelSignal } = makeCancelSignal();

    jobs.set(jobId, {
      progress: 0,
      status: "in-progress",
      cancel: cancel,
      data: job.data,
    });

    try {
      const inputProps =
        job.data.props ??
        (job.data.titleText
          ? { titleText: job.data.titleText }
          : {
              title: "Longest Substring Without Repeating Characters",
              intro:
                "We use the Sliding Window technique. Move right to expand, move left to remove duplicates.",
              examples: ["abcabcbb", "bbbbb", "pwwkew"],
            });

      const targetCompositionId =
        job.data.compositionId ??
        (job.data.titleText ? DEFAULT_HELLO : DEFAULT_EXPLAINER);

      const composition = await selectComposition({
        serveUrl,
        id: targetCompositionId,
        inputProps,
      });

      await renderMedia({
        cancelSignal,
        serveUrl,
        composition,
        inputProps,
        // High-quality, color-accurate output
        codec: "h264",
        imageFormat: "png",
        jpegQuality: 100,
        crf: 18,
        x264Preset: "slow",
        pixelFormat: "yuv420p",
        colorSpace: "bt709",
        onProgress: (progress) => {
          console.info(`${jobId} render progress:`, progress.progress);
          jobs.set(jobId, {
            progress: progress.progress,
            status: "in-progress",
            cancel: cancel,
            data: job.data,
          });
        },
        outputLocation: path.join(rendersDir, `${jobId}.mp4`),
      });

      jobs.set(jobId, {
        status: "completed",
        videoUrl: `http://localhost:${port}/renders/${jobId}.mp4`,
        data: job.data,
      });
    } catch (error) {
      console.error(error);
      jobs.set(jobId, {
        status: "failed",
        error: error as Error,
        data: job.data,
      });
    }
  };

  const queueRender = async ({
    jobId,
    data,
  }: {
    jobId: string;
    data: JobData;
  }) => {
    jobs.set(jobId, {
      status: "queued",
      data,
      cancel: () => {
        jobs.delete(jobId);
      },
    });

    queue = queue.then(() => processRender(jobId));
  };

  function createJob(data: JobData) {
    const jobId = randomUUID();

    queueRender({ jobId, data });

    return jobId;
  }

  return {
    createJob,
    jobs,
  };
};
