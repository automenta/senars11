import { jest } from '@jest/globals';
import { NotebookManager } from '../../src/notebook/NotebookManager.js';
import { eventBus } from '../../src/core/EventBus.js';

describe('NotebookManager Refactor', () => {
    let container;
    let manager;

    beforeEach(() => {
        container = document.createElement('div');
        eventBus.clear();
        manager = new NotebookManager(container);
    });

    test('addCell emits notebook:cell:added', (done) => {
        eventBus.on('notebook:cell:added', (cell) => {
            try {
                expect(cell.content).toBe('test');
                done();
            } catch (e) {
                done(e);
            }
        });
        manager.createMarkdownCell('test');
    });

    test('removeCell emits notebook:cell:removed', (done) => {
        const cell = manager.createMarkdownCell('test');
        eventBus.on('notebook:cell:removed', (removed) => {
            try {
                expect(removed).toBe(cell);
                done();
            } catch (e) {
                done(e);
            }
        });
        manager.removeCell(cell);
    });

    test('cells state is reactive', () => {
        const cell = manager.createMarkdownCell('test');
        expect(manager.state.cells).toContain(cell);

        manager.removeCell(cell);
        expect(manager.state.cells).not.toContain(cell);
    });
});
