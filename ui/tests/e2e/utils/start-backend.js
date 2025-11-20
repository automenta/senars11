import {NAR} from '../../../../src/nar/NAR.js';
import {WebSocketMonitor} from '../../../../src/server/WebSocketMonitor.js';

const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8090;
const wsHost = process.env.WS_HOST || '127.0.0.1';

console.log(`Starting Real NAR Backend on ${wsHost}:${wsPort}`);

async function start() {
    try {
        const nar = new NAR({lm: {enabled: false}});
        await nar.initialize();

        // Force path to '/' to match UI expectation
        const monitor = new WebSocketMonitor({port: wsPort, host: wsHost, path: '/'});
        await monitor.start();
        nar.connectToWebSocketMonitor(monitor);

        console.log('NAR Backend Ready');
    } catch (error) {
        console.error('Failed to start NAR backend:', error);
        process.exit(1);
    }
}

start();

// Keep process alive
setInterval(() => {
}, 10000);
