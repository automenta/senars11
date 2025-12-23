# SeNARS (Semantic Non-axiomatic Reasoning System)

A hybrid neuro-symbolic reasoning system that combines Non-Axiomatic Logic (NAL) with Language Models (LM).

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
/* Standard stream reasoner construction with explicit components */
const reasoner = new Reasoner(premiseSource, strategy, ruleProcessor, {
    cpuThrottleInterval: 1,
    maxDerivationDepth: 10
});
reasoner.start();

/* Input a belief */
nar.input("(bird --> animal).");
```

See [README.quickref.md](README.quickref.md) for command reference and [README.usage.md](README.usage.md) for more details.

