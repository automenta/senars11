// Unit test for WebSocket client
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';

// Mock the WebSocketService
const mockWebSocketService = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  sendMessage: vi.fn(),
  routeMessage: vi.fn(),
  handleOpen: vi.fn(),
  handleClose: vi.fn(),
  handleError: vi.fn()
};

vi.mock('../../src/utils/websocket.js', () => {
  return {
    default: vi.fn().mockImplementation((url) => {
      return {
        ...mockWebSocketService,
        url
      };
    })
  };
});

// Import after mocks are set up
import WebSocketClient from '../../shared/ws.js';

describe('WebSocketClient', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
  });

  it('should create a WebSocket client instance', () => {
    const client = new WebSocketClient('ws://localhost:8080', 'test-session');
    expect(client).toBeInstanceOf(WebSocketClient);
    expect(client.url).toBe('ws://localhost:8080?session=test-session');
    expect(client.sessionId).toBe('test-session');
  });

  it('should connect to WebSocket', () => {
    const client = new WebSocketClient('ws://localhost:8080', 'test-session');
    expect(mockWebSocketService.connect).toHaveBeenCalled();
  });

  it('should send messages with session ID', () => {
    const client = new WebSocketClient('ws://localhost:8080', 'test-session');
    const testData = { type: 'test', payload: { data: 'test' } };
    
    client.send(testData);
    
    expect(mockWebSocketService.sendMessage).toHaveBeenCalledWith({
      sessionId: 'test-session',
      type: 'test',
      payload: { data: 'test' }
    });
  });

  it('should preserve existing session ID in messages', () => {
    const client = new WebSocketClient('ws://localhost:8080', 'test-session');
    const testData = { sessionId: 'other-session', type: 'test', payload: { data: 'test' } };
    
    client.send(testData);
    
    expect(mockWebSocketService.sendMessage).toHaveBeenCalledWith({
      sessionId: 'other-session',
      type: 'test',
      payload: { data: 'test' }
    });
  });

  it('should close WebSocket connection', () => {
    const client = new WebSocketClient('ws://localhost:8080', 'test-session');
    client.close();
    
    expect(mockWebSocketService.disconnect).toHaveBeenCalled();
  });

  it('should warn when sending message without WebSocket', () => {
    // Create a client without initializing the websocket
    const client = new WebSocketClient('ws://localhost:8080', 'test-session');
    client.websocket = null;
    
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    client.send({ type: 'test' });
    
    expect(warnSpy).toHaveBeenCalledWith('WebSocket is not initialized. Message not sent:', { type: 'test' });
  });
});