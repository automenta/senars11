import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {ContextMenu} from '../ContextMenu.js';
import blessed from 'blessed';

describe('ContextMenu', () => {
    let screen;
    let contextMenu;

    beforeEach(() => {
        screen = blessed.screen({
            terminal: 'xterm-256color',
            autoPadding: true,
            smartCSR: true,
            fullUnicode: true,
            height: 25,
            width: 80
        });
    });

    afterEach(() => {
        if (contextMenu && contextMenu.element) {
            contextMenu.destroy();
        }
        if (screen) {
            screen.destroy();
        }
    });

    test('should initialize without errors', () => {
        contextMenu = new ContextMenu({
            parent: screen,
            position: {top: 5, left: 10}
        });

        const element = contextMenu.init();
        expect(element).toBeDefined();
        expect(contextMenu.element).toBeDefined();
    });

    test('should show and hide properly', () => {
        contextMenu = new ContextMenu({
            parent: screen,
            position: {top: 5, left: 10}
        });
        contextMenu.init();

        const menuItems = [
            {
                label: 'Option 1', action: () => {
                }
            },
            {
                label: 'Option 2', action: () => {
                }
            }
        ];

        contextMenu.show({top: 5, left: 10}, menuItems);
        expect(contextMenu.isVisible).toBe(true);

        contextMenu.hide();
        expect(contextMenu.isVisible).toBe(false);
    });

    test('should set and get menu items correctly', () => {
        contextMenu = new ContextMenu({
            parent: screen,
            position: {top: 5, left: 10}
        });
        contextMenu.init();

        const menuItems = [
            {
                label: 'Test Option', action: () => {
                }
            }
        ];

        contextMenu.setMenuItems(menuItems);
        const retrievedItems = contextMenu.getMenuItems();

        expect(retrievedItems).toHaveLength(1);
        expect(retrievedItems[0].label).toBe('Test Option');
    });
});