import React, {memo, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import {DataPanel} from './DataPanel.js';
import {createProgressBar} from '../utils/dashboardUtils.js';
import {themeUtils} from '../utils/themeUtils.js';
import {Button} from './GenericComponents.js';

const DemoPanel = memo(() => {
  const demos = useUiStore(state => state.demos);
  const demoStates = useUiStore(state => state.demoStates);
  const wsService = useUiStore(state => state.wsService);

  // Helper function to send demo control commands
  const sendDemoControl = (demoId, command, parameters = {}) => {
    if (!wsService) {
      console.warn('WebSocket service not available. Demo control unavailable.');
      return;
    }

    // Send demo control command to real NAR server for actual demo execution
    wsService.sendMessage({
      type: 'demoControl',
      payload: {command, demoId, parameters}
    });
  };

  const getStateColors = (state) => {
    const colorMap = {
      running: themeUtils.get('COLORS.SUCCESS'),
      paused: themeUtils.get('COLORS.WARNING'),
      completed: themeUtils.get('COLORS.SUCCESS'),
      error: themeUtils.get('COLORS.DANGER')
    };

    const color = colorMap[state] || themeUtils.get('COLORS.INFO');
    return {
      bg: color + '20',
      border: color
    };
  };

  const getButtonVariant = (isActive, isDisabled = false) => {
    if (isDisabled) return 'light';
    if (isActive) return 'success';
    return 'secondary';
  };

  const DemoRow = memo(({demo}) => {
    const [expanded, setExpanded] = useState(false);
    const state = demoStates[demo.id] || {state: 'ready', progress: 0};
    const toggleExpanded = () => setExpanded(!expanded);
    const stateColors = getStateColors(state.state);

    // Get progress color based on state
    const getProgressColor = () => {
      if (state.state === 'running' || state.state === 'completed') return themeUtils.get('COLORS.SUCCESS');
      if (state.state === 'paused') return themeUtils.get('COLORS.WARNING');
      return themeUtils.get('COLORS.PRIMARY');
    };

    return React.createElement('div',
      {
        style: {
          padding: themeUtils.get('SPACING.MD'),
          margin: `${themeUtils.get('SPACING.SM')} 0`,
          backgroundColor: stateColors.bg,
          border: `1px solid ${stateColors.border}`,
          borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
          fontSize: themeUtils.get('FONTS.SIZE.SM')
        }
      },
      React.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }
      },
      React.createElement('div', {style: {flex: 1}},
        React.createElement('div', {
          style: {
            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }
        },
        React.createElement('span', {onClick: toggleExpanded, style: {marginRight: themeUtils.get('SPACING.XS')}},
          expanded ? '▼' : '►'
        ),
        `${demo.name} `,
        React.createElement('span', {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.XS'),
            color: themeUtils.get('TEXT.SECONDARY'),
            marginLeft: themeUtils.get('SPACING.SM')
          }
        }, `(${state.state})`)
        ),
        React.createElement('div', {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.XS'),
            color: themeUtils.get('TEXT.SECONDARY'),
            marginTop: themeUtils.get('SPACING.XS')
          }
        },
        demo.description
        ),
        // Show progress bar and additional info
        React.createElement('div', {style: {marginTop: themeUtils.get('SPACING.SM')}},
          createProgressBar(React, {
            percentage: state.progress || 0,
            color: getProgressColor()
          }),
          state.progress && React.createElement('div', {
            style: {
              fontSize: themeUtils.get('FONTS.SIZE.XS'),
              marginTop: themeUtils.get('SPACING.XS'),
              color: themeUtils.get('TEXT.TERTIARY')
            }
          },
          `${state.progress}% complete, Step: ${state.currentStep || 0}`
          )
        )
      ),
      React.createElement('div', {style: {display: 'flex', gap: themeUtils.get('SPACING.XS'), flexShrink: 0}},
        React.createElement(Button, {
          onClick: () => {
            // Before starting, ensure NAR memory is reset for clean demo
            if (wsService) {
              wsService.sendMessage({type: 'control/reset', payload: {}});
              // Wait a bit and then start the demo
              setTimeout(() => {
                sendDemoControl(demo.id, 'start');
              }, 300);
            } else {
              sendDemoControl(demo.id, 'start');
            }
          },
          variant: getButtonVariant(state.state !== 'running', state.state === 'running'),
          disabled: state.state === 'running',
          size: 'sm'
        }, 'Start'),
        React.createElement(Button, {
          onClick: () => sendDemoControl(demo.id, 'pause'),
          variant: getButtonVariant(state.state === 'paused', state.state !== 'running'),
          disabled: state.state !== 'running',
          size: 'sm'
        }, 'Pause'),
        React.createElement(Button, {
          onClick: () => sendDemoControl(demo.id, 'resume'),
          variant: getButtonVariant(state.state === 'running', state.state !== 'paused'),
          disabled: state.state !== 'paused',
          size: 'sm'
        }, 'Resume'),
        React.createElement(Button, {
          onClick: () => sendDemoControl(demo.id, 'stop'),
          variant: 'danger',
          size: 'sm'
        }, 'Stop')
      )
      ),
      expanded && React.createElement('div', {
        style: {
          marginTop: themeUtils.get('SPACING.MD'),
          paddingTop: themeUtils.get('SPACING.MD'),
          borderTop: `1px solid ${themeUtils.get('BORDERS.COLOR')}`
        }
      },
      demo.parameters && demo.parameters.length > 0
        ? React.createElement('div', null,
          React.createElement('div', {
            style: {
              fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
              marginBottom: themeUtils.get('SPACING.SM'),
              color: themeUtils.get('TEXT.PRIMARY')
            }
          }, 'Parameters:'),
          demo.parameters.map(param =>
            React.createElement('div', {
              key: param.name,
              style: {marginBottom: themeUtils.get('SPACING.SM'), display: 'flex', alignItems: 'center'}
            },
            React.createElement('label', {
              style: {
                width: '150px',
                fontSize: themeUtils.get('FONTS.SIZE.SM'),
                color: themeUtils.get('TEXT.SECONDARY')
              }
            }, param.name),
            React.createElement('input', {
              type: 'number',
              defaultValue: param.defaultValue,
              placeholder: param.description,
              onChange: (e) => {
                // This would require more complex state management to capture parameter changes
                // For now, we'll just show the parameters
              },
              style: {
                flex: 1,
                padding: themeUtils.get('SPACING.XS'),
                border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
              }
            })
            )
          )
        )
        : React.createElement('div', {
          style: {
            fontSize: themeUtils.get('FONTS.SIZE.SM'),
            color: themeUtils.get('TEXT.MUTED')
          }
        }, 'No configurable parameters')
      )
    );
  });

  const renderDemo = (demo) => React.createElement(DemoRow, {demo});

  return React.createElement(DataPanel, {
    title: 'Demos',
    dataSource: () => demos,
    renderItem: renderDemo,
    config: {
      itemLabel: 'demos',
      showItemCount: true,
      emptyMessage: 'No demos available. The server will send a list of available demos.',
      containerHeight: 400
    }
  });
});

export default DemoPanel;