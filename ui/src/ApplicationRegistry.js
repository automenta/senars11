/**
 * Application Registry: Centralized management of multiple UI applications
 * Following AGENTS.md: Organized, Modular, Abstract, DRY
 */

import React from 'react';
import { BaseApp, AppShell } from './components/BaseApp.js';
import { createApp } from './AppRegistry.js';

// Application definitions with metadata
const APP_DEFINITIONS = Object.freeze({
  // Core applications
  'ide': {
    id: 'ide',
    name: 'Cognitive IDE',
    description: 'Main IDE interface with flexible layout panels',
    icon: '🧠',
    component: () => import('./App.js'),
    routes: ['/', '/ide'],
    defaultLayout: 'ide'
  },
  'repl': {
    id: 'repl',
    name: 'REPL Interface',
    description: 'Read-Eval-Print Loop for direct NARS interaction',
    icon: '💻',
    component: () => import('./repl-app.js'),
    routes: ['/repl'],
    defaultLayout: 'repl'
  },
  'graph': {
    id: 'graph',
    name: 'Graph UI',
    description: 'Visual representation of concepts and relationships',
    icon: '🌐',
    component: () => import('./App.js'),
    routes: ['/graph'],
    defaultLayout: 'graph'
  },
  'self-analysis': {
    id: 'self-analysis',
    name: 'Self Analysis',
    description: 'System introspection and monitoring tools',
    icon: '🔍',
    component: () => import('./App.js'),
    routes: ['/self-analysis'],
    defaultLayout: 'self-analysis'
  },
  'launcher': {
    id: 'launcher',
    name: 'UI Launcher',
    description: 'Application launcher interface',
    icon: '🚀',
    component: () => import('./Launcher.js'),
    routes: ['/'],
    defaultLayout: 'launcher'
  },
  'merged': {
    id: 'merged',
    name: 'Merged Interface',
    description: 'Launcher and REPL in one view',
    icon: '🌐',
    component: () => import('./MergedLauncher.js'),
    routes: ['/merged'],
    defaultLayout: 'merged'
  }
});

// Utility class for application management
class ApplicationRegistry {
  constructor() {
    this.apps = new Map();
    this.initialized = false;
  }

  /**
   * Register an application with the registry
   * @param {string} id - Application ID
   * @param {Object} config - Application configuration
   */
  register(id, config) {
    if (this.apps.has(id)) {
      console.warn(`Application with ID ${id} already exists, overwriting...`);
    }

    // Validate required fields
    if (!id || !config.name || !config.component) {
      throw new Error(`Invalid application config for ${id}: missing required fields`);
    }

    this.apps.set(id, {
      id,
      ...config,
      createdAt: Date.now(),
      // Provide a factory function for creating app instances
      create: (appConfig = {}) => this.createAppInstance(id, { ...config, ...appConfig })
    });

    return this;
  }

  /**
   * Create an application instance
   * @param {string} id - Application ID
   * @param {Object} config - Configuration override
   * @returns {React.Component} Application component
   */
  createAppInstance(id, config = {}) {
    const appDef = this.apps.get(id);
    if (!appDef) {
      throw new Error(`Application ${id} not found in registry`);
    }

    const { component, name, defaultLayout } = { ...appDef, ...config };

    // Return a configured application component factory
    return (props = {}) => {
      const AppConfiguredApp = createApp({
        appId: id,
        appConfig: {
          title: name,
          layoutType: props.layoutType || defaultLayout,
          ...config
        },
        ...props
      });

      return React.createElement(BaseApp, {
        appId: id,
        appConfig: { title: name, ...config },
        ...props
      });
    };
  }

  /**
   * Get an application definition
   * @param {string} id - Application ID
   * @returns {Object} Application definition
   */
  get(id) {
    return this.apps.get(id);
  }

  /**
   * Get all registered applications
   * @returns {Array} Array of application definitions
   */
  getAll() {
    return Array.from(this.apps.values());
  }

  /**
   * Get application by URL path
   * @param {string} path - URL path
   * @returns {Object} Matching application definition
   */
  getByPath(path) {
    for (const [id, appDef] of this.apps.entries()) {
      if (appDef.routes?.some(route => path.startsWith(route))) {
        return { id, appDef };
      }
    }
    return null;
  }

  /**
   * Check if an application exists
   * @param {string} id - Application ID
   * @returns {boolean} Whether the application exists
   */
  has(id) {
    return this.apps.has(id);
  }

  /**
   * Load an application component dynamically
   * @param {string} id - Application ID
   * @returns {Promise<React.Component>} Loaded component
   */
  async loadComponent(id) {
    const appDef = this.apps.get(id);
    if (!appDef) {
      throw new Error(`Application ${id} not found in registry`);
    }

    if (typeof appDef.component === 'function') {
      return await appDef.component();
    }

    return appDef.component;
  }

  /**
   * Initialize the registry with default applications
   * @returns {ApplicationRegistry} Instance for chaining
   */
  initialize() {
    if (this.initialized) {
      return this;
    }

    // Register default applications
    for (const [id, definition] of Object.entries(APP_DEFINITIONS)) {
      this.register(id, definition);
    }

    this.initialized = true;
    return this;
  }

  /**
   * Reset the registry to initial state
   */
  reset() {
    this.apps.clear();
    this.initialized = false;
  }
}

// Global singleton instance
const applicationRegistry = new ApplicationRegistry();

// Initialize with default applications
applicationRegistry.initialize();

export { 
  applicationRegistry, 
  ApplicationRegistry, 
  APP_DEFINITIONS 
};

export default applicationRegistry;