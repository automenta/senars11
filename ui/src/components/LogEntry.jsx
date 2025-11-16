import React from 'react';
import PropTypes from 'prop-types';

export const LogEntry = ({ entry }) => {
  return (
    <div className="log-entry">
      <span className="log-entry-timestamp">{entry.timestamp}</span>
      <span className={`log-entry-type log-entry-type--${entry.type}`}>{entry.type}</span>
      <span className="log-entry-message">{entry.message}</span>
    </div>
  );
};

LogEntry.propTypes = {
  entry: PropTypes.shape({
    timestamp: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
};
