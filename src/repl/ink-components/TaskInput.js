import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export const TaskInput = ({ onSubmit }) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim().length > 0) {
      onSubmit(value);
      setValue('');
    }
  };

  return React.createElement(
    Box,
    { borderStyle: 'round', padding: 1 },
    React.createElement(
      Box,
      { marginRight: 1 },
      React.createElement(Text, null, 'Enter task:')
    ),
    React.createElement(TextInput, {
      value: value,
      onChange: setValue,
      onSubmit: handleSubmit,
    })
  );
};
