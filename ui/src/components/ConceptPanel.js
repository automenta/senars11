import React from 'react';
import useUiStore from '../stores/uiStore.js';

const ConceptPanel = () => {
  const concepts = useUiStore(state => state.concepts);
  
  return React.createElement('div', { style: { maxHeight: 'calc(100% - 2rem)', overflowY: 'auto' } },
    concepts.map((concept, index) => 
      React.createElement('div', { 
        key: concept.term || index,
        style: {
          padding: '0.5rem',
          margin: '0.25rem 0',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }
      },
      React.createElement('div', { style: { fontWeight: 'bold' } }, concept.term),
      React.createElement('div', null, 
        `Priority: ${concept.priority.toFixed(3)} | Tasks: ${concept.taskCount} | Beliefs: ${concept.beliefCount}`
      ),
      React.createElement('div', { style: { fontSize: '0.8rem', color: '#666' } },
        `Last access: ${new Date(concept.lastAccess).toLocaleTimeString()}`
      )
      )
    )
  );
};

export default ConceptPanel;