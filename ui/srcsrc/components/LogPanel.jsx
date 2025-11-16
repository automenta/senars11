import React from 'react';
import useNarStore from '../store/nar-store';
import LogEntry from './LogEntry';

const LogPanel = () => {
    const { logEntries } = useNarStore();

    return (
        <div className="log-panel">
            {logEntries.map((entry, index) => (
                <LogEntry key={index} entry={entry} />
            ))}
        </div>
    );
};

export default LogPanel;
