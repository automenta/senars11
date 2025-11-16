import React from 'react';
import PropTypes from 'prop-types';

/**
 * A bar with control buttons.
 * @param {{
 *   onReset?: () => void;
 *   onStep?: () => void;
 *   onStart?: () => void;
 *   onStop?: () => void;
 * }} props
 */
const ControlBar = ({ onReset, onStep, onStart, onStop }) => {
  return (
    <div className="control-bar">
      {onReset && <button onClick={onReset}>Reset</button>}
      {onStep && <button onClick={onStep}>Step</button>}
      {onStart && <button onClick={onStart}>Start</button>}
      {onStop && <button onClick={onStop}>Stop</button>}
    </div>
  );
};

ControlBar.propTypes = {
  /**
   * The function to call when the reset button is clicked.
   */
  onReset: PropTypes.func,
  /**
   * The function to call when the step button is clicked.
   */
  onStep: PropTypes.func,
  /**
   * The function to call when the start button is clicked.
   */
  onStart: PropTypes.func,
  /**
   * The function to call when the stop button is clicked.
   */
  onStop: PropTypes.func,
};

export default ControlBar;
