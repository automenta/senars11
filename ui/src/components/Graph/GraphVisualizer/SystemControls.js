/**
 * SystemControls Component for Graph Visualization
 * Provides controls for the reasoning engine (Pause, Resume, Step) for the graph view
 * Reuses existing patterns from ReasonerControls
 */
import React, { memo, useCallback } from 'react';
import useUiStore from '../../../stores/uiStore.js';
import { themeUtils } from '../../../utils/themeUtils.js';

const SystemControls = memo(({ className = '' }) => {
  const wsService = useUiStore(state => state.wsService);
  const wsConnected = useUiStore(state => state.wsConnected);

  const sendControlCommand = useCallback((command) => {
    if (!wsService || !wsConnected) return;

    const controlMessage = {
      type: `control/${command}`,
      payload: {}
    };

    try {
      wsService.sendMessage(controlMessage);
    } catch (error) {
      console.error(`Error sending ${command} command:`, error);
      useUiStore.getState().addNotification({
        type: 'error',
        title: `Error sending ${command} command`,
        message: error.message
      });
    }
  }, [wsService, wsConnected]);

  const buttonConfig = [
    { id: 'pause', label: 'Pause', command: 'pause', icon: '⏸️' },
    { id: 'resume', label: 'Resume', command: 'resume', icon: '▶️' },
    { id: 'step', label: 'Step', command: 'step', icon: '⏭️' }
  ];

  const renderButton = useCallback((button) => {
    const { id, label, command, icon } = button;
    const buttonDisabled = !wsService || !wsConnected;

    return React.createElement('button',
      {
        key: id,
        onClick: () => sendControlCommand(command),
        disabled: buttonDisabled,
        'aria-label': `${label} reasoner`,
        style: {
          padding: '0.5rem 1rem',
          margin: '0 0.25rem',
          backgroundColor: buttonDisabled ? '#6c757d' : themeUtils.get('COLORS.PRIMARY'),
          color: 'white',
          border: 'none',
          borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
          cursor: buttonDisabled ? 'not-allowed' : 'pointer',
          minWidth: '60px',
          fontSize: themeUtils.get('FONTS.SIZE.BASE'),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }
      },
      React.createElement('span', { style: { fontSize: '1.2rem' } }, icon),
      React.createElement('span', { style: { fontSize: themeUtils.get('FONTS.SIZE.XS') } }, label)
    );
  }, [sendControlCommand, wsService, wsConnected]);

  return React.createElement('div',
    {
      className: `system-controls ${className}`,
      style: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0.5rem',
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
      }
    },
    ...buttonConfig.map(renderButton)
  );
});

export default SystemControls;