import { create } from 'zustand';
import { narService } from '../services/nar-service';

const useNarStore = create((set, get) => ({
    graphNodes: [],
    graphEdges: [],
    logEntries: [],
    lastSnapshotTime: 0,
    isSnapshotLoading: false,
    liveUpdateEnabled: true,
    isConnected: false,

    actions: {
        toggleLiveUpdate: () => set(state => ({ liveUpdateEnabled: !state.liveUpdateEnabled })),

        handleConnectionOpen: () => set({ isConnected: true }),

        handleConnectionClose: () => set({ isConnected: false }),

        handleSnapshot: (snapshot) => {
            const { concepts, tasks } = snapshot;
            const newNodes = concepts.map(c => ({ id: c.id, label: c.term }));
            const newEdges = tasks
                .filter(t => t.term.operator === '==>')
                .map(t => ({
                    id: t.id,
                    source: t.term.components[0].id,
                    target: t.term.components[1].id,
                }));

            set({
                graphNodes: newNodes,
                graphEdges: newEdges,
                lastSnapshotTime: Date.now(),
                isSnapshotLoading: false,
            });
        },

        handleEventBatch: (events) => {
            const { lastSnapshotTime, liveUpdateEnabled } = get();
            if (!liveUpdateEnabled) return;

            const newLogEntries = get().logEntries.slice();
            const newNodes = [...get().graphNodes];
            const newEdges = [...get().graphEdges];

            for (const event of events) {
                if (event.timestamp > lastSnapshotTime) {
                    newLogEntries.push(event);

                    if (event.type === 'concept:created') {
                        newNodes.push({ id: event.payload.id, label: event.payload.term });
                    } else if (event.type === 'task:added' && event.payload.term.operator === '==>') {
                        newEdges.push({
                            id: event.payload.id,
                            source: event.payload.term.components[0].id,
                            target: event.payload.term.components[1].id,
                        });
                    }
                }
            }

            set({
                logEntries: newLogEntries,
                graphNodes: newNodes,
                graphEdges: newEdges,
            });
            get().actions.pruneLog();
        },

        pruneLog: () => {
            const { logEntries } = get();
            if (logEntries.length > 1000) {
                set({ logEntries: logEntries.slice(logEntries.length - 1000) });
            }
        },

        requestSnapshot: () => {
            set({ isSnapshotLoading: true });
            narService.requestSnapshot();
        },
    },
}));

narService.on('memorySnapshot', useNarStore.getState().actions.handleSnapshot);
narService.on('event-batch', useNarStore.getState().actions.handleEventBatch);
narService.on('open', useNarStore.getState().actions.handleConnectionOpen);
narService.on('close', useNarStore.getState().actions.handleConnectionClose);

export default useNarStore;
