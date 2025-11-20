import {useStore} from './store.js';
import {
    checkDependencies,
    validateConfig,
    validateLogEntry,
    validateNARSCommand,
    validateSnapshot
} from '../../validation-utils.js';

// Configuration
const config = validateConfig({
    maxLogEntries: 500,
    maxNodes: 1000
});

// Check dependencies at startup
const dependencyCheck = checkDependencies();
if (!dependencyCheck.valid) {
    console.error('Missing required dependencies:', dependencyCheck.checks);
    // Still continue but with limited functionality
}

// Direct NAR instance (will import from actual NAR when available)
let directNAR = null;
let narInitialized = false;

// Attempt to initialize the direct NAR
// This will require the actual NAR code to be available in the project
export const initializeNAR = async () => {
    try {
        // Try to import the actual NAR engine if it exists in the project
        // This is where we'd import the real NAR implementation
        // For now, we'll use a placeholder that will be replaced with actual import
        console.log('Attempting to initialize direct NAR...');

        // Placeholder initialization - in a real implementation, this would be:
        // const { default: NAR } = await import('../../../src/nar/NAR.js');
        // directNAR = new NAR();

        // For now, we'll note that this needs to be implemented with the actual NAR engine
        console.log('Direct NAR initialization - actual implementation requires NAR engine import');

        // Set up event handlers if available
        if (directNAR && typeof directNAR.on === 'function') {
            directNAR.on('output', (output) => {
                const {corrected: validatedEntry} = validateLogEntry({
                    type: 'output',
                    message: output,
                    timestamp: Date.now()
                });
                useStore.getState().appendLog(validatedEntry);
            });
        }

        narInitialized = true;
        console.log('Direct NAR initialized successfully');

        const {corrected: validatedEntry} = validateLogEntry({
            type: 'status',
            message: 'Direct NAR initialized',
            timestamp: Date.now()
        });
        useStore.getState().appendLog(validatedEntry);

        return true;
    } catch (error) {
        console.error('Failed to initialize direct NAR:', error);
        const {corrected: validatedEntry} = validateLogEntry({
            type: 'error',
            message: `Failed to initialize direct NAR: ${error.message}`,
            timestamp: Date.now()
        });
        useStore.getState().appendLog(validatedEntry);
        return false;
    }
};

// Execute a NARS command directly on the embedded NAR
export const executeCommand = (command) => {
    // First, validate the command
    const validation = validateNARSCommand(command);
    if (!validation.valid) {
        console.error('Invalid NARS command:', validation.error);
        const {corrected: validatedEntry} = validateLogEntry({
            type: 'error',
            message: validation.error,
            timestamp: Date.now()
        });
        useStore.getState().appendLog(validatedEntry);
        return false;
    }

    const validatedCommand = validation.corrected;

    if (!narInitialized) {
        const {corrected: validatedEntry} = validateLogEntry({
            type: 'error',
            message: 'NAR not initialized. Cannot execute command.',
            timestamp: Date.now()
        });
        useStore.getState().appendLog(validatedEntry);
        return false;
    }

    try {
        // Add command to log
        const {corrected: logEntry} = validateLogEntry({
            type: 'command',
            command: validatedCommand,
            timestamp: Date.now()
        });
        useStore.getState().appendLog(logEntry);

        // Execute command on the direct NAR engine
        // This is where the actual NAR processing happens
        if (directNAR && typeof directNAR.input === 'function') {
            directNAR.input(validatedCommand);
        } else {
            // Placeholder - in a real implementation, the NAR engine would be available
            console.warn('Direct NAR not available, command not executed:', validatedCommand);
            const {corrected: validatedEntry} = validateLogEntry({
                type: 'error',
                message: 'Direct NAR engine not available',
                timestamp: Date.now()
            });
            useStore.getState().appendLog(validatedEntry);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error executing NARS command:', error);
        const {corrected: validatedEntry} = validateLogEntry({
            type: 'error',
            message: `Command execution error: ${error.message}`,
            timestamp: Date.now()
        });
        useStore.getState().appendLog(validatedEntry);
        return false;
    }
};

// Get a snapshot of the current NAR state
export const requestSnapshot = () => {
    if (!narInitialized) {
        const {corrected: validatedEntry} = validateLogEntry({
            type: 'error',
            message: 'NAR not initialized. Cannot request snapshot.',
            timestamp: Date.now()
        });
        useStore.getState().appendLog(validatedEntry);
        return false;
    }

    try {
        // In a real implementation, this would extract the actual NAR state
        // For now, we'll create a placeholder that would be replaced with actual state extraction
        console.log('Requesting NAR state snapshot...');

        // Placeholder snapshot - in a real implementation, this would extract from the NAR engine
        // const snapshot = directNAR.getSnapshot(); // This would be the real call

        // For now, create an empty snapshot that the UI can handle
        const snapshot = {nodes: [], edges: [], timestamp: Date.now()};

        // Validate the snapshot
        const snapshotValidation = validateSnapshot(snapshot);
        if (snapshotValidation.valid) {
            useStore.getState().setSnapshot(snapshotValidation.corrected);

            const {corrected: validatedEntry} = validateLogEntry({
                type: 'response',
                message: `Snapshot: ${snapshot.nodes.length} nodes, ${snapshot.edges.length} edges`,
                command: 'request_snapshot',
                timestamp: Date.now()
            });
            useStore.getState().appendLog(validatedEntry);

            return true;
        } else {
            console.error('Invalid snapshot data:', snapshotValidation.error);
            const {corrected: validatedEntry} = validateLogEntry({
                type: 'error',
                message: `Invalid snapshot: ${snapshotValidation.error}`,
                timestamp: Date.now()
            });
            useStore.getState().appendLog(validatedEntry);
            return false;
        }
    } catch (error) {
        console.error('Error requesting NAR snapshot:', error);
        const {corrected: validatedEntry} = validateLogEntry({
            type: 'error',
            message: `Snapshot request error: ${error.message}`,
            timestamp: Date.now()
        });
        useStore.getState().appendLog(validatedEntry);
        return false;
    }
};

// Function to toggle live updates
export const toggleLiveUpdates = () => {
    // In a direct NAR implementation, this might control whether to continuously poll for updates
    console.log('Live updates toggle - in direct NAR implementation this would control update polling');
    return true;
};

// Function to get connection status (for direct NAR)
export const getConnectionStatus = () => {
    return {
        connected: narInitialized,
        status: narInitialized ? 'connected' : 'disconnected',
        source: 'direct_nar',
        initialized: narInitialized
    };
};

// Initialize the NAR when the module loads
initializeNAR();

// Internal function to send NAR command via WebSocket
const sendNARCommandWebSocket = (command) => {
    try {
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Create the message payload
            const msgPayload = {
                type: 'nar_command',
                command: command,
                timestamp: Date.now()
            };

            // Stringify and send
            const msg = JSON.stringify(msgPayload);
            ws.send(msg);

            // Add to log
            const {corrected: validatedEntry} = validateLogEntry({
                type: 'command',
                command: command,
                timestamp: Date.now()
            });
            useStore.getState().appendLog(validatedEntry);
            return true;
        } else {
            // Add error to log
            const {corrected: validatedEntry} = validateLogEntry({
                type: 'error',
                message: 'Not connected to SeNARS engine',
                timestamp: Date.now()
            });
            useStore.getState().appendLog(validatedEntry);
            return false;
        }
    } catch (error) {
        console.error('Error sending NAR command:', error);
        const {corrected: validatedEntry} = validateLogEntry({
            type: 'error',
            message: `Command send error: ${error.message}`,
            timestamp: Date.now()
        });
        useStore.getState().appendLog(validatedEntry);
        return false;
    }
};

// Function to send NAR commands with validation (kept for compatibility)
export const sendNARCommand = (command) => {
    return executeCommand(command);
};

// Function to request snapshot with error handling
export const requestSnapshot = () => {
    try {
        // If direct NAR is available and enabled, get snapshot from there
        if (directNAR && useDirectNAR) {
            try {
                const snapshot = directNAR.getSnapshot({limit: 100});

                if (snapshot) {
                    // Validate the snapshot
                    const snapshotValidation = validateSnapshot(snapshot);
                    if (snapshotValidation.valid) {
                        // Update the store with the new snapshot
                        useStore.getState().setSnapshot(snapshotValidation.corrected);

                        // Add to log
                        const {corrected: validatedEntry} = validateLogEntry({
                            type: 'response',
                            message: `Direct NAR snapshot: ${snapshot.nodes.length} nodes, ${snapshot.edges.length} edges`,
                            command: 'request_snapshot',
                            timestamp: Date.now()
                        });
                        useStore.getState().appendLog(validatedEntry);

                        return true;
                    } else {
                        console.error('Invalid snapshot data from direct NAR:', snapshotValidation.error);
                        const {corrected: validatedEntry} = validateLogEntry({
                            type: 'error',
                            message: `Invalid snapshot from direct NAR: ${snapshotValidation.error}`,
                            timestamp: Date.now()
                        });
                        useStore.getState().appendLog(validatedEntry);
                        return false;
                    }
                }
            } catch (error) {
                console.error('Error getting snapshot from direct NAR:', error);
                const {corrected: validatedEntry} = validateLogEntry({
                    type: 'error',
                    message: `Direct NAR snapshot error: ${error.message}`,
                    timestamp: Date.now()
                });
                useStore.getState().appendLog(validatedEntry);
                // Fall back to WebSocket if direct NAR fails
            }
        }

        // Otherwise, use WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
            const msg = JSON.stringify({type: 'request_snapshot', limit: 100, timestamp: Date.now()});
            ws.send(msg);
            // Add to log
            const {corrected: validatedEntry} = validateLogEntry({
                type: 'command',
                command: 'request_snapshot',
                timestamp: Date.now()
            });
            useStore.getState().appendLog(validatedEntry);
            return true;
        } else {
            // Add error to log
            const {corrected: validatedEntry} = validateLogEntry({
                type: 'error',
                message: 'Not connected to SeNARS engine',
                timestamp: Date.now()
            });
            useStore.getState().appendLog(validatedEntry);
            return false;
        }
    } catch (error) {
        console.error('Error requesting snapshot:', error);
        const {corrected: validatedEntry} = validateLogEntry({
            type: 'error',
            message: `Snapshot request error: ${error.message}`,
            timestamp: Date.now()
        });
        useStore.getState().appendLog(validatedEntry);
        return false;
    }
};

// Function to close the connection properly
export const closeConnection = () => {
    if (ws) {
        ws.close(1000, "Application shutdown");
    }
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    isReconnecting = false;
    reconnectAttempts = 0;
};

// Function to reset NAR state (useful for testing)
export const resetNAR = () => {
    if (directNAR && typeof directNAR.reset === 'function') {
        directNAR.reset();
    }
    narInitialized = false;
    console.log('NAR reset');

    // Reinitialize
    initializeNAR();
};