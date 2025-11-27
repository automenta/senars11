import {useCallback, useEffect, useState} from 'react';
import {v4 as uuidv4} from 'uuid';
import {FormattingUtils} from '../../util/FormattingUtils.js';

export const useAgentLogs = (engine) => {
    const [logs, setLogs] = useState([{
        id: uuidv4(),
        message: '🤖 Agent TUI initialized',
        timestamp: Date.now(),
        type: 'info'
    }]);

    const [status, setStatus] = useState({isRunning: false, cycle: 0});

    // Add log message with color coding, avoiding duplicates
    const addLog = useCallback((message, type = 'info') => {
        setLogs(prevLogs => {
            // Check if the exact same message already exists recently (last 2 entries)
            const isDuplicate = prevLogs.slice(-2).some(log =>
                log.message === message && log.type === type
            );

            if (isDuplicate) {
                return prevLogs; // Don't add duplicate
            }

            return [
                ...prevLogs,
                {id: uuidv4(), message, timestamp: Date.now(), type}
            ].slice(-50); // Keep max 50 logs in memory for performance
        });
    }, []);

    const updateLog = useCallback((id, message, type) => {
        setLogs(prevLogs => prevLogs.map(log =>
            log.id === id
                ? {...log, message, type: type || log.type}
                : log
        ));
    }, []);

    useEffect(() => {
        const handleLog = (message) => {
            // If message is a string, use it directly
            if (typeof message === 'string') {
                addLog(message, 'info');
            }
            // If it's an object, try to extract meaningful content
            else if (typeof message === 'object') {
                // Check if it's an event object with message content
                if (message.message) {
                    // It's an event object with a message property
                    addLog(message.message, 'info');
                } else if (message.content) {
                    // It's an event object with a content property
                    addLog(message.content, 'info');
                } else if (message.task) {
                    // It might be a task-focused event
                    try {
                        const formattedTask = FormattingUtils.formatTask(message.task);
                        addLog(formattedTask, 'info');
                    } catch (e) {
                        addLog(JSON.stringify(message), 'info');
                    }
                } else if (message.hasOwnProperty('0') && typeof message[0] === 'string') {
                    // It might be a string represented as an indexed object (e.g., {"0":"H","1":"i","2":"!"})
                    // But it could also contain event metadata, so we need to be careful
                    try {
                        // Get all numeric keys in order to reconstruct the string
                        const numericKeys = Object.keys(message)
                            .filter(key => /^\d+$/.test(key))
                            .sort((a, b) => parseInt(a) - parseInt(b));

                        if (numericKeys.length > 0) {
                            // Reconstruct the string from indexed values
                            const stringParts = numericKeys.map(key => message[key]);
                            const reconstructedString = stringParts.join('');

                            // Only use the reconstructed string if it's not just metadata
                            addLog(reconstructedString, 'info');
                        } else {
                            // No numeric keys found, stringify the object
                            addLog(JSON.stringify(message), 'info');
                        }
                    } catch (e) {
                        addLog(JSON.stringify(message), 'info');
                    }
                } else {
                    // Default to stringifying the whole object
                    addLog(JSON.stringify(message), 'info');
                }
            }
            // For other types (number, boolean, etc.), convert to string
            else {
                addLog(String(message), 'info');
            }
        };

        const handleStatus = (newStatus) => setStatus(prev => ({...prev, ...newStatus}));
        const handleCycleStep = (data) => setStatus(prev => ({
            ...prev,
            cycle: data.cycleAfter ?? data.cycle ?? 0
        }));
        const handleCycleRunning = () => setStatus(prev => ({...prev, isRunning: true}));
        const handleCycleStop = () => setStatus(prev => ({...prev, isRunning: false}));

        const handleTaskFocused = (data) => {
            if (typeof data === 'object') {
                const task = data.task || data;
                if (task && typeof task === 'object') {
                    try {
                        const formattedTask = FormattingUtils.formatTask(task);
                        addLog(`📝 FOCUSED: ${formattedTask}`, 'info');
                    } catch (e) {
                        addLog(`📝 FOCUSED: ${JSON.stringify(task)}`, 'info');
                    }
                } else {
                    addLog(`📝 FOCUSED: ${JSON.stringify(data)}`, 'info');
                }
            } else if (typeof data === 'string') {
                addLog(`📝 FOCUSED: ${data}`, 'info');
            } else {
                addLog(`📝 FOCUSED: ${JSON.stringify(data)}`, 'info');
            }
        };

        const handleGenericAgentEvent = (prefix, data) =>
            addLog(`${prefix}: ${typeof data === 'object' ? (data.action ?? data.decision ?? data.description ?? JSON.stringify(data)) : String(data)} ${typeof data === 'object' && data.details ? `- ${data.details}` : ''}`, 'agent');

        const handlers = {
            'log': handleLog,
            'status': handleStatus,
            'nar.cycle.step': handleCycleStep,
            'nar.cycle.running': handleCycleRunning,
            'nar.cycle.stop': handleCycleStop,
            'task.focus': handleTaskFocused,
            'narsese.error': (data) => addLog(`❌ Error: ${typeof data === 'object' && data.error ? data.error : (typeof data === 'string' ? data : JSON.stringify(data))}`, 'error'),
            'command.error': (data) => addLog(`❌ Command Error: ${typeof data === 'object' && data.error ? data.error : (typeof data === 'string' ? data : JSON.stringify(data))}`, 'error'),
            'agent.action': (data) => handleGenericAgentEvent('🤖 AGENT ACTION', data),
            'agent.decision': (data) => handleGenericAgentEvent('🧠 AGENT DECISION', data),
            'hybrid.reasoning': (data) => handleGenericAgentEvent('🔗 HYBRID REASONING', data)
        };

        Object.entries(handlers).forEach(([event, handler]) => engine.on(event, handler));

        return () => {
            Object.entries(handlers).forEach(([event, handler]) => engine.off(event, handler));
        };
    }, [engine, addLog]);

    return {logs, status, addLog, setLogs, updateLog};
};
