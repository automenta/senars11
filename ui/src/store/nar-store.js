import { create } from 'zustand';
import { narService } from '../services/nar-service';

const useNarStore = create((set, get) => ({
    graphNodes: [],
    graphEdges: [],
    logEntries: [],
    lastSnapshotTime: 0,
    isSnapshotLoading: false,

    actions: {
        handleSnapshot: (snapshot) => {
            const { concepts, tasks } = snapshot;
            const newNodes = concepts.map(c => ({ id: c.id, label: c.term }));
            const newEdges = tasks
                .filter(t => t.term.type === 'Implication')
                .map(t => ({
                    id: t.id,
                    source: t.term.predicate,
                    target: t.term.subject,
                }));

            set({
                graphNodes: newNodes,
                graphEdges: newEdges,
                lastSnapshotTime: Date.now(),
                isSnapshotLoading: false,
            });
        },

        handleEventBatch: (events) => {
            const { lastSnapshotTime } = get();
            const newLogEntries = get().logEntries.slice();

            for (const event of events) {
                if (event.timestamp > lastSnapshotTime) {
                    newLogEntries.push(event);
                }
            }

            set({ logEntries: newLogEntries });
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

export default useNarStore;
