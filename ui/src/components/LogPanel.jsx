import React from 'react';
import PropTypes from 'prop-types';
import { LogEntry } from './LogEntry';

export const LogPanel = ({ entries }) => {
  return (
    <div className="log-panel">
      {entries.map((entry, index) => (
        <LogEntry key={index} entry={entry} />
      ))}
    </div>
  );
};

LogPanel.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
};
