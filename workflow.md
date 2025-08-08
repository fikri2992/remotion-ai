# Remotion + Mastra Workflows

This repo now exposes Mastra Workflows built on top of the existing render queue and agents. You can run single-step, multi-step, and looping workflows for rendering and monitoring.

Key file: `src/mastra/workflows/remotion-workflow.ts`

## Exports
- `explainerReviewedWorkflow`: Generates props for `LongestSubstringExplainer` with a docs‑grounded self‑critique loop, then queues a render.
- `batchHelloWorkflow`: Creates multiple HelloWorld renders from a list of titles.
- `monitorUntilDoneWorkflow`: Polls job statuses in a loop until all jobs complete or fail.
- Reusable steps:
  - `initRemotionStep` (bundle + queue)
  - `buildInitialPropsStep`
  - `reviewIterationStep`
  - `queueRenderStep`
  - `initForBatchStep`, `createJobsFromTitlesStep`
  - `initOnlyStep`, `monitorTickStep`, `cancelJobsStep`

### Module layout (refactor)
- `src/mastra/workflows/remotion/core.ts`
  - `RemotionWorkflow` class and `remotionWorkflow` singleton
- `src/mastra/workflows/remotion/schemas.ts`
  - Zod schemas: `explainerInputZ`, `propsZ`, `loopRecordZ`, `batchInputZ`, `batchInitZ`, `monitorInputZ`, `successCriteriaZ`
- `src/mastra/workflows/remotion/static.ts`
  - Static steps/workflows: `initRemotionStep`, `buildInitialPropsStep`, `reviewIterationStep`, `queueRenderStep`, `explainerReviewedWorkflow`, `initForBatchStep`, `createJobsFromTitlesStep`, `batchHelloWorkflow`, `initOnlyStep`, `monitorTickStep`, `cancelJobsStep`, `monitorUntilDoneWorkflow`
- `src/mastra/workflows/remotion/factories.ts`
  - Configurable factories: `buildExplainerReviewedWorkflow`, `make*Step` variants, batch & monitor factories, `ExplainerWorkflowConfig`, `MonitorWorkflowConfig`

Import examples:
```ts
// Static workflow
import { explainerReviewedWorkflow } from './src/mastra/workflows/remotion/static';

// Configurable workflow
import { buildExplainerReviewedWorkflow } from './src/mastra/workflows/remotion/factories';

// Class-based API (legacy-compatible)
import { RemotionWorkflow } from './src/mastra/workflows/remotion/core';
```

## Install
- Already included in `package.json`:
  - `@mastra/core`, `zod`

## Usage

### 1) Reviewed Explainer (looping with do-while)
This workflow fetches docs, reviews props with `SelfCriticAgent`, optionally repairs, loops until criteria are met or `maxIterations` is reached, then queues a render.

```ts
import { Mastra } from "@mastra/core";
import {
  explainerReviewedWorkflow,
} from "./src/mastra/workflows/remotion-workflow";

const mastra = new Mastra({
  workflows: { explainerReviewedWorkflow },
});

const run = await mastra.getWorkflow("explainerReviewedWorkflow").createRunAsync();

const result = await run.start({
  inputData: {
    examples: ["abcabcbb", "bbbbb", "pwwkew"],
    title: "Longest Substring Without Repeating Characters",
    intro: "We use the Sliding Window technique...",
    topics: ["agents", "workflows", "tools", "voice"],
    fps: 60,
    maxIterations: 2,
    criteria: { minScore: 0.9, requiredCitations: 1 },
  },
});

console.log(result); // { jobId, props, loop }
```

#### Customize with factories (separation of concerns)
Use the factory builders to customize composition ID, docs limit, id prefixes, and stop predicates without touching internals.

```ts
import { Mastra } from "@mastra/core";
import { buildExplainerReviewedWorkflow } from "./src/mastra/workflows/remotion-workflow";

const explainerReviewedCustom = buildExplainerReviewedWorkflow({
  compositionId: "LongestSubstringExplainer",
  idPrefix: "my.",
  docsLimit: 6,
  propsBuilder: (input) => ({
    title: `[Custom] ${input.title}`,
    intro: input.intro,
    examples: input.examples,
  }),
  stopPredicate: ({ iteration, maxIterations, shouldStop }) => Boolean(shouldStop) || iteration > Math.min(5, maxIterations),
});

const mastra = new Mastra({ workflows: { explainerReviewedCustom } });
```

### 2) Batch HelloWorld renders (multi-step)
```ts
import { Mastra } from "@mastra/core";
import { batchHelloWorkflow } from "./src/mastra/workflows/remotion-workflow";

const mastra = new Mastra({ workflows: { batchHelloWorkflow } });
const run = await mastra.getWorkflow("batchHelloWorkflow").createRunAsync();
const { jobIds } = await run.start({ inputData: { titles: ["A", "B", "C"] } });
console.log(jobIds);
```

Or use configurable batch builders:
```ts
import { buildBatchHelloWorkflow } from "./src/mastra/workflows/remotion-workflow";

const batch = buildBatchHelloWorkflow();
```

### 3) Monitor jobs until done (looping with do-until)
```ts
import { Mastra } from "@mastra/core";
import { monitorUntilDoneWorkflow } from "./src/mastra/workflows/remotion-workflow";

const mastra = new Mastra({ workflows: { monitorUntilDoneWorkflow } });
const run = await mastra.getWorkflow("monitorUntilDoneWorkflow").createRunAsync();

const { summary } = await run.start({ inputData: { jobIds: ["<job-id>"], intervalMs: 1000 } });
console.log(summary);
```

Or a configurable monitor:
```ts
import { buildMonitorUntilDoneWorkflow } from "./src/mastra/workflows/remotion-workflow";

const monitor = buildMonitorUntilDoneWorkflow({
  defaultIntervalMs: 1500,
  donePredicate: (s) => s.inProgress === 0 || s.failed > 0,
});
```

### Optional: Cancel jobs via step
If you need a cancellation workflow, you can compose `initOnlyStep` → `cancelJobsStep` similarly.

## Control Flow Used
- Sequential chaining with `.then()`
- Looping with `.dowhile()` for iterative self‑critique
- Looping with `.dountil()` for monitoring until completion

## Notes
- Renders are written to the `renders/` directory via `server/render-queue.ts`.
- `videoUrl` is computed in the queue using a port — in headless mode this may be a placeholder; consume files directly from `renders/` when not serving over HTTP.
- Docs fetching uses `MastraMcpDocsProvider` placeholder; wire it to a real MCP client (e.g., Mastra Docs MCP) for live citations.

### Dependency injection hooks
- `MonitorWorkflowConfig.defaultIntervalMs?`, `donePredicate?`, `idPrefix?` to namespace steps when composing.
- `propsBuilder?` and `queueJobBuilder?` to fully control props and queue payload.

## Where to extend
- Add a TTS agent step and use `.parallel()` with concurrency to synthesize narration per section.
- Add `.branch()` for different explainer templates (sliding window, DP, graphs) based on classification.
- Wire monitoring to UI or CLI by consuming the `summary` from `monitorTickStep`.
