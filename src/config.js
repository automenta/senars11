/**
 * Centralized configuration module for SeNARS application
 * Shared between UI, scripts, and server components
 */

// Default configuration values
const DEFAULT_CONFIG = Object.freeze({
    // WebSocket configuration
    webSocket: {
        port: parseInt(process.env.WS_PORT) || 8080,
        host: process.env.WS_HOST || 'localhost',
        path: process.env.WS_PATH || '/ws',
        maxConnections: 20
    },
    
    // UI configuration
    ui: {
        port: parseInt(process.env.PORT) || 5173,
        host: process.env.UI_HOST || 'localhost',
        defaultPath: '/'
    },
    
    // Demo configuration
    demo: {
        defaultPort: 5174,
        defaultWsPort: 8083
    },
    
    // Persistence configuration
    persistence: {
        defaultPath: './agent.json',
        backupPath: './agent.json.bak'
    },
    
    // Performance configuration
    performance: {
        defaultTimeout: 30000,  // 30 seconds
        heartbeatInterval: 30000,  // 30 seconds
        heartbeatTimeout: 15000,   // 15 seconds
        reconnectInterval: 5000,   // 5 seconds
        maxReconnectAttempts: 10
    },
    
    // Test configuration
    test: {
        timeout: 60000,  // 60 seconds
        verbose: false,
        coverage: false,
        watch: false
    }
});

/**
 * Get configuration with environment-based overrides
 */
function getConfig() {
    return {
        webSocket: {
            port: parseInt(process.env.WS_PORT) || DEFAULT_CONFIG.webSocket.port,
            host: process.env.WS_HOST || DEFAULT_CONFIG.webSocket.host,
            path: process.env.WS_PATH || DEFAULT_CONFIG.webSocket.path,
            maxConnections: DEFAULT_CONFIG.webSocket.maxConnections
        },
        ui: {
            port: parseInt(process.env.PORT) || DEFAULT_CONFIG.ui.port,
            host: process.env.UI_HOST || DEFAULT_CONFIG.ui.host,
            defaultPath: DEFAULT_CONFIG.ui.defaultPath
        },
        demo: {
            defaultPort: DEFAULT_CONFIG.demo.defaultPort,
            defaultWsPort: DEFAULT_CONFIG.demo.defaultWsPort
        },
        persistence: {
            defaultPath: DEFAULT_CONFIG.persistence.defaultPath,
            backupPath: DEFAULT_CONFIG.persistence.backupPath
        },
        performance: {
            defaultTimeout: DEFAULT_CONFIG.performance.defaultTimeout,
            heartbeatInterval: DEFAULT_CONFIG.performance.heartbeatInterval,
            heartbeatTimeout: DEFAULT_CONFIG.performance.heartbeatTimeout,
            reconnectInterval: DEFAULT_CONFIG.performance.reconnectInterval,
            maxReconnectAttempts: DEFAULT_CONFIG.performance.maxReconnectAttempts
        },
        test: {
            timeout: DEFAULT_CONFIG.test.timeout,
            verbose: DEFAULT_CONFIG.test.verbose,
            coverage: DEFAULT_CONFIG.test.coverage,
            watch: DEFAULT_CONFIG.test.watch
        }
    };
}

/**
 * Get WebSocket URL string based on current configuration
 */
function getWebSocketUrl(config = getConfig()) {
    return `ws://${config.webSocket.host}:${config.webSocket.port}${config.webSocket.path}`;
}

/**
 * Get UI URL string based on current configuration
 */
function getUiUrl(config = getConfig()) {
    return `http://${config.ui.host}:${config.ui.port}`;
}

/**
 * Get demo URL string based on current configuration
 */
function getDemoUrl(config = getConfig()) {
    return `http://${config.ui.host}:${config.demo.defaultPort}`;
}

// Export configuration
const config = getConfig();

export {
    config,
    getConfig,
    getWebSocketUrl,
    getUiUrl,
    getDemoUrl,
    DEFAULT_CONFIG
};

export default config;