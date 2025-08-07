# Mastra Agent & Workflow Guide

This guide explains how to use the Mastra agent and workflow system for Remotion video rendering.

## Overview

We've implemented a complete Mastra-based system that includes:
- **MCP Server** - Replaces Express.js with tool-based API
- **Simple Agent** - Direct interaction with MCP tools
- **Workflow System** - Batch processing and automation
- **Comprehensive Testing** - Full test suite for validation

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mastra Agent  │    │   MCP Server     │    │   Remotion      │
│   (simple-agent)│◄──►│ (mcp-server)     │◄──►│   Rendering     │
│                 │    │                  │    │   System        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Workflow      │    │   Test Suite     │    │   Output        │
│   (remotion-wf) │    │   (test files)   │    │   Videos        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Files Created

### Core Components
- **`mcp-server-simple.js`** - Main MCP server
- **`src/mastra/agents/simple-agent.js`** - Mastra agent for direct MCP interaction
- **`src/mastra/workflows/remotion-workflow.ts`** - Workflow system for batch processing

### Testing
- **`test/mastra-mcp.test.js`** - Comprehensive test suite
- **`test/api-test.js`** - Simple API endpoint testing
- **`test/api-test.js`** - Simple API tests

## Usage

### 1. Start MCP Server
```bash
npm run mcp:server
```

### 2. Run Agent Demo
```bash
npm run agent:demo
# or
npm run mastra:agent
```

### 3. Run Workflow Demo
```bash
npm run workflow:demo
# or
npm run mastra:workflow
```

### 4. Run Tests
```bash
# Simple API test
npm run test:api

# Workflow test
npm run test:workflow

# Full test suite
npm run test:all

# Comprehensive MCP test
npm run test:mcp
```

## Mastra Agent Features

The `SimpleRemotionAgent` provides:

### Methods
- `start()` - Initialize agent and connect to MCP server
- `createVideo(titleText)` - Create a new video rendering job
- `getStatus(jobId)` - Get status of a specific job
- `stop()` - Clean shutdown
- `runDemo()` - Complete demo with all features

### Example Usage
```javascript
const { SimpleRemotionAgent } = require('./src/mastra/agents/simple-agent');

const agent = new SimpleRemotionAgent();

async function createVideo() {
  await agent.start();
  
  const job = await agent.createVideo('Hello World!');
  console.log('Job created:', job.jobId);
  
  const status = await agent.getStatus(job.jobId);
  console.log('Status:', status.status);
  
  await agent.stop();
}

createVideo();
```

## Workflow System Features

The `RemotionWorkflow` provides:

### Methods
- `initialize()` - Set up rendering environment
- `createVideoWorkflow(titleTexts)` - Create batch of videos
- `monitorWorkflow(jobIds)` - Monitor multiple jobs
- `cancelWorkflow(jobIds)` - Cancel multiple jobs

### Example Usage
```javascript
const { RemotionWorkflow } = require('./src/mastra/workflows/remotion-workflow');

const workflow = new RemotionWorkflow();

async function batchProcess() {
  // Create multiple videos
  const result = await workflow.createVideoWorkflow([
    'Video 1',
    'Video 2',
    'Video 3'
  ]);
  
  console.log('Created jobs:', result.jobs);
  
  // Monitor progress
  const statuses = await workflow.monitorWorkflow(
    result.jobs.map(j => j.jobId)
  );
  
  console.log('Progress:', statuses);
}

batchProcess();
```

## Testing Framework

### Test Coverage
- **MCP Server Tools** - All three tools (create, status, cancel)
- **Agent Integration** - Direct MCP communication
- **Workflow Operations** - Batch processing and monitoring
- **Error Handling** - Graceful failure scenarios

### Test Structure
```
test/
├── mastra-mcp.test.js    # Comprehensive test suite
├── api-test.js          # Simple API endpoint tests
└── api-test.js          # Basic functionality tests
```

## Advanced Usage

### Custom Workflows
```javascript
// Create custom workflow
const workflow = new RemotionWorkflow();

// Step 1: Initialize
await workflow.initialize();

// Step 2: Create jobs
const batch = await workflow.createVideoWorkflow([
  'Title 1', 'Title 2', 'Title 3'
]);

// Step 3: Monitor until complete
const checkProgress = async () => {
  const status = await workflow.monitorWorkflow(
    batch.jobs.map(j => j.jobId)
  );
  
  if (status.completed === batch.totalJobs) {
    console.log('All videos completed!');
  } else {
    console.log(`Progress: ${status.completed}/${batch.totalJobs}`);
    setTimeout(checkProgress, 5000);
  }
};

checkProgress();
```

### Integration with External Systems
```javascript
// Example: Integration with external API
const { SimpleRemotionAgent } = require('./src/mastra/agents/simple-agent');

async function processVideoRequests(requests) {
  const agent = new SimpleRemotionAgent();
  await agent.start();
  
  const results = [];
  
  for (const request of requests) {
    try {
      const job = await agent.createVideo(request.title);
      results.push({ request, job, success: true });
    } catch (error) {
      results.push({ request, error: error.message, success: false });
    }
  }
  
  await agent.stop();
  return results;
}

// Usage
const requests = [
  { title: 'Welcome Video' },
  { title: 'Product Demo' },
  { title: 'Tutorial' }
];

processVideoRequests(requests).then(results => {
  console.log('Processing complete:', results);
});
```

## Environment Setup

### Required Environment Variables
```bash
# Optional - use pre-built bundle
export REMOTION_SERVE_URL="https://your-bundle-url.com"

# For development
npm install
```

### Directory Structure
```
remotion-ai/
├── mcp-server-simple.js          # MCP server
├── src/mastra/
│   ├── agents/simple-agent.js    # Mastra agent
│   └── workflows/remotion-workflow.ts  # Workflow system
├── test/
│   ├── mastra-mcp.test.js       # Comprehensive tests
│   ├── api-test.js              # API tests
│   └── api-test.js              # Simple tests
└── package.json                 # Scripts and dependencies
```

## Troubleshooting

### Common Issues
1. **Server not starting**: Check Node.js version and dependencies
2. **Browser not found**: Ensure Chrome/Chromium is installed
3. **Bundle issues**: Verify `remotion/index.ts` exists

### Debug Mode
```bash
# Enable debug output
DEBUG=1 npm run mcp:server

# Verbose testing
npm run test:mcp --verbose
```

## Next Steps

1. **Production Deployment**: Use PM2 or systemd
2. **Monitoring**: Add logging and metrics
3. **Scaling**: Consider queue management
4. **Integration**: Connect to external systems
5. **Optimization**: Add caching and optimization

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Test the setup
npm run test:all

# 3. Run agent demo
npm run agent:demo

# 4. Run workflow demo
npm run workflow:demo

# 5. Start MCP server
npm run mcp:server
```

Your Mastra MCP system is now complete with agent, workflow, and comprehensive testing!
