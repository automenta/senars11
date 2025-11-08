import blessed from 'blessed';

/**
 * ContextMenu class - reusable blessed Box component for displaying context menus
 */
export class ContextMenu {
    constructor(config = {}) {
        const { eventEmitter, parent, menuItems = [], position = { top: 0, left: 0 } } = config;
        this.eventEmitter = eventEmitter;
        this.parent = parent;
        this.menuItems = menuItems;
        this.position = position;
        this.element = null;
        this.isVisible = false;
        this.selectedIndex = 0;
    }

    init() {
        this.element = blessed.box({
            top: this.position.top,
            left: this.position.left,
            width: 'shrink',
            height: 'shrink',
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'black',
                border: { fg: 'green' },
                selected: { fg: 'black', bg: 'lightgreen' }
            },
            hidden: true,
            clickable: true,
            keys: true,
            vi: true,
            mouse: true
        });

        this.parent?.append?.(this.element);

        this._setupEventHandlers();
        return this.element;
    }

    _setupEventHandlers() {
        if (!this.element) return;

        // Handle keyboard navigation
        const navHandlers = {
            ['up,k']: () => this._navigateUp(),
            ['down,j']: () => this._navigateDown(),
            ['enter, ']: () => this._executeSelection(),
            ['escape,q']: () => this.hide()
        };

        Object.entries(navHandlers).forEach(([keys, handler]) => {
            this.element.key(keys.split(','), handler);
        });

        // Handle mouse selection
        this.element.on('mouse', (data) => {
            if (data.action === 'mouseup') {
                const itemIndex = data.y - this.element.iratio.y - 1; // Adjust for border
                this._selectItemByIndex(itemIndex);
            }
        });
    }

    _navigateUp() {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this._highlightSelection();
    }

    _navigateDown() {
        this.selectedIndex = Math.min(this.menuItems.length - 1, this.selectedIndex + 1);
        this._highlightSelection();
    }

    _selectItemByIndex(index) {
        if (index >= 0 && index < this.menuItems.length) {
            this.selectedIndex = index;
            this._executeSelection();
        }
    }

    show(position, menuItems) {
        this.position = position ?? this.position;
        this.menuItems = menuItems ?? this.menuItems;

        if (this.element) {
            this.element.position.top = this.position.top;
            this.element.position.left = this.position.left;
            this._renderMenu();
            this.element.show();
            this.isVisible = true;
            this.element.focus();
        }
    }

    hide() {
        if (this.element) {
            this.element.hide();
            this.isVisible = false;
            // Don't call focus on parent as it may not be a blessed element
        }
    }

    _renderMenu() {
        if (!this.element) return;

        const menuContent = this.menuItems.map((item, index) => {
            const isSelected = index === this.selectedIndex;
            const prefix = isSelected ? '❯ ' : '  ';
            return `${prefix}${item.label}`;
        }).join('\n');

        this.element.setContent(menuContent);
        this._highlightSelection();
    }

    _highlightSelection() {
        if (!this.element) return;

        const lines = this.element.getContent().split('\n');
        const highlightedLines = lines.map((line, index) => {
            const isSelected = index === this.selectedIndex;
            const prefix = isSelected ? '❯ ' : '  ';
            const content = line.replace(/^.{2}/, ''); // Remove existing prefix
            return `{${isSelected ? 'black' : 'white'}}{${isSelected ? 'lightgreen' : 'default'}}${prefix}{/}{/}${content}{/}`;
        });

        this.element.setContent(highlightedLines.join('\n'));
        this.parent?.render?.();
    }

    _executeSelection() {
        const selectedItem = this.menuItems[this.selectedIndex];
        if (selectedItem?.action) {
            // Add visual feedback for selection
            if (this.element) {
                const originalFg = this.element.style.fg;
                this.element.style.fg = 'magenta';
                this.element.screen.render();
                
                setTimeout(() => {
                    selectedItem.action();
                    if (this.element) {
                        this.element.style.fg = originalFg;
                        this.element.screen.render();
                    }
                }, 50);
            } else {
                selectedItem.action();
            }
        }
        this.hide();
    }

    setPosition(top, left) {
        this.position = { top, left };
        if (this.element) {
            this.element.position.top = top;
            this.element.position.left = left;
            this.parent?.render?.();
        }
    }

    getMenuItems() {
        return [...this.menuItems];
    }

    setMenuItems(items) {
        this.menuItems = [...items];
        this.selectedIndex = 0;
        this._renderMenu();
    }

    addItem(item) {
        this.menuItems.push(item);
        this._renderMenu();
    }

    removeItem(index) {
        if (index >= 0 && index < this.menuItems.length) {
            this.menuItems.splice(index, 1);
            this.selectedIndex = Math.min(this.selectedIndex, this.menuItems.length - 1);
            this._renderMenu();
        }
    }

    destroy() {
        this.element?.destroy?.();
        this.element = null;
        this.isVisible = false;
    }
}