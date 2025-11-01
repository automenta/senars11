import React from 'react';
import useUiStore from '../stores/uiStore.js';
import GenericPanel from './GenericPanel.js';

const VariablesPanel = () => {
  // Using system metrics as sample data for variables
  const systemMetrics = useUiStore(state => state.systemMetrics);

  // Convert metrics to a list of variables
  const variables = systemMetrics ? [
    {name: 'Cycles', value: systemMetrics.cycleCount},
    {name: 'Tasks', value: systemMetrics.taskCount},
    {name: 'Concepts', value: systemMetrics.conceptCount},
    {name: 'Runtime (s)', value: (systemMetrics.runtime / 1000).toFixed(1)},
    {name: 'Connected Clients', value: systemMetrics.connectedClients},
  ] : [];

  const renderVariable = (variable, index) =>
    React.createElement('div',
      {
        key: variable.name || index,
        style: {
          padding: '0.5rem',
          margin: '0.25rem 0',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }
      },
      React.createElement('div', {style: {fontWeight: 'bold', display: 'flex', justifyContent: 'space-between'}},
        variable.name,
        React.createElement('span', {style: {fontWeight: 'normal', color: '#666'}}, variable.value)
      )
    );

  return React.createElement(GenericPanel, {
    items: variables,
    renderItem: renderVariable,
    emptyMessage: 'No variables to inspect'
  });
};

export default VariablesPanel;