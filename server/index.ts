import express from "express";
import { makeRenderQueue } from "./render-queue";
import { bundle } from "@remotion/bundler";
import path from "node:path";
import fs from "node:fs";
import { ensureBrowser } from "@remotion/renderer";

const { PORT = 3000, REMOTION_SERVE_URL } = process.env;

function setupApp({ remotionBundleUrl }: { remotionBundleUrl: string }) {
  const app = express();

  const rendersDir = path.resolve("renders");
  // Ensure renders directory exists
  try {
    fs.mkdirSync(rendersDir, { recursive: true });
  } catch {
    // Directory may already exist, ignore error
  }

  const queue = makeRenderQueue({
    port: Number(PORT),
    serveUrl: remotionBundleUrl,
    rendersDir,
  });

  // Host renders on /renders
  app.use("/renders", express.static(rendersDir));
  app.use(express.json());

  // Endpoint to create a new job
  app.post("/renders", async (req, res) => {
    const { titleText, compositionId, props } = req.body ?? {};

    if (titleText !== undefined && typeof titleText !== "string") {
      res.status(400).json({ message: "titleText must be a string if provided" });
      return;
    }
    if (compositionId !== undefined && typeof compositionId !== "string") {
      res.status(400).json({ message: "compositionId must be a string if provided" });
      return;
    }
    if (props !== undefined && (typeof props !== "object" || props === null || Array.isArray(props))) {
      res.status(400).json({ message: "props must be an object if provided" });
      return;
    }

    const jobId = queue.createJob({ titleText, compositionId, props });

    res.json({ jobId });
  });

  // Endpoint to get a job status
  app.get("/renders/:jobId", (req, res) => {
    const jobId = req.params.jobId;
    const job = queue.jobs.get(jobId);

    res.json(job);
  });

  // Endpoint to cancel a job
  app.delete("/renders/:jobId", (req, res) => {
    const jobId = req.params.jobId;

    const job = queue.jobs.get(jobId);

    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    if (job.status !== "queued" && job.status !== "in-progress") {
      res.status(400).json({ message: "Job is not cancellable" });
      return;
    }

    job.cancel();

    res.json({ message: "Job cancelled" });
  });

  return app;
}

async function main() {
  await ensureBrowser();

  const remotionBundleUrl = REMOTION_SERVE_URL
    ? REMOTION_SERVE_URL
    : await bundle({
        entryPoint: path.resolve("remotion/index.ts"),
        onProgress(progress) {
          console.info(`Bundling Remotion project: ${progress}%`);
        },
      });

  const app = setupApp({ remotionBundleUrl });

  app.listen(PORT, () => {
    console.info(`Server is running on port ${PORT}`);
  });
}

main();
