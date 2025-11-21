#!/usr/bin/env node

import {WebSocketMonitor} from './server/WebSocketMonitor.js';
import {NAR} from './nar/NAR.js';
import {AgentReplEngine} from './repl/AgentReplEngine.js';

const DEFAULT_CONFIG = Object.freeze({
    nar: {
        lm: {enabled: false},
        reasoningAboutReasoning: {enabled: true},
        reasoning: {}
    },
    persistence: {defaultPath: './agent.json'},
    webSocket: {
        port: process.env.WS_PORT || 8080,
        host: process.env.WS_HOST || 'localhost',
        maxConnections: 20
    }
});

async function main() {
    console.log('SeNARS starting...');

    // Note: AgentReplEngine expects config without the NAR instance merged in
    const repl = new AgentReplEngine(DEFAULT_CONFIG);

    // Initialize the engine (which initializes NAR)
    await repl.initialize();

    const monitor = new WebSocketMonitor(DEFAULT_CONFIG.webSocket);
    await monitor.start();
    repl.nar.connectToWebSocketMonitor(monitor);

    setupGracefulShutdown(repl, monitor);

    // The AgentReplEngine doesn't have a start() method that blocks like the TUI
    // It's primarily an API-driven engine.
    // If this entry point is meant to be a server/daemon, we just keep running.
    console.log('Server running. Press Ctrl+C to stop.');

    // Keep process alive
    return new Promise(() => {});
}

const setupGracefulShutdown = (repl, monitor) => {
    process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        try {
            if (repl.nar && repl.nar.serialize) {
                const state = repl.nar.serialize();
                await repl.persistenceManager.saveToDefault(state);
                console.log('Current state saved to agent.json');
            }
        } catch (saveError) {
            console.error('Error saving state on shutdown:', saveError?.message || saveError);
        }
        if (monitor) await monitor.stop();
        process.exit(0);
    });

    process.on('uncaughtException', error => {
        console.error('Uncaught exception:', error?.message || error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason?.message || reason);
        process.exit(1);
    });
};

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Failed to start SeNARS:', error);
        process.exit(1);
    });
}

export {main as startServer};
export * from './module.js';
