/**
 * @file Logger.test.js
 * @description Unit tests for Logger class functionality
 */

import {Logger} from '../../../src/logging/Logger.js';

describe('Logger', () => {
    let logger;
    let mockUIElements;

    beforeEach(() => {
        // Create real DOM elements
        const mockLogsContainer = document.createElement('div');
        mockLogsContainer.id = 'logs-container';

        const mockNotificationContainer = document.createElement('div');
        mockNotificationContainer.id = 'notification-container';

        mockUIElements = {
            logsContainer: mockLogsContainer,
            notificationContainer: mockNotificationContainer
        };

        logger = new Logger(mockUIElements);
    });

    test('should create log entry with correct structure', () => {
        logger.addLogEntry('Test message', 'info');

        const logEntry = mockUIElements.logsContainer.querySelector('.log-entry');
        expect(logEntry).toBeTruthy();
        expect(logEntry.classList.contains('type-info')).toBe(true);
        expect(logEntry.querySelector('.log-entry-content').textContent).toBe('Test message');
        expect(logEntry.querySelector('.log-entry-icon')).toBeTruthy();
    });

    test('should clear logs and add cleared message', () => {
        logger.addLogEntry('Existing message', 'info');
        expect(mockUIElements.logsContainer.querySelectorAll('.log-entry')).toHaveLength(1);

        logger.clearLogs();

        const logEntries = mockUIElements.logsContainer.querySelectorAll('.log-entry');
        expect(logEntries).toHaveLength(1);
        expect(logEntries[0].querySelector('.log-entry-content').textContent).toBe('Cleared logs');
    });

    test('should set UI elements correctly', () => {
        const newUIElements = {logsContainer: document.createElement('div')};
        logger.setUIElements(newUIElements);

        expect(logger.uiElements).toBe(newUIElements);
    });

    test('should handle notification display', () => {
        logger.showNotification('Test notification', 'info');

        const notification = mockUIElements.notificationContainer.querySelector('.notification');
        expect(notification).toBeTruthy();
        expect(notification.textContent).toBe('Test notification');
        expect(notification.classList.contains('notification-info')).toBe(true);
    });

    test('should use provided icon when available', () => {
        logger.addLogEntry('Test message', 'info', '🎯');

        const logIcon = mockUIElements.logsContainer.querySelector('.log-entry-icon');
        expect(logIcon.textContent).toBe('🎯');
    });

    test('should use type-based icon when no custom icon provided', () => {
        logger.addLogEntry('Test message', 'error');

        const logIcon = mockUIElements.logsContainer.querySelector('.log-entry-icon');
        expect(logIcon.textContent).toBeTruthy(); // Should have some error icon defined
    });
});