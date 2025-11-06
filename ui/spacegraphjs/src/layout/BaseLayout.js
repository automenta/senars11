export class BaseLayout {
  space = null;
  pluginManager = null;
  nodes = [];

  constructor(config = {}) {
    this.settings = { ...this.getDefaultSettings(), ...config };
  }

  getDefaultSettings() {
    return {
      animate: true,
    };
  }

  setContext(space, pluginManager) {
    this.space = space;
    this.pluginManager = pluginManager;
  }

  updateConfig(newConfig) {
    this.settings = { ...this.settings, ...newConfig };
  }

  init(nodes, edges, config = {}) {
    if (config) this.updateConfig(config);
    this.nodes = [...nodes];
  }

  run() {}

  stop() {}

  kick() {}

  addNode(_node) {}

  removeNode(_node) {}

  addEdge(_edge) {}

  removeEdge(_edge) {}

  dispose() {
    this.nodes = [];
    this.space = null;
    this.pluginManager = null;
  }
}
