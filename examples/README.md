# SeNARS Examples

Demonstrations of SeNARS reasoning capabilities, neural-symbolic integration, and production patterns.

## Quick Start

```bash
# Basic reasoning demo
node examples/reasoning/syllogism-demo.js

# Stream-based reasoning
node examples/advanced/stream-reasoning.js

# Tensor Logic (neural components)
node examples/tensor-logic/mlp-training.mjs

# Comprehensive LM Integration Demo (NAL/LM synergy)
node examples/run-lm-demos.js --model=transformers

# NARS-GPT with production LM (requires Ollama)
ollama serve  # separate terminal
node examples/narsgpt/production-lm.js
```

**→ [Complete LM Demo Guide](LM_DEMO_GUIDE.md)** - Model configs, transcript collection, troubleshooting

---

## Categories

### 🧠 Core Reasoning (`reasoning/`)

| Example                                                                | Description                            |
|------------------------------------------------------------------------|----------------------------------------|
| [syllogism-demo.js](reasoning/syllogism-demo.js)                       | Classic syllogistic inference          |
| [syllogism-comparison-demo.js](reasoning/syllogism-comparison-demo.js) | Stream vs cycle comparison             |
| [causal-reasoning-demo.js](reasoning/causal-reasoning-demo.js)         | Causal relationships                   |
| [inductive-reasoning-demo.js](reasoning/inductive-reasoning-demo.js)   | Inductive generalization               |
| [temporal-reasoning-demo.js](reasoning/temporal-reasoning-demo.js)     | Temporal logic                         |
| [advanced-reasoning-demo.js](reasoning/advanced-reasoning-demo.js)     | Advanced reasoning features            |
| [truth-class-demo.js](reasoning/truth-class-demo.js)                   | Truth value operations                 |
| [truth-value-reasoning.js](reasoning/truth-value-reasoning.js)         | Reasoning with truth values            |
| [operator-examples.js](reasoning/operator-examples.js)                 | Narsese operator usage                 |
| [eventbus-patterns-demo.js](reasoning/eventbus-patterns-demo.js)       | EventBus for observability             |
| [memory-operations-demo.js](reasoning/memory-operations-demo.js)       | Memory API: concepts, beliefs, queries |
| [focus-management-demo.js](reasoning/focus-management-demo.js)         | Focus system: attention direction      |
| [goal-driven-demo.js](reasoning/goal-driven-demo.js)                   | Goal-driven reasoning and planning     |

---

### 🤖 NARS-GPT (`narsgpt/`)

Production-ready LLM integration with NARS reasoning.

| Example                                              | Description            | Requirements |
|------------------------------------------------------|------------------------|--------------|
| [demo-narsgpt.js](narsgpt/demo-narsgpt.js)           | Feature demo (mock LM) | None         |
| [production-lm.js](narsgpt/production-lm.js)         | LM with Ollama/TJS     | Provider     |
| [production-openai.js](narsgpt/production-openai.js) | OpenAI API             | API key      |
| [domain-knowledge.js](narsgpt/domain-knowledge.js)   | Grounding patterns     | None         |

[→ NARS-GPT Documentation](narsgpt/README.md)

---

### 🔄 Advanced Features (`advanced/`)

| Example                                                                       | Description                           |
|-------------------------------------------------------------------------------|---------------------------------------|
| [stream-reasoning.js](advanced/stream-reasoning.js)                           | Stream vs cycle reasoner              |
| [prolog-strategy-demo.js](advanced/prolog-strategy-demo.js)                   | Prolog-style backward chaining        |
| [agent-builder-demo.js](advanced/agent-builder-demo.js)                       | Agent configuration patterns          |
| [components-integration-demo.js](advanced/components-integration-demo.js)     | Stream reasoner components            |
| [transformers-integration-demo.js](advanced/transformers-integration-demo.js) | Transformers.js + NAR + MCP           |
| [tool-usage-demo.js](advanced/tool-usage-demo.js)                             | FileOperations, CommandExecutor tools |
| [custom-tool-demo.js](advanced/custom-tool-demo.js)                           | Creating custom tools                 |
| [config-patterns-demo.js](advanced/config-patterns-demo.js)                   | NAR configuration best practices      |
| [error-handling-demo.js](advanced/error-handling-demo.js)                     | Error handling and recovery           |
| [performance-benchmark.js](advanced/performance-benchmark.js)                 | Performance metrics                   |
| [mcp-demo.js](advanced/mcp-demo.js)                                           | Model Context Protocol                |

---

### 📐 Tensor Logic (`tensor-logic/`)

Neural-symbolic computation with PyTorch-like API.

| Example                                                         | Description          |
|-----------------------------------------------------------------|----------------------|
| [tensor-basics.mjs](tensor-logic/tensor-basics.mjs)             | Tensor primitives    |
| [mlp-training.mjs](tensor-logic/mlp-training.mjs)               | Train XOR MLP        |
| [attention-mechanism.mjs](tensor-logic/attention-mechanism.mjs) | Self-attention       |
| [batch-training.mjs](tensor-logic/batch-training.mjs)           | Vectorized training  |
| [embedding-demo.mjs](tensor-logic/embedding-demo.mjs)           | Word embeddings      |
| [verify_tensor_logic.mjs](tensor-logic/verify_tensor_logic.mjs) | Phase 6 verification |

[→ Full Tensor Logic Guide](tensor-logic/README.md) (20 examples)

---

### 🔧 LM Integration (`lm/`)

| Example                                                          | Description               |
|------------------------------------------------------------------|---------------------------|
| [lm-providers.js](lm/lm-providers.js)                            | LM provider configuration |
| [minimal-inference.js](lm/minimal-inference.js)                  | Minimal Transformers.js   |
| [demo-system-verification.js](demos/demo-system-verification.js) | Full System Verification  |

---

### 💬 Agent REPL (`repl/`)

| Example                                                             | Description                           |
|---------------------------------------------------------------------|---------------------------------------|
| [example-agent-repl.js](repl/example-agent-repl.js)                 | Full Agent demo (Ollama/Transformers) |
| [example-research-scenario.js](repl/example-research-scenario.js)   | Multi-agent research                  |
| [example-fallback-mechanism.js](repl/example-fallback-mechanism.js) | LM/NARS routing                       |

[→ REPL Examples](repl/EXAMPLES.md)

---

### 📜 Narsese Scripts (`scripts/`)

14 `.nars` files for testing and experimentation:

- [basic-reasoning.nars](scripts/basic-reasoning.nars)
- [syllogistic-reasoning.nars](scripts/syllogistic-reasoning.nars)
- [causal-reasoning.nars](scripts/causal-reasoning.nars)
- [temporal-reasoning.nars](scripts/temporal-reasoning.nars)
- And more...

---

## Directory Structure

```
examples/
├── README.md                # This file
├── demos.js                 # Demo runner
├── reasoning/               # Core reasoning (9 files)
├── narsgpt/                 # NARS-GPT integration (5 files)
├── advanced/                # Advanced features (7 files)
├── tensor-logic/            # Tensor examples (20 files)
├── lm/                      # LM integration (7 files)
├── repl/                    # Agent REPL (6 files)
├── scripts/                 # .nars scripts (14 files)
└── utils/                   # Helper utilities
```

---

## Running Examples

### Prerequisites

```bash
npm install  # Install dependencies
```

### With Ollama (for LM examples)

```bash
ollama serve
ollama pull llama3
node examples/narsgpt/production-lm.js
```

### With Demo Runner

```bash
node examples/demos.js              # Run all non-LM demos
node examples/demos.js --quick      # Quick subset
node examples/demos.js --lm-only --provider transformers
```

---

## Troubleshooting

| Issue          | Solution                                   |
|----------------|--------------------------------------------|
| Import error   | Run from project root: `node examples/...` |
| Ollama timeout | Ensure `ollama serve` is running           |
| Missing model  | Run `ollama pull llama3`                   |

---

## See Also

- [Main README](../README.md)
- [Project TODO](../TODO.md)
- [Tests](../tests/) for more usage examples
- [API Documentation](../docs/)
