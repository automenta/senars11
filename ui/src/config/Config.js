/**
 * Configuration module for SeNARS UI
 */
export class Config {
  static getWebSocketConfig() {
    // Get WebSocket configuration from the injected global variable
    if (typeof window.WEBSOCKET_CONFIG !== 'undefined') {
      return {
        host: window.WEBSOCKET_CONFIG.host || window.location.hostname || 'localhost',
        port: window.WEBSOCKET_CONFIG.port || '8081'
      };
    }

    // Fallback to default configuration
    return {
      host: window.location.hostname || 'localhost',
      port: '8081'
    };
  }

  static getWebSocketUrl() {
    const wsConfig = this.getWebSocketConfig();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${wsConfig.host}:${wsConfig.port}`;
  }

  static getGraphStyle() {
    return [
      {
        selector: 'node',
        style: {
          'background-color': '#4ec9b0',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#ffffff',
          'font-size': '12px',
          'width': 'mapData(weight, 0, 100, 20, 80)',
          'height': 'mapData(weight, 0, 100, 20, 80)'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#dcdcdc',
          'target-arrow-color': '#dcdcdc',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      },
      {
        selector: 'node[type = "concept"]',
        style: {
          'background-color': '#4ec9b0'
        }
      },
      {
        selector: 'node[type = "task"]',
        style: {
          'background-color': '#ff8c00'
        }
      },
      {
        selector: 'node[type = "question"]',
        style: {
          'background-color': '#9d68f0'
        }
      }
    ];
  }

  static getGraphLayout() {
    return { name: 'cose' };
  }

  static getConstants() {
    return {
      RECONNECT_DELAY: 3000,
      MAX_HISTORY_SIZE: 100,
      NOTIFICATION_DURATION: 5000,
      DEMO_DELAY: 1500
    };
  }
}