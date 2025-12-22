import {Component} from './Component.js';
import {GraphManager} from '../visualization/GraphManager.js';

export class GraphPanel extends Component {
    constructor(containerId) {
        super(containerId);
        this.graphManager = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized || !this.container) return;

        const uiElements = {
            graphContainer: this.container,
            graphDetails: null
        };

        try {
            this.graphManager = new GraphManager(uiElements);
            this.initialized = this.graphManager.initialize();
        } catch (e) {
            console.error('Failed to initialize GraphManager:', e);
        }
    }

    update(message) {
        this.graphManager?.initialized && this.graphManager.updateFromMessage(message);
    }

    reset() {
        this.graphManager?.initialized && this.graphManager.clear();
    }
}
