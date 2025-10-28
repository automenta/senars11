# UI Plan: Unified Web and CLI (Corrected)

This plan outlines a corrected, implementable architecture for a unified UI serving both web and command-line interfaces from a single codebase. It avoids synchronous module loading issues by isolating the asynchronous `import('ink')` to the CLI entry point.

---

## Core Principles
- **Single Codebase**: Shared components and hooks for both platforms.
- **Platform Abstraction**: Primitives are defined synchronously for the web and overridden at runtime for the CLI.
- **ESM Native**: No `require()` or bundler hacks.
- **Developer Experience**: Hot reloading for both web and CLI.

---

## 1. Dependencies

```bash
# Core dependencies
npm i react ink react-hook-form zod

# Development dependencies
npm i -D vite @vitejs/plugin-react nodemon
```

---

## 2. Project Structure

```
ui/
├── shared/
│   ├── components/     # Shared components (Button, Grid, etc.)
│   ├── hooks/          # Shared hooks
│   ├── platform/       # Synchronous platform module
│   └── App.js          # Root application component
├── cli/
│   └── index.js        # CLI entry point (imports and patches Ink)
└── web/
    ├── index.html
    ├── index.js        # Web entry point
    └── vite.config.js  # Vite configuration
```

---

## 3. Platform Abstraction (`ui/shared/platform/index.js`)

This module is fully synchronous and defaults to web primitives.

```js
// ui/shared/platform/index.js
import { createElement as h } from 'react';

export const PLATFORM = process.env.PLATFORM || 'web';

// Default to web primitives. These will be monkey-patched by the CLI entry point.
export let Box = 'div';
export let Text = 'span';
export let Newline = 'br';

// Re-export shared components
export { default as Button } from '../components/Button.js';
export { default as Grid } from '../components/Grid.js';
export { default as Modal } from '../components/Modal.js';
export { default as Tabs } from '../components/Tabs.js';

export { h };
```

---

## 4. CLI Entry Point (`ui/cli/index.js`)

This is the **only** place where Ink is imported. It dynamically patches the platform primitives before rendering the application.

```js
#!/usr/bin/env node
process.env.PLATFORM = 'cli';

import { render } from 'ink';
import { createElement as h } from 'react';
import App from '../shared/App.js';

// Import the platform module to be patched
import * as platform from '../shared/platform/index.js';

// Dynamically import Ink and get its components
const { Box, Text, Newline } = await import('ink');

// Monkey-patch the platform exports for the CLI process
Object.assign(platform, { Box, Text, Newline });

// Render the app now that the primitives are correctly set
render(h(App));
```

---

## 5. Web Entry Point (`ui/web/index.js`)

The web entry point remains simple and unchanged.

```js
process.env.PLATFORM = 'web';

import { createRoot } from 'react-dom/client';
import { createElement as h } from 'react';
import App from '../shared/App.js';

createRoot(document.getElementById('root')).render(h(App));
```

---

## 6. Shared Components

Components can now safely import from `platform` and will receive the correct primitives based on the environment.

### Example: `ui/shared/components/Button.js`
```js
import { h, Box, Text, PLATFORM } from '../platform/index.js';

export default function Button({ children, onPress, primary }) {
  if (PLATFORM === 'cli') {
    return h(Box, {
      borderStyle: 'round',
      paddingX: 1,
      borderColor: primary ? 'blue' : 'gray',
    }, h(Text, {}, children));
  }

  return h('button', {
    onClick: onPress,
    style: {
      background: primary ? '#1e90ff' : '#333',
      color: 'white',
      padding: '8px 16px',
      border: 'none',
      borderRadius: 4,
    }
  }, children);
}
```

---

## 7. Development and Build

### Dev Scripts (`package.json`)
```json
{
  "scripts": {
    "dev:cli": "nodemon --watch ui --ext js --exec 'PLATFORM=cli node ui/cli/index.js'",
    "dev:web": "vite"
  }
}
```

### Vite Config (`ui/web/vite.config.js`)
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // The root is the web sub-directory
  root: 'ui/web',
  plugins: [
    react({
      // Use classic runtime to avoid automatic JSX imports
      jsxRuntime: 'classic'
    })
  ],
});
```

### Build CLI Binary
```bash
pkg ui/cli/index.js --out-path dist/ --targets node18-linux-x64
```