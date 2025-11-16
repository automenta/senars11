import React from 'react';
import PropTypes from 'prop-types';

/**
 * A single log entry in the LogPanel.
 * @param {{ message: string; }} props
 */
export const LogEntry = ({ message }) => {
  return <div className="log-entry">{message}</div>;
};

LogEntry.propTypes = {
  /**
   * The log message to display.
   */
  message: PropTypes.string.isRequired,
};
