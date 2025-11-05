import {jest} from '@jest/globals';
import { Strategy } from '../Strategy.js';
import { createTestTask } from './testUtils.js';

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
      // Check that the result has the expected ID and structure, ignoring timestamp differences
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('selected');
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

      // Check the structure and IDs, ignoring timestamp differences
      expect(pairs).toHaveLength(3);
      expect(pairs[0][0].id).toBe('primary1');
      expect(pairs[0][1].id).toBe('secondary1a');
      expect(pairs[1][0].id).toBe('primary1');
      expect(pairs[1][1].id).toBe('secondary1b');
      expect(pairs[2][0].id).toBe('primary2');
      expect(pairs[2][1].id).toBe('secondary2a');
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
      expect(pairs).toHaveLength(1);
      expect(pairs[0][0].id).toBe('primary2');
      expect(pairs[0][1].id).toBe('secondary');
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