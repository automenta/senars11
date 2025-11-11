# SeNARS Agent REPL Examples & Demonstrations

This directory contains comprehensive examples and demonstrations for the SeNARS Agent REPL with Ollama integration.

## Available Examples

The following automated examples demonstrate the hybrid intelligence capabilities:

### Core Examples
1. **Advanced Agent REPL with Ollama Integration** (`example-agent-repl-ollama.js`)
   - Complex reasoning with LM + NARS integration
   - Agent creation and management
   - Hybrid intelligence demonstrations

2. **AI Research Scenario** (`example-research-scenario.js`)
   - Multi-agent research project simulation
   - Complex AI research with hybrid reasoning
   - Adaptive reasoning and problem-solving

3. **LM Fallback Mechanism** (`example-fallback-mechanism.js`)
   - Intelligent input routing between LM and NARS
   - Error handling and fallback strategies
   - Narsese detection and processing

### Cognitive Capability Examples
4. **Complex Query Processing** (`example-complex-queries.js`)
   - Analytical reasoning and comparisons
   - Multi-step problem solving
   - Cross-domain knowledge integration
   - Hypothetical scenarios and planning

5. **Advanced Capabilities** (`example-advanced-capabilities.js`)
   - Reasoning, planning, and reflection
   - Integrated cognitive tasks
   - Multi-capability workflows

6. **Hybrid Integration** (`example-hybrid-integration.js`)
   - NARS knowledge + LM contextual understanding
   - LM planning + NARS logic
   - Multi-system reasoning chains

### Management & Operations Examples
7. **Agent Management** (`example-agent-management.js`)
   - Agent creation and initialization
   - Status monitoring and information management
   - Multi-agent coordination
   - Configuration and customization

8. **Reasoning Chains** (`example-reasoning-chains.js`)
   - Multi-step logical inference
   - Hypothetical and causal reasoning
   - Analogical reasoning
   - Meta-reasoning capabilities

9. **Planning & Goals** (`example-planning-goals.js`)
   - Goal setting and prioritization
   - Strategic planning processes
   - Hierarchical goal structures
   - Goal achievement tracking

10. **Multi-Step Problem Solving** (`example-problem-solving.js`)
    - Diagnosis with symbolic and neural analysis
    - Scientific discovery with hypothesis testing
    - Engineering design with constraint management
    - Cross-domain knowledge integration

## Running Examples

### Individual Examples
Run any example individually:
```bash
node example-agent-repl-ollama.js
node example-research-scenario.js
node example-fallback-mechanism.js
# ... etc
```

### Run All Examples
Run all examples in sequence:
```bash
node run-all-demos.js
```

## Ollama Integration

For Ollama-specific demonstrations, you can run:
```bash
npm run repl:agent:ollama
```

Make sure Ollama is running with a compatible model (e.g., `gemma:4b`).

## Key Features Demonstrated

- **Hybrid Intelligence**: Integration of Large Language Models with NARS symbolic reasoning
- **Agent Management**: Creation, configuration, and control of AI agents
- **Intelligent Routing**: Smart detection of Narsese vs. natural language inputs
- **Complex Reasoning**: Multi-step logical and contextual reasoning chains
- **Goal Achievement**: Planning and execution frameworks
- **Adaptive Systems**: Dynamic adjustment and learning capabilities

## Architecture

The system demonstrates:
- **LM Layer**: Large language model integration via LangChain
- **NARS Layer**: Symbolic reasoning and logic processing  
- **Agent Layer**: High-level goal management and planning
- **Integration Layer**: Intelligent routing and hybrid processing

## Testing

All examples can be run with timeout to ensure proper execution:
```bash
timeout 30s node example-agent-repl-ollama.js
```

## Files

- `run-all-demos.js` - Run all examples in sequence
- `test-*.js` - Verification scripts for different components
- `example-*.js` - Main demonstration examples