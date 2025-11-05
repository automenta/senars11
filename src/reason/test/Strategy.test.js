import { Strategy } from '../Strategy.js';
import { createTestTask } from '../utils/test.js';

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
      const primaryPremise = createTestTask({ id: 'primary' });
      const result = await strategy.selectSecondaryPremises(primaryPremise);
      
      expect(result).toEqual([]);
    });

    test('should use premiseSelector if provided', async () => {
      const mockPremiseSelector = {
        select: jest.fn().mockResolvedValue([createTestTask({ id: 'selected' })])
      };
      
      strategy = new Strategy({ premiseSelector: mockPremiseSelector });
      
      const primaryPremise = createTestTask({ id: 'primary' });
      const result = await strategy.selectSecondaryPremises(primaryPremise);
      
      expect(mockPremiseSelector.select).toHaveBeenCalledWith(primaryPremise);
      expect(result).toEqual([createTestTask({ id: 'selected' })]);
    });

    test('should handle errors gracefully', async () => {
      strategy = new Strategy({
        premiseSelector: { select: () => { throw new Error('Selector error'); } }
      });

      const primaryPremise = createTestTask({ id: 'primary' });
      const result = await strategy.selectSecondaryPremises(primaryPremise);
      
      expect(result).toEqual([]);
    });
  });

  describe('generatePremisePairs', () => {
    test('should generate premise pairs from stream', async () => {
      const premiseStream = {
        [Symbol.asyncIterator]: async function*() {
          yield createTestTask({ id: 'primary1' });
          yield createTestTask({ id: 'primary2' });
        }
      };

      // Mock the selectSecondaryPremises to return specific results
      strategy.selectSecondaryPremises = async (primary) => {
        if (primary.id === 'primary1') {
          return [createTestTask({ id: 'secondary1a' }), createTestTask({ id: 'secondary1b' })];
        } else {
          return [createTestTask({ id: 'secondary2a' })];
        }
      };

      const pairs = [];
      for await (const pair of strategy.generatePremisePairs(premiseStream)) {
        pairs.push(pair);
      }

      expect(pairs).toEqual([
        [createTestTask({ id: 'primary1' }), createTestTask({ id: 'secondary1a' })],
        [createTestTask({ id: 'primary1' }), createTestTask({ id: 'secondary1b' })],
        [createTestTask({ id: 'primary2' }), createTestTask({ id: 'secondary2a' })]
      ]);
    });

    test('should handle errors during premise selection', async () => {
      const premiseStream = {
        [Symbol.asyncIterator]: async function*() {
          yield createTestTask({ id: 'primary1' });
          yield createTestTask({ id: 'primary2' });
        }
      };

      // Mock to throw error for first premise, succeed for second
      let callCount = 0;
      strategy.selectSecondaryPremises = async (primary) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Selection failed');
        }
        return [createTestTask({ id: 'secondary' })];
      };

      const pairs = [];
      for await (const pair of strategy.generatePremisePairs(premiseStream)) {
        pairs.push(pair);
      }

      // Should skip the failed premise and continue with the second
      expect(pairs).toEqual([
        [createTestTask({ id: 'primary2' }), createTestTask({ id: 'secondary' })]
      ]);
    });
  });

  describe('getStatus', () => {
    test('should return status information', () => {
      strategy = new Strategy({ maxSecondaryPremises: 8 });
      
      const status = strategy.getStatus();
      
      expect(status.config.maxSecondaryPremises).toBe(8);
      expect(status.type).toBe('Strategy');
      expect(status.timestamp).toBeDefined();
    });
  });
});