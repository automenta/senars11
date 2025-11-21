
import {SessionBuilder} from './src/session/SessionBuilder.js';
import SessionManager from './src/session/SessionManager.js';
import {WebSocketMonitor} from './src/server/WebSocketMonitor.js';
import {EventEmitter} from 'events';

// Mock NAR to avoid heavy initialization and hanging loops
class MockNAR extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
        this._eventBus = new EventEmitter();
    }
    initialize() { return Promise.resolve(); }
    start() { this.isRunning = true; }
    stop() { this.isRunning = false; }
    shutdown() { this.isRunning = false; }
    serialize() { return {}; }
}

// Mock AgentReplEngine
class MockEngine extends EventEmitter {
    constructor(config) {
        super();
        this.nar = config.nar;
        this.config = config;
    }
    initialize() { return Promise.resolve(); }
    shutdown() { return Promise.resolve(); }
}

// Stub imports in SessionBuilder (we can't easily mock imports in ESM without a loader,
// so we will rely on the real classes but use minimal configs to keep them fast)

async function testSessionBuilder() {
    console.log('--- Testing SessionBuilder ---');
    // Use minimal config to avoid connecting to real Ollama or heavy NAR tasks
    const builder = new SessionBuilder({
        nar: {
            debug: { pipeline: false },
            // Disable heavy subsystems
            reasoningAboutReasoning: { enabled: false }
        },
        lm: { enabled: false }
    });

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SessionBuilder build timeout')), 5000)
    );

    try {
        const engine = await Promise.race([builder.build(), timeoutPromise]);

        if (engine && engine.nar) {
            console.log('✅ SessionBuilder created engine with NAR');
            // Verify structure without running heavy logic
            if (typeof engine.processInput === 'function') {
                console.log('✅ Engine has processInput method');
            }
        } else {
            console.error('❌ SessionBuilder failed to create valid engine');
            process.exitCode = 1;
        }

        // Clean shutdown
        if (engine.shutdown) await engine.shutdown();

    } catch (e) {
        console.error('❌ SessionBuilder Error:', e);
        process.exitCode = 1;
    }
}

async function testWebSocketMonitor() {
    console.log('\n--- Testing WebSocketMonitor ---');
    const monitor = new WebSocketMonitor({
        port: 12346, // Different port
        maxConnections: 1
    });

    try {
        if (typeof monitor.bufferEvent === 'function') {
             console.log('✅ WebSocketMonitor has bufferEvent method');

             // Test buffering
             monitor.bufferEvent('test.event', { foo: 'bar' });
             if (monitor.eventBuffer.length === 1) {
                 console.log('✅ BufferEvent correctly added to buffer');
             } else {
                 console.error('❌ BufferEvent failed to add to buffer');
                 process.exitCode = 1;
             }

        } else {
             console.error('❌ WebSocketMonitor missing bufferEvent method');
             process.exitCode = 1;
        }

        // Verify Dumbness
        if (monitor.listenToNAR) {
             console.error('❌ WebSocketMonitor still has listenToNAR');
             process.exitCode = 1;
        } else {
             console.log('✅ WebSocketMonitor listenToNAR removed');
        }

    } catch (e) {
        console.error('❌ WebSocketMonitor Error:', e);
        process.exitCode = 1;
    } finally {
        // We didn't start the server, so no need to stop it
    }
}

async function main() {
    try {
        await testSessionBuilder();
        await testWebSocketMonitor();
        console.log('\n✨ Verification Complete');
    } catch (e) {
        console.error('Fatal Error:', e);
        process.exit(1);
    }
    // Force exit to prevent hanging on any remaining handles
    process.exit(process.exitCode || 0);
}

main();
