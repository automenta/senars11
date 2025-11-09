import React, {useEffect, useMemo, useState} from 'react';
import {Box, render, useInput, useStdin} from 'ink';
import {ReplEngine} from './ReplEngine.js';
import {EventEmitter} from 'events';
import {LogViewer} from './ink-components/LogViewer.js';
import {StatusBar} from './ink-components/StatusBar.js';
import {TaskInput} from './ink-components/TaskInput.js';
import {v4 as uuidv4} from 'uuid';
import {PluginManager} from './utils/PluginManager.js';
import {ThemeManager} from './utils/ThemeManager.js';
import {CommandManager} from './utils/CommandManager.js';

/**
 * ExtensibleTUI - Manages plugins, themes, commands, and component registry for the TUI
 */
class ExtensibleTUI {
    constructor(config = {}) {
        this.config = config;
        this.pluginManager = new PluginManager();
        this.themeManager = new ThemeManager();
        this.commandManager = new CommandManager();
        this.componentRegistry = this.pluginManager.getComponentRegistry();
        this.customComponents = {};

        // Initialize configuration
        this._initConfig();
    }

    /**
     * Initialize configuration settings
     * @private
     */
    _initConfig() {
        if (this.config.theme) {
            this.themeManager.applyTheme(this.config.theme);
        }
    }

    /**
     * Register a custom component
     * @param {string} name - Component name
     * @param {Function} component - React component
     */
    registerComponent(name, component) {
        this.customComponents[name] = component;
    }

    /**
     * Get a component (custom or registered)
     * @param {string} name - Component name
     * @returns {Function|null} Component function or null if not found
     */
    getComponent(name) {
        // First check custom components
        if (this.customComponents[name]) {
            return this.customComponents[name];
        }

        // Then check registered components
        const registered = this.componentRegistry.getComponent(name);
        return registered ? registered.component : null;
    }

    /**
     * Apply theme to component props
     * @param {string} componentName - Component name
     * @param {Object} props - Component props
     * @returns {Object} Updated props with theme applied
     */
    applyTheme(componentName, props = {}) {
        const theme = this.themeManager.getCurrentTheme();
        const componentConfig = theme.components[componentName] || {};
        const styles = theme.styles[componentName] || {};

        return {
            ...props,
            theme: theme,
            customStyles: styles,
            ...componentConfig
        };
    }
}

/**
 * Main TUI Component for SeNARS
 * @param {Object} props - Component props
 * @param {Object} props.engine - ReplEngine instance
 * @param {ExtensibleTUI} props.extensibleTUI - Extensible TUI instance
 * @param {Object} props.config - Configuration object
 * @returns {JSX.Element} React component
 */
const TUI = ({engine, extensibleTUI, config = {}}) => {
    const [logs, setLogs] = useState([{id: uuidv4(), message: 'TUI component rendered'}]);
    const [tasks, setTasks] = useState([]);
    const [status, setStatus] = useState({isRunning: false, cycle: 0, mode: 'idle'});
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [commandHistory, setCommandHistory] = useState([]);
    const {isRawModeSupported} = useStdin();

    // Initialize extensible TUI if not provided
    const extensible = useMemo(() => extensibleTUI || new ExtensibleTUI(config.ui || {}), []);

    /**
     * Handle log messages from engine
     * @param {string} message - Log message
     */
    const handleLog = (message) => {
        setLogs((prevLogs) => [...prevLogs, {id: uuidv4(), message, timestamp: Date.now()}]);
    };

    /**
     * Handle status updates from engine
     * @param {Object} newStatus - New status object
     */
    const handleStatus = (newStatus) => {
        setStatus(newStatus);
    };

    // Enhanced event handling to properly connect with the engine
    useEffect(() => {
        // Listen for NAR cycle events to update status
        const handleCycleStep = (data) => {
            setStatus(prev => ({...prev, cycle: data.cycle, mode: 'stepped'}));
        };

        const handleCycleRunning = () => {
            setStatus(prev => ({...prev, isRunning: true, mode: 'running'}));
        };

        const handleCycleStop = () => {
            setStatus(prev => ({...prev, isRunning: false, mode: 'idle'}));
        };

        // Listen for task-related events from the engine
        const handleNarseseProcessed = (data) => {
            // Only log success with derived tasks to avoid spam for duplicate detection
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
        engine.on('status', handleStatus);
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
            engine.off('status', handleStatus);
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
            // engine._next().then(result => {
            //     // Only show meaningful results, avoid spammy cycle messages
            //     if (result && !result.includes('Single cycle executed')) {
            //         setLogs(prev => [...prev, {id: uuidv4(), message: result, timestamp: Date.now()}]);
            //     }
            // });
        }

        // Handle command shortcuts
        if (key.ctrl && input === '\\') {
            // Execute a special command (for debugging or special operations)
            console.log("Command shortcut triggered");
        }
    });

    /**
     * Convert engine tasks to compatible format for UI
     * @param {Array} engineTasks - Array of engine tasks
     * @returns {Array} Formatted tasks for UI display
     */
    const convertEngineTasksToUIFormat = (engineTasks) => {
        return engineTasks?.map?.(task => ({
            id: task.id,
            content: task.task,
            priority: task.priority,
            timestamp: task.timestamp,
            metadata: task.metadata,
            processed: task.metadata?.processed ?? false,
            pending: task.metadata?.pending ?? false,
            error: task.metadata?.error ?? false
        })) ?? [];
    };

    const uiTasks = convertEngineTasksToUIFormat(tasks);

    /**
     * Handle task operations (delete, edit, adjust priority)
     * @param {string} operation - Operation type
     * @param {string} taskId - Task ID
     * @param {Object} data - Additional data for the operation
     */
    const handleTaskOperation = (operation, taskId, data) => {
        const operations = {
            'delete': () => {
                engine.inputManager.removeTaskById(taskId);
                setTasks(engine.inputManager.getAllTasks());
            },
            'edit': () => {
                const oldTask = engine.inputManager.getTaskById(taskId);
                if (oldTask) {
                    engine.inputManager.editInputWithRecreate(taskId, data?.newContent);
                    setTasks(engine.inputManager.getAllTasks());
                }
            },
            'adjust-priority': () => {
                engine.inputManager.updatePriorityById(taskId, data?.newPriority, data?.mode ?? 'direct');
                setTasks(engine.inputManager.getAllTasks());
            }
        };

        const operationFn = operations[operation];
        if (operationFn) {
            operationFn();
        } else {
            console.warn(`Unknown task operation: ${operation}`);
        }
    };

    /**
     * Handle extended commands
     * @param {string} input - User input string
     * @returns {Promise<boolean>} True if command was handled, false otherwise
     */
    const handleExtendedCommand = async (input) => {
        if (input.startsWith('/')) {
            const [cmdName, ...args] = input.slice(1).split(' ');
            try {
                const result = await extensible.commandManager.executeCommand(cmdName, args, {
                    engine,
                    setLogs,
                    setTasks,
                    setStatus
                });
                if (result) {
                    setLogs(prev => [...prev, {id: uuidv4(), message: result, timestamp: Date.now()}]);
                }
            } catch (error) {
                setLogs(prev => [...prev, {
                    id: uuidv4(),
                    message: `❌ Command Error: ${error.message}`,
                    timestamp: Date.now()
                }]);
            }
            return true;
        }
        return false;
    };

    /**
     * Render main content area with extensible architecture
     * @returns {React.Element} Main content component
     */
    const renderMainContent = () => {
        // Get components from the extensible architecture - use provided components or defaults
        const ComponentLogViewer = extensible.getComponent('LogViewer') || LogViewer;

        // Apply theme to components
        const logViewerProps = extensible.applyTheme('logViewer', {
            logs,
            maxScrollback: config.ui?.logViewer?.maxScrollback,
            showTimestamp: config.ui?.logViewer?.showTimestamp,
            defaultFilter: config.ui?.logViewer?.defaultFilter
        });

        // Render only the log viewer as the main content area
        return React.createElement(
            Box,
            {flexDirection: 'column', flexGrow: 1},
            React.createElement(ComponentLogViewer, logViewerProps)
        );
    };

    // Get themed components - use provided components or defaults
    const ComponentTaskInput = extensible.getComponent('TaskInput') || TaskInput;
    const ComponentStatusBar = extensible.getComponent('StatusBar') || StatusBar;

    const taskInputProps = extensible.applyTheme('taskInput', {});
    const statusBarProps = extensible.applyTheme('statusBar', {
        status: {
            ...status,
            view: 'log-only',  // Fixed view mode since we removed multiple view modes
            taskCount: uiTasks.length,
            logCount: logs.length,
            alerts: logs.filter(log => /Error|❌/.test(log.message)).length
        }
    });

    return React.createElement(
        Box,
        {flexDirection: 'column', width: '100%', height: '100%'},
        renderMainContent(),
        React.createElement(
            Box,
            {flexDirection: 'column'},
            React.createElement(ComponentTaskInput, {
                ...taskInputProps,
                onSubmit: async (input) => {
                    // Try to handle as extended command first
                    if (!await handleExtendedCommand(input)) {
                        // If not a command, process as normal input
                        try {
                            await engine.processInput(input);
                            // Refresh tasks after processing
                            setTasks(engine.inputManager.getAllTasks());
                        } catch (error) {
                            setLogs(prev => [...prev, {
                                id: uuidv4(),
                                message: `❌ Processing Error: ${error.message}`,
                                timestamp: Date.now()
                            }]);
                        }
                    }
                },
            }),
            React.createElement(ComponentStatusBar, {
                ...statusBarProps,
                showViewInfo: config.ui?.statusBar?.showViewInfo,
                showTaskCount: config.ui?.statusBar?.showTaskCount,
                showLogCount: config.ui?.statusBar?.showLogCount,
                showAlerts: config.ui?.statusBar?.showAlerts
            })
        )
    );
};

/**
 * Extensible Ink-based TUI REPL for SeNARS
 */
export class TUIReplInk extends EventEmitter {
    /**
     * Create a new TUIReplInk instance
     * @param {Object} config - Configuration object
     * @param {Object} config.engine - Engine configuration
     * @param {string} config.theme - Initial theme name
     * @param {Object} config.ui - UI-specific configuration
     */
    constructor(config = {}) {
        super();
        this.config = this._mergeDefaultConfig(config);
        this.engine = new ReplEngine(this.config.engine || {});
        this.extensibleTUI = new ExtensibleTUI(this.config.ui || {});
        this.view = this.config.ui?.defaultView || 'vertical-split';
        this.isReady = false;
    }

    /**
     * Merge user configuration with default configuration
     * @param {Object} userConfig - User-provided configuration
     * @returns {Object} Merged configuration
     * @private
     */
    _mergeDefaultConfig(userConfig) {
        const defaultConfig = {
            engine: {},
            ui: {
                defaultView: 'vertical-split',
                theme: 'default',
                logViewer: {
                    maxScrollback: 1000,
                    showTimestamp: true,
                    defaultFilter: 'all'
                },
                statusBar: {
                    showViewInfo: true,
                    showTaskCount: true,
                    showLogCount: true,
                    showAlerts: true
                }
            },
            notebook: {
                autoSave: true,
                exportFormats: ['json', 'markdown', 'text'],
                maxHistory: 500
            }
        };

        return this._deepMerge(defaultConfig, userConfig);
    }

    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     * @private
     */
    _deepMerge(target, source) {
        const output = {...target};

        for (const key in source) {
            if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = this._deepMerge(output[key] || {}, source[key]);
            } else {
                output[key] = source[key];
            }
        }

        return output;
    }

    /**
     * Register a custom component
     * @param {string} name - Component name
     * @param {Function} component - React component
     * @returns {TUIReplInk} Current instance for chaining
     */
    registerComponent(name, component) {
        this.extensibleTUI.registerComponent(name, component);
        return this;
    }

    /**
     * Get the component registry for plugins
     * @returns {ComponentRegistry} Component registry
     */
    getComponentRegistry() {
        return this.extensibleTUI.componentRegistry;
    }

    /**
     * Get the plugin manager
     * @returns {PluginManager} Plugin manager instance
     */
    getPluginManager() {
        return this.extensibleTUI.pluginManager;
    }

    /**
     * Get the theme manager
     * @returns {ThemeManager} Theme manager instance
     */
    getThemeManager() {
        return this.extensibleTUI.themeManager;
    }

    /**
     * Get the command manager
     * @returns {CommandManager} Command manager instance
     */
    getCommandManager() {
        return this.extensibleTUI.commandManager;
    }

    /**
     * Load a plugin
     * @param {Object} plugin - Plugin object with install method
     * @param {string} name - Plugin name
     * @param {Object} options - Plugin options
     * @returns {Promise<TUIReplInk>} Promise resolving to current instance for chaining
     */
    async loadPlugin(plugin, name, options = {}) {
        await this.extensibleTUI.pluginManager.loadPlugin(plugin, name, options);
        return this;
    }

    /**
     * Apply a theme
     * @param {string} themeName - Theme name
     * @returns {TUIReplInk} Current instance for chaining
     */
    applyTheme(themeName) {
        this.extensibleTUI.themeManager.applyTheme(themeName);
        return this;
    }

    /**
     * Register a command
     * @param {string} name - Command name
     * @param {Function} handler - Command handler function
     * @param {Object} metadata - Command metadata
     * @returns {TUIReplInk} Current instance for chaining
     */
    registerCommand(name, handler, metadata = {}) {
        this.extensibleTUI.commandManager.registerCommand(name, handler, metadata);
        return this;
    }

    /**
     * Start the TUI REPL
     * @returns {Promise<void>}
     */
    async start() {
        console.log('Starting Extensible Ink TUI...');

        try {
            await this.engine.initialize();
            this.isReady = true;

            // Connect to engine events before rendering
            this.engine.on('engine.ready', () => {
                console.log('✅ Extensible Ink TUI connected to engine');
            });

            // Register default commands
            this._registerDefaultCommands();

            // Render with extensible TUI context
            render(React.createElement(TUI, {
                engine: this.engine,
                extensibleTUI: this.extensibleTUI,
                config: this.config
            }));
        } catch (error) {
            console.error('❌ Failed to start TUI:', error);
            throw error;
        }
    }

    /**
     * Register default commands for the TUI
     * @private
     */
    _registerDefaultCommands() {
        this.registerCommand('n', (args, context) => {
            this.engine.nar.step();
        }, {
            description: 'Execute cycle',
            usage: '/n',
            category: 'system'
        });

        this.registerCommand('help', (args, context) => {
            return this.extensibleTUI.commandManager.getAllHelp();
        }, {
            description: 'Show help for all commands',
            usage: '/help',
            category: 'system'
        });

        this.registerCommand('theme', (args, context) => {
            if (args.length > 0) {
                const themeName = args[0];
                if (this.extensibleTUI.themeManager.applyTheme(themeName)) {
                    return `Theme changed to: ${themeName}`;
                } else {
                    return `❌ Theme ${themeName} not found`;
                }
            }
            return `Current theme: ${this.extensibleTUI.themeManager.getCurrentTheme().name}`;
        }, {
            description: 'Change UI theme',
            usage: '/theme [theme-name]',
            category: 'ui'
        });

        this.registerCommand('plugins', (args, context) => {
            const plugins = this.extensibleTUI.pluginManager.getAllPlugins();
            if (plugins.length === 0) {
                return 'No plugins loaded';
            }
            return `Loaded plugins: ${plugins.map(p => p.name).join(', ')}`;
        }, {
            description: 'Show loaded plugins',
            usage: '/plugins',
            category: 'system'
        });

        this.registerCommand('notebook', async (args, context) => {
            const format = args[0] || 'json';
            const title = args.slice(1).join(' ') || 'SeNARS Session';

            try {
                if (this.engine && typeof this.engine.captureNotebook === 'function') {
                    const notebook = await this.engine.captureNotebook(format, title);
                    return `📝 Notebook generated in ${format} format:\n\n${notebook}`;
                } else {
                    return '❌ Notebook functionality not available';
                }
            } catch (error) {
                console.error('Notebook generation error:', error);
                return `❌ Error generating notebook: ${error.message}`;
            }
        }, {
            description: 'Generate a session notebook report',
            usage: '/notebook [format] [title]',
            category: 'report'
        });
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