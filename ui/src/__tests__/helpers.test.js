import { describe, it, expect } from 'vitest';
import { generateId, formatTimestamp, deepClone, isEmpty } from '../utils/helpers';

// Unit tests for helpers.js functions
describe('Helpers', () => {
  it('generateId returns a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('formatTimestamp formats a timestamp correctly', () => {
    const timestamp = 1609459200000; // Jan 1, 2021
    const formatted = formatTimestamp(timestamp);
    expect(typeof formatted).toBe('string');
    expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/); // HH:MM:SS format
  });

  it('deepClone creates a separate object', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);
    
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original); // Different object references
    expect(cloned.b).not.toBe(original.b); // Nested objects are also cloned
  });

  it('isEmpty detects empty values correctly', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('   ')).toBe(true);
    expect(isEmpty([])).toBe(true);
    expect(isEmpty({})).toBe(true);
    
    expect(isEmpty('hello')).toBe(false);
    expect(isEmpty([1, 2, 3])).toBe(false);
    expect(isEmpty({ a: 1 })).toBe(false);
  });
});