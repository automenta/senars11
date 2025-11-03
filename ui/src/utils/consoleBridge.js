// Console bridge to forward logs to WebSocket server
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

const sendLogToWebSocket = (currentWsService, level, args) => {
    // Check if the currentWsService exists and has the expected structure
    if (!currentWsService || !currentWsService.sendMessage) return;

    try {
        const message = {
            type: 'log',
            level,
            data: formatArgs(args),
            timestamp: Date.now(),
            meta: getLogMetadata()
        };

        currentWsService.sendMessage(message);
    } catch (error) {
        originalConsole.error('Failed to send console log to WebSocket:', error);
    }
};

const createLogSender = (level) => (...args) => {
    originalConsole[level](...args);
    const currentWsService = useUiStore.getState().wsService;
    sendLogToWebSocket(currentWsService, level, args);
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
    console.log('Console bridge initialized with WebSocket');
};

export const getConsoleBridgeService = () => useUiStore.getState().wsService;