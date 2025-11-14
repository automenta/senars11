import { themeUtils } from '../utils/themeUtils.js';

/**
 * Application configurations for the launcher panel
 * Following AGENTS.md: Organized, Consolidated, Consistent
 */
export const UI_APPS = Object.freeze([
  {
    id: 'ide',
    name: 'Cognitive IDE',
    description: 'Main IDE interface with flexible layout panels',
    icon: '🧠',
    color: themeUtils.get('COLORS.PRIMARY'),
    path: '/?layout=ide'
  },
  {
    id: 'repl',
    name: 'REPL Interface',
    description: 'Read-Eval-Print Loop for direct NARS interaction',
    icon: '💻',
    color: themeUtils.get('COLORS.SECONDARY'),
    path: '/repl/'
  },
  {
    id: 'minimal-repl',
    name: 'Minimal REPL (Fallback)',
    description: 'Basic REPL interface that works when main UI fails',
    icon: '🛠️',
    color: themeUtils.get('COLORS.INFO'),
    path: '/?layout=minimal'
  },
  {
    id: 'simple',
    name: 'Simple UI Collection',
    description: 'Minimal interfaces for focused tasks',
    icon: '⚡',
    color: themeUtils.get('COLORS.SUCCESS'),
    path: '/?layout=simple'
  },
  {
    id: 'graph',
    name: 'Graph UI',
    description: 'Visual representation of concepts and relationships',
    icon: '🌐',
    color: themeUtils.get('COLORS.WARNING'),
    path: '/?layout=graph'
  },
  {
    id: 'selfAnalysis',
    name: 'Self Analysis',
    description: 'System introspection and monitoring tools',
    icon: '🔍',
    color: themeUtils.get('COLORS.DANGER'),
    path: '/?layout=self-analysis'
  },
  {
    id: 'merged',
    name: 'Unified Interface (Docking Framework)',
    description: 'Comprehensive interface with all panels combined',
    icon: '🌐',
    color: themeUtils.get('COLORS.INFO'),
    path: '/' // This is now the main interface
  }
]);