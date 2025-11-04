import React, {memo} from 'react';
import {DataPanel} from './DataPanel.js';
import {themeUtils} from '../utils/themeUtils.js';
import {createSection, createMetricDisplay} from '../utils/panelUtils.js';

const CyclePanel = memo(() => {
    const renderCycle = (cycle) =>
        React.createElement('div',
            {
                key: cycle.cycle,
                style: {
                    padding: '0.75rem',
                    borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
                    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                    marginBottom: '0.25rem'
                }
            },
            React.createElement('div', {
                style: {
                    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                    color: themeUtils.get('TEXT.PRIMARY')
                }
            }, `Cycle #${cycle.cycle}`),
            React.createElement('div', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.SM'),
                        color: themeUtils.get('TEXT.SECONDARY'),
                        marginTop: '0.25rem'
                    }
                },
                `Tasks: ${cycle.tasksProcessed} | Beliefs: ${cycle.beliefsAdded} | Qs: ${cycle.questionsAnswered}`
            ),
            React.createElement('div', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.SM'),
                        color: themeUtils.get('TEXT.MUTED'),
                        marginTop: '0.125rem'
                    }
                },
                `${new Date(cycle.timestamp).toLocaleTimeString()}`
            )
        );

    return React.createElement(DataPanel, {
        title: 'Cycles',
        dataSource: (state) => {
            const cycles = state.cycles.slice(-10).reverse();
            const systemMetrics = state.systemMetrics;
            
            // Return an array with both metrics and cycles, already processed
            const result = [];
            
            // Add metrics section if available
            if (systemMetrics) {
                result.push({type: 'systemMetrics', systemMetrics});
            }
            
            // Add cycles
            result.push(...cycles);
            
            return result;
        },
        renderItem: (item) => {
            // If item is a cycle object, render it directly
            if (item && typeof item === 'object' && item.cycle !== undefined && item.timestamp !== undefined) {
                return renderCycle(item);
            }
            
            // If item contains systemMetrics, render metrics section
            if (item && typeof item === 'object' && item.systemMetrics) {
                const metrics = item.systemMetrics;
                if (!metrics) return null;
                
                return createSection(React, {
                    title: 'System Metrics',
                    children: [
                        createMetricDisplay(React, {label: 'Cycles', value: metrics.cycleCount}),
                        createMetricDisplay(React, {label: 'Tasks', value: metrics.taskCount}),
                        createMetricDisplay(React, {label: 'Concepts', value: metrics.conceptCount}),
                        createMetricDisplay(React, {label: 'Runtime', value: `${(metrics.runtime / 1000).toFixed(1)}s`}),
                        createMetricDisplay(React, {label: 'Clients', value: metrics.connectedClients})
                    ]
                });
            }
            
            return null;
        },
        config: {
            itemLabel: 'cycles',
            showItemCount: false,
            emptyMessage: 'No cycles to display',
            containerHeight: 400
        }
    });
});

export default CyclePanel;