/**
 * App Configuration - Centralized parameter management
 */
const AppConfig = {
    // WebSocket settings
    websocket: {
        defaultPort: 8080,
        defaultHost: '0.0.0.0',
        defaultPath: '/ws',
        reconnectDelay: 3000,
        maxReconnectAttempts: 10,
        connectionTimeout: 10000
    },
    
    // UI settings
    ui: {
        maxLogEntries: 1000,
        batchProcessingInterval: 150,
        maxGraphNodes: 5000,
        maxGraphEdges: 10000,
        uiUpdateInterval: 1000
    },
    
    // Graph settings
    graph: {
        nodeShapes: {
            concept: 'ellipse',
            task: 'rectangle',
            belief: 'triangle',
            input_task: 'diamond',
            processed_task: 'ellipse',
            question: 'pentagon',
            derivation: 'hexagon',
            reasoning_step: 'star'
        },
        nodeColors: {
            concept: '#3399FF',
            task: '#FF6B6B',
            belief: '#6BCF7F',
            input_task: '#FFD93D',
            processed_task: '#A0A0A0',
            question: '#9B59B6',
            derivation: '#E67E22',
            reasoning_step: '#1ABC9C'
        },
        layout: {
            name: 'cose',
            animate: false,
            fit: true,
            padding: 30
        }
    },
    
    // Validation settings
    validation: {
        enableMessageValidation: true,
        strictValidation: false
    },
    
    // Logging settings
    logging: {
        level: 'info', // 'debug', 'info', 'warn', 'error'
        enableConsoleLogging: true
    }
};

export default AppConfig;