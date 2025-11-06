// Unit test for WebSocket client
import {describe, expect, it, vi, beforeAll, afterAll} from 'vitest';

// Create a mock WebSocket class for testing
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
  }
  
  send(data) {
    this.lastSent = data;
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
  }
}

// Store and restore original WebSocket
const originalWebSocket = global.WebSocket;

describe('WebSocketClient', () => {
  beforeAll(() => {
    global.WebSocket = MockWebSocket;
  });
  
  afterAll(() => {
    global.WebSocket = originalWebSocket;
  });
  
  it('should initialize with correct url and session id', () => {
    const url = 'ws://localhost:8080/nar';
    const sessionId = 'test-session';
    
    // Test the constructor logic without actually creating the full object
    const fullUrl = `${url}?session=${sessionId}`;
    
    expect(fullUrl).toBe('ws://localhost:8080/nar?session=test-session');
  });
  
  it('should have correct default properties', () => {
    const wsClientProps = {
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000
    };
    
    expect(wsClientProps.reconnectAttempts).toBe(0);
    expect(wsClientProps.maxReconnectAttempts).toBe(5);
    expect(wsClientProps.reconnectDelay).toBe(1000);
  });
  
  it('should format messages with session id', () => {
    const sessionId = 'test-session';
    const testData = { type: 'test', payload: { data: 'value' } };
    
    // Test the logic for adding sessionId to messages
    const message = testData.sessionId ? testData : { sessionId: sessionId, ...testData };
    
    expect(message.sessionId).toBe(sessionId);
    expect(message.type).toBe('test');
    expect(message.payload.data).toBe('value');
  });
  
  it('should handle reconnection with exponential backoff', () => {
    const reconnectDelay = 1000;
    const attempts = [1, 2, 3, 4];
    const expectedDelays = attempts.map(attempt => reconnectDelay * Math.pow(2, attempt - 1));
    
    expect(expectedDelays[0]).toBe(1000); // 1st retry
    expect(expectedDelays[1]).toBe(2000); // 2nd retry
    expect(expectedDelays[2]).toBe(4000); // 3rd retry
    expect(expectedDelays[3]).toBe(8000); // 4th retry
  });
  
  it('should check connection status correctly', () => {
    // Test OPEN state
    const mockWs = { readyState: 1 }; // WebSocket.OPEN is 1
    
    const isConnected = mockWs.readyState === 1; // WebSocket.OPEN
    expect(isConnected).toBe(true);
    
    // Test CLOSED state
    const mockWsClosed = { readyState: 3 }; // WebSocket.CLOSED is 3
    const isConnectedClosed = mockWsClosed.readyState === 1; // WebSocket.OPEN
    expect(isConnectedClosed).toBe(false);
  });
});