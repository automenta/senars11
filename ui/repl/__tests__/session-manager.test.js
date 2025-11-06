// Unit test for Session Manager
import {describe, expect, it, beforeEach, vi} from 'vitest';
import SessionManager from '../../repl/session-manager.js';

// Create mock DOM elements for testing and mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Create mock DOM elements for testing
describe('SessionManager', () => {
  let sessionManager;

  beforeEach(() => {
    // Create the DOM structure that SessionManager expects
    document.body.innerHTML = `
      <div id="session-container"></div>
      <div id="session-selector"></div>
    `;
    
    // Create a SessionManager instance for testing
    sessionManager = new SessionManager();
  });

  it('should initialize with sessions including main', () => {
    // The constructor automatically creates a main session
    expect(sessionManager.activeSessions.main).toBeDefined();
    expect(sessionManager.sessionHistories).toEqual({});
    expect(sessionManager.container).not.toBeNull();
    expect(sessionManager.selector).not.toBeNull();
  });

  it('should create cell structure correctly', () => {
    const sessionId = 'test-session';
    const type = 'input';
    const content = 'test content';
    
    const cell = sessionManager.createCell(sessionId, type, content);
    
    expect(cell.type).toBe(type);
    expect(cell.content).toBe(content);
    expect(cell.sessionId).toBe(sessionId);
    expect(cell.pinned).toBe(false);
    expect(typeof cell.id).toBe('string');
    expect(typeof cell.timestamp).toBe('number');
  });

  it('should add cell to history correctly', () => {
    const sessionId = 'test-session';
    const type = 'input';
    const content = 'test content';
    
    sessionManager.addCellToHistory(sessionId, type, content);
    
    expect(sessionManager.sessionHistories[sessionId]).toHaveLength(1);
    expect(sessionManager.sessionHistories[sessionId][0].content).toBe(content);
    expect(sessionManager.sessionHistories[sessionId][0].type).toBe(type);
    expect(sessionManager.sessionHistories[sessionId][0].sessionId).toBe(sessionId);
  });

  it('should filter history by content correctly', () => {
    // Add some test data to the session manager
    const sessionId = 'test-session';
    sessionManager.addCellToHistory(sessionId, 'input', 'hello world');
    sessionManager.addCellToHistory(sessionId, 'output', { text: 'response' });
    sessionManager.addCellToHistory(sessionId, 'input', 'goodbye');
    
    // Test text filtering
    const filtered = sessionManager.filterHistoryByText(sessionId, 'hello');
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].content).toBe('hello world');
  });

  it('should handle pin/unpin functionality', () => {
    const sessionId = 'test-session';
    
    // Add some cells to the session history
    sessionManager.addCellToHistory(sessionId, 'input', 'test 1');
    sessionManager.addCellToHistory(sessionId, 'input', 'test 2');
    
    // Get the first cell
    const firstCell = sessionManager.sessionHistories[sessionId][0];
    
    // Pin the first cell
    sessionManager.pinCell(sessionId, firstCell.id);
    
    expect(sessionManager.sessionHistories[sessionId][0].pinned).toBe(true);
    
    // Unpin the first cell
    sessionManager.unpinCell(sessionId, firstCell.id);
    
    expect(sessionManager.sessionHistories[sessionId][0].pinned).toBe(false);
  });
  
  it('should create a session correctly', () => {
    const sessionId = 'test-session';
    
    sessionManager.createSession(sessionId);
    
    expect(sessionManager.activeSessions[sessionId]).toBeDefined();
    expect(sessionManager.activeSessions[sessionId].element).toBeDefined();
    expect(sessionManager.activeSessions[sessionId].element.getAttribute('data-session-id')).toBe(sessionId);
  });
});