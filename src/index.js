#!/usr/bin/env node

import {WebSocketMonitor} from './server/WebSocketMonitor.js';
import {Agent} from './agent/Agent.js';

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

    // Create the Agent (which extends NAR)
    const agent = new Agent(DEFAULT_CONFIG);

    // Initialize the agent
    await agent.initialize();

    const monitor = new WebSocketMonitor(DEFAULT_CONFIG.webSocket);
    await monitor.start();

    // Connect monitor to the agent (which is a NAR)
    agent.connectToWebSocketMonitor(monitor);

    setupGracefulShutdown(agent, monitor);

    // The Agent doesn't have a start() method that blocks like the TUI
    // It's primarily an API-driven engine.
    // If this entry point is meant to be a server/daemon, we just keep running.
    console.log('Server running. Press Ctrl+C to stop.');

    // Keep process alive
    return new Promise(() => {});
}

const setupGracefulShutdown = (agent, monitor) => {
    process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        try {
            if (agent && agent.save) {
                await agent.save(); // Agent has save() method
                console.log('Current state saved to agent.json');
            } else if (agent && agent.serialize) {
                // Fallback
                 const state = agent.serialize();
                 // We don't have persistenceManager access easily here unless exposed
                 // But Agent.js has save() which uses persistenceManager.
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
