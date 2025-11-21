import {WebSocketMonitor} from '../../../../src/server/WebSocketMonitor.js';

const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8090;
const wsHost = process.env.WS_HOST || '127.0.0.1';

console.log(`Starting Real NAR Backend on ${wsHost}:${wsPort}`);

async function start() {
    try {
        // Use AgentReplEngine to support agent features
        const {AgentReplEngine} = await import('../../../../src/repl/AgentReplEngine.js');
        const {WebRepl} = await import('../../../../src/repl/WebRepl.js');
        const {DemoWrapper} = await import('../../../../src/demo/DemoWrapper.js');

        // Initialize engine (LM disabled for consistent testing, but Agent structure is present)
        const replEngine = new AgentReplEngine({
            nar: {lm: {enabled: false}}
        });
        await replEngine.initialize();

        // Initialize WebSocket Monitor
        const monitor = new WebSocketMonitor({port: wsPort, host: wsHost, path: '/'});
        await monitor.start();
        replEngine.nar.connectToWebSocketMonitor(monitor);

        // Initialize WebRepl (bridges Engine <-> WS)
        const webRepl = new WebRepl(replEngine, monitor);
        webRepl.registerWithWebSocketServer();

        // Initialize Demo System
        const demoWrapper = new DemoWrapper();
        await demoWrapper.initialize(replEngine.nar, monitor);

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
