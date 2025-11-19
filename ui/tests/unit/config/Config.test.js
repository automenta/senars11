import { Config } from '../../src/config/Config.js';

describe('Config', () => {
  describe('getWebSocketConfig', () => {
    test('should return default config when no global config exists', () => {
      // Delete any existing global config
      delete window.WEBSOCKET_CONFIG;
      
      const config = Config.getWebSocketConfig();
      
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config.port).toBe('8081');
    });

    test('should return global config when it exists', () => {
      window.WEBSOCKET_CONFIG = {
        host: 'test-host',
        port: '9999'
      };

      const config = Config.getWebSocketConfig();
      
      expect(config.host).toBe('test-host');
      expect(config.port).toBe('9999');
    });
  });

  describe('getWebSocketUrl', () => {
    test('should return correct WebSocket URL for http', () => {
      delete window.WEBSOCKET_CONFIG;
      // Mock location protocol
      Object.defineProperty(window.location, 'protocol', {
        value: 'http:',
        writable: true
      });

      const url = Config.getWebSocketUrl();
      
      expect(url).toContain('ws://');
      expect(url).toContain('8081');
    });

    test('should return correct WebSocket URL for https', () => {
      delete window.WEBSOCKET_CONFIG;
      // Mock location protocol
      Object.defineProperty(window.location, 'protocol', {
        value: 'https:',
        writable: true
      });

      const url = Config.getWebSocketUrl();
      
      expect(url).toContain('wss://');
      expect(url).toContain('8081');
    });
  });

  describe('getConstants', () => {
    test('should return constant values', () => {
      const constants = Config.getConstants();
      
      expect(constants).toHaveProperty('RECONNECT_DELAY');
      expect(constants).toHaveProperty('MAX_HISTORY_SIZE');
      expect(constants).toHaveProperty('NOTIFICATION_DURATION');
      expect(constants).toHaveProperty('DEMO_DELAY');
    });
  });
});