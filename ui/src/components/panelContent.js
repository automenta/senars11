// Panel content mapping to reduce duplication in App.js
import TaskPanel from './TaskPanel.js';
import ConceptPanel from './ConceptPanel.js';
import CyclePanel from './CyclePanel.js';

export const contentMap = {
  'ExplorerPanel': () => 'Explorer content goes here',
  'MainPanel': () => 'Main content goes here',
  'ConsolePanel': () => 'Console output goes here',
  'VariablesPanel': () => 'Variable inspection goes here',
  'TaskPanel': TaskPanel,
  'ConceptPanel': ConceptPanel,
  'CyclePanel': CyclePanel,
};