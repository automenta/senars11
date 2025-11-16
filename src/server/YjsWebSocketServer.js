import { createServer } from 'http';
import { Server } from 'y-websocket/bin/utils.js';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

// Create a simple WebSocket server for Y.js documents
// This is a basic example - in production you might want more configuration
export class YjsWebSocketServer {
  constructor(options = {}) {
    this.options = {
      port: options.port || 1234,
      ...options
    };
    
    // The y-websocket server
    this.server = null;
    this.wss = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = createServer();
      this.wss = new Server({ 
        server: this.server,
        // Add any additional options here
        maxDocuments: 100,
        gcEnabled: true
      });

      this.server.listen(this.options.port, () => {
        console.log(`Yjs WebSocket Server running on port ${this.options.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('Yjs WebSocket Server error:', error);
        reject(error);
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.destroy();
      }
      if (this.server) {
        this.server.close(() => {
          console.log('Yjs WebSocket Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}