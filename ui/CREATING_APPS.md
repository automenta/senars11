# Creating New Apps with Common Components

This document explains how to create new applications using the common component architecture.

## Overview

The UI system is built around a modular architecture that allows different application types to share common components,
state management, and infrastructure while maintaining their own specific functionality.

## Architecture Components

### 1. AppShell

- Provides common UI infrastructure (header, WebSocket status, etc.)
- Wraps all application content
- Handles common UI concerns

### 2. AppRegistry

- Manages registration of different application types
- Handles dynamic loading of applications
- Provides centralized app management

### 3. Hooks

- `useWebSocket`: Manages WebSocket connections and messaging
- `useUiData`: Accesses shared UI store data
- `useDataOperations`: Provides common data operation methods

### 4. AppLayout

- Predefined layouts for different application types (dashboard, IDE, analysis, visualization, simple)
- Uses flexlayout-react for panel management
- Configurable based on app type

## Creating a New App

### Step 1: Create the App Component

Create a new component that uses the common architecture:

```javascript
// Example: MyNewApp.js
import React from 'react';
import AppShell from './components/AppShell.js';
import AppLayout from './layouts/AppLayout.js';
import { useWebSocket } from './hooks/useWebSocket.js';

function MyNewApp({ appId = 'myNewApp', appConfig = {} }) {
  const { wsConnected } = useWebSocket();

  return React.createElement(AppShell, 
    { 
      appId, 
      appConfig: { title: 'My New App', ...appConfig },
      showWebSocketStatus: true
    },
    React.createElement(AppLayout, { layoutType: 'dashboard' }), // or 'ide', 'analysis', etc.
    wsConnected 
      ? null  // Connection status shown in header
      : React.createElement('div', { 
          style: { padding: '10px', backgroundColor: '#ffeeee', color: '#d00' } 
        }, 'WebSocket Disconnected')
  );
}

export default MyNewApp;
```

### Step 2: Register the App

Register your app with the AppRegistry:

```javascript
// In your main application file or in AppRegistry.js
import appRegistry from './AppRegistry.js';

appRegistry.registerApp('myNewApp', {
  title: 'My New App',
  description: 'Description of my new application',
  loadComponent: () => import('./MyNewApp.js'),
  icon: '🌟',  // Any emoji or character
  category: 'custom',
  permissions: [],
  dependencies: [],
  config: {
    // Any app-specific configuration
  }
});
```

### Step 3: Choose an App Layout

Select an appropriate layout from the available options:

- `dashboard`: For dashboard-style interfaces
- `ide`: For development/IDE style layouts
- `analysis`: For analysis-focused interfaces
- `visualization`: For visualization-heavy apps
- `simple`: For minimal interfaces

### Step 4: Use Common Components

Use the common components available in `./components/GenericComponents.js`:

- `Button`: Styled buttons with variants
- `Card`: Card containers
- `StatusBadge`: Status indicators
- `LoadingSpinner`: Loading indicators
- `EmptyState`: Empty state displays
- `ErrorState`: Error state displays
- `TimeDisplay`: Time formatting
- `WebSocketStatus`: Connection status
- `GenericFormField`, `GenericInputField`, `GenericSelectField`: Form components
- `CollapsibleSection`: Collapsible sections
- `ToggleSwitch`: Toggle switches

### Step 5: Access Shared Data

Use the provided hooks to access shared data:

```javascript
import { useUiData, useDataOperations } from './hooks/useWebSocket.js';

function MyComponent() {
  // Access shared data
  const { tasks, concepts, reasoningSteps, wsConnected } = useUiData();
  
  // Access data operations
  const { addTask, updateTask, removeTask } = useDataOperations();
  
  // Use the data in your component
  return React.createElement('div', null, 
    // Your component content
  );
}
```

## Best Practices

1. Always use the `AppShell` component to wrap your app content
2. Leverage common components to maintain consistency
3. Use the appropriate app layout for your use case
4. Access data through the provided hooks rather than directly accessing the store
5. Follow the AGENTS.md code guidelines (Elegant, Consolidated, Consistent, Organized, etc.)
6. Use the theme utility functions for consistent styling
7. Handle WebSocket connections through the provided hooks
8. Use React.createElement instead of JSX for consistency with the codebase