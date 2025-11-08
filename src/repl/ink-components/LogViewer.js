import React from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';

export const LogViewer = ({ logs }) => {
  return React.createElement(
    Box,
    { flexDirection: 'column', padding: 1, flexGrow: 1 },
    React.createElement(BigText, { text: 'SeNARS' }),
    React.createElement(
      Box,
      { flexDirection: 'column' },
      logs.map((log) =>
        React.createElement(Text, { key: log.id }, log.message)
      )
    )
  );
};
