import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { LogEntry } from './LogEntry';

/**
 * A panel that displays a list of log entries.
 * @param {{ entries: string[]; }} props
 */
export const LogPanel = ({ entries }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="log-panel" ref={scrollRef}>
      {entries.map((entry, index) => (
        <LogEntry key={index} message={entry} />
      ))}
    </div>
  );
};

LogPanel.propTypes = {
  /**
   * The list of log messages to display.
   */
  entries: PropTypes.arrayOf(PropTypes.string).isRequired,
};
