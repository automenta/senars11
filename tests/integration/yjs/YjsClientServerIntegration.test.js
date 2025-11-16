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
import YjsSyncClient from 'yjs-client'; // Assuming yjs-client is available

describe('Yjs Client/Server Synchronization Integration', () => {
  let nar, monitor;
  const MAIN_WS_PORT = 4001;
  const YJS_WS_PORT = 1234; // Default Yjs port
  const TEST_DOC_ID = 'integration-test-document';

  beforeAll(async () => {
    nar = new NAR();
    monitor = new WebSocketMonitor({
      port: MAIN_WS_PORT,
      yjsPort: YJS_WS_PORT,
      yjsDocumentId: TEST_DOC_ID,
    });
    await monitor.listenToNAR(nar);
    await nar.initialize();
    nar.start();
    await monitor.start();
  });

  afterAll(async () => {
    if (monitor) {
      await monitor.stop();
    }
    if (nar) {
      nar.stop();
      await nar.dispose();
    }
  });

  test('should synchronize NAR state changes across multiple Yjs clients', async () => {
    // Create two Yjs clients to simulate multiple users
    const client1 = new YjsSyncClient({ serverUrl: 'localhost', websocketPort: YJS_WS_PORT, documentId: TEST_DOC_ID });
    const client2 = new YjsSyncClient({ serverUrl: 'localhost', websocketPort: YJS_WS_PORT, documentId: TEST_DOC_ID });

    // Connect clients
    await Promise.all([
      new Promise(resolve => client1.provider.on('status', ({ status }) => status === 'connected' && resolve())),
      new Promise(resolve => client2.provider.on('status', ({ status }) => status === 'connected' && resolve())),
    ]);

    // Create a promise to wait for synchronization
    const syncPromise = new Promise(resolve => {
      client2.sharedState.concepts.observeDeep(events => {
        // Check if the concept from client 1's input is now in client 2's state
        if (client2.sharedState.concepts.has('cat')) {
          resolve();
        }
      });
    });

    // Use the main WebSocket to send input to the server
    const ws = new WebSocket(`ws://localhost:${MAIN_WS_PORT}/ws`);
    await new Promise(resolve => ws.on('open', resolve));

    // Send Narsese input that will create a 'cat' concept
    ws.send(JSON.stringify({ type: 'narseseInput', payload: { input: '<cat --> animal>.' } }));
    ws.close();

    // Wait for synchronization to occur
    await syncPromise;

    // Assert that client2 has the synchronized state
    expect(client2.sharedState.concepts.has('cat')).toBe(true);

    // Clean up
    client1.destroy();
    client2.destroy();
  }, 20000); // 20-second timeout for the test
});