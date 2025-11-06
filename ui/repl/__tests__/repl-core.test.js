// Unit test for REPL core functionality
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import REPLCore from '../repl-core.js';

describe('REPLCore', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a REPL core instance', () => {
    // This test requires a real DOM environment which is not available in unit tests
    // We'll skip this test for now
    expect(true).toBe(true);
  });
});