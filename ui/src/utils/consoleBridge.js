import useUiStore from '../stores/uiStore.js';

const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
};

const formatArgs = (args) => args.map(arg =>
    typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg)
);

const getLogMetadata = () => ({
    url: typeof window !== 'undefined' ? window.location.href : 'N/A',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
});

let cachedWsService = null;

// Update the cached WebSocket service when the store changes
const updateWsServiceCache = () => {
    try {
        if (typeof useUiStore.getState === 'function') {
            const state = useUiStore.getState();
            cachedWsService = state?.wsService || null;
        }
    } catch (error) {
        // If store isn't ready yet, keep the existing cached value
    }
};

// Subscribe to store updates to maintain cache
try {
    if (typeof useUiStore.subscribe === 'function') {
        useUiStore.subscribe(updateWsServiceCache);
        updateWsServiceCache(); // Initialize cache
    }
} catch (error) {
    console.debug('Could not subscribe to store in console bridge:', error.message);
}

const sendLogToWebSocket = (currentWsService, level, args) => {
    // Prefer the cached WebSocket service, fall back to direct access if needed
    const wsServiceToUse = currentWsService || cachedWsService;
    
    // Check if the wsServiceToUse exists and has the expected structure
    if (!wsServiceToUse || !wsServiceToUse.sendMessage) return;

    try {
        const message = {
            type: 'log',
            level,
            data: formatArgs(args),
            timestamp: Date.now(),
            meta: getLogMetadata()
        };

        wsServiceToUse.sendMessage(message);
    } catch (error) {
        originalConsole.error('Failed to send console log to WebSocket:', error);
    }
};

const createLogSender = (level) => (...args) => {
    originalConsole[level](...args);
    try {
        // Use the cached WebSocket service to avoid store access during console calls
        sendLogToWebSocket(null, level, args);
    } catch (error) {
        // If there's an issue sending the log, just continue with regular console logging
        originalConsole.warn('Could not send console log via WebSocket:', error.message);
    }
};

const initConsoleBridge = () => {
    Object.keys(originalConsole).forEach(level => {
        console[level] = createLogSender(level);
    });
};

initConsoleBridge();

export const restoreOriginalConsole = () => {
    Object.keys(originalConsole).forEach(level => {
        console[level] = originalConsole[level];
    });
};

export const setConsoleBridge = (ws) => {
    // The console bridge is already initialized, but we can ensure it has access to the WebSocket
    // This function is provided for compatibility with the App.js requirement
    console.debug('Console bridge initialized with WebSocket');
};

export const getConsoleBridgeService = () => useUiStore.getState().wsService;