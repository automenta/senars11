import React from 'react';
import PropTypes from 'prop-types';

export const InputBar = ({ onInput }) => {
  const [value, setValue] = React.useState('');

  const handleChange = (event) => {
    setValue(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onInput(value);
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="input-bar">
      <input type="text" value={value} onChange={handleChange} />
      <button type="submit">Send</button>
    </form>
  );
};

InputBar.propTypes = {
  onInput: PropTypes.func.isRequired,
};
