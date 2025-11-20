/**
 * Validation utilities for SeNARS UI implementations
 * Ensures data integrity and prevents runtime errors
 */

// Validate snapshot data structure
export function validateSnapshot(data) {
    if (!data) {
        console.warn('Snapshot validation: data is null or undefined');
        return {valid: false, error: 'Snapshot data is null or undefined', corrected: {nodes: [], edges: []}};
    }

    let nodes = data.nodes || [];
    let edges = data.edges || [];

    // Validate nodes
    if (!Array.isArray(nodes)) {
        console.warn('Snapshot validation: nodes is not an array, converting to empty array');
        nodes = [];
    } else {
        nodes = nodes.filter(node => node !== null && typeof node === 'object')
            .map(node => {
                if (typeof node !== 'object') return null;
                return {
                    id: node.id || 'unknown',
                    x: typeof node.x === 'number' ? node.x : Math.random() * 800,
                    y: typeof node.y === 'number' ? node.y : Math.random() * 600,
                    label: typeof node.label === 'string' ? node.label : (node.id || 'node'),
                    ...node
                };
            })
            .filter(Boolean);
    }

    // Validate edges
    if (!Array.isArray(edges)) {
        console.warn('Snapshot validation: edges is not an array, converting to empty array');
        edges = [];
    } else {
        edges = edges.filter(edge => edge !== null && typeof edge === 'object')
            .map(edge => {
                if (typeof edge !== 'object') return null;
                return {
                    id: edge.id || 'unknown',
                    source: edge.source || 'unknown',
                    target: edge.target || 'unknown',
                    sourceX: typeof edge.sourceX === 'number' ? edge.sourceX : 100,
                    sourceY: typeof edge.sourceY === 'number' ? edge.sourceY : 100,
                    targetX: typeof edge.targetX === 'number' ? edge.targetX : 200,
                    targetY: typeof edge.targetY === 'number' ? edge.targetY : 200,
                    ...edge
                };
            })
            .filter(Boolean);
    }

    return {
        valid: true,
        corrected: {nodes, edges}
    };
}

// Validate log entries
export function validateLogEntry(entry) {
    if (!entry || typeof entry !== 'object') {
        return {
            valid: false,
            corrected: {
                type: 'error',
                message: 'Invalid log entry',
                timestamp: Date.now()
            }
        };
    }

    const type = typeof entry.type === 'string' ? entry.type : 'message';
    const timestamp = typeof entry.timestamp === 'number' ? entry.timestamp : Date.now();
    const validTypes = ['command', 'status', 'error', 'response', 'message'];

    return {
        valid: true,
        corrected: {
            type: validTypes.includes(type) ? type : 'message',
            message: typeof entry.message === 'string' ? entry.message : (typeof entry.command === 'string' ? entry.command : JSON.stringify(entry)),
            timestamp,
            command: typeof entry.command === 'string' ? entry.command : undefined
        }
    };
}

// Validate WebSocket message
export function validateWebSocketMessage(msg) {
    if (!msg) {
        return {valid: false, error: 'Message is null or undefined'};
    }

    try {
        // If it's a string, parse it
        let parsedMsg = msg;
        if (typeof msg === 'string') {
            parsedMsg = JSON.parse(msg);
        }

        if (typeof parsedMsg !== 'object') {
            return {valid: false, error: 'Message is not an object'};
        }

        const type = parsedMsg.type;
        if (!type || typeof type !== 'string') {
            return {valid: false, error: 'Message type is required and must be a string'};
        }

        return {
            valid: true,
            corrected: parsedMsg
        };
    } catch (error) {
        return {valid: false, error: `Invalid JSON: ${error.message}`};
    }
}

// Validate NARS command
export function validateNARSCommand(command) {
    if (typeof command !== 'string' || !command.trim()) {
        return {
            valid: false,
            error: 'NARS command must be a non-empty string'
        };
    }

    // Basic NARS syntax validation (simplified)
    const trimmed = command.trim();

    // Should end with a punctuation character
    if (!/[.!?]$/.test(trimmed)) {
        return {
            valid: false,
            error: 'NARS command must end with . (belief), ! (goal), or ? (question)'
        };
    }

    return {
        valid: true,
        corrected: trimmed
    };
}

// Validate configuration object
export function validateConfig(config) {
    const defaultConfig = {
        wsUrl: 'ws://127.0.0.1:8080',
        maxLogEntries: 500,
        maxNodes: 1000,
        refreshInterval: 1000
    };

    if (!config || typeof config !== 'object') {
        return defaultConfig;
    }

    return {
        wsUrl: typeof config.wsUrl === 'string' ? config.wsUrl : defaultConfig.wsUrl,
        maxLogEntries: typeof config.maxLogEntries === 'number' ? Math.max(100, config.maxLogEntries) : defaultConfig.maxLogEntries,
        maxNodes: typeof config.maxNodes === 'number' ? Math.max(10, config.maxNodes) : defaultConfig.maxNodes,
        refreshInterval: typeof config.refreshInterval === 'number' ? Math.max(100, config.refreshInterval) : defaultConfig.refreshInterval
    };
}

// Safe JSON parsing with fallback
export function safeJsonParse(str, fallback = null) {
    try {
        return JSON.parse(str);
    } catch (error) {
        console.error('JSON parse error:', error.message, 'Input:', str);
        return fallback;
    }
}

// Safe function execution with error handling
export function safeExecute(fn, context = null, ...args) {
    try {
        if (typeof fn !== 'function') {
            throw new Error('Provided argument is not a function');
        }
        return fn.apply(context, args);
    } catch (error) {
        console.error('Function execution error:', error);
        return null;
    }
}

// Validate that required dependencies are available
export function checkDependencies() {
    const checks = {
        // Check if WebSocket is available
        webSocket: typeof WebSocket !== 'undefined',
        // Check if required global objects are available
        console: typeof console !== 'undefined',
        JSON: typeof JSON !== 'undefined',
        Array: typeof Array !== 'undefined',
        Object: typeof Object !== 'undefined',
        setTimeout: typeof setTimeout !== 'undefined'
    };

    const allValid = Object.values(checks).every(Boolean);

    return {
        valid: allValid,
        checks,
        message: allValid ? 'All required dependencies available' : 'Missing required dependencies'
    };
}