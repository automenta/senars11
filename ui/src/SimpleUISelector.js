import React from 'react';
import { createRoot } from 'react-dom/client';

// Simple UIs available
const SIMPLE_UIS = [
  {
    id: 'visualVerification',
    name: 'Visual Verification',
    description: 'Visual verification of reasoning processes',
    path: '/simple-uis/VisualVerificationApp.js',
    component: 'VisualVerificationApp'
  },
  {
    id: 'narseseInput',
    name: 'Narsese Input',
    description: 'Direct Narsese input interface',
    path: '/simple-uis/NarseseInput.js',
    component: 'NarseseInput'
  },
  {
    id: 'taskMonitor',
    name: 'Task Monitor',
    description: 'Monitor active tasks in the system',
    path: '/simple-uis/TaskMonitor.js',
    component: 'TaskMonitor'
  },
  {
    id: 'demoRunner',
    name: 'Demo Runner',
    description: 'Run predefined demos',
    path: '/simple-uis/DemoRunner.js',
    component: 'DemoRunner'
  }
];

const SimpleUISelector = () => {
  const handleSelect = (ui) => {
    // For now, let's redirect to the specific simple UI
    // In a real implementation, we might want to have the simple-uis index.html
    // that selects specific components
    window.location.href = '/simple-uis/index.html';
  };

  return React.createElement('div', { className: 'min-h-screen bg-gradient-to-br from-gray-50 to-gray-100' },
    React.createElement('header', { className: 'bg-white shadow-sm py-6' },
      React.createElement('div', { className: 'container mx-auto px-4' },
        React.createElement('h1', { className: 'text-3xl font-bold text-center text-gray-800' }, 
          'Simple UI Selector'
        ),
        React.createElement('p', { className: 'text-center text-gray-600 mt-2' },
          'Select a simple interface to begin'
        )
      )
    ),

    React.createElement('main', { className: 'container mx-auto px-4 py-12' },
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto' },
        SIMPLE_UIS.map(ui => 
          React.createElement('div', {
            key: ui.id,
            className: 'p-6 rounded-lg shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl border border-gray-200 bg-blue-500 text-white',
            onClick: () => handleSelect(ui),
            style: { minHeight: '120px' }
          },
          React.createElement('div', { className: 'flex flex-col h-full' },
            React.createElement('h3', { className: 'text-xl font-bold mb-2' }, ui.name),
            React.createElement('p', { className: 'text-sm opacity-90 flex-grow' }, ui.description)
          )
          )
        )
      )
    )
  );
};

// Render the selector to the DOM
const container = document.getElementById('root');
const root = createRoot(container);
root.render(React.createElement(SimpleUISelector));

export default SimpleUISelector;