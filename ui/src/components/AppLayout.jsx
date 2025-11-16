/**
 * @file The main layout component for the SeNARS UI.
 * It assembles all the major UI panels and control bars into the final layout.
 * This component receives fully composed panels as props to keep it purely structural.
 */
import React from 'react';
import { InputBar } from './InputBar';
import { ControlBar } from './ControlBar';

export const AppLayout = ({ viewControls, logPanel, graphPanel, onSendNarsese }) => {
  return (
    <div className="app-layout">
      <header className="app-layout-header">
        <ControlBar />
        {viewControls}
      </header>
      <main className="app-layout-main">
        <div className="app-layout-graph">
          {graphPanel}
        </div>
        <div className="app-layout-log">
          {logPanel}
        </div>
      </main>
      <footer className="app-layout-footer">
        <InputBar onInput={onSendNarsese} />
      </footer>
    </div>
  );
};
