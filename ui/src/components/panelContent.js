// Panel content mapping to reduce duplication in App.js
import ExplorerPanel from './ExplorerPanel.js';
import MainPanel from './MainPanel.js';
import ConsolePanel from './ConsolePanel.js';
import VariablesPanel from './VariablesPanel.js';
import TaskPanel from './TaskPanel.js';
import ConceptPanel from './ConceptPanel.js';
import CyclePanel from './CyclePanel.js';

export const contentMap = {
  'ExplorerPanel': ExplorerPanel,
  'MainPanel': MainPanel,
  'ConsolePanel': ConsolePanel,
  'VariablesPanel': VariablesPanel,
  'TaskPanel': TaskPanel,
  'ConceptPanel': ConceptPanel,
  'CyclePanel': CyclePanel,
};