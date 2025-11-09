import React, { useState, useEffect, useMemo } from 'react';
import { render, Box, useStdin, Text, useInput } from 'ink';
import { ReplEngine } from './ReplEngine.js';
import { EventEmitter } from 'events';
import { TaskEditor } from './ink-components/TaskEditor.js';
import { LogViewer } from './ink-components/LogViewer.js';
import { StatusBar } from './ink-components/StatusBar.js';
import { TaskInput } from './ink-components/TaskInput.js';
import { v4 as uuidv4 } from 'uuid';
import { PluginManager } from './utils/PluginManager.js';
import { ThemeManager } from './utils/ThemeManager.js';
import { CommandManager } from './utils/CommandManager.js';

class ExtensibleTUI {
  constructor() {
    this.pluginManager = new PluginManager();
    this.themeManager = new ThemeManager();
    this.commandManager = new CommandManager();
    this.componentRegistry = this.pluginManager.getComponentRegistry();
    this.customComponents = {};
  }

  // Register a custom component
  registerComponent(name, component) {
    this.customComponents[name] = component;
  }

  // Get a component (custom or registered)
  getComponent(name) {
    // First check custom components
    if (this.customComponents[name]) {
      return this.customComponents[name];
    }
    
    // Then check registered components
    const registered = this.componentRegistry.getComponent(name);
    return registered ? registered.component : null;
  }

  // Apply theme to component props
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

const TUI = ({ engine, extensibleTUI }) => {
  const [logs, setLogs] = useState([{ id: uuidv4(), message: 'TUI component rendered' }]);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState({ isRunning: false, cycle: 0, mode: 'idle' });
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const { isRawModeSupported } = useStdin();
  
  // Initialize extensible TUI if not provided
  const extensible = useMemo(() => extensibleTUI || new ExtensibleTUI(), []);

  // Enhanced event handling to properly connect with the engine
  useEffect(() => {
    const handleLog = (message) => {
      setLogs((prevLogs) => [...prevLogs, { id: uuidv4(), message, timestamp: Date.now() }]);
    };

    const handleStatus = (newStatus) => {
      setStatus(newStatus);
    };

    // Listen for NAR cycle events to update status
    const handleCycleStep = (data) => {
      setStatus(prev => ({ ...prev, cycle: data.cycle, mode: 'stepped' }));
    };

    const handleCycleRunning = () => {
      setStatus(prev => ({ ...prev, isRunning: true, mode: 'running' }));
    };

    const handleCycleStop = () => {
      setStatus(prev => ({ ...prev, isRunning: false, mode: 'idle' }));
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
      engine._next().then(result => {
        // Only show meaningful results, avoid spammy cycle messages
        if (result && !result.includes('Single cycle executed')) {
          setLogs(prev => [...prev, { id: uuidv4(), message: result, timestamp: Date.now() }]);
        }
      });
    }
    
    // Handle command shortcuts
    if (key.ctrl && input === '\\') {
      // Execute a special command (for debugging or special operations)
      console.log("Command shortcut triggered");
    }
  });

  // Convert engine tasks to compatible format for UI
  const convertEngineTasksToUIFormat = (engineTasks) => {
    return engineTasks.map(task => ({
      id: task.id,
      content: task.task,
      priority: task.priority,
      timestamp: task.timestamp,
      metadata: task.metadata,
      processed: task.metadata?.processed || false,
      pending: task.metadata?.pending || false,
      error: task.metadata?.error || false
    }));
  };

  const uiTasks = convertEngineTasksToUIFormat(tasks);

  // Handle task operations
  const handleTaskOperation = (operation, taskId, data) => {
    switch(operation) {
      case 'delete':
        engine.inputManager.removeTaskById(taskId);
        setTasks(engine.inputManager.getAllTasks());
        break;
      case 'edit':
        const oldTask = engine.inputManager.getTaskById(taskId);
        if (oldTask) {
          engine.inputManager.editInputWithRecreate(taskId, data.newContent);
          setTasks(engine.inputManager.getAllTasks());
        }
        break;
      case 'adjust-priority':
        engine.inputManager.updatePriorityById(taskId, data.newPriority, data.mode || 'direct');
        setTasks(engine.inputManager.getAllTasks());
        break;
    }
  };

  // Handle extended commands
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
          setLogs(prev => [...prev, { id: uuidv4(), message: result, timestamp: Date.now() }]);
        }
      } catch (error) {
        setLogs(prev => [...prev, { id: uuidv4(), message: `Error: ${error.message}`, timestamp: Date.now() }]);
      }
      return true;
    }
    return false;
  };

  // Render based on current view using extensible architecture
    // Render only log viewer as the main content area - single interactive REPL view
  const renderMainContent = () => {
    // Get components from the extensible architecture - use provided components or defaults
    const ComponentLogViewer = extensible.getComponent('LogViewer');

    // Apply theme to components
    const logViewerProps = extensible.applyTheme('logViewer', { logs });

    // Render only the log viewer as the main content area
    return React.createElement(
      Box,
      { flexDirection: 'column', flexGrow: 1 },
      React.createElement(ComponentLogViewer || LogViewer, logViewerProps)
    );
  };

  // Get themed components - use provided components or defaults
  const ComponentTaskInput = extensible.getComponent('TaskInput');
  const ComponentStatusBar = extensible.getComponent('StatusBar');
  
  const taskInputProps = extensible.applyTheme('taskInput', {});
  const statusBarProps = extensible.applyTheme('statusBar', {
    status: {
      ...status,
      view: 'log-only',  // Fixed view mode since we removed multiple view modes
      taskCount: uiTasks.length,
      logCount: logs.length,
      alerts: logs.filter(log => log.message.includes('Error')).length
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column', width: '100%', height: '100%' },
    renderMainContent(),
    React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(ComponentTaskInput || TaskInput, {
        ...taskInputProps,
        onSubmit: async (input) => {
          // Try to handle as extended command first
          if (!await handleExtendedCommand(input)) {
            // If not a command, process as normal input
            engine.processInput(input).then(() => {
              // Refresh tasks after processing
              setTasks(engine.inputManager.getAllTasks());
            });
          }
        },
      }),
      React.createElement(ComponentStatusBar || StatusBar, statusBarProps)
    )
  );
};

export class TUIReplInk extends EventEmitter {
  constructor(config = {}) {
    super();
    this.engine = new ReplEngine(config);
    this.extensibleTUI = new ExtensibleTUI();
    this.view = 'vertical-split';
  }

  // Register a custom component
  registerComponent(name, component) {
    this.extensibleTUI.registerComponent(name, component);
    return this;
  }

  // Get the component registry for plugins
  getComponentRegistry() {
    return this.extensibleTUI.componentRegistry;
  }

  // Get the plugin manager
  getPluginManager() {
    return this.extensibleTUI.pluginManager;
  }

  // Get the theme manager
  getThemeManager() {
    return this.extensibleTUI.themeManager;
  }

  // Get the command manager
  getCommandManager() {
    return this.extensibleTUI.commandManager;
  }

  // Load a plugin
  async loadPlugin(plugin, name, options = {}) {
    await this.extensibleTUI.pluginManager.loadPlugin(plugin, name, options);
    return this;
  }

  // Apply a theme
  applyTheme(themeName) {
    this.extensibleTUI.themeManager.applyTheme(themeName);
    return this;
  }

  // Register a command
  registerCommand(name, handler, metadata = {}) {
    this.extensibleTUI.commandManager.registerCommand(name, handler, metadata);
    return this;
  }

  async start() {
    console.log('Starting Extensible Ink TUI...');

    await this.engine.initialize();

    // Connect to engine events before rendering
    this.engine.on('engine.ready', () => {
      console.log('✅ Extensible Ink TUI connected to engine');
    });

    // Register default commands
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
          return `Theme ${themeName} not found`;
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

    // Render with extensible TUI context
    render(React.createElement(TUI, { engine: this.engine, extensibleTUI: this.extensibleTUI }));
  }
}