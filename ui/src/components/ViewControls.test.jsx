import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReactFlowProvider } from 'reactflow';
import ViewControls from './ViewControls';
import useNarStore from '../store/nar-store';

vi.mock('../store/nar-store');

describe('ViewControls', () => {
  it('calls requestSnapshot when the refresh button is clicked', () => {
    render(
      <ReactFlowProvider>
        <ViewControls />
      </ReactFlowProvider>
    );

    fireEvent.click(screen.getByText('Refresh'));
    expect(useNarStore().actions.requestSnapshot).toHaveBeenCalled();
  });
});
