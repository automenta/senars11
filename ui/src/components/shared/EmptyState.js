import React, { memo } from 'react';
import { themeUtils } from '../../utils/themeUtils.js';

export const EmptyState = memo(({ message = 'No data to display', icon = '🔍', ...props }) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: themeUtils.get('SPACING.LG'),
    textAlign: 'center',
    color: themeUtils.get('TEXT.MUTED')
  };

  const iconStyle = {
    fontSize: '2rem',
    marginBottom: themeUtils.get('SPACING.MD')
  };

  return React.createElement('div', { style: containerStyle, ...props },
    React.createElement('div', { style: iconStyle }, icon),
    React.createElement('div', null, message)
  );
});