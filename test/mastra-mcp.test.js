const { spawn } = require('child_process');
const path = require('node:path');
const { RemotionWorkflow } = require('../src/mastra/workflows/remotion-workflow');

// Test suite for Mastra MCP integration
class MastraMCPTester {
  constructor() {
    this.mcpServer = null;
    this.workflow = new RemotionWorkflow();
  }

  // Start MCP server for testing
  async startMCPServer() {
    return new Promise((resolve, reject) => {
      console.log('Starting MCP server for testing...');
      
      this.mcpServer = spawn('node', [
        path.join(__dirname, '..', 'mcp-server-simple.js')
      ], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      this.mcpServer.on('spawn', () => {
        console.log('MCP server started successfully');
        // Wait a moment for initialization
        setTimeout(resolve, 3000);
      });

      this.mcpServer.on('error', (error) => {
        console.error('Failed to start MCP server:', error);
        reject(error);
      });

      // Handle server output
      this.mcpServer.stdout.on('data', (data) => {
        const message = data.toString();
        if (message.includes('Remotion MCP server started')) {
          console.log('Server ready for testing');
        }
      });
    });
  }

  // Test MCP server tools via direct communication
  async testMCPTools() {
    console.log('Testing MCP tools...');
    
    const testCases = [
      {
        name: 'List available tools',
        request: {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        }
      },
      {
        name: 'Create render job',
        request: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'createRenderJob',
            arguments: {
              titleText: 'Hello from MCP Test!'
            }
          }
        }
      }
    ];

    const results = [];
    
    for (const testCase of testCases) {
      console.log(`Running: ${testCase.name}`);
      
      try {
        // Send request to MCP server
        this.mcpServer.stdin.write(JSON.stringify(testCase.request) + '\n');
        
        // Wait for response
        const response = await this.waitForResponse(5000);
        results.push({
          test: testCase.name,
          success: true,
          response: response
        });
        
        console.log(`✅ ${testCase.name}: Success`);
      } catch (error) {
        results.push({
          test: testCase.name,
          success: false,
          error: error.message
        });
        console.log(`❌ ${testCase.name}: ${error.message}`);
      }
    }

    return results;
  }

  // Test workflow functionality
  async testWorkflow() {
    console.log('Testing Remotion workflow...');
    
    try {
      // Test batch video creation
      const workflowResult = await this.workflow.createVideoWorkflow([
        'Test Video 1',
        'Test Video 2',
        'Test Video 3'
      ]);
      
      console.log('✅ Workflow creation successful:', workflowResult);
      
      // Test monitoring
      const monitorResult = await this.workflow.monitorWorkflow(
        workflowResult.jobs.map(job => job.jobId)
      );
      
      console.log('✅ Workflow monitoring successful:', monitorResult);
      
      return {
        workflow: workflowResult,
        monitoring: monitorResult,
        success: true
      };
    } catch (error) {
      console.error('❌ Workflow test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Wait for MCP server response
  waitForResponse(timeout = 5000) {
    return new Promise((resolve, reject) => {
      let responseBuffer = '';
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, timeout);

      const onData = (data) => {
        responseBuffer += data.toString();
        
        try {
          // Try to parse as JSON-RPC response
          const lines = responseBuffer.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const parsed = JSON.parse(line.trim());
            if (parsed.id) {
              clearTimeout(timeoutId);
              this.mcpServer.stdout.off('data', onData);
              resolve(parsed);
              return;
            }
          }
        } catch (e) {
          // Continue waiting for complete JSON
        }
      };

      this.mcpServer.stdout.on('data', onData);
    });
  }

  // Stop MCP server
  async stopMCPServer() {
    if (this.mcpServer) {
      console.log('Stopping MCP server...');
      this.mcpServer.kill('SIGINT');
      
      return new Promise((resolve) => {
        this.mcpServer.on('close', () => {
          console.log('MCP server stopped');
          resolve();
        });
      });
    }
  }

  // Run complete test suite
  async runAllTests() {
    console.log('🚀 Starting Mastra MCP Test Suite\n');
    
    const results = {
      mcpTools: [],
      workflow: null,
      overall: false
    };

    try {
      // Start MCP server
      await this.startMCPServer();
      
      // Test MCP tools
      results.mcpTools = await this.testMCPTools();
      
      // Test workflow
      results.workflow = await this.testWorkflow();
      
      // Determine overall success
      const mcpSuccess = results.mcpTools.every(test => test.success);
      const workflowSuccess = results.workflow?.success || false;
      
      results.overall = mcpSuccess && workflowSuccess;
      
      console.log('\n📊 Test Results Summary:');
      console.log(`MCP Tools: ${results.mcpTools.filter(t => t.success).length}/${results.mcpTools.length} passed`);
      console.log(`Workflow: ${results.workflow?.success ? '✅' : '❌'}`);
      console.log(`Overall: ${results.overall ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      results.error = error.message;
    } finally {
      await this.stopMCPServer();
    }

    return results;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new MastraMCPTester();
  
  tester.runAllTests()
    .then(results => {
      process.exit(results.overall ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { MastraMCPTester };
