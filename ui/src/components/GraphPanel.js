import {Component} from './Component.js';
import {GraphManager} from '../visualization/GraphManager.js';

export class GraphPanel extends Component {
    constructor(containerId) {
        super(containerId);
        this.graphManager = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        if (!this.container) return;

        // GraphManager expects a map of elements
        const uiElements = {
            graphContainer: this.container,
            graphDetails: null
        };

        try {
            this.graphManager = new GraphManager(uiElements);
            this.graphManager.initialize();
            this.initialized = true;
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
            // GraphManager might not have reset, but we can clear
            this.graphManager.cy.elements().remove();
        }
    }
}
