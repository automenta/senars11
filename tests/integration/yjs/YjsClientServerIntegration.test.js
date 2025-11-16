/**
 * End-to-End Integration Test for Yjs Client/Server Synchronization
 * 
 * This test validates the complete client/server round-trip flow:
 * UI Input -> WebSocket -> Server -> NAR -> Yjs Sync -> All Clients
 * 
 * Tests real-time collaborative editing where multiple clients
 * can simultaneously interact and see synchronized state changes.
 */

import { NAR } from '../../../src/nar/NAR.js';
import { WebSocketMonitor } from '../../../src/server/WebSocketMonitor.js';
import WebSocket from 'ws';

describe('Yjs Client/Server Synchronization Integration', () => {
  let nar, monitor;
  let MAIN_WS_PORT, YJS_WS_PORT;
  const TEST_DOC_ID = 'integration-test-document';

  // Find available ports and start server components before tests
  beforeAll(async () => {
    // Find available ports
    const net = await import('net');

    MAIN_WS_PORT = await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      server.on('error', reject);
    });

    YJS_WS_PORT = await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      server.on('error', reject);
    });

    // Create and configure NAR
    nar = new NAR({
      debug: { pipeline: false },
      performance: { useOptimizedCycle: true },
      memory: { capacity: 100 },
      taskManager: { maxTasks: 50 },
      focus: { capacity: 20 }
    });
    
    // Create WebSocketMonitor that connects to NAR
    monitor = new WebSocketMonitor({
      port: MAIN_WS_PORT,
      yjsPort: YJS_WS_PORT,
      yjsDocumentId: TEST_DOC_ID
    });
    
    // Connect NAR to monitor for Yjs synchronization
    await monitor.listenToNAR(nar);
    
    // Start all server components
    await nar.initialize();
    nar.start();
    await monitor.start();
    
    // Wait for full initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 15000); // Increase timeout for beforeAll

  // Clean up after tests
  afterAll(async () => {
    try {
      // Stop NAR and monitor
      if (nar) {
        nar.stop();
        await nar.dispose();
      }
      if (monitor) {
        await monitor.stop();
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }, 10000); // Increase timeout for afterAll

  test('should synchronize narseseInput commands across multiple clients via Yjs', async () => {
    return new Promise((resolve, reject) => {
      // Set up client connections
      const client1 = new WebSocket(`ws://localhost:${MAIN_WS_PORT}/ws`);
      const client2 = new WebSocket(`ws://localhost:${MAIN_WS_PORT}/ws`);

      // Collect messages from both clients
      const receivedMessages = { client1: [], client2: [] };
      let syncAchieved = false;

      client1.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'taskUpdate' || msg.type === 'event') {
          receivedMessages.client1.push(msg);
          
          // Check for cross-client sync: Client 1 should eventually see Client 2's input
          if (receivedMessages.client1.some(m => JSON.stringify(m).includes('fish')) &&
              receivedMessages.client2.some(m => (JSON.stringify(m).includes('cat') || JSON.stringify(m).includes('dog')))) {
            syncAchieved = true;
          }
        }
      });
      
      client2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'taskUpdate' || msg.type === 'event') {
          receivedMessages.client2.push(msg);
          
          // Check for cross-client sync: Client 2 should eventually see Client 1's input
          if (receivedMessages.client2.some(m => (JSON.stringify(m).includes('cat') || JSON.stringify(m).includes('dog'))) &&
              receivedMessages.client1.some(m => JSON.stringify(m).includes('fish'))) {
            syncAchieved = true;
          }
        }
      });

      // Set up connection promise
      const connectionPromise = new Promise((connResolve) => {
        let connected = 0;
        const checkConnected = () => {
          connected++;
          if (connected === 2) connResolve();
        };
        
        client1.on('open', checkConnected);
        client2.on('open', checkConnected);
      });

      connectionPromise.then(() => {
        // Send commands
        client1.send(JSON.stringify({
          type: 'narseseInput',
          payload: { input: '<cat --> animal>.' }
        }));

        setTimeout(() => {
          client1.send(JSON.stringify({
            type: 'narseseInput', 
            payload: { input: '<dog --> mammal>?' }
          }));
        }, 200);

        setTimeout(() => {
          client2.send(JSON.stringify({
            type: 'narseseInput',
            payload: { input: '<fish --> water>!' }
          }));
        }, 400);

        // Check for synchronization every 200ms, with timeout
        const startTime = Date.now();
        const maxTime = 8000; // 8 second timeout
        const checkInterval = setInterval(() => {
          if (syncAchieved) {
            clearInterval(checkInterval);
            
            // Verify basic requirements
            expect(receivedMessages.client1.length).toBeGreaterThan(0);
            expect(receivedMessages.client2.length).toBeGreaterThan(0);
            
            // Verify cross-client sync
            const client2SawClient1 = receivedMessages.client2.some(msg => 
              JSON.stringify(msg).includes('cat') || JSON.stringify(msg).includes('dog'));
            const client1SawClient2 = receivedMessages.client1.some(msg => 
              JSON.stringify(msg).includes('fish'));
            
            expect(client2SawClient1).toBe(true);
            expect(client1SawClient2).toBe(true);
            
            // Clean up
            if (client1 && client1.readyState === WebSocket.OPEN) client1.close();
            if (client2 && client2.readyState === WebSocket.OPEN) client2.close();
            
            resolve();
          } else if (Date.now() - startTime > maxTime) {
            clearInterval(checkInterval);
            
            // Still do cleanup and provide detailed error
            if (client1 && client1.readyState === WebSocket.OPEN) client1.close();
            if (client2 && client2.readyState === WebSocket.OPEN) client2.close();
            
            reject(new Error(`Timeout waiting for synchronization. Client1: ${receivedMessages.client1.length} messages, Client2: ${receivedMessages.client2.length} messages. Sync achieved: ${syncAchieved}`));
          }
        }, 200);
      });
      
      // Handle connection errors
      client1.on('error', (error) => {
        reject(new Error(`Client 1 error: ${error.message}`));
      });
      client2.on('error', (error) => {
        reject(new Error(`Client 2 error: ${error.message}`));
      });
    });
  }, 10000); // Increase timeout for this test
});