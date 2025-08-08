#!/usr/bin/env node

// Simple MCP server using existing codebase
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

// Simple JSON-RPC handler
const handleRequest = async (request) => {
  try {
    const { method, params } = request;

    switch (method) {
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              {
                name: 'createRenderJob',
                description: 'Create a new render job. Provide compositionId and props for non-HelloWorld comps; otherwise use titleText for HelloWorld demo.',
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
            ],
          },
        };

      case 'tools/call':
        const { name, arguments: args } = params;
        
        switch (name) {
          case 'createRenderJob':
            const { renderQueue } = await initializeServices();
            const jobId = renderQueue.createJob({ titleText: args?.titleText, compositionId: args?.compositionId, props: args?.props });
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
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
              },
            };

          case 'getRenderStatus':
            const { renderQueue: rq } = await initializeServices();
            const job = rq.jobs.get(args.jobId);
            if (!job) {
              return {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({ error: 'Job not found' }),
                    },
                  ],
                  isError: true,
                },
              };
            }
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(job),
                  },
                ],
                isError: false,
              },
            };

          case 'cancelRenderJob':
            const { renderQueue: rq2 } = await initializeServices();
            const jobToCancel = rq2.jobs.get(args.jobId);
            if (!jobToCancel) {
              return {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({ error: 'Job not found' }),
                    },
                  ],
                  isError: true,
                },
              };
            }
            jobToCancel.cancel();
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      message: 'Job cancelled successfully',
                      jobId: args.jobId,
                      status: 'cancelled',
                    }),
                  },
                ],
                isError: false,
              },
            };

          default:
            return {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32601,
                message: `Unknown tool: ${name}`,
              },
            };
        }

      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Unknown method: ${method}`,
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: error.message,
      },
    };
  }
};

// Main server loop
const startServer = () => {
  console.error('Remotion MCP server starting...');
  
  const stdin = process.stdin;
  stdin.setEncoding('utf8');
  
  let buffer = '';
  
  stdin.on('data', (chunk) => {
    buffer += chunk;
    
    // Process complete JSON-RPC messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const request = JSON.parse(line.trim());
          handleRequest(request).then(response => {
            console.log(JSON.stringify(response));
          });
        } catch (error) {
          console.error('Invalid JSON:', error.message);
        }
      }
    }
  });
  
  console.error('Remotion MCP server started and listening on stdin');
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down Remotion MCP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down Remotion MCP server...');
  process.exit(0);
});

startServer();
