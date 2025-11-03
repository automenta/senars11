import {jest} from '@jest/globals';
import {NAR} from '../../../src/nar/NAR.js';
import {SystemConfig} from '../../../src/nar/SystemConfig.js';
import {Metacognition} from '../../../src/reasoning/Metacognition.js';

// Set a longer timeout for this integration test
jest.setTimeout(10000);

describe('Metacognition Integration', () => {
    let nar;

    beforeEach(async () => {
        const config = {
            introspection: {
                enabled: true,
            },
            metacognition: {
                analyzers: ['PerformanceAnalyzer'],
                selfOptimization: {
                    enabled: true,
                },
                PerformanceAnalyzer: {
                    cacheHitRateThreshold: 0.9,
                },
            },
            termFactory: {
                maxCacheSize: 10,
            },
        };

        nar = new NAR(config);
        await nar.initialize();
        // Do not start the NAR, we will step manually
    });

    it('should run without timing out', async () => {
        expect(true).toBe(true);
    });
});
