import React from 'react';
import PropTypes from 'prop-types';

export const ControlBar = ({ onReset, onStep, onRun, onStop }) => {
  return (
    <div className="control-bar">
      <button onClick={onReset}>Reset</button>
      <button onClick={onStep}>Step</button>
      <button onClick={onRun}>Run</button>
      <button onClick={onStop}>Stop</button>
    </div>
  );
};

ControlBar.propTypes = {
  onReset: PropTypes.func.isRequired,
  onStep: PropTypes.func.isRequired,
  onRun: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
};
