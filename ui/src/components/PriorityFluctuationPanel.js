import React, {memo} from 'react';
import {DataPanel} from './DataPanel.js';
import {themeUtils} from '../utils/themeUtils.js';
import {createProgressBar} from '../utils/componentUtils.js';

const PriorityFluctuationPanel = memo(() => {
    const renderFluctuation = (fluctuation) =>
        React.createElement('div',
            {
                key: `${fluctuation.concept}-${fluctuation.timestamp}`,
                style: {
                    padding: '0.5rem',
                    borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                    backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
                    borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
                    marginBottom: '0.25rem'
                }
            },
            React.createElement('div', {
                    style: {
                        fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                        color: themeUtils.get('TEXT.PRIMARY'),
                        display: 'flex',
                        justifyContent: 'space-between'
                    }
                },
                React.createElement('span', null, fluctuation.concept),
                React.createElement('span', {
                        style: {
                            fontSize: themeUtils.get('FONTS.SIZE.XS'),
                            color: themeUtils.get('TEXT.SECONDARY')
                        }
                    },
                    new Date(fluctuation.timestamp).toLocaleTimeString()
                )
            ),
            React.createElement('div', null,
                React.createElement('div', {style: {margin: '0.25rem 0', fontSize: themeUtils.get('FONTS.SIZE.SM')}},
                    fluctuation.priorityChange !== undefined
                        ? `Priority: ${fluctuation.oldPriority?.toFixed(3)} → ${fluctuation.newPriority?.toFixed(3)} (${fluctuation.priorityChange > 0 ? '+' : ''}${fluctuation.priorityChange?.toFixed(3)})`
                        : `Task Count: ${fluctuation.oldTaskCount} → ${fluctuation.newTaskCount}`
                ),
                createProgressBar(React, {
                    percentage: fluctuation.newPriority ? fluctuation.newPriority * 100 : 50,
                    color: fluctuation.priorityChange !== undefined
                        ? (fluctuation.priorityChange > 0 ? '#28a745' : '#dc3545')
                        : '#ffc107'
                })
            )
        );

    const renderCurrentConcept = (concept) =>
        React.createElement('div',
            {
                key: concept.term,
                style: {
                    padding: '0.5rem',
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
                },
                concept.term
            ),
            React.createElement('div', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.SM'),
                        color: themeUtils.get('TEXT.SECONDARY')
                    }
                },
                `Priority: ${concept.priority?.toFixed(3)} | Activation: ${concept.activation?.toFixed(3)}`
            ),
            React.createElement('div', {
                    style: {
                        fontSize: themeUtils.get('FONTS.SIZE.SM'),
                        color: themeUtils.get('TEXT.SECONDARY')
                    }
                },
                `Tasks: ${concept.totalTasks} | Use: ${concept.useCount}`
            ),
            createProgressBar(React, {
                percentage: Math.min(100, concept.priority * 100),
                color: '#007bff'
            })
        );

    return React.createElement(DataPanel, {
        title: 'Priority Fluctuations & Metrics',
        dataSource: (state) => {
            const demoMetrics = state.demoMetrics;
            const concepts = state.concepts;

            // Extract priority fluctuations from all demo metrics
            const allPriorityFluctuations = [];
            Object.values(demoMetrics || {}).forEach(metrics => {
                if (metrics?.systemMetrics?.priorityFluctuations) {
                    allPriorityFluctuations.push(...metrics.systemMetrics.priorityFluctuations);
                }
            });

            // Sort fluctuations by timestamp (most recent first)
            allPriorityFluctuations.sort((a, b) => b.timestamp - a.timestamp);

            // Get the most recent 20 priority changes for display
            const recentFluctuations = allPriorityFluctuations.slice(0, 20);

            // Extract concept metrics for display
            const conceptMetrics = [];
            Object.values(demoMetrics || {}).forEach(metrics => {
                if (metrics?.systemMetrics?.conceptMetrics) {
                    conceptMetrics.push(...metrics.systemMetrics.conceptMetrics);
                }
            });

            // Combine both sections with headers
            return [
                {type: 'header', content: 'Priority Fluctuations'},
                ...recentFluctuations.map(f => ({type: 'fluctuation', data: f})),
                {type: 'header', content: 'Current Concept Metrics'},
                ...conceptMetrics.map(c => ({type: 'concept', data: c}))
            ];
        },
        renderItem: (item) => {
            switch (item.type) {
                case 'header':
                    return React.createElement('div', {
                        style: {
                            fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                            fontSize: themeUtils.get('FONTS.SIZE.BASE'),
                            margin: '1rem 0 0.5rem 0',
                            padding: '0.5rem 0',
                            borderBottom: `2px solid ${themeUtils.get('COLORS.PRIMARY')}`,
                            color: themeUtils.get('TEXT.PRIMARY')
                        }
                    }, item.content);
                case 'fluctuation':
                    return renderFluctuation(item.data);
                case 'concept':
                    return renderCurrentConcept(item.data);
                default:
                    return null;
            }
        },
        config: {
            itemLabel: 'items',
            showItemCount: false,
            emptyMessage: 'No priority fluctuation data available. Run a demo to see metrics.',
            containerHeight: 400
        }
    });
});

export default PriorityFluctuationPanel;