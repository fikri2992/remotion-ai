# Remotion Render Server Template

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.gif">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

This template provides an Express.js server that allows you to start new video render jobs, track the progress of ongoing renders, and cancel running render jobs.

The server exposes the following main endpoints:

- `POST /renders` - Start a new render job
- `GET /renders/:jobId` - Get the status of a render
- `DELETE /renders/:jobId` - Cancel a running render

## Getting Started

**Install Dependencies**

```console
npm i
```

**Start the Render Server**

```console
npm run dev
```

This will start the Express server that handles render requests in watch mode for development.

**Run in Production**

```console
npm start
```

**Run Remotion Studio**

```console
npm run remotion:studio
```

**Render the example video locally**

```
npx remotion render
```

**Upgrade all Remotion packages:**

```
npx remotion upgrade
```

## Docker Support

The template includes Docker support out of the box. Build and run the container using:

```console
docker build -t remotion-render-server .
docker run -d -p 3000:3000 remotion-render-server
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).

---

# Remotion AI: Remotion + Mastra MCP (Updated README)

This project augments a Remotion render server with an MCP (Model Context Protocol) server so AI agents and MCP clients can create and monitor video renders via stdio tools in addition to the traditional HTTP API.

Highlights:
- __HTTP server__ in `server/index.ts` for REST-style control of render jobs.
- __MCP server__ in `src/mastra/tools/remotion-server.ts` exposing tools: `createRenderJob`, `getRenderStatus`, `cancelRenderJob`.
- __Render queue__ in `server/render-queue.ts` with job states, progress, and cancellation.
- __Agent demo__ in `src/mastra/agents/simple-agent.js` using the MCP tools.
- __Workflow utilities__ in `src/mastra/workflows/remotion/` for batching, reviewing, and monitoring renders.

## Project Structure

- `server/index.ts` — Express server: create, query, cancel jobs; serves `renders/`.
- `server/render-queue.ts` — Job queue; uses Remotion renderer; cancel/progress support.
- `src/mastra/tools/remotion-server.ts` — MCP server over stdio with 3 tools.
- `mcp-server-simple.js` — Node launcher that runs the TypeScript MCP server via `tsx`.
- `demo-mcp.js` — Minimal MCP client demo that spawns the MCP server and calls tools.
- `src/mastra/agents/simple-agent.js` — Simple agent that lists tools and creates a job.
- `src/mastra/workflows/remotion/` — `core.ts`, `factories.ts`, `schemas.ts`, `static.ts` for workflows and steps.
- `renders/` — Output videos; also hosted by the Express server under `/renders`.

Related docs in repo:
- `MASTRA-AGENT-GUIDE.md`
- `agent.md`
- `workflow.md`

## Setup

1) Install dependencies

```bash
npm i
```

2) Optional: Run Remotion Studio during development

```bash
npm run remotion:studio
```

3) Build bundle (optional — servers auto-bundle if `REMOTION_SERVE_URL` is not set)

```bash
npm run build
```

## Run: HTTP Server (Express)

Development (watch):

```bash
npm run dev
```

Production:

```bash
npm start
```

Endpoints (see `server/index.ts`):
- `POST /renders` — Create a render job. Body supports:
  - `titleText?: string` (HelloWorld demo)
  - `compositionId?: string` and `props?: object`
- `GET /renders/:jobId` — Get job status.
- `DELETE /renders/:jobId` — Cancel a queued/in-progress job.

The server hosts finished videos at `/renders/<jobId>.mp4` from the `renders/` folder.

## Run: MCP Server (stdio tools)

Start MCP server:

```bash
npm run mcp:server
```

This launches `mcp-server-simple.js`, which runs `src/mastra/tools/remotion-server.ts` via `tsx` and exposes tools compatible with MCP clients and agents.

Quick demo client:

```bash
node demo-mcp.js
```

Example JSON-RPC requests sent over stdio:

```json
// List tools
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

```json
// Create a render job
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "createRenderJob",
    "arguments": { "titleText": "Hello from MCP!" }
  }
}
```

## Agent and Workflows

- __Agent demo__: `node src/mastra/agents/simple-agent.js`
  - Spawns the MCP server, lists tools, creates a job, fetches status.

- __Workflows__: see `src/mastra/workflows/remotion/`
  - `core.ts` class `RemotionWorkflow` provides:
    - `createVideoWorkflow(titleTexts: string[])`
    - `createExplainerWorkflow(...)`
    - `createExplainerWorkflowReviewed(...)`
    - `monitorWorkflow(jobIds: string[])`
    - `cancelWorkflow(jobIds: string[])`
  - `factories.ts` exposes configurable steps and builders:
    - `buildExplainerReviewedWorkflow()`
    - `buildBatchHelloWorkflow()`
    - `buildMonitorUntilDoneWorkflow()`

Example one‑liners with tsx:

```bash
npx tsx -e "import { RemotionWorkflow } from './src/mastra/workflows/remotion/core.ts'; const w = new RemotionWorkflow(); w.createVideoWorkflow(['Demo 1','Demo 2']).then(console.log).catch(console.error)"
```

```bash
npx tsx -e "import { buildBatchHelloWorkflow } from './src/mastra/workflows/remotion/factories.ts'; (async () => { const wf = await buildBatchHelloWorkflow(); const out = await wf.run({ titles: ['A','B','C'] }); console.log(out); })();"
```

## Testing

- __API/MCP sanity__: `npm run test:api` (spawns MCP server and calls `createRenderJob`).
- __MCP demo__: `node demo-mcp.js` to see `tools/list` and `createRenderJob` responses.

Note: `npm run test:mcp`, `npm run test:workflow`, and related inline examples in `package.json` may reference older paths (e.g., `remotion-workflow.ts`). Prefer the explicit `core.ts`/`factories.ts` one‑liners shown above.

## Configuration

Environment variables:
- `PORT` — Express server port (default `3000`).
- `REMOTION_SERVE_URL` — Optional pre-built Remotion bundle URL; if not set, the servers bundle from `remotion/index.ts` at startup.

## Scripts Reference (package.json)

- `dev` — Start Express server in watch mode.
- `start` — Start Express server.
- `remotion:studio` — Open Remotion Studio.
- `build` — Bundle Remotion project.
- `mcp:server` — Start MCP server (`mcp-server-simple.js`).
- `mcp:demo` — Alias to start MCP server.
- `agent:demo` / `mastra:agent` — Run simple agent demo.
- `test:api` — Minimal MCP API test.

## Troubleshooting

- __Bundling takes long__: First run bundles Remotion. Subsequent runs are faster or can use `REMOTION_SERVE_URL`.
- __No video output__: Check job status via HTTP or MCP; outputs should appear in `renders/`. Ensure the composition `compositionId` and `props` are valid for your Remotion project.
- __Windows__: The `mcp-server-simple.js` launcher handles `.cmd` for `tsx` on Windows.

## Next Steps

- Integrate a full MCP client or agent UI against the exposed tools.
- Harden error handling, persistence, and metrics for production use.
