import React, { memo } from 'react';

const ErrorState = memo(({ message = 'Error', ...props }) => {
  return React.createElement('div', { ...props }, message);
});

export { ErrorState };