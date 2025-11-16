import React from 'react';
import { LogPanel } from './LogPanel';
import { InputBar } from './InputBar';
import { ControlBar } from './ControlBar';
import { ViewControls } from './ViewControls';
import { GraphPanel } from './GraphPanel';

export const AppLayout = () => {
  return (
    <div className="app-layout">
      <div className="app-layout-header">
        <ControlBar />
        <ViewControls />
      </div>
      <div className="app-layout-main">
        <div className="app-layout-graph">
          <GraphPanel nodes={[]} edges={[]} />
        </div>
        <div className="app-layout-log">
          <LogPanel entries={[]} />
        </div>
      </div>
      <div className="app-layout-footer">
        <InputBar onInput={() => {}} />
      </div>
    </div>
  );
};
