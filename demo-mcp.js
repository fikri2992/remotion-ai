#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Start the MCP server
console.log('Starting Remotion MCP server...');
const mcpServer = spawn('node', [path.join(__dirname, 'mcp-server.js')], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Simple MCP client to test the server
const testMCP = async () => {
  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('Testing MCP server...');
  
  // Test 1: List tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  // Test 2: Create render job
  const createJobRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'createRenderJob',
      arguments: {
        titleText: 'Hello from MCP!'
      }
    }
  };
  
  // Send requests to MCP server
  mcpServer.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  mcpServer.stdin.write(JSON.stringify(createJobRequest) + '\n');
  
  // Handle responses
  mcpServer.stdout.on('data', (data) => {
    const response = data.toString();
    console.log('MCP Response:', response);
  });
  
  // Wait a bit then exit
  setTimeout(() => {
    console.log('Demo complete. Stopping MCP server...');
    mcpServer.kill('SIGINT');
  }, 5000);
};

// Handle MCP server events
mcpServer.on('spawn', () => {
  console.log('MCP server started successfully');
  testMCP();
});

mcpServer.on('error', (error) => {
  console.error('Failed to start MCP server:', error);
});

mcpServer.on('close', (code) => {
  console.log(`MCP server exited with code ${code}`);
});
