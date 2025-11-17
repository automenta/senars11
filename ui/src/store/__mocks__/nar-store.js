import { vi } from 'vitest';

const actions = {
  requestSnapshot: vi.fn(),
  toggleLiveUpdate: vi.fn(),
};

const useNarStore = vi.fn(() => ({
  isConnected: true,
  isSnapshotLoading: false,
  logEntries: [],
  liveUpdateEnabled: true,
  actions,
}));

export default useNarStore;
