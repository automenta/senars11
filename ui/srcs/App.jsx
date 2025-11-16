/**
 * @file The root component of the SeNARS UI application.
 * This file assembles the main layout and wires together the state store,
 * WebSocket service, and UI components.
 */
import { useEffect } from 'react';
import { AppLayout } from './components/AppLayout';
import { ViewControls } from './components/ViewControls';
import { LogPanel } from './components/LogPanel';
import { GraphPanel } from './components/GraphPanel';
import { useNARStore } from './store/nar-store';
import narService from './services/nar-service';
import './App.css';

// Determine WebSocket URL from environment variables
const VITE_WS_HOST = import.meta.env.VITE_WS_HOST || 'localhost';
const VITE_WS_PORT = import.meta.env.VITE_WS_PORT || 8080;
const WS_URL = `ws://${VITE_WS_HOST}:${VITE_WS_PORT}`;

function App() {
  // Select state and actions from the Zustand store
  const {
    viewQuery,
    liveUpdateEnabled,
    logEntries,
    graphNodes,
    graphEdges,
    setViewQuery,
    toggleLiveUpdate,
    handleSnapshot,
    handleEventBatch,
  } = useNARStore((state) => ({
    viewQuery: state.viewQuery,
    liveUpdateEnabled: state.liveUpdateEnabled,
    logEntries: state.logEntries,
    graphNodes: state.graphNodes,
    graphEdges: state.graphEdges,
    setViewQuery: state.setViewQuery,
    toggleLiveUpdate: state.toggleLiveUpdate,
    handleSnapshot: state.handleSnapshot,
    handleEventBatch: state.handleEventBatch,
  }));

  // Initialize WebSocket service and subscribe to events on mount
  useEffect(() => {
    narService.initialize(WS_URL);

    const onSnapshot = (snapshot) => handleSnapshot(snapshot);
    const onBatch = (batch) => {
      // Only process batch if live updates are enabled
      if (useNARStore.getState().liveUpdateEnabled) {
        handleEventBatch(batch);
      }
    };

    narService.on('snapshot', onSnapshot);
    narService.on('batch', onBatch);

    // Cleanup listeners on component unmount
    return () => {
      narService.off('snapshot', onSnapshot);
      narService.off('batch', onBatch);
      narService.close();
    };
  }, [handleSnapshot, handleEventBatch]);

  // Handler for the "Refresh View" button
  const handleRefresh = () => {
    // Get the latest query from the store and request a snapshot
    const currentQuery = useNARStore.getState().viewQuery;
    narService.requestMemorySnapshot(currentQuery);
  };

  // Handler for sending Narsese input
  const handleSendNarsese = (narsese) => {
    narService.sendNarsese(narsese);
  };

  return (
    <AppLayout
      viewControls={
        <ViewControls
          limit={viewQuery.limit}
          sortBy={viewQuery.sortBy}
          liveUpdateEnabled={liveUpdateEnabled}
          onLimitChange={(limit) => setViewQuery({ limit: parseInt(limit, 10) })}
          onSortByChange={(sortBy) => setViewQuery({ sortBy })}
          onToggleLive={toggleLiveUpdate}
          onRefresh={handleRefresh}
        />
      }
      logPanel={<LogPanel entries={logEntries} />}
      graphPanel={<GraphPanel nodes={graphNodes} edges={graphEdges} />}
      onSendNarsese={handleSendNarsese}
    />
  );
}

export default App;
