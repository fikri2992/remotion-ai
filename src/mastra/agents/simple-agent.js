// Simple Mastra agent for Remotion MCP without external dependencies
const path = require('node:path');
const { spawn } = require('child_process');

class SimpleRemotionAgent {
  constructor() {
    this.mcpServer = null;
    this.tools = null;
  }

  async start() {
    console.log('Starting Remotion MCP agent...');
    
    return new Promise((resolve, reject) => {
      this.mcpServer = spawn('node', [
        path.join(__dirname, '..', '..', '..', 'mcp-server-simple.js')
      ], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      setTimeout(() => {
        this.getTools().then(() => resolve()).catch(reject);
      }, 3000);
    });
  }

  async getTools() {
    const request = {
      jsonrpc: '2.0',
      id: 'get-tools',
      method: 'tools/list',
      params: {}
    };

    return new Promise((resolve, reject) => {
      let response = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Timeout getting tools'));
      }, 5000);

      const onData = (data) => {
        response += data.toString();
        
        try {
          const lines = response.split('\n').filter(l => l.trim());
          for (const line of lines) {
            const parsed = JSON.parse(line.trim());
            if (parsed.id === 'get-tools') {
              clearTimeout(timeout);
              this.mcpServer.stdout.off('data', onData);
              this.tools = parsed.result.tools;
              resolve(this.tools);
              return;
            }
          }
        } catch (e) {
          // Continue waiting
        }
      };

      this.mcpServer.stdout.on('data', onData);
      this.mcpServer.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async createVideo(titleText) {
    console.log(`Creating video: "${titleText}"`);
    
    const request = {
      jsonrpc: '2.0',
      id: 'create-video',
      method: 'tools/call',
      params: {
        name: 'createRenderJob',
        arguments: { titleText }
      }
    };

    return new Promise((resolve, reject) => {
      let response = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Timeout creating video'));
      }, 10000);

      const onData = (data) => {
        response += data.toString();
        
        try {
          const lines = response.split('\n').filter(l => l.trim());
          for (const line of lines) {
            const parsed = JSON.parse(line.trim());
            if (parsed.id === 'create-video') {
              clearTimeout(timeout);
              this.mcpServer.stdout.off('data', onData);
              
              if (parsed.result) {
                const content = JSON.parse(parsed.result.content[0].text);
                resolve(content);
              } else {
                reject(new Error('Failed to create video'));
              }
              return;
            }
          }
        } catch (e) {
          // Continue waiting
        }
      };

      this.mcpServer.stdout.on('data', onData);
      this.mcpServer.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async getStatus(jobId) {
    console.log(`Getting status for job: ${jobId}`);
    
    const request = {
      jsonrpc: '2.0',
      id: 'get-status',
      method: 'tools/call',
      params: {
        name: 'getRenderStatus',
        arguments: { jobId }
      }
    };

    return new Promise((resolve, reject) => {
      let response = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Timeout getting status'));
      }, 5000);

      const onData = (data) => {
        response += data.toString();
        
        try {
          const lines = response.split('\n').filter(l => l.trim());
          for (const line of lines) {
            const parsed = JSON.parse(line.trim());
            if (parsed.id === 'get-status') {
              clearTimeout(timeout);
              this.mcpServer.stdout.off('data', onData);
              
              if (parsed.result) {
                const content = JSON.parse(parsed.result.content[0].text);
                resolve(content);
              } else {
                reject(new Error('Failed to get status'));
              }
              return;
            }
          }
        } catch (e) {
          // Continue waiting
        }
      };

      this.mcpServer.stdout.on('data', onData);
      this.mcpServer.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async stop() {
    if (this.mcpServer) {
      this.mcpServer.kill('SIGINT');
      await new Promise(resolve => {
        this.mcpServer.on('close', resolve);
      });
    }
  }

  async runDemo() {
    console.log('🤖 Remotion Agent Demo\n');
    
    try {
      await this.start();
      console.log('✅ Agent started successfully');
      console.log('Available tools:', this.tools.map(t => t.name));
      
      // Create a video
      const job = await this.createVideo('Hello from Mastra Agent!');
      console.log('✅ Video created:', job);
      
      // Check status
      const status = await this.getStatus(job.jobId);
      console.log('✅ Status retrieved:', status);
      
      return { success: true, job, status };
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      return { success: false, error: error.message };
    } finally {
      await this.stop();
    }
  }
}

// Export for use
module.exports = { SimpleRemotionAgent };

// Run demo if called directly
if (require.main === module) {
  const agent = new SimpleRemotionAgent();
  agent.runDemo()
    .then(result => {
      console.log('\n🎯 Demo completed:', result.success ? 'Success' : 'Failed');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Demo error:', error);
      process.exit(1);
    });
}
