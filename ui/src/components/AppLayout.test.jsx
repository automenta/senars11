import React from 'react';
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { AppLayout } from '../components/AppLayout';

describe('AppLayout', () => {
  it('renders without crashing', () => {
    render(<AppLayout />);
  });
});
