import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';

export const StatusBar = ({ status }) => {
  const { isRunning, cycle, mode } = status;

  return React.createElement(
    Box,
    { paddingX: 1 },
    isRunning && React.createElement(Spinner, { type: 'dots' }),
    React.createElement(
      Gradient,
      { name: 'rainbow' },
      React.createElement(
        Text,
        { marginLeft: 1 },
        `Cycle: ${cycle} | Mode: ${mode}`
      )
    )
  );
};
