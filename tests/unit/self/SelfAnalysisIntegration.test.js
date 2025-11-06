/**
 * Self Analysis Integration Tests
 * Tests for the integration between self-analyzer and knowledge system
 */
import {SeNARSSelfAnalyzerNAR} from '../../../self-analyze.nar.js';

describe('Self Analysis Integration', () => {
    // Mock NAR class for testing
    class MockNAR {
        constructor() {
            this.inputs = [];
        }

        async input(statement) {
            this.inputs.push(statement);
        }
    }

    test('should create analyzer instance', () => {
        const analyzer = new SeNARSSelfAnalyzerNAR({summaryOnly: true});
        expect(analyzer).toBeDefined();
    });

    test('should connect to NAR instance', () => {
        const analyzer = new SeNARSSelfAnalyzerNAR();
        const mockNAR = new MockNAR();

        analyzer.connectToNAR(mockNAR);

        expect(analyzer.nar).toBe(mockNAR);
        expect(analyzer.integrationEnabled).toBe(true);
    });

    test('should get knowing system', () => {
        const analyzer = new SeNARSSelfAnalyzerNAR();
        const knowing = analyzer.getKnowingSystem();

        expect(knowing).toBeDefined();
        expect(knowing.constructor.name).toBe('Knowing');
    });

    test('should reset knowledge', () => {
        const analyzer = new SeNARSSelfAnalyzerNAR();
        const initialKnowledge = analyzer.getKnowingSystem();

        // Add some dummy knowledge to test reset
        analyzer.resetKnowledge();
        const resetKnowledge = analyzer.getKnowingSystem();

        expect(resetKnowledge).toBeDefined();
    });
});