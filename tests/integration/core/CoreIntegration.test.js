import { NAR } from '../../../src/nar/NAR.js';
import { WebSocketMonitor } from '../../../src/server/WebSocketMonitor.js';

describe('SeNARS Integration Test', () => {
    let nar;
    let monitor;

    beforeEach(async () => {
        nar = new NAR({
            lm: { enabled: false },
            reasoningAboutReasoning: { enabled: true }
        });
        await nar.initialize();

        monitor = new WebSocketMonitor({
            port: 8081,  // Use different port to avoid conflicts
            host: 'localhost',
            maxConnections: 5
        });
        await monitor.start();
        nar.connectToWebSocketMonitor(monitor);
    });

    afterEach(async () => {
        await monitor.stop();
        await nar.dispose();
    });

    test('core components should work together properly', async () => {
        expect(nar).toBeDefined();
        expect(monitor).toBeDefined();

        const testInput = '<cat --> animal>. %1.00;0.90%';
        const result = await nar.input(testInput);
        expect(result).toBeDefined();

        const concepts = nar.getConcepts();
        expect(concepts.length).toBeGreaterThan(0);

        const stats = nar.getStats();
        expect(stats?.cycleCount).toBeDefined();
        expect(stats?.isRunning).toBeDefined();

        nar.start();
        await new Promise(resolve => setTimeout(resolve, 200));
        nar.stop();

        // Additional assertions can be added here to verify the state after NAR runs
    });
});
