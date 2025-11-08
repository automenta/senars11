import blessed from 'blessed';

/**
 * Abstract Base Component class for blessed UI components
 */
export class BaseComponent {
    constructor(config = {}) {
        const { elementConfig = {}, elementType = 'box', parent, eventEmitter } = config;
        this.config = config;
        this.elementConfig = elementConfig;
        this.elementType = elementType;
        this.parent = parent;
        this.eventEmitter = eventEmitter;
        this.element = null;
        this.isInitialized = false;
        this.children = [];
    }

    init() {
        this.element = blessed[this.elementType](this.elementConfig);

        if (this.parent && this.element) {
            this.parent.append(this.element);
        }

        this.isInitialized = true;
        return this.element;
    }

    render() {
        this.element?.screen?.render?.();
    }

    getElement() {
        return this.element;
    }

    setContent(content) {
        if (typeof this.element?.setContent === 'function') {
            this.element.setContent(content);
            this.render();
        }
    }

    pushLine(line) {
        if (typeof this.element?.pushLine === 'function') {
            this.element.pushLine(line);
            this.render();
        }
    }

    clear() {
        if (typeof this.element?.clear === 'function') {
            this.element.clear();
            this.render();
        }
    }

    focus() {
        typeof this.element?.focus === 'function' && this.element.focus();
    }

    hide() {
        if (this.element) {
            this.element.hide();
            this.render();
        }
    }

    show() {
        if (this.element) {
            this.element.show();
            this.render();
        }
    }

    setPosition(top, left, width, height) {
        if (!this.element) return;

        const position = this.element.position;
        top !== undefined && (position.top = top);
        left !== undefined && (position.left = left);
        width !== undefined && (position.width = width);
        height !== undefined && (position.height = height);

        this.element.screen.render();
    }

    emit(event, data) {
        this.eventEmitter?.emit(event, data);
    }

    on(event, handler) {
        this.eventEmitter?.on(event, handler);
    }

    addChild(child) {
        this.children.push(child);
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) this.children.splice(index, 1);
    }

    getChildren() {
        return [...this.children];
    }

    destroy() {
        this.element?.destroy?.();

        this.children.forEach(child => child.destroy());
        this.children = [];
        this.isInitialized = false;
    }
}