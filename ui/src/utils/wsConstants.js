export const ConnectionState = Object.freeze({
  DISCONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2,
  RECONNECTING: 3,
});

export const DEFAULT_OPTIONS = Object.freeze({
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  maxQueueSize: 1000,
  heartbeatTimeout: 15000,
  maxMessagesPerSecond: 1000,
  duplicateWindowMs: 5000
});