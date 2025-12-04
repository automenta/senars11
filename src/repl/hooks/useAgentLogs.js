import {useCallback, useEffect, useState} from 'react';
import {v4 as uuidv4} from 'uuid';
import {FormattingUtils} from '../../util/FormattingUtils.js';
import {ActivityViewModel} from '../../ui/model/ActivityViewModel.js';

export const useAgentLogs = (engine, app) => {
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
        // Shared listeners (status, cycle)
        const handleStatus = (newStatus) => setStatus(prev => ({...prev, ...newStatus}));
        const handleCycleStep = (data) => setStatus(prev => ({
            ...prev,
            cycle: data.cycleAfter ?? data.cycle ?? 0
        }));
        const handleCycleRunning = () => setStatus(prev => ({...prev, isRunning: true}));
        const handleCycleStop = () => setStatus(prev => ({...prev, isRunning: false}));

        engine.on('status', handleStatus);
        engine.on('nar.cycle.step', handleCycleStep);
        engine.on('nar.cycle.running', handleCycleRunning);
        engine.on('nar.cycle.stop', handleCycleStop);

        // cleanup function for status listeners
        const cleanupStatus = () => {
            engine.off('status', handleStatus);
            engine.off('nar.cycle.step', handleCycleStep);
            engine.off('nar.cycle.running', handleCycleRunning);
            engine.off('nar.cycle.stop', handleCycleStop);
        };

        // Unified Log Handling via ActivityModel
        // TUI always requires app context for robust logging
        if (app?.activityModel) {
            const unsubscribeModel = app.activityModel.subscribe((event, data) => {
                if (event === 'add') {
                     const formatted = ActivityViewModel.format(data);
                     setLogs(prev => [...prev, formatted].slice(-50));
                } else if (event === 'clear') {
                     setLogs([]);
                }
            });

            return () => {
                cleanupStatus();
                unsubscribeModel();
            };
        } else {
            // Fallback for isolated engine testing without App context
            // Just listens to generic 'log' event
            const handleLog = (msg) => addLog(typeof msg === 'string' ? msg : JSON.stringify(msg), 'info');
            engine.on('log', handleLog);

            return () => {
                cleanupStatus();
                engine.off('log', handleLog);
            };
        }

    }, [engine, app, addLog]);

    return {logs, status, addLog, setLogs, updateLog};
};
