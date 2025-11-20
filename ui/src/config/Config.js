/**
 * Configuration module for SeNARS UI
 */
export class Config {
  static get WEBSOCKET_CONFIG() {
    return {
      RECONNECT_DELAY: 3000,
      MAX_RECONNECT_ATTEMPTS: 10,
      DEFAULT_PORT: '8081',
      PROTOCOL_MAP: {
        'https:': 'wss:',
        'http:': 'ws:'
      }
    };
  }

  static get UI_CONSTANTS() {
    return {
      MAX_HISTORY_SIZE: 100,
      NOTIFICATION_DURATION: 5000,
      DEMO_DELAY: 1500,
      MESSAGE_BATCH_SIZE: 100
    };
  }

  static get GRAPH_CONSTANTS() {
    return {
      DEFAULT_NODE_WEIGHT: 50,
      TASK_NODE_WEIGHT: 30,
      QUESTION_NODE_WEIGHT: 40
    };
  }

  static get ELEMENT_IDS() {
    return {
      STATUS_INDICATOR: 'status-indicator',
      CONNECTION_STATUS: 'connection-status',
      MESSAGE_COUNT: 'message-count',
      LOGS_CONTAINER: 'logs-container',
      COMMAND_INPUT: 'command-input',
      SEND_BUTTON: 'send-button',
      QUICK_COMMANDS: 'quick-commands',
      EXEC_QUICK: 'exec-quick',
      SHOW_HISTORY: 'show-history',
      CLEAR_LOGS: 'clear-logs',
      REFRESH_GRAPH: 'refresh-graph',
      TOGGLE_LIVE: 'toggle-live',
      DEMO_SELECT: 'demo-select',
      RUN_DEMO: 'run-demo',
      GRAPH_DETAILS: 'graph-details',
      GRAPH_CONTAINER: 'graph-container',
      NOTIFICATION_CONTAINER: 'notification-container'
    };
  }

  static getWebSocketConfig() {
    // Get WebSocket configuration from the injected global variable
    const wsConfig = window.WEBSOCKET_CONFIG;
    return {
      host: wsConfig?.host || window.location.hostname || 'localhost',
      port: wsConfig?.port || this.WEBSOCKET_CONFIG.DEFAULT_PORT
    };
  }

  static getWebSocketUrl() {
    const wsConfig = this.getWebSocketConfig();
    const protocol = this.WEBSOCKET_CONFIG.PROTOCOL_MAP[window.location.protocol] || 'ws:';
    return `${protocol}//${wsConfig.host}:${wsConfig.port}`;
  }

  static getGraphStyle() {
    const { CONCEPT_COLOR, TASK_COLOR, QUESTION_COLOR, EDGE_COLOR, NODE_COLOR } = this.GRAPH_COLORS;

    return [
      {
        selector: 'node',
        style: {
          'background-color': NODE_COLOR,
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
          'line-color': EDGE_COLOR,
          'target-arrow-color': EDGE_COLOR,
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      },
      {
        selector: 'node[type = "concept"]',
        style: {
          'background-color': CONCEPT_COLOR
        }
      },
      {
        selector: 'node[type = "task"]',
        style: {
          'background-color': TASK_COLOR
        }
      },
      {
        selector: 'node[type = "question"]',
        style: {
          'background-color': QUESTION_COLOR
        }
      }
    ];
  }

  static get GRAPH_COLORS() {
    return {
      NODE_COLOR: '#4ec9b0',
      CONCEPT_COLOR: '#4ec9b0',
      TASK_COLOR: '#ff8c00',
      QUESTION_COLOR: '#9d68f0',
      EDGE_COLOR: '#dcdcdc'
    };
  }

  static getGraphLayout() {
    return { name: 'cose' };
  }

  static getConstants() {
    return {
      // WebSocket-related constants
      RECONNECT_DELAY: this.WEBSOCKET_CONFIG.RECONNECT_DELAY,
      MAX_RECONNECT_ATTEMPTS: this.WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS,

      // History and UI constants
      MAX_HISTORY_SIZE: this.UI_CONSTANTS.MAX_HISTORY_SIZE,
      NOTIFICATION_DURATION: this.UI_CONSTANTS.NOTIFICATION_DURATION,
      DEMO_DELAY: this.UI_CONSTANTS.DEMO_DELAY,

      // Graph-related constants
      DEFAULT_NODE_WEIGHT: this.GRAPH_CONSTANTS.DEFAULT_NODE_WEIGHT,
      TASK_NODE_WEIGHT: this.GRAPH_CONSTANTS.TASK_NODE_WEIGHT,
      QUESTION_NODE_WEIGHT: this.GRAPH_CONSTANTS.QUESTION_NODE_WEIGHT,

      // Message processing
      MESSAGE_BATCH_SIZE: this.UI_CONSTANTS.MESSAGE_BATCH_SIZE,

      // DOM element IDs (for consistency)
      ELEMENT_IDS: this.ELEMENT_IDS
    };
  }
}