// Integration test to validate core components work together properly
import {NAR} from '../src/nar/NAR.js';
import {WebSocketMonitor} from '../src/server/WebSocketMonitor.js';

// Simple integration test to ensure core components work together
async function runIntegrationTest() {
    console.log('Starting SeNARS Integration Test...');

    try {
        // Create NAR instance
        const nar = new NAR({
            lm: {enabled: false},
            reasoningAboutReasoning: {enabled: true}
        });

        console.log('✓ NAR instance created');

        // Initialize NAR
        await nar.initialize();
        console.log('✓ NAR initialized');

        // Create WebSocket monitor
        const monitor = new WebSocketMonitor({
            port: 8081,  // Use different port to avoid conflicts
            host: 'localhost',
            maxConnections: 5
        });

        await monitor.start();
        console.log('✓ WebSocket monitor started');

        // Connect NAR to WebSocket monitor
        nar.connectToWebSocketMonitor(monitor);
        console.log('✓ NAR connected to WebSocket monitor');

        // Test basic NAR functionality
        const testInput = '<cat --> animal>. %1.00;0.90%';
        const result = await nar.input(testInput);
        console.log('✓ NAR processed test input:', testInput);

        // Check if we can access concepts
        const concepts = nar.getConcepts();
        console.log(`✓ Retrieved ${concepts.length} concepts from NAR`);

        // Check basic stats
        const stats = nar.getStats();
        console.log('✓ Retrieved NAR stats:', {
            cycleCount: stats.cycleCount,
            isRunning: stats.isRunning
        });

        // Start NAR briefly to process the input
        nar.start();
        await new Promise(resolve => setTimeout(resolve, 200)); // Let it process
        nar.stop();

        console.log('✓ NAR ran reasoning cycle');

        // Stop services
        await monitor.stop();
        await nar.dispose();

        console.log('\n✅ All integration tests passed!');
        return true;

    } catch (error) {
        console.error('\n❌ Integration test failed:', error);
        return false;
    }
}

// If this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runIntegrationTest()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test runner error:', error);
            process.exit(1);
        });
}

export {runIntegrationTest};