import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

export const TaskInput = ({ onSubmit }) => {
  const [value, setValue] = useState('');
  
  const handleSubmit = () => {
    if (value.trim().length > 0) {
      onSubmit(value);
      setValue('');
    }
  };

  // Handle special key combinations
  useInput((input, key) => {
    if (key.return) {
      handleSubmit();
    } else if (key.escape) {
      setValue('');
    }
  });

  return React.createElement(
    Box,
    { borderStyle: 'round', padding: 1, width: '100%' },
    React.createElement(
      Box,
      { flexDirection: 'row', alignItems: 'center' },
      React.createElement(Text, { color: 'green', bold: true }, '> '),
      React.createElement(
        TextInput,
        {
          value: value,
          onChange: setValue,
          onSubmit: handleSubmit,
          placeholder: 'Enter task or command...',
          style: { marginLeft: 0 }
        }
      )
    )
  );
};
