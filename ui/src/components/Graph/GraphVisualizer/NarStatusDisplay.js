/**
 * NarStatusDisplay Component
 * Shows NAR status information including clock time and running state
 * Reuses patterns from existing status components
 */
import React, { memo, useEffect, useState } from 'react';
import useUiStore from '../../../stores/uiStore.js';
import { themeUtils } from '../../../utils/themeUtils.js';

const NarStatusDisplay = memo(({ className = '' }) => {
  const [clockTime, setClockTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const wsConnected = useUiStore(state => state.wsConnected);
  const metrics = useUiStore(state => state.systemMetrics);

  // Update local state when store metrics change
  useEffect(() => {
    if (metrics) {
      // Extract clock time if available
      if (metrics.clock != null) {
        setClockTime(metrics.clock);
      }
      // Extract running state if available
      if (metrics.running != null) {
        setIsRunning(metrics.running);
      }
    }
  }, [metrics]);

  // Calculate status display
  const statusColor = wsConnected && isRunning ? '#28a745' : // Green for running
                    wsConnected && !isRunning ? '#ffc107' : // Yellow for paused
                    !wsConnected ? '#dc3545' : // Red for disconnected
                    '#6c757d'; // Gray for unknown

  const statusText = wsConnected && isRunning ? 'Running' :
                    wsConnected && !isRunning ? 'Paused' :
                    !wsConnected ? 'Disconnected' : 'Unknown';

  return React.createElement('div',
    {
      className: `nar-status-display ${className}`,
      style: {
        display: 'flex',
        flexDirection: 'column',
        padding: '0.75rem',
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        minWidth: '150px'
      }
    },
    // Status indicator
    React.createElement('div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          marginBottom: '0.5rem'
        }
      },
      React.createElement('div',
        {
          style: {
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            marginRight: '0.5rem'
          }
        }
      ),
      React.createElement('span',
        {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.SM'),
            fontWeight: 'bold'
          }
        },
        'Status: '
      ),
      React.createElement('span',
        {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.SM')
          }
        },
        statusText
      )
    ),

    // Clock time
    React.createElement('div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.25rem'
        }
      },
      React.createElement('span',
        {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.SM')
          }
        },
        'Clock:'
      ),
      React.createElement('span',
        {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.SM'),
            fontWeight: '500'
          }
        },
        clockTime || 'N/A'
      )
    ),

    // Connection indicator
    React.createElement('div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between'
        }
      },
      React.createElement('span',
        {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.SM')
          }
        },
        'Connection:'
      ),
      React.createElement('span',
        {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.SM'),
            color: wsConnected ? '#28a745' : '#dc3545'
          }
        },
        wsConnected ? 'Live' : 'Offline'
      )
    )
  );
});

export default NarStatusDisplay;