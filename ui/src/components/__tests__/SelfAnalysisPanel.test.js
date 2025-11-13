// Basic unit test for SelfAnalysisPanel to ensure it loads without syntax errors
import {describe, expect, it, vi} from 'vitest';

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
  it('loads without syntax errors', async () => {
    const module = await import('../SelfAnalysisPanel.js');
    expect(module.default).toBeDefined();
  });

  it('is a function/component', async () => {
    const module = await import('../SelfAnalysisPanel.js');
    expect(typeof module.default).toBe('function');
  });
});