
import {SessionBuilder} from './src/session/SessionBuilder.js';
import SessionManager from './src/session/SessionManager.js';
import {WebSocketMonitor} from './src/server/WebSocketMonitor.js';

async function testSessionBuilder() {
    console.log('--- Testing SessionBuilder ---');
    const builder = new SessionBuilder({
        nar: { debug: { pipeline: false } }
    });

    try {
        const engine = await builder.build();
        if (engine && engine.nar) {
            console.log('✅ SessionBuilder created engine with NAR');
        } else {
            console.error('❌ SessionBuilder failed to create valid engine');
        }

        if (engine.shutdown) await engine.shutdown();
    } catch (e) {
        console.error('❌ SessionBuilder Error:', e);
    }
}

async function testSessionManager() {
    console.log('\n--- Testing SessionManager ---');
    try {
        const sessionId = await SessionManager.createSession('test-session', {
             nar: { debug: { pipeline: false } }
        });

        const session = SessionManager.getSession(sessionId);
        if (session && session.engine && session.nar) {
             console.log('✅ SessionManager created session with Engine and NAR');
        } else {
             console.error('❌ SessionManager failed to create valid session structure');
        }

        SessionManager.removeSession(sessionId);
    } catch (e) {
        console.error('❌ SessionManager Error:', e);
    }
}

async function testWebSocketMonitor() {
    console.log('\n--- Testing WebSocketMonitor ---');
    const monitor = new WebSocketMonitor({port: 12345}); // Use non-standard port

    if (typeof monitor.bufferEvent === 'function') {
         console.log('✅ WebSocketMonitor has bufferEvent method');
    } else {
         console.error('❌ WebSocketMonitor missing bufferEvent method');
    }

    if (monitor.listenToNAR) {
         console.error('❌ WebSocketMonitor still has listenToNAR (should be removed)');
    } else {
         console.log('✅ WebSocketMonitor listenToNAR removed');
    }

    // Clean up if we started anything (though we didn't call start())
}

async function main() {
    await testSessionBuilder();
    await testSessionManager();
    await testWebSocketMonitor();
}

main();
