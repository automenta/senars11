/**
 * @file Config.test.js
 * @description Unit tests for Config class functionality
 */

// Import the Config class using ES modules
import {Config} from '../../../src/config/Config.js';

describe('Config', () => {
    const originalWindow = global.window;

    afterEach(() => {
        global.window = originalWindow;
    });

    describe('getWebSocketConfig', () => {
        test('should return default config when no global config exists', () => {
            // Set up mock window without global config
            global.window = Object.create(originalWindow);
            Object.defineProperty(global.window, 'location', {
                value: {hostname: 'localhost', protocol: 'http:'},
                writable: true
            });
            global.window.WEBSOCKET_CONFIG = undefined;

            const config = Config.getWebSocketConfig();

            expect(config).toHaveProperty('host');
            expect(config).toHaveProperty('port');
        });

        test('should return global config when it exists', () => {
            // Set up mock window with global config
            global.window = Object.create(originalWindow);
            Object.defineProperty(global.window, 'location', {
                value: {hostname: 'localhost', protocol: 'http:'},
                writable: true
            });
            global.window.WEBSOCKET_CONFIG = {
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
            // Mock window with http protocol
            global.window = Object.create(originalWindow);
            Object.defineProperty(global.window, 'location', {
                value: {protocol: 'http:', hostname: 'localhost'},
                writable: true
            });
            global.window.WEBSOCKET_CONFIG = null;

            const url = Config.getWebSocketUrl();

            expect(url).toContain('ws://');
        });

        test('should return correct WebSocket URL for https', () => {
            // Mock window with https protocol
            global.window = Object.create(originalWindow);
            Object.defineProperty(global.window, 'location', {
                value: {protocol: 'https:', hostname: 'localhost'},
                writable: true
            });
            global.window.WEBSOCKET_CONFIG = null;

            const url = Config.getWebSocketUrl();

            expect(url).toContain('wss://');
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