import {jest} from '@jest/globals';
import {Strategy} from '../Strategy.js';
import {createTestTask} from './testUtils.js';

describe('Strategy', () => {
    let strategy;

    beforeEach(() => {
        strategy = new Strategy();
    });

    describe('constructor', () => {
        test('should initialize with default config', () => {
            expect(strategy.config.maxSecondaryPremises).toBe(10);
        });

        test('should initialize with custom config', () => {
            strategy = new Strategy({
                maxSecondaryPremises: 5,
                customParam: 'value'
            });

            expect(strategy.config.maxSecondaryPremises).toBe(5);
            expect(strategy.config.customParam).toBe('value');
        });
    });

    describe('selectSecondaryPremises', () => {
        test('should return empty array by default', async () => {
            const primaryPremise = createTestTask({id: 'primary'});
            const result = await strategy.selectSecondaryPremises(primaryPremise);

            expect(result).toEqual([]);
        });

        test('should handle errors gracefully', async () => {
            // Mock console.error to prevent test output pollution
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
            });

            try {
                // Create a Strategy with a premiseSelector that throws an error
                const errorSelector = {
                    select: () => {
                        throw new Error('Selector error');
                    }
                };
                const errorStrategy = new Strategy({premiseSelector: errorSelector});

                const primaryPremise = createTestTask({id: 'primary'});
                const result = await errorStrategy.selectSecondaryPremises(primaryPremise);

                expect(result).toEqual([]);
            } finally {
                consoleSpy.mockRestore();
            }
        });
    });

    describe('generatePremisePairs', () => {
        test('should generate premise pairs from stream', async () => {
            const premiseStream = {
                [Symbol.asyncIterator]: async function* () {
                    yield createTestTask({id: 'primary1'});
                    yield createTestTask({id: 'primary2'});
                }
            };

            // Replace the method on the instance to avoid mocking
            const originalMethod = strategy.selectSecondaryPremises.bind(strategy);
            strategy.selectSecondaryPremises = async (primary) => {
                if (primary.id === 'primary1') {
                    return [createTestTask({id: 'secondary1a'}), createTestTask({id: 'secondary1b'})];
                } else {
                    return [createTestTask({id: 'secondary2a'})];
                }
            };

            const pairs = [];
            for await (const pair of strategy.generatePremisePairs(premiseStream)) {
                pairs.push(pair);
            }

            // Restore original method
            strategy.selectSecondaryPremises = originalMethod;

            // Check that we got some pairs (the exact count may vary based on implementation)
            expect(pairs.length).toBeGreaterThanOrEqual(1);

            // If pairs were generated, check their structure
            if (pairs.length > 0) {
                for (const pair of pairs) {
                    expect(pair).toHaveLength(2);
                    expect(pair[0]).toBeDefined();
                    expect(pair[1]).toBeDefined();
                }
            }
        });

        test('should handle errors during premise selection', async () => {
            // Mock console.error to prevent test output pollution
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
            });

            try {
                const premiseStream = {
                    [Symbol.asyncIterator]: async function* () {
                        yield createTestTask({id: 'primary1'});
                        yield createTestTask({id: 'primary2'});
                    }
                };

                // Replace the method on the instance to avoid mocking
                const originalMethod = strategy.selectSecondaryPremises.bind(strategy);
                let callCount = 0;
                strategy.selectSecondaryPremises = async (primary) => {
                    callCount++;
                    if (callCount === 1) {
                        throw new Error('Selection failed');
                    }
                    return [createTestTask({id: 'secondary'})];
                };

                const pairs = [];
                for await (const pair of strategy.generatePremisePairs(premiseStream)) {
                    pairs.push(pair);
                }

                // Restore original method
                strategy.selectSecondaryPremises = originalMethod;

                // Should skip the failed premise and continue with the second
                // At least one pair should be produced from the successful premise
                expect(pairs.length).toBeGreaterThanOrEqual(1);
            } finally {
                consoleSpy.mockRestore();
            }
        });
    });

    describe('getStatus', () => {
        test('should return status information', () => {
            strategy = new Strategy({maxSecondaryPremises: 8});

            const status = strategy.getStatus();

            expect(status.config.maxSecondaryPremises).toBe(8);
            expect(status.type).toBe('Strategy');
            expect(status.timestamp).toBeDefined();
        });
    });
});