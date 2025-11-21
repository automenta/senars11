/**
 * ReasonerControls Component
 * Provides controls for the reasoning engine (Run, Stop, Step)
 * Implements the control commands specified in PLAN.repl.md
 *
 * Features:
 * - WebSocket integration for command transmission
 * - Visual feedback for connection status
 * - Accessible button labels
 * - Error handling and notifications
 */
import React, {memo, useCallback} from 'react';
import useUiStore from '../stores/uiStore.js';
import {themeUtils} from '../utils/themeUtils.js';

const ReasonerControls = memo(({className = ''}) => {
    const wsService = useUiStore(state => state.wsService);
    const wsConnected = useUiStore(state => state.wsConnected);

    /**
     * Sends a control command to the reasoning engine via WebSocket
     * @param {string} command - The command to send ('start', 'stop', 'step')
     */
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
        {id: 'run', label: 'Run', command: 'start', icon: '▶️'},
        {id: 'stop', label: 'Stop', command: 'stop', icon: '⏹️'},
        {id: 'step', label: 'Step', command: 'step', icon: '⏭️'}
    ];

    /**
     * Renders a control button with proper styling and behavior
     * @param {Object} button - Button configuration object
     * @returns {JSX.Element} Button element
     */
    const renderButton = useCallback((button) => {
        const {id, label, command, icon} = button;
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
            React.createElement('span', {style: {fontSize: '1.2rem'}}, icon),
            React.createElement('span', {style: {fontSize: themeUtils.get('FONTS.SIZE.XS')}}, label)
        );
    }, [sendControlCommand, wsService, wsConnected]);

    return React.createElement('div',
        {
            className: `reasoner-controls ${className}`,
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

export default ReasonerControls;