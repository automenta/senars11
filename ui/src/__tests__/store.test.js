import {beforeEach, describe, expect, it} from 'vitest';
import useUiStore from '../stores/uiStore';

// Unit tests for Zustand store
describe('UI Store', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        useUiStore.setState({
            layout: null,
            wsConnected: false,
            panels: {},
            reasoningSteps: [],
            activeSession: null,
            error: null,
            isLoading: false,
            theme: 'light',
            savedLayouts: {},
            notifications: []
        });
    });

    it('should initialize with default values', () => {
        const state = useUiStore.getState();
        expect(state.wsConnected).toBe(false);
        expect(state.theme).toBe('light');
        expect(state.panels).toEqual({});
    });

    it('should update connection status', () => {
        const {setWsConnected} = useUiStore.getState();
        setWsConnected(true);

        expect(useUiStore.getState().wsConnected).toBe(true);
    });

    it('should add and remove panels', () => {
        const {addPanel, removePanel} = useUiStore.getState();

        addPanel('test-panel', {title: 'Test Panel'});
        expect(useUiStore.getState().panels['test-panel']).toEqual({title: 'Test Panel'});

        removePanel('test-panel');
        expect(useUiStore.getState().panels['test-panel']).toBeUndefined();
    });

    it('should toggle theme', () => {
        const {toggleTheme} = useUiStore.getState();

        toggleTheme();
        expect(useUiStore.getState().theme).toBe('dark');

        toggleTheme();
        expect(useUiStore.getState().theme).toBe('light');
    });
});