import React from 'react';
import { ControlBar } from './ControlBar';
import { GraphPanel } from './GraphPanel';
import { InputBar } from './InputBar';
import { LogPanel } from './LogPanel';
import { ViewControls } from './ViewControls';

/**
 * The main layout of the application.
 */
export const AppLayout = () => {
  return (
    <div className="app-layout">
      <div className="main-content">
        <GraphPanel nodes={[]} edges={[]} />
        <LogPanel entries={[]} />
      </div>
      <div className="sidebar">
        <ControlBar />
        <ViewControls onUpdate={() => {}} />
        <InputBar onSend={() => {}} />
      </div>
    </div>
  );
};
