
import {NAR} from '../src/nar/NAR.js';
import {WebSocketMonitor} from '../src/server/WebSocketMonitor.js';

async function startServer() {
  const nar = new NAR();
  await nar.initialize();
  
  const monitor = new WebSocketMonitor({port: 8157});
  await monitor.start();
  monitor.listenToNAR(nar);
  
  console.log('WebSocket monitoring server started on ws://localhost:8157/ws');
}

startServer().catch(console.error);
        