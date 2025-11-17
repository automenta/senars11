import '@testing-library/jest-dom';

// Mock ResizeObserver for react-flow
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;
