import {WebSocketMonitor} from '../../../../src/server/WebSocketMonitor.js';

const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8090;
const wsHost = process.env.WS_HOST || '127.0.0.1';

console.log(`Starting Real NAR Backend on ${wsHost}:${wsPort}`);

async function start() {
    try {
        // Use SessionEngine to support agent features
        const {SessionEngine} = await import('../../../../src/session/SessionEngine.js');
        const {SessionServerAdapter} = await import('../../../../src/server/SessionServerAdapter.js');
        const {DemoWrapper} = await import('../../../../src/demo/DemoWrapper.js');

        // Initialize engine (LM disabled for consistent testing, but Agent structure is present)
        const replEngine = new SessionEngine({
            nar: {lm: {enabled: false}}
        });
        await replEngine.initialize();

        // Initialize WebSocket Monitor
        const monitor = new WebSocketMonitor({port: wsPort, host: wsHost, path: '/'});
        await monitor.start();
        // replEngine.nar.connectToWebSocketMonitor(monitor); // Removed as per new architecture

        // Initialize SessionServerAdapter (bridges Engine <-> WS)
        const serverAdapter = new SessionServerAdapter(replEngine, monitor);
        serverAdapter.registerWithWebSocketServer();

        // Initialize Demo System
        const demoWrapper = new DemoWrapper();
        await demoWrapper.initialize(replEngine.nar, monitor);

        console.log('NAR Backend Ready');

        // Handle graceful shutdown
        const shutdown = async () => {
            console.log('Stopping NAR Backend...');
            try {
                if (monitor) await monitor.stop();
                if (replEngine) await replEngine.shutdown();
            } catch (err) {
                console.error('Error during shutdown:', err);
            }
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        console.error('Failed to start NAR backend:', error);
        process.exit(1);
    }
}

start();

// Keep process alive
setInterval(() => {
}, 10000);
