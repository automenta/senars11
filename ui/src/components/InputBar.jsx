import React from 'react';
import PropTypes from 'prop-types';

/**
 * An input bar with a button.
 * @param {{
 *   onSend: (value: string) => void;
 *   placeholder?: string;
 * }} props
 */
export const InputBar = ({ onSend, placeholder }) => {
  const [value, setValue] = React.useState('');

  const handleSend = () => {
    if (value.trim()) {
      onSend(value);
      setValue('');
    }
  };

  return (
    <div className="input-bar">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};

InputBar.propTypes = {
  /**
   * The function to call when the send button is clicked.
   */
  onSend: PropTypes.func.isRequired,
  /**
   * The placeholder text for the input field.
   */
  placeholder: PropTypes.string,
};
