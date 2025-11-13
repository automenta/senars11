import {describe, expect, it} from 'vitest';
import {
  debounce,
  deepClone,
  deepEqual,
  delay,
  formatDateTime,
  formatTimestamp,
  generateId,
  getNestedProperty,
  isEmpty,
  memoize,
  setNestedProperty,
  throttle
} from '../utils/helpers.js';

describe('Helper Functions', () => {
  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2); // Should be different each time
    });
  });

  describe('Date Formatting', () => {
    it('should format timestamp to time string', () => {
      const timestamp = 1609459200000; // Jan 1, 2021 00:00:00 UTC
      const formatted = formatTimestamp(timestamp);

      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/); // Should match HH:MM:SS format
    });

    it('should format timestamp to date and time string', () => {
      const timestamp = 1609459200000; // Jan 1, 2021 00:00:00 UTC
      const formatted = formatDateTime(timestamp);

      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/); // Should match MM/DD/YYYY, HH:MM format
    });
  });

  describe('Function Utilities', () => {
    it('should debounce function calls', async () => {
      let callCount = 0;
      const increment = () => {
        callCount++;
      };
      const debouncedFn = debounce(increment, 10);

      debouncedFn();
      debouncedFn(); // This should cancel the previous call
      await delay(15); // Wait for debounce

      expect(callCount).toBe(1);
    });

    it('should throttle function calls', async () => {
      let callCount = 0;
      const increment = () => {
        callCount++;
      };
      const throttledFn = throttle(increment, 20);

      throttledFn();
      throttledFn(); // This should be ignored
      await delay(25); // Wait for throttle to reset
      throttledFn(); // This should execute

      expect(callCount).toBe(2);
    });
  });

  describe('Object Utilities', () => {
    it('should deep clone objects', () => {
      const original = {a: 1, b: {c: 2, d: [3, 4]}, e: new Date()};
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original); // Should be different references
      expect(cloned.b).not.toBe(original.b); // Nested objects should be different references
    });

    it('should check if values are empty', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);

      expect(isEmpty('test')).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty({a: 1})).toBe(false);
    });

    it('should check deep equality', () => {
      const obj1 = {a: 1, b: {c: 2}};
      const obj2 = {a: 1, b: {c: 2}};
      const obj3 = {a: 1, b: {c: 3}};

      expect(deepEqual(obj1, obj2)).toBe(true);
      expect(deepEqual(obj1, obj3)).toBe(false);
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, null)).toBe(false);
    });

    it('should get nested properties', () => {
      const obj = {a: {b: {c: 'value'}}};

      expect(getNestedProperty(obj, 'a.b.c')).toBe('value');
      expect(getNestedProperty(obj, 'a.b.d')).toBe(undefined);
      expect(getNestedProperty(obj, 'a.b.d', 'default')).toBe('default');
    });

    it('should set nested properties', () => {
      const obj = {a: {b: {}}};

      setNestedProperty(obj, 'a.b.c', 'new value');
      expect(obj.a.b.c).toBe('new value');

      setNestedProperty(obj, 'a.b.d.e.f', 'nested value');
      expect(obj.a.b.d.e.f).toBe('nested value');
    });

    it('should memoize function results', () => {
      let callCount = 0;
      const expensiveFn = (x) => {
        callCount++;
        return x * 2;
      };
      const memoizedFn = memoize(expensiveFn);

      // First call should execute the function
      const result1 = memoizedFn(5);
      expect(callCount).toBe(1);
      expect(result1).toBe(10);

      // Second call with same args should use cache
      const result2 = memoizedFn(5);
      expect(callCount).toBe(1); // Not called again
      expect(result2).toBe(10);

      // Call with different args should execute again
      const result3 = memoizedFn(10);
      expect(callCount).toBe(2);
      expect(result3).toBe(20);
    });
  });

  describe('Delay Utility', () => {
    it('should delay execution for specified time', async () => {
      const start = Date.now();
      await delay(10);
      const end = Date.now();

      // Should take at least 10ms (accounting for some timing variance)
      expect(end - start).toBeGreaterThanOrEqual(8);
    });
  });
});