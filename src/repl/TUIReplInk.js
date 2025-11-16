import React, {useEffect, useState} from 'react';
import {Box, render, useInput} from 'ink';
import {ReplEngine} from './ReplEngine.js';
import {EventEmitter} from 'events';
import {LogViewer} from './ink-components/LogViewer.js';
import {StatusBar} from './ink-components/StatusBar.js';
import {TaskInput} from './ink-components/TaskInput.js';
import {v4 as uuidv4} from 'uuid';

/**
 * Simplified Narsese TUI Component for SeNARS
 * @param {Object} props - Component props
 * @param {Object} props.engine - ReplEngine instance
 * @returns {JSX.Element} React component
 */
const NarseseTUI = ({engine}) => {
    const [logs, setLogs] = useState([{id: uuidv4(), message: 'Narsese TUI initialized', timestamp: Date.now()}]);
    const [tasks, setTasks] = useState([]);
    const [status, setStatus] = useState({isRunning: false, cycle: 0, mode: 'idle'});

    /**
     * Handle log messages from engine
     * @param {string} message - Log message
     */
    const handleLog = (message) => {
        setLogs((prevLogs) => [
            ...prevLogs,
            {id: uuidv4(), message, timestamp: Date.now()}
        ].slice(-100)); // Keep only last 100 logs for performance
    };

    // Enhanced event handling to properly connect with the engine
    useEffect(() => {
        // Listen for NAR cycle events to update status
        const handleCycleStep = (data) => {
            setStatus(prev => ({...prev, cycle: data.cycleAfter ?? data.cycle ?? 0, mode: 'stepped'}));
        };

        const handleCycleRunning = () => {
            setStatus(prev => ({...prev, isRunning: true, mode: 'running'}));
        };

        const handleCycleStop = () => {
            setStatus(prev => ({...prev, isRunning: false, mode: 'idle'}));
        };

        // Listen for task-related events from the engine
        const handleNarseseProcessed = (data) => {
            // Only log success with derived tasks to avoid spam
            if (data.derivedTasks && data.derivedTasks.length > 0) {
                handleLog(`✅ Input processed successfully (${data.duration}ms) - ${data.derivedTasks.length} derived tasks`);
            }
            // Update tasks from the input manager
            const allTasks = engine.inputManager.getAllTasks();
            setTasks(allTasks);
        };

        const handleNarseseError = (data) => {
            handleLog(`❌ Error: ${data.error}`);
        };

        // Register all event listeners
        engine.on('log', handleLog);
        //engine.on('status', handleStatus);
        engine.on('nar.cycle.step', handleCycleStep);
        engine.on('nar.cycle.running', handleCycleRunning);
        engine.on('nar.cycle.stop', handleCycleStop);
        engine.on('narsese.processed', handleNarseseProcessed);
        engine.on('narsese.error', handleNarseseError);

        // Initialize tasks from input manager
        const initialTasks = engine.inputManager.getAllTasks();
        setTasks(initialTasks);

        return () => {
            engine.off('log', handleLog);
            //engine.off('status', handleStatus);
            engine.off('nar.cycle.step', handleCycleStep);
            engine.off('nar.cycle.running', handleCycleRunning);
            engine.off('nar.cycle.stop', handleCycleStop);
            engine.off('narsese.processed', handleNarseseProcessed);
            engine.off('narsese.error', handleNarseseError);
        };
    }, [engine]);

    // Handle keyboard shortcuts and commands
    useInput((input, key) => {
        // Handle Enter key to run one cycle when input is empty (for stepping)
        if (key.return && input === '') {
            // When the input field is empty and user presses Enter, run a single cycle
            engine._next?.().catch(error => {
                handleLog(`❌ Cycle error: ${error.message}`);
            });
        }
    });

    /**
     * Handle extended commands
     * @param {string} input - User input string
     * @returns {Promise<boolean>} True if command was handled, false otherwise
     */
    const handleExtendedCommand = async (input) => {
        if (input.startsWith('/')) {
            const [cmdName, ...args] = input.slice(1).split(' ');

            // Handle specific commands
            switch (cmdName.toLowerCase()) {
                case 'n':
                case 'step':
                    engine.nar?.step?.();
                    handleLog('⏭️ Single step executed');
                    return true;
                case 'run':
                case 'go':
                    engine.nar?.run?.();
                    handleLog('🏃 Run started');
                    return true;
                case 'stop':
                    engine.nar?.stop?.();
                    handleLog('🛑 Run stopped');
                    return true;
                case 'reset':
                    engine.nar?.reset?.();
                    handleLog('🔄 NAR reset');
                    return true;
                case 'help':
                    handleLog('📚 Commands: /n (step), /run (run continuously), /stop, /reset, /help');
                    return true;
                default:
                    handleLog(`⚠️ Unknown command: ${cmdName}. Use /help for available commands.`);
                    return true;
            }
        }
        return false;
    };

    return React.createElement(
        Box,
        {flexDirection: 'column', width: '100%', height: '100%'},
        // Log Viewer - Main content area
        React.createElement(
            Box,
            {flexDirection: 'column', flexGrow: 1, paddingX: 1, paddingY: 1},
            React.createElement(LogViewer, {logs})
        ),
        // Input and Status area
        React.createElement(
            Box,
            {flexDirection: 'column', width: '100%'},
            // Task Input
            React.createElement(TaskInput, {
                onSubmit: async (input) => {
                    // Try to handle as extended command first
                    if (!await handleExtendedCommand(input)) {
                        // If not a command, process as normal Narsese input
                        try {
                            await engine.processInput(input);
                            // Refresh tasks after processing
                            setTasks(engine.inputManager.getAllTasks());
                        } catch (error) {
                            setLogs(prev => [
                                ...prev,
                                {id: uuidv4(), message: `❌ Processing Error: ${error.message}`, timestamp: Date.now()}
                            ].slice(-100));
                        }
                    }
                },
            }),
            // Status Bar
            React.createElement(StatusBar, {
                status: {
                    ...status,
                    taskCount: tasks.length,
                    logCount: logs.length,
                    alerts: logs.filter(log => /Error|❌/.test(log.message)).length
                }
            })
        )
    );
};

/**
 * Simplified Narsese REPL using Ink
 */
export class TUIReplInk extends EventEmitter {
    constructor(config = {}) {
        super();
        this.engine = new ReplEngine(config.engine || {});
        this.isReady = false;
    }

    /**
     * Start the Narsese REPL
     * @returns {Promise<void>}
     */
    async start() {
        console.log('🤖 Starting Narsese REPL (Narsese input only)...');

        try {
            await this.engine.initialize();
            this.isReady = true;

            // Connect to engine events before rendering
            this.engine.on('engine.ready', () => {
                console.log('✅ Narsese TUI connected to engine');
            });

            // Render the simplified TUI
            render(React.createElement(NarseseTUI, {engine: this.engine}));
        } catch (error) {
            console.error('❌ Failed to start Narsese TUI:', error);
            throw error;
        }
    }

    /**
     * Get the current engine instance
     * @returns {ReplEngine} The engine instance
     */
    getEngine() {
        return this.engine;
    }

    /**
     * Check if the TUI is ready
     * @returns {boolean} True if TUI is ready, false otherwise
     */
    isReady() {
        return this.isReady;
    }

    /**
     * Shutdown the TUI and clean up resources
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.isReady = false;
        if (this.engine) {
            await this.engine.shutdown();
        }
    }
}