// Simple API test for Mastra MCP integration
const { spawn } = require('child_process');
const path = require('node:path');

class SimpleAPITest {
  constructor() {
    this.server = null;
  }

  async startServer() {
    console.log('Starting MCP server...');
    
    return new Promise((resolve, reject) => {
      this.server = spawn('node', [
        path.join(__dirname, '..', 'mcp-server-simple.js')
      ], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      setTimeout(() => resolve(), 2000); // Give server time to start
    });
  }

  async testCreateJob() {
    console.log('Testing create job...');
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'createRenderJob',
        arguments: { titleText: 'Test Video API' }
      }
    };

    return new Promise((resolve) => {
      let response = '';
      
      this.server.stdout.on('data', (data) => {
        response += data.toString();
        
        try {
          const lines = response.split('\n').filter(l => l.trim());
          for (const line of lines) {
            const parsed = JSON.parse(line.trim());
            if (parsed.id === 1) {
              console.log('✅ Create job response:', parsed);
              resolve(parsed);
              return;
            }
          }
        } catch (e) {
          // Continue waiting
        }
      });

      this.server.stdin.write(JSON.stringify(request) + '\n');
      
      setTimeout(() => {
        console.log('⏰ Response timeout');
        resolve(null);
      }, 5000);
    });
  }

  async runTest() {
    console.log('🧪 Running simple API test...\n');
    
    try {
      await this.startServer();
      
      const result = await this.testCreateJob();
      
      if (result && result.result) {
        console.log('\n✅ API test successful!');
        console.log('Job created:', result.result.content[0].text);
        return true;
      } else {
        console.log('\n❌ API test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Test error:', error.message);
      return false;
    } finally {
      if (this.server) {
        this.server.kill('SIGINT');
      }
    }
  }
}

// Run test
if (require.main === module) {
  const test = new SimpleAPITest();
  test.runTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}

module.exports = { SimpleAPITest };
