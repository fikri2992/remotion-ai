#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const z = require('zod');
const path = require('node:path');
const { bundle } = require('@remotion/bundler');
const { ensureBrowser } = require('@remotion/renderer');
const { makeRenderQueue } = require('./server/render-queue');

// Initialize services
let remotionBundleUrl = null;
let renderQueue = null;

const initializeServices = async () => {
  if (!remotionBundleUrl) {
    await ensureBrowser();
    const { REMOTION_SERVE_URL } = process.env;
    remotionBundleUrl = REMOTION_SERVE_URL
      ? REMOTION_SERVE_URL
      : await bundle({
          entryPoint: path.resolve('remotion/index.ts'),
          onProgress(progress) {
            console.error(`Bundling Remotion project: ${progress}%`);
          },
        });
  }

  if (!renderQueue) {
    const rendersDir = path.resolve('renders');
    renderQueue = makeRenderQueue({
      port: 0,
      serveUrl: remotionBundleUrl,
      rendersDir,
    });
  }

  return { remotionBundleUrl, renderQueue };
};

const server = new Server(
  {
    name: 'Remotion Video Renderer',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: 'createRenderJob',
    description: 'Create a new video rendering job with the specified title text',
    inputSchema: {
      type: 'object',
      properties: {
        titleText: {
          type: 'string',
          description: 'Optional: Text for HelloWorld demo',
        },
        compositionId: {
          type: 'string',
          description: 'Optional: Composition ID to render',
        },
        props: {
          type: 'object',
          description: 'Optional: Input props for the composition',
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'getRenderStatus',
    description: 'Get the status of a specific render job by job ID',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: {
          type: 'string',
          description: 'The ID of the render job',
        },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'cancelRenderJob',
    description: 'Cancel a specific render job by job ID',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: {
          type: 'string',
          description: 'The ID of the render job to cancel',
        },
      },
      required: ['jobId'],
    },
  },
];

// Tool implementations
const createRenderJob = async ({ titleText, compositionId, props }) => {
  try {
    const { renderQueue } = await initializeServices();
    const jobId = renderQueue.createJob({ titleText, compositionId, props });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            jobId,
            status: 'queued',
            message: 'Render job created successfully',
          }),
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to create render job: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
};

const getRenderStatus = async ({ jobId }) => {
  try {
    const { renderQueue } = await initializeServices();
    const job = renderQueue.jobs.get(jobId);

    if (!job) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Job not found',
              jobId,
            }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(job),
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to get render status: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
};

const cancelRenderJob = async ({ jobId }) => {
  try {
    const { renderQueue } = await initializeServices();
    const job = renderQueue.jobs.get(jobId);

    if (!job) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Job not found',
              jobId,
            }),
          },
        ],
        isError: true,
      };
    }

    if (job.status !== 'queued' && job.status !== 'in-progress') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Job is not cancellable',
              jobId,
              status: job.status,
            }),
          },
        ],
        isError: true,
      };
    }

    job.cancel();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: 'Job cancelled successfully',
            jobId,
            status: 'cancelled',
          }),
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to cancel render job: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
};

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'createRenderJob':
        return await createRenderJob(request.params.arguments);
      case 'getRenderStatus':
        return await getRenderStatus(request.params.arguments);
      case 'cancelRenderJob':
        return await cancelRenderJob(request.params.arguments);
      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${request.params.name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Remotion MCP server started');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down Remotion MCP server...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down Remotion MCP server...');
  await server.close();
  process.exit(0);
});

main().catch(console.error);
