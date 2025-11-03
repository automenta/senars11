// Basic unit test for SelfAnalysisPanel to ensure it loads without syntax errors
import { describe, expect, it, beforeEach, vi } from 'vitest';

// Mock the window.wsService before importing the component
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

describe('SelfAnalysisPanel', () => {
  let SelfAnalysisPanel;

  beforeEach(async () => {
    // Dynamic import to test that the module loads without syntax errors
    const module = await import('../SelfAnalysisPanel.js');
    SelfAnalysisPanel = module.default;
  });

  it('loads without syntax errors', () => {
    expect(SelfAnalysisPanel).toBeDefined();
  });

  it('is a function/component', () => {
    expect(typeof SelfAnalysisPanel).toBe('function');
  });
});