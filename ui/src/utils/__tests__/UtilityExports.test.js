// Unit test to verify utility module exports are available as expected
// This catches export mismatches before they cause runtime errors
import {describe, expect, it} from 'vitest';

describe('Utility Module Exports', () => {
  it('formatters.js provides expected exports', async () => {
    // Try to import the module
    const module = await import('../formatters.js');

    // Check if the module exists
    expect(module).toBeDefined();

    // Check for specific exports that other modules might depend on
    expect(module.formatBudget).toBeDefined();
    expect(module.formatTruth).toBeDefined();
  });

  it('themeUtils.js provides expected exports', async () => {
    // Try to import the module
    const module = await import('../themeUtils.js');

    // Check if the module exists
    expect(module).toBeDefined();
    expect(module.themeUtils).toBeDefined();
  });

  // Test to verify no missing export errors when importing utility dependencies
  it('No missing export errors when importing utility dependencies', async () => {
    // This type of test would catch errors before they reach the runtime
    await expect(import('../formatters.js')).resolves.toBeDefined();
    await expect(import('../themeUtils.js')).resolves.toBeDefined();
  });
});