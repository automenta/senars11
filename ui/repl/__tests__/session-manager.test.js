// Unit test for Session Manager
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import SessionManager from '../session-manager.js';

// Mock DOM APIs
const mockElements = new Map();

const createElement = (tag) => {
  const element = {
    tag,
    className: '',
    attributes: new Map(),
    children: [],
    eventListeners: new Map(),
    textContent: '',
    style: {},
    
    setAttribute: function(name, value) {
      this.attributes.set(name, value);
    },
    
    getAttribute: function(name) {
      return this.attributes.get(name);
    },
    
    addEventListener: function(event, handler) {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(handler);
    },
    
    appendChild: function(child) {
      this.children.push(child);
    },
    
    remove: function() {
      // Simple removal simulation
    },
    
    querySelector: function(selector) {
      // Return a mock element for any query
      return mockElements.get(selector) || createElement('div');
    }
  };
  
  return element;
};

const mockDocument = {
  createElement,
  getElementById: vi.fn((id) => {
    if (id === 'session-container' || id === 'session-selector') {
      return createElement('div');
    }
    return null;
  }),
  addEventListener: vi.fn()
};

const mockWindow = {
  addEventListener: vi.fn()
};

// Replace global objects with mocks
global.document = mockDocument;
global.window = mockWindow;
global.Node = { ELEMENT_NODE: 1 };

describe('SessionManager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Reset mock elements
    mockElements.clear();
  });

  afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
  });

  it('should create a session manager instance', () => {
    const sessionManager = new SessionManager();
    expect(sessionManager).toBeInstanceOf(SessionManager);
    expect(sessionManager.activeSessions).toBeDefined();
  });

  it('should create a session', () => {
    const sessionManager = new SessionManager();
    sessionManager.createSession('test-session');
    
    expect(sessionManager.activeSessions['test-session']).toBeDefined();
    expect(sessionManager.activeSessions['test-session'].element).toBeDefined();
  });

  it('should not create duplicate sessions', () => {
    const sessionManager = new SessionManager();
    sessionManager.createSession('test-session');
    
    // Spy on console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    sessionManager.createSession('test-session');
    
    expect(warnSpy).toHaveBeenCalledWith('Session test-session already exists');
  });

  it('should destroy a session', () => {
    const sessionManager = new SessionManager();
    sessionManager.createSession('test-session');
    
    expect(sessionManager.activeSessions['test-session']).toBeDefined();
    
    sessionManager.destroySession('test-session');
    
    expect(sessionManager.activeSessions['test-session']).toBeUndefined();
  });

  it('should warn when destroying non-existent session', () => {
    const sessionManager = new SessionManager();
    
    // Spy on console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    sessionManager.destroySession('non-existent');
    
    expect(warnSpy).toHaveBeenCalledWith('Session non-existent does not exist');
  });

  it('should get a session', () => {
    const sessionManager = new SessionManager();
    sessionManager.createSession('test-session');
    
    const session = sessionManager.getSession('test-session');
    expect(session).toBeDefined();
    expect(session.element).toBeDefined();
  });

  it('should return null for non-existent session', () => {
    const sessionManager = new SessionManager();
    
    const session = sessionManager.getSession('non-existent');
    expect(session).toBeNull();
  });
});