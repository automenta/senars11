// Unit test for REPL core functionality
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import REPLCore from '../repl-core.js';

// Mock the WebSocket client
vi.mock('../../shared/ws.js', () => {
  return {
    default: vi.fn().mockImplementation((url, sessionId) => {
      return {
        url,
        sessionId,
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        connect: vi.fn(),
        send: vi.fn(),
        close: vi.fn()
      };
    })
  };
});

// Mock DOM APIs
const mockElement = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  appendChild: vi.fn(),
  remove: vi.fn(),
  setAttribute: vi.fn(),
  getAttribute: vi.fn(),
  querySelector: vi.fn(() => mockElement),
  querySelectorAll: vi.fn(() => []),
  textContent: '',
  className: '',
  style: {}
};

const mockDocument = {
  createElement: vi.fn(() => mockElement),
  getElementById: vi.fn(() => mockElement),
  addEventListener: vi.fn()
};

const mockWindow = {
  addEventListener: vi.fn()
};

// Replace global objects with mocks
global.document = mockDocument;
global.window = mockWindow;

describe('REPLCore', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Set up session manager mock
    global.window.sessionManager = {
      getSession: vi.fn(() => ({
        input: mockElement,
        output: mockElement,
        status: mockElement
      })),
      repl: {}
    };
  });

  afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
  });

  it('should create a REPL core instance', () => {
    const repl = new REPLCore('test-session');
    expect(repl).toBeInstanceOf(REPLCore);
    expect(repl.sessionId).toBe('test-session');
  });

  it('should initialize WebSocket connection', () => {
    const repl = new REPLCore('test-session');
    expect(repl.websocket).toBeDefined();
    expect(repl.websocket.connect).toHaveBeenCalled();
  });

  it('should bind UI events', () => {
    const repl = new REPLCore('test-session');
    expect(mockElement.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should handle WebSocket open event', () => {
    const repl = new REPLCore('test-session');
    repl.websocket.onopen();
    expect(repl.statusElement.setAttribute).toHaveBeenCalledWith('data-status', 'connected');
  });

  it('should handle WebSocket close event', () => {
    const repl = new REPLCore('test-session');
    repl.websocket.onclose();
    expect(repl.statusElement.setAttribute).toHaveBeenCalledWith('data-status', 'disconnected');
  });

  it('should handle WebSocket error event', () => {
    const repl = new REPLCore('test-session');
    repl.websocket.onerror();
    expect(repl.statusElement.setAttribute).toHaveBeenCalledWith('data-status', 'error');
  });
});