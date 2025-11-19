import { Logger } from '../../src/logging/Logger.js';

describe('Logger', () => {
  let logger;
  let mockUIElements;

  beforeEach(() => {
    // Create mock UI elements
    const mockLogsContainer = document.createElement('div');
    mockLogsContainer.id = 'logs-container';
    
    mockUIElements = {
      logsContainer: mockLogsContainer
    };

    logger = new Logger(mockUIElements);
  });

  test('should create log entry with correct structure', () => {
    logger.addLogEntry('Test message', 'info', 'ℹ️');

    const logEntries = mockUIElements.logsContainer.querySelectorAll('.log-entry');
    expect(logEntries).toHaveLength(1);
    
    const logEntry = logEntries[0];
    expect(logEntry).toHaveClass('type-info');
  });

  test('should set UI elements correctly', () => {
    const newUIElements = { logsContainer: document.createElement('div') };
    logger.setUIElements(newUIElements);
    
    expect(logger.uiElements).toBe(newUIElements);
  });

  test('should use default icon when none provided', () => {
    // Temporarily store original icons
    const originalIcons = { ...logger.icons };
    
    logger.addLogEntry('Test message', 'unknown_type');
    
    const logEntries = mockUIElements.logsContainer.querySelectorAll('.log-entry');
    expect(logEntries[0].querySelector('.log-entry-icon').textContent).toBe('ℹ️');
    
    // Restore original icons
    logger.icons = originalIcons;
  });
});