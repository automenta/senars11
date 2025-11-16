import React from 'react';
import ControlBar from './ControlBar';
import GraphPanel from './GraphPanel';
import InputBar from './InputBar';
import LogPanel from './LogPanel';
import ViewControls from './ViewControls';
import useNarStore from '../store/nar-store';

/**
 * The main layout of the application.
 */
const AppLayout = () => {
  const { isConnected, isSnapshotLoading, logEntries } = useNarStore();

  return (
    <div className="app-layout">
      {!isConnected && <div className="disconnect-banner">Disconnected</div>}
      {isSnapshotLoading && <div className="loading-indicator">Loading...</div>}
      <div className="main-content">
        <GraphPanel />
        <LogPanel entries={logEntries} />
      </div>
      <div className="sidebar">
        <ControlBar />
        <ViewControls onUpdate={() => {}} />
        <InputBar onSend={() => {}} />
      </div>
    </div>
  );
};

export default AppLayout;
