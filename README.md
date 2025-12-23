# SeNARS (Semantic Non-axiomatic Reasoning System)

SeNARS is a hybrid neuro-symbolic reasoning system that combines Non-Axiomatic Logic (NAL) with Language Models (LM).

## Documentation

This README has been decomposed into detailed sections:

*   **[Introduction](README.intro.md)**: System definition, abstract, and summary.
*   **[Vision & Philosophy](README.vision.md)**: The "Why" behind SeNARS, RLFP, and long-term goals.
*   **[Usage Guide](README.usage.md)**: Quick start, basic usage, and TUI.
*   **[Architecture](README.architecture.md)**: High-level architectural patterns and diagrams.
*   **[Core Components](README.core.md)**: Detailed breakdown of Memory, Focus, Rules, and Data Structures.
*   **[Configuration](README.config.md)**: System customization and plugin architecture.
*   **[Development](README.development.md)**: Development guide, testing strategies, and directory structure.
*   **[API](README.api.md)**: API reference for key classes like `NAR`.
*   **[Roadmap](README.roadmap.md)**: Current challenges and future plans.

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

See [README.usage.md](README.usage.md) for more details.
