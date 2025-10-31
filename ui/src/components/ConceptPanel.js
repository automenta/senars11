import React from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';
import { listItemStyles, typography } from '../utils/styles.js';

const ConceptPanel = () => {
    const concepts = useUiStore(state => state.concepts);

    const renderConcept = (concept, index) =>
        React.createElement('div',
            {
                key: concept.term || index,
                style: listItemStyles.base
            },
            React.createElement('div', {style: typography.subtitle}, concept.term),
            React.createElement('div', null,
                `Priority: ${concept.priority.toFixed(3)} | Tasks: ${concept.taskCount} | Beliefs: ${concept.beliefCount}`
            ),
            React.createElement('div', {style: typography.small},
                `Last access: ${new Date(concept.lastAccess).toLocaleTimeString()}`
            )
        );

    return React.createElement(GenericPanel, {
        maxHeight: 'calc(100% - 2rem)',
        items: concepts,
        renderItem: renderConcept
    });
};

export default ConceptPanel;