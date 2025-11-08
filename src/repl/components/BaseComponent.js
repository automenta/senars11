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

    /**
     * Add visual feedback with optional animation
     */
    addVisualFeedback(content, options = {}) {
        const { animate = true, flashDuration = 200, callback } = options;
        const color = options.color || 'yellow';

        if (animate && this.element) {
            // Store original style properties to avoid object creation
            const originalFg = this.element.style.fg;

            // Flash effect
            this.element.style.fg = color;
            this.render();

            setTimeout(() => {
                // Restore original style
                if (this.element?.style) {
                    this.element.style.fg = originalFg;
                    this.render();
                }
                if (callback) callback();
            }, flashDuration);
        }

        if (typeof this.element?.setContent === 'function' && content !== undefined) {
            this.element.setContent(content);
            this.render();
        }
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
    
    /**
     * Create an animated progress bar
     */
    createProgressBar(current, total, width = 20, options = {}) {
        const percentage = total > 0 ? current / total : 0;
        const filledWidth = Math.floor(percentage * width);
        const emptyWidth = width - filledWidth;
        
        const filledChar = options.filledChar || '█';
        const emptyChar = options.emptyChar || '░';
        const prefix = options.prefix || '';
        const suffix = options.suffix || '';
        
        const filled = filledChar.repeat(filledWidth);
        const empty = emptyChar.repeat(emptyWidth);
        
        // Animate with color based on progress
        const progressColor = this._getProgressColor(percentage);
        
        return `${prefix}[{${progressColor}}${filled}${empty}{/}] ${Math.round(percentage * 100)}%${suffix}`;
    }
    
    /**
     * Get color based on progress percentage
     */
    _getProgressColor(percentage) {
        if (percentage < 0.3) return 'red';
        if (percentage < 0.7) return 'yellow';
        return 'green';
    }
    
    /**
     * Show animated progress indicator for long operations
     */
    showProgressIndicator(message, options = {}) {
        const {
            duration = 1000,
            animationInterval = 200,
            onComplete = () => {},
            onProgress = () => {}
        } = options;
        
        if (!this.element) return;
        
        const animationChars = ['◐', '◓', '◑', '◒'];
        let animIndex = 0;
        
        const updateAnimation = () => {
            const animChar = animationChars[animIndex % animationChars.length];
            const originalContent = this.element.getContent();
            this.element.setContent(`${animChar} ${message}`);
            this.render();
            animIndex++;
        };
        
        // Start animation
        updateAnimation();
        const intervalId = setInterval(updateAnimation, animationInterval);
        
        // Stop animation after duration
        setTimeout(() => {
            clearInterval(intervalId);
            if (onComplete) onComplete();
            this.element.setContent(message.replace(/^[^ ]+ /, '')); // Remove animation character
            this.render();
        }, duration);
    }
    
    /**
     * Create a modal progress dialog for long operations
     */
    createProgressDialog(title, options = {}) {
        if (!this.parent) return null;
        
        const progressDialog = blessed.box({
            top: 'center',
            left: 'center',
            width: options.width || '50%',
            height: options.height || 5,
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'black',
                border: { fg: 'green' }
            },
            tags: true,
            content: `{center}${title}{/center}\n`,
            hidden: false
        });
        
        this.parent.append(progressDialog);
        this.render();
        
        return progressDialog;
    }
}
}