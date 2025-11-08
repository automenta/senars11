import React, { useState, useEffect } from 'react';
import { render, Box, useStdin, Text, useInput } from 'ink';
import { ReplEngine } from './ReplEngine.js';
import { EventEmitter } from 'events';
import { TaskEditor } from './ink-components/TaskEditor.js';
import { LogViewer } from './ink-components/LogViewer.js';
import { StatusBar } from './ink-components/StatusBar.js';
import { TaskInput } from './ink-components/TaskInput.js';
import { v4 as uuidv4 } from 'uuid';

const TUI = ({ engine }) => {
  const [logs, setLogs] = useState([{ id: uuidv4(), message: 'TUI component rendered' }]);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState({ isRunning: false, cycle: 0, mode: 'idle' });
  const [view, setView] = useState('vertical-split'); // 'vertical-split', 'log-only', 'dynamic-grouping'
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const { isRawModeSupported } = useStdin();

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
      handleLog(`✅ Input processed successfully (${data.duration}ms)`);
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

  // Handle keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl) {
      switch (input) {
        case 'l':
        case 'L':
          setView('log-only');
          break;
        case 't':
        case 'T':
          setView('vertical-split');
          break;
        case 'g':
        case 'G':
          setView('dynamic-grouping');
          break;
        case 'c':
        case 'C':
          // Exit on Ctrl+C - This doesn't work directly in Ink, but we handle it in the parent
          break;
      }
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

  // Render based on current view
  const renderMainContent = () => {
    switch(view) {
      case 'log-only':
        return React.createElement(
          Box,
          { flexDirection: 'column', flexGrow: 1 },
          React.createElement(LogViewer, { logs })
        );
      
      case 'dynamic-grouping':
        return React.createElement(
          Box,
          { flexDirection: 'row', flexGrow: 1 },
          React.createElement(
            Box,
            { width: '70%', borderStyle: 'round' },
            React.createElement(TaskEditor, { 
              tasks: uiTasks,
              onSelect: setSelectedTaskId,
              selectedTaskId,
              onTaskOperation: handleTaskOperation,
              groupingMode: 'priority' // Default grouping mode
            })
          ),
          React.createElement(
            Box,
            { width: '30%', borderStyle: 'round' },
            React.createElement(LogViewer, { logs })
          )
        );
      
      case 'vertical-split':
      default:
        return React.createElement(
          Box,
          { flexDirection: 'row', flexGrow: 1 },
          React.createElement(
            Box,
            { width: '40%', borderStyle: 'round' },
            React.createElement(TaskEditor, { 
              tasks: uiTasks,
              onSelect: setSelectedTaskId,
              selectedTaskId,
              onTaskOperation: handleTaskOperation
            })
          ),
          React.createElement(
            Box,
            { width: '60%', borderStyle: 'round' },
            React.createElement(LogViewer, { logs })
          )
        );
    }
  };

  return React.createElement(
    Box,
    { flexDirection: 'column', width: '100%', height: '100%' },
    renderMainContent(),
    React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(TaskInput, {
        onSubmit: (input) => {
          engine.processInput(input).then(() => {
            // Refresh tasks after processing
            setTasks(engine.inputManager.getAllTasks());
          });
        },
      }),
      React.createElement(StatusBar, { 
        status: { 
          ...status, 
          view, 
          taskCount: uiTasks.length,
          logCount: logs.length,
          alerts: logs.filter(log => log.message.includes('Error')).length
        } 
      })
    )
  );
};

export class TUIReplInk extends EventEmitter {
  constructor(config = {}) {
    super();
    this.engine = new ReplEngine(config);
    this.view = 'vertical-split';
  }

  async start() {
    console.log('Starting Enhanced Ink TUI...');

    await this.engine.initialize();

    // Connect to engine events before rendering
    this.engine.on('engine.ready', () => {
      console.log('✅ Ink TUI connected to engine');
    });

    render(React.createElement(TUI, { engine: this.engine }));
  }
}
