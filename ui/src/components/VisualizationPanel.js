/**
 * VisualizationPanel Component
 * Provides visualization capabilities for the Cognitive IDE as specified in PLAN.repl.md
 * Includes graph view, task list, and concept visualization with tabbed interface
 *
 * Features:
 * - Tab-based interface for different visualization types
 * - Statistical summary of reasoning elements
 * - Integration with existing TaskPanel, ConceptPanel, and GraphUI components
 */
import React, {memo, useCallback, useState} from 'react';
import useUiStore from '../stores/uiStore.js';
import {themeUtils} from '../utils/themeUtils.js';
import TaskPanel from './TaskPanel.js';
import ConceptPanel from './ConceptPanel.js';
import GraphUI from './GraphUI.js';
import {DataPanel} from './DataPanel.js';

const VisualizationPanel = memo(() => {
    const tasks = useUiStore(state => state.tasks);
    const concepts = useUiStore(state => state.concepts);
    const beliefs = useUiStore(state => state.beliefs);
    const [activeTab, setActiveTab] = useState('graph');

    // Get related concepts for tasks to show relationships
    const getRelatedConcepts = useCallback((task) => {
        if (!task?.content) return [];
        // Extract concept terms from task content
        // This is a simplified example - in a real implementation, this would be more complex
        const conceptMatches = task.content.match(/<([^>]+)-->/g) || [];
        return conceptMatches.map(match => match.replace(/<|-->|>/g, '').trim());
    }, []);

    // Tab configuration for different visualization types
    const tabs = [
        {
            id: 'graph',
            label: 'Graph View',
            content: React.createElement(GraphUI, {key: 'graph-view'})
        },
        {
            id: 'tasks',
            label: 'Task List',
            content: React.createElement(TaskPanel, {key: 'task-list'})
        },
        {
            id: 'concepts',
            label: 'Concepts',
            content: React.createElement(ConceptPanel, {key: 'concepts'})
        }
    ];

    /**
     * Renders tab navigation buttons
     * @returns {JSX.Element} Tab navigation element
     */
    const renderTabButtons = () => {
        return React.createElement('div',
            {
                style: {
                    display: 'flex',
                    borderBottom: `2px solid ${themeUtils.get('BORDERS.COLOR')}`,
                    marginBottom: '1rem'
                }
            },
            ...tabs.map(tab =>
                React.createElement('button',
                    {
                        key: tab.id,
                        onClick: () => setActiveTab(tab.id),
                        style: {
                            padding: '0.5rem 1rem',
                            backgroundColor: activeTab === tab.id ? themeUtils.get('COLORS.PRIMARY') : themeUtils.get('BACKGROUNDS.SECONDARY'),
                            color: activeTab === tab.id ? 'white' : themeUtils.get('TEXT.PRIMARY'),
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid ' + themeUtils.get('COLORS.PRIMARY') : '2px solid transparent',
                            cursor: 'pointer',
                            fontWeight: activeTab === tab.id ? themeUtils.get('FONTS.WEIGHT.BOLD') : 'normal'
                        }
                    },
                    tab.label
                )
            )
        );
    };

    // Get active content based on selected tab
    const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content || tabs[0].content;

    // Stats summary showing counts of different reasoning elements
    const statsSummary = React.createElement('div',
        {
            style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.5rem',
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
                borderRadius: themeUtils.get('BORDERS.RADIUS.SM')
            }
        },
        React.createElement('div', {style: {textAlign: 'center'}},
            React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}}, 'Tasks'),
            React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.LG')}}, tasks.length)
        ),
        React.createElement('div', {style: {textAlign: 'center'}},
            React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}}, 'Concepts'),
            React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.LG')}}, Object.keys(concepts).length)
        ),
        React.createElement('div', {style: {textAlign: 'center'}},
            React.createElement('div', {style: {fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')}}, 'Beliefs'),
            React.createElement('div', {style: {fontSize: themeUtils.get('FONTS.SIZE.LG')}}, beliefs.length)
        )
    );

    return React.createElement(DataPanel, {
        title: 'Visualization Panel',
        dataSource: () => [
            {type: 'stats', content: statsSummary},
            {type: 'tabs', content: renderTabButtons()},
            {type: 'content', content: activeTabContent}
        ],
        renderItem: (item) => {
            if (item.type === 'stats') return item.content;
            if (item.type === 'tabs') return item.content;
            if (item.type === 'content') return item.content;
            return null;
        },
        config: {
            itemLabel: 'items',
            showItemCount: false,
            containerHeight: 500
        }
    });
});

export default VisualizationPanel;