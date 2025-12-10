/**
 * Base Component class providing common functionality for UI components
 */
export class Component {
    constructor(container) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        if (!this.container) {
            console.warn(`Container not found for ${this.constructor.name}`);
        }
        this.elements = {};
    }

    render() {
        // To be implemented by subclasses
    }

    mount(parent) {
        if (parent) {
            this.container = parent;
        }
        if (this.container) {
            this.render();
        }
    }
}
