// Unit test for WebSocket client
import {describe, expect, it} from 'vitest';
import WebSocketClient from '../../shared/ws.js';

// Mock the global WebSocket object for testing
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.OPEN; // Default to OPEN for tests
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
  }
  
  send(data) {
    this.lastSent = data;
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED;
  }
}

// Define WebSocket constants in the mock
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

// Set up global WebSocket mock before tests
global.WebSocket = MockWebSocket;

describe('WebSocketClient', () => {
  it('should initialize with correct url and session id', () => {
    const url = 'ws://localhost:8080/nar';
    const sessionId = 'test-session';
    
    const wsClient = new WebSocketClient(url, sessionId);
    
    expect(wsClient.url).toBe('ws://localhost:8080/nar');
    expect(wsClient.sessionId).toBe('test-session');
  });
  
  it('should have correct default properties', () => {
    const wsClient = new WebSocketClient('ws://localhost:8080/nar', 'test-session');
    
    expect(wsClient.reconnectAttempts).toBe(0);
    expect(wsClient.maxReconnectAttempts).toBe(5);
    expect(wsClient.reconnectDelay).toBe(1000);
  });
  
  it('should format messages with session id', () => {
    const wsClient = new WebSocketClient('ws://localhost:8080/nar', 'test-session');
    const testData = { type: 'test', payload: { data: 'value' } };
    
    // Test the logic for adding sessionId to messages
    const message = wsClient.ensureMessageHasSessionId(testData);
    
    expect(message.sessionId).toBe('test-session');
    expect(message.type).toBe('test');
    expect(message.payload.data).toBe('value');
  });
  
  it('should handle reconnection with exponential backoff', () => {
    const wsClient = new WebSocketClient('ws://localhost:8080/nar', 'test-session');
    
    // When reconnectAttempts is 0, the calculation is 1000 * 2^(-1) = 500ms
    expect(wsClient.calculateReconnectDelay()).toBe(500); // 1st retry attempt (0 actual attempts, but calculation uses -1)
    
    wsClient.reconnectAttempts = 1;
    expect(wsClient.calculateReconnectDelay()).toBe(1000); // 1st actual retry
    wsClient.reconnectAttempts = 2;
    expect(wsClient.calculateReconnectDelay()).toBe(2000); // 2nd retry
    wsClient.reconnectAttempts = 3;
    expect(wsClient.calculateReconnectDelay()).toBe(4000); // 3rd retry
    wsClient.reconnectAttempts = 4;
    expect(wsClient.calculateReconnectDelay()).toBe(8000); // 4th retry
  });
  
  it('should check connection status correctly', () => {
    const wsClient = new WebSocketClient('ws://localhost:8080/nar', 'test-session');
    
    // Mock WebSocket with OPEN state
    wsClient.websocket = { readyState: 1 }; // WebSocket.OPEN is 1
    
    expect(wsClient.isConnected()).toBe(true);
    
    // Mock WebSocket with CLOSED state
    wsClient.websocket = { readyState: 3 }; // WebSocket.CLOSED is 3
    expect(wsClient.isConnected()).toBe(false);
  });
  
  it('should send message correctly', () => {
    const wsClient = new WebSocketClient('ws://localhost:8080/nar', 'test-session');
    
    // Mock the websocket connection
    wsClient.websocket = new MockWebSocket('ws://localhost:8080/nar?session=test-session');
    
    const testData = { type: 'test', payload: { data: 'value' } };
    wsClient.send(testData);
    
    expect(wsClient.websocket.lastSent).toBe(JSON.stringify({ sessionId: 'test-session', type: 'test', payload: { data: 'value' } }));
  });
});