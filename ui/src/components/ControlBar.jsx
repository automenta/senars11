import React from 'react';

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
