import React from 'react';
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { ReactFlowProvider } from 'reactflow';
import AppLayout from './AppLayout';

describe('AppLayout', () => {
  it('renders without crashing', () => {
    render(
      <ReactFlowProvider>
        <AppLayout />
      </ReactFlowProvider>
    );
  });
});
