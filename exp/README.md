# SeNARS Desktop UI Experiments

This directory contains two parallel experiments for creating a desktop UI for SeNARS:

## Experiments

### A. Tauri (`tauri/`)

- **Approach**: Webview-based desktop app reusing existing web UI code
- **Technology**: Tauri 2, Rust backend, React frontend
- **Features**: 100% code reuse from web UI, native process control

### B. NodeGUI (`nodegui/`)

- **Approach**: Native Qt widgets using React bindings
- **Technology**: NodeGUI, React, native rendering
- **Features**: Native performance, smaller bundle size, no webview dependencies

## Structure

```
exp/
├── tauri/        # Tauri experiment
└── nodegui/      # NodeGUI experiment
```

## Running Experiments

### Tauri

```bash
cd exp/tauri
npm run tauri dev    # Development mode
npm run tauri build  # Build release
```

### NodeGUI

```bash
cd exp/nodegui
npm run dev          # Development mode
npm run build        # Build production
```

## Results

See `comparison.md` in the project root for performance comparisons, bundle sizes, and our final recommendation.