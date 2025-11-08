import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

export const TaskEditor = ({ tasks, onSelect }) => {
  const items = tasks.map(task => ({
    label: `${task.content} [${task.priority}]`,
    value: task.id,
  }));

  return React.createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    React.createElement(Text, { bold: true }, 'Tasks'),
    React.createElement(SelectInput, {
      items: items,
      onSelect: onSelect,
    })
  );
};
