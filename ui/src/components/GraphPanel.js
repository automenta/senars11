import {Component} from './Component.js';
import {GraphManager} from '../visualization/GraphManager.js';

/**
 * GraphPanel component for displaying and managing the visualization
 */
export class GraphPanel extends Component {
    constructor(containerId) {
        super(containerId);
        this.graphManager = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized || !this.container) return;

        // GraphManager expects a map of elements
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
        if (this.graphManager && this.initialized) {
            this.graphManager.updateFromMessage(message);
        }
    }

    reset() {
        if (this.graphManager && this.initialized) {
            this.graphManager.clear();
        }
    }
}
