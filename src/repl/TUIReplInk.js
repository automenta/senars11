import React, { useState, useEffect } from 'react';
import { render, Box, useStdin } from 'ink';
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
  const { isRawModeSupported } = useStdin();

  useEffect(() => {
    const handleLog = (message) => {
      setLogs((prevLogs) => [...prevLogs, { id: uuidv4(), message }]);
    };

    const handleStatus = (newStatus) => {
      setStatus(newStatus);
    };

    const handleTasks = (newTasks) => {
      setTasks(newTasks);
    };

    engine.on('log', handleLog);
    engine.on('status', handleStatus);
    engine.on('tasks', handleTasks);

    return () => {
      engine.off('log', handleLog);
      engine.off('status', handleStatus);
      engine.off('tasks', handleTasks);
    };
  }, [engine]);

  return React.createElement(
    Box,
    { flexDirection: 'column', width: '100%', height: '100%' },
    React.createElement(
      Box,
      { flexGrow: 1 },
      isRawModeSupported && React.createElement(
        Box,
        { width: '40%', borderStyle: 'round' },
        React.createElement(TaskEditor, { tasks, onSelect: () => {} })
      ),
      React.createElement(
        Box,
        { width: isRawModeSupported ? '60%' : '100%', borderStyle: 'round' },
        React.createElement(LogViewer, { logs })
      )
    ),
    isRawModeSupported && React.createElement(TaskInput, {
      onSubmit: (input) => engine.processInput(input),
    }),
    React.createElement(StatusBar, { status })
  );
};

export class TUIReplInk extends EventEmitter {
  constructor(config = {}) {
    super();
    this.engine = new ReplEngine(config);
  }

  async start() {
    console.log('Starting Ink TUI...');

    await this.engine.initialize();

    render(React.createElement(TUI, { engine: this.engine }));
  }
}
