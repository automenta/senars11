import React from 'react';

// Panel content mapping to reduce duplication in App.js
import TaskPanel from './TaskPanel.js';
import ConceptPanel from './ConceptPanel.js';
import CyclePanel from './CyclePanel.js';

export const contentMap = {
  'ExplorerPanel': () => React.createElement('div', null, 'Explorer content goes here'),
  'MainPanel': () => React.createElement('div', null, 'Main content goes here'),
  'ConsolePanel': () => React.createElement('div', null, 'Console output goes here'),
  'VariablesPanel': () => React.createElement('div', null, 'Variable inspection goes here'),
  'TaskPanel': TaskPanel,
  'ConceptPanel': ConceptPanel,
  'CyclePanel': CyclePanel,
};