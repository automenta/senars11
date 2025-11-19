/**
 * Logger module to handle all log message formatting and display
 */
export class Logger {
  constructor(uiElements = null) {
    this.uiElements = uiElements;
    this.messageCounter = 1;
    this.icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      debug: '🔍',
      input: '⌨️',
      task: '📥',
      concept: '🧠',
      question: '❓',
      reasoning: '🔍',
      connection: '🌐',
      snapshot: '📊',
      control: '⚙️',
      notification: '🔔',
      command: '📜',
      demo: '🎬',
      refresh: '🔄',
      clear: '🧹',
      eventBatch: '📦'
    };
  }

  /**
   * Set UI elements reference for DOM operations
   */
  setUIElements(uiElements) {
    this.uiElements = uiElements;
  }

  /**
   * Add a log entry to the container
   */
  addLogEntry(content, type = 'info', icon = null) {
    if (!icon) {
      icon = this.icons[type] || this.icons.info;
    }

    // Create log entry elements
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry type-${type}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'log-entry-icon';
    iconSpan.textContent = icon;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'log-entry-content';
    contentDiv.textContent = content;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-entry-time';
    timeSpan.textContent = new Date().toLocaleTimeString();
    timeSpan.id = `time-${this.messageCounter}`;

    logEntry.appendChild(iconSpan);
    logEntry.appendChild(contentDiv);
    logEntry.appendChild(timeSpan);

    // Add to container if available
    if (this.uiElements?.logsContainer) {
      this.uiElements.logsContainer.appendChild(logEntry);
      // Auto-scroll to bottom
      this.uiElements.logsContainer.scrollTop = this.uiElements.logsContainer.scrollHeight;
    }

    this.messageCounter++;
    return logEntry;
  }

  /**
   * Log a message using the addLogEntry method
   */
  log(content, type = 'info', icon = null) {
    this.addLogEntry(content, type, icon);
  }

  /**
   * Show a notification message
   */
  showNotification(message, type = 'info') {
    const container = this.uiElements?.notificationContainer || document.getElementById('notification-container');
    if (!container) {
      // If no container, just log to console
      console[type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log'](message);
      return;
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        container.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Clear all log entries
   */
  clearLogs() {
    if (this.uiElements?.logsContainer) {
      this.uiElements.logsContainer.innerHTML = '';
      this.log('Cleared logs', 'info', '🧹');
    }
  }
}