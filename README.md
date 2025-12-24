# SeNARS (Semantic Non-axiomatic Reasoning System)

**SeNARS** is the kernel for a new generation of cognitive architectures. It fuses the **fluid creativity** of Large Language Models (LLMs) with the **rigorous logic** of Non-Axiomatic Reasoning Systems (NARS).

## How to Use This Documentation

This documentation is organized into three main categories:

- **Getting Started**: For newcomers to understand and use SeNARS quickly
- **System Design**: For understanding the architecture and internal workings
- **Reference**: For detailed API, configuration, and development information

Start with [Quick Reference](README.quickref.md) for immediate usage, or [Introduction](README.intro.md) for a comprehensive overview.

## Installation

```bash
npm install
npm run build
npm test  # Verify installation (99.8% pass rate)
```

## Documentation

This README has been decomposed into detailed sections:

### Getting Started
*   **[Quick Reference](README.quickref.md)**: Commands, subsystems, and common patterns.
*   **[Usage Guide](README.usage.md)**: Quick start, basic usage, and TUI.
*   **[Introduction](README.intro.md)**: System definition, abstract, and summary.

### System Design
*   **[Vision & Philosophy](README.vision.md)**: The "Why" behind SeNARS, RLFP, and long-term goals.
*   **[Architecture](README.architecture.md)**: High-level patterns, async/sync hybridization, and diagrams.
*   **[Core Components](README.core.md)**: Memory, Focus, Rules, Data Structures, and Algorithms.
*   **[Tensor Logic](README.tensor.md)**: Neural-symbolic AI foundation with differentiable tensors.
*   **[Resources](README.resources.md)**: Resource awareness, AIKR principle, and throttling.

### Reference
*   **[Configuration](README.config.md)**: System customization, examples, and plugin architecture.
*   **[API](README.api.md)**: API reference for `NAR` and Stream Reasoner.
*   **[Development](README.development.md)**: Development guide, testing strategies, and directory structure.
*   **[Roadmap](README.roadmap.md)**: Current features, challenges, and future plans.

## Quick Start

```javascript
import { NAR } from './core/src/nar/NAR.js';

const nar = new NAR();
nar.start();

/* Input a belief */
nar.input("(bird --> animal).");

/* Ask a question */
nar.input("(bird --> ?what)?");
```

See [README.quickref.md](README.quickref.md) for command reference and [README.usage.md](README.usage.md) for more details.

