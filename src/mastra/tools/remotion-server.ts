import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { ensureBrowser } from '@remotion/renderer';
import { makeRenderQueue } from '../../../server/render-queue';

// Initialize browser and bundle
let remotionBundleUrl: string | null = null;
let renderQueue: ReturnType<typeof makeRenderQueue> | null = null;

const initializeServices = async () => {
  if (!remotionBundleUrl) {
    await ensureBrowser();
    const { REMOTION_SERVE_URL } = process.env;
    remotionBundleUrl = REMOTION_SERVE_URL
      ? REMOTION_SERVE_URL
      : await bundle({
          entryPoint: path.resolve('remotion/index.ts'),
          onProgress(progress) {
            console.info(`Bundling Remotion project: ${progress}%`);
          },
        });
  }

  if (!renderQueue) {
    const rendersDir = path.resolve('renders');
    renderQueue = makeRenderQueue({
      port: 0, // Port not needed for MCP server
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
  },
);

// Tool schemas
const createRenderJobSchema = z.object({
  titleText: z.string().describe('The text to display in the video'),
});

const getRenderStatusSchema = z.object({
  jobId: z.string().describe('The ID of the render job'),
});

const cancelRenderJobSchema = z.object({
  jobId: z.string().describe('The ID of the render job to cancel'),
});

// Tool implementations
const createRenderJob = async ({ titleText }: z.infer<typeof createRenderJobSchema>) => {
  try {
    const { renderQueue } = await initializeServices();
    const jobId = renderQueue.createJob({ titleText });
    
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
          text: `Failed to create render job: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

const getRenderStatus = async ({ jobId }: z.infer<typeof getRenderStatusSchema>) => {
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
          text: `Failed to get render status: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

const cancelRenderJob = async ({ jobId }: z.infer<typeof cancelRenderJobSchema>) => {
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
          text: `Failed to cancel render job: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'createRenderJob',
      description: 'Create a new video rendering job with the specified title text',
      inputSchema: zodToJsonSchema(createRenderJobSchema),
    },
    {
      name: 'getRenderStatus',
      description: 'Get the status of a specific render job by job ID',
      inputSchema: zodToJsonSchema(getRenderStatusSchema),
    },
    {
      name: 'cancelRenderJob',
      description: 'Cancel a specific render job by job ID',
      inputSchema: zodToJsonSchema(cancelRenderJobSchema),
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'createRenderJob': {
        const args = createRenderJobSchema.parse(request.params.arguments);
        return await createRenderJob(args);
      }
      case 'getRenderStatus': {
        const args = getRenderStatusSchema.parse(request.params.arguments);
        return await getRenderStatus(args);
      }
      case 'cancelRenderJob': {
        const args = cancelRenderJobSchema.parse(request.params.arguments);
        return await cancelRenderJob(args);
      }
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
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
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
