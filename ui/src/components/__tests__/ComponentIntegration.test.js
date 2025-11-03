// Integration test to verify all components can be imported without syntax errors
// This catches import/export mismatches, missing dependencies, and syntax errors
import { describe, expect, it, vi } from 'vitest';

// Mock essential globals that components expect
global.window = {
  ...global.window,
  wsService: {
    ws: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    send: vi.fn(),
  },
};

describe('Component Import and Syntax Tests', () => {
  it('SelfAnalysisPanel imports without syntax errors', async () => {
    const module = await import('../SelfAnalysisPanel.js');
    expect(module).toBeDefined();
    expect(module.default).toBeDefined();
  });

  it('TaskPanel imports without syntax errors', async () => {
    const module = await import('../TaskPanel.js');
    expect(module).toBeDefined();
    expect(module.default).toBeDefined();
  });

  it('ConceptPanel imports without syntax errors', async () => {
    const module = await import('../ConceptPanel.js');
    expect(module).toBeDefined();
    expect(module.default).toBeDefined();
  });

  it('SystemStatusPanel imports without syntax errors', async () => {
    const module = await import('../SystemStatusPanel.js');
    expect(module).toBeDefined();
    expect(module.default).toBeDefined();
  });
});