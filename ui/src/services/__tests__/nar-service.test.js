/**
 * @file Unit tests for the NAR WebSocket service.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import narService from '../nar-service';

// Mock WebSocket class
const mockSend = vi.fn();
const mockClose = vi.fn();

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.send = mockSend;
    this.close = mockClose;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
  }
}
// Add static properties to the mock class to match the real WebSocket API
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;


// Stub the global WebSocket object with our mock class
vi.stubGlobal('WebSocket', MockWebSocket);

describe('NARService', () => {
  let wsInstance;
  const testUrl = 'ws://localhost:8080';

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Initialize the service, which creates a new mock WebSocket instance
    narService.initialize(testUrl);
    // Get the instance created by the service to simulate events on it
    wsInstance = narService.ws;
  });

  afterEach(() => {
    narService.close();
  });

  it('should initialize a WebSocket connection', () => {
    expect(wsInstance).toBeInstanceOf(MockWebSocket);
    expect(wsInstance.url).toBe(testUrl);
  });

  it('should emit "open" event on connection', () => {
    const openCallback = vi.fn();
    narService.on('open', openCallback);

    // Simulate the connection opening by calling the onopen handler
    wsInstance.onopen();
    expect(openCallback).toHaveBeenCalled();
  });

  it('should emit "snapshot" when a memorySnapshot message is received', () => {
    const snapshotCallback = vi.fn();
    narService.on('snapshot', snapshotCallback);

    const snapshotPayload = { concepts: [], tasks: [] };
    const messageEvent = {
      data: JSON.stringify({ type: 'memorySnapshot', payload: snapshotPayload }),
    };

    wsInstance.onmessage(messageEvent);

    expect(snapshotCallback).toHaveBeenCalledWith(snapshotPayload);
  });

  it('should handle and normalize a single event into a batch', () => {
    const batchCallback = vi.fn();
    narService.on('batch', batchCallback);

    const singleEvent = { type: 'ADD_CONCEPT', concept: 'C1' };
    const messageEvent = {
      data: JSON.stringify(singleEvent),
    };

    wsInstance.onmessage(messageEvent);

    // It should be wrapped in an array
    expect(batchCallback).toHaveBeenCalledWith([singleEvent]);
  });

  it('should handle a batch of events', () => {
    const batchCallback = vi.fn();
    narService.on('batch', batchCallback);

    const eventBatch = [
      { type: 'ADD_CONCEPT', concept: 'C1' },
      { type: 'ADD_TASK', task: 'T1' },
    ];
    const messageEvent = {
      data: JSON.stringify(eventBatch),
    };

    wsInstance.onmessage(messageEvent);

    expect(batchCallback).toHaveBeenCalledWith(eventBatch);
  });

  it('should send a correctly formatted requestMemorySnapshot message', () => {
    wsInstance.readyState = WebSocket.OPEN; // Mock open state
    const options = { limit: 100, sortBy: 'priority' };
    narService.requestMemorySnapshot(options);

    const expectedMessage = JSON.stringify({
      type: 'control/requestMemorySnapshot',
      payload: options,
    });

    expect(mockSend).toHaveBeenCalledWith(expectedMessage);
  });

  it('should send a correctly formatted narseseInput message', () => {
    wsInstance.readyState = WebSocket.OPEN; // Mock open state
    const narsese = '<a --> b>.';
    narService.sendNarsese(narsese);

    const expectedMessage = JSON.stringify({
      type: 'narseseInput',
      payload: narsese,
    });

    expect(mockSend).toHaveBeenCalledWith(expectedMessage);
  });

  it('should not send if WebSocket is not open', () => {
    wsInstance.readyState = WebSocket.CONNECTING; // Mock non-open state
    narService.sendNarsese('<a --> b>.');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should close the WebSocket connection', () => {
    narService.close();
    expect(mockClose).toHaveBeenCalled();
  });
});
