/**
 * DemoStateManager - handles the state management for demos
 */
export class DemoStateManager {
    constructor() {
        this.demoStates = {};
    }

    initializeDemoState(demoId, parameters) {
        this.demoStates[demoId] = {
            state: 'running',
            progress: 0,
            currentStep: 0,
            parameters,
            demoId,
            startTime: Date.now(),
            lastUpdateTime: Date.now()
        };
        return this.demoStates[demoId];
    }

    updateDemoState(demoId, stateUpdate) {
        if (demoId && this.demoStates[demoId]) {
            this.demoStates[demoId] = {
                ...this.demoStates[demoId],
                ...stateUpdate
            };
        } else if (demoId) {
            this.demoStates[demoId] = {
                ...stateUpdate,
                demoId
            };
        }
    }

    finalizeDemoState(demoId, state, additionalData = {}) {
        if (this.demoStates[demoId]) {
            this.demoStates[demoId] = {
                ...this.demoStates[demoId],
                state,
                endTime: Date.now(),
                progress: state === 'completed' ? 100 : this.demoStates[demoId].progress || 0,
                ...additionalData
            };
        }
    }

    getDemoState(demoId) {
        return this.demoStates[demoId];
    }

    clearDemoState(demoId) {
        if (demoId && this.demoStates[demoId]) {
            delete this.demoStates[demoId];
        }
    }

    getAllDemoStates() {
        return { ...this.demoStates };
    }

    hasRunningDemo() {
        return Object.values(this.demoStates).some(state => state.state === 'running');
    }

    getRunningDemoId() {
        const runningDemo = Object.entries(this.demoStates).find(
            ([id, state]) => state.state === 'running'
        );
        return runningDemo ? runningDemo[0] : null;
    }
}