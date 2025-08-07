# Mastra MCP Setup Guide

This guide explains how to replace the Express.js server with a Mastra MCP server for Remotion video rendering.

## Overview

Instead of using Express.js for HTTP endpoints, we've implemented a **Model Context Protocol (MCP)** server that exposes the same functionality as tools. This allows AI agents and other MCP clients to interact with your Remotion rendering system.

## Files Created

1. **`mcp-server.js`** - Main MCP server that replaces Express.js
2. **`demo-mcp.js`** - Demo script to test the MCP server
3. **`src/mastra/`** - Mastra configuration (optional advanced usage)

## MCP Server Features

The MCP server provides three main tools:

### 1. `createRenderJob`
- **Purpose**: Create a new video rendering job
- **Input**: `{ titleText: string }`
- **Output**: Job ID and status information

### 2. `getRenderStatus`
- **Purpose**: Get the status of a specific render job
- **Input**: `{ jobId: string }`
- **Output**: Complete job status including progress, URLs, etc.

### 3. `cancelRenderJob`
- **Purpose**: Cancel a running or queued render job
- **Input**: `{ jobId: string }`
- **Output**: Confirmation of cancellation

## Usage

### Running the MCP Server

```bash
# Start the MCP server
npm run mcp:server

# Or run the demo
npm run mcp:demo
```

### Using with AI Agents

You can connect this MCP server to AI agents like Claude Desktop, Cursor, or custom Mastra agents:

#### Example with Claude Desktop
Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "remotion-renderer": {
      "command": "node",
      "args": ["/path/to/your/project/mcp-server.js"]
    }
  }
}
```

#### Example with Mastra

```javascript
import { MCPClient } from '@mastra/mcp';

const mcp = new MCPClient({
  servers: {
    remotion: {
      command: 'node',
      args: ['./mcp-server.js'],
    },
  },
});

const tools = await mcp.getTools();
// Use tools with your Mastra agent
```

### Manual Testing

You can test the MCP server manually using the command line:

```bash
# Start the server
node mcp-server.js

# In another terminal, you can send JSON-RPC requests
# The server will respond to tools/list and tools/call methods
```

## Migration from Express.js

### Old Express.js Endpoints → MCP Tools

| Express.js Endpoint | MCP Tool | Description |
|-------------------|----------|-------------|
| `POST /renders` | `createRenderJob` | Create new render job |
| `GET /renders/:jobId` | `getRenderStatus` | Get job status |
| `DELETE /renders/:jobId` | `cancelRenderJob` | Cancel job |

### Key Differences

1. **No HTTP Server**: MCP uses stdio communication instead of HTTP
2. **Tool-based API**: Functions are exposed as tools rather than REST endpoints
3. **AI-Native**: Designed for AI agents to discover and use automatically
4. **No CORS**: No web server means no CORS issues
5. **Simpler Deployment**: Just run the script, no port configuration needed

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Agent      │    │   MCP Client     │    │  MCP Server     │
│   (Claude,      │◄──►│   (Mastra,       │◄──►│  (mcp-server.js)│
│   Cursor, etc.) │    │   Custom)        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                              ┌──────────────────┐
                                              │  Remotion Core   │
                                              │  (Bundle +       │
                                              │   Render Queue)  │
                                              └──────────────────┘
```

## Environment Variables

The MCP server uses the same environment variables as the original Express.js server:

- `PORT` (optional): Not used in MCP (stdio-based)
- `REMOTION_SERVE_URL` (optional): Pre-built Remotion bundle URL

## Troubleshooting

### Common Issues

1. **Dependencies Missing**: Run `npm install` to install all dependencies
2. **Browser Not Found**: Ensure Chrome/Chromium is installed for Remotion
3. **Bundle Issues**: Check that `remotion/index.ts` exists and is valid

### Debug Mode

Enable debug output by setting:
```bash
export DEBUG=1
node mcp-server.js
```

## Advanced Usage

### Custom Integrations

You can extend the MCP server to add more tools:

1. Add new tool definitions to the `tools` array
2. Add corresponding handler functions
3. Update the switch statement in `CallToolRequestSchema`

### Production Deployment

For production, consider:

1. **Process Manager**: Use PM2 or systemd to keep the server running
2. **Logging**: Add structured logging for monitoring
3. **Error Handling**: Implement proper error boundaries
4. **Resource Limits**: Set appropriate memory and CPU limits

## Next Steps

1. Test the MCP server with your preferred AI assistant
2. Integrate with your existing workflow
3. Consider adding more Remotion-specific tools
4. Explore Mastra's advanced features for complex workflows
