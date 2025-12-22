# Running LM Demos - Comprehensive Guide

Complete guide to running Language Model integration demos and collecting meaningful transcripts.

## Quick Start

```bash
# Transformers.js (offline, no setup required)
node examples/run-lm-demos.js --model=transformers

# Ollama (requires ollama serve)
ollama serve  # In separate terminal
node examples/run-lm-demos.js --model=ollama
```

---

## What the Demos Show

The LM demos demonstrate **neuro-symbolic synergy** - the combination of:
- **NAL**: Precise logical inference, structured knowledge
- **LM**: Natural language understanding, flexible reasoning
- **Hybrid**: Capabilities neither system has alone

### Demo 1: Basic Knowledge Query
**NAL Knowledge**: `bird→animal`, `robin→bird`  
**LM Query**: "Is a robin an animal?"  
**Shows**: LM reasoning aligns with NAL inference

### Demo 2: Chained Reasoning  
**NAL Knowledge**: `Socrates→man`, `man→mortal`  
**LM Query**: "What can we conclude about Socrates?"  
**Shows**: Multi-step logical chains

### Demo 3: Goal-Driven Planning
**NAL Goal**: `<door --> open>!`  
**NAL Knowledge**: `keys→open doors`, `golden-key is a key`  
**LM Query**: "How should I open the door?"  
**Shows**: Goal-directed reasoning and planning

### Demo 4: Tool Integration
**LM Query**: "Calculate 15 + 27"  
**Shows**: LM awareness of when tools are needed

---

## Model Configurations

### Transformers.js (Recommended for Testing)
```bash
node examples/run-lm-demos.js --model=transformers
```

**Pros**:
- No external dependencies
- Offline operation
- Fast setup (~30s first run for model download)

**Cons**:
- Smaller model, less sophisticated responses
- CPU-only (slower inference)

**Model**: Xenova/LaMini-Flan-T5-248M (248M parameters)

---

### Ollama (Recommended for Quality)
```bash
# Terminal 1
ollama serve

# Terminal 2
ollama pull llama3
node examples/run-lm-demos.js --model=ollama
```

**Pros**:
- Much better quality responses
- GPU acceleration (if available)
- Larger context window

**Cons**:
- Requires ollama installation
- Larger memory footprint
- Need ollama server running

**Model**: llama3 (8B parameters default)

---

## Collecting Transcripts

### Save to File
```bash
node examples/run-lm-demos.js --model=transformers > transcripts/transformers-demo.txt 2>&1
node examples/run-lm-demos.js --model=ollama > transcripts/ollama-demo.txt 2>&1
```

### What to Look For

**Successful NAL/LM Synergy**:
- ✅ LM responses reference NAL knowledge
- ✅ NAL derivations appear in beliefs
- ✅ LM suggests actions aligned with NAL goals
- ✅ Both systems converge on same conclusion

**Example Good Transcript**:
```
NAL Knowledge: bird→animal, robin→bird
Query: "Is a robin an animal?"

📤 LM Response:
  "Yes, since robins are birds and birds are animals, robins are animals."

✅ NAL Derivation: (robin --> animal) %0.81;0.72%
🔗 Synergy: LM reasoning aligns with NAL inference
```

---

## Individual Examples

Besides the comprehensive runner, you can run individual LM examples:

### NARS-GPT Examples
```bash
# Production LM (requires Ollama or API key)
node examples/narsgpt/production-lm.js

# Domain knowledge grounding
node examples/narsgpt/domain-knowledge.js
```

### Advanced Integration
```bash
# Transformers.js integration
node examples/advanced/transformers-integration-demo.js

# MCP protocol demo
node examples/advanced/mcp-demo.js
```

### Agent REPL
```bash
# Interactive agent with LM (requires Ollama/Transformers)
node examples/repl/example-agent-repl.js
```

---

## Troubleshooting

### "Model loading timed out"
- First run downloads model (~250MB for Transformers.js)
- Increase timeout or check internet connection
- Subsequent runs use cached model

### "Connection refused" (Ollama)
- Ensure `ollama serve` is running
- Check ollama is on default port 11434
- Try: `curl http://localhost:11434/api/tags`

### "Empty LM response"
- Check model loaded successfully
- Verify temperature/maxTokens config
- Try with default Transformers.js first

###  "No NAL derivations"
- Increase reasoning cycles (30-50 for complex inference)
- Check Narsese syntax is valid
- Verify beliefs were added: `nar.getBeliefs()`

---

## Expected Output

Successful run should show:

1. **Model initialization**: "✅ Agent initialized with LM integration"
2. **NAL knowledge added**: Narsese statements logged
3. **LM responses**: Natural language answers in quotes
4. **NAL derivations**: Derived beliefs with truth values
5. **Synergy markers**: "🔗 Synergy" messages
6. **Summary**: Success rate, timings, capabilities demonstrated

**Duration**: 1-3 minutes (Transformers.js), 30-60 seconds (Ollama with GPU)

---

## Advanced Usage

### Custom Model Configuration
Edit `examples/run-lm-demos.js` MODELS object:

```javascript
const MODELS = {
    custom: {
        provider: 'ollama',
        model: 'mistral',  // or any ollama model
        baseUrl: 'http://localhost:11434'
    }
};
```

Then run: `node examples/run-lm-demos.js --model=custom`

### Programmatic Use
```javascript
import {LMDemoRunner} from './examples/run-lm-demos.js';

const runner = new LMDemoRunner({
    provider: 'transformers',
    modelName: 'Xenova/LaMini-Flan-T5-248M'
});

await runner.initialize();
await runner.demo1_BasicQuery();
// ... more demos
await runner.shutdown();
```

---

## Next Steps

After running demos:
1. Review transcript for NAL/LM synergy markers
2. Try with different models to compare quality
3. Modify demos in `run-lm-demos.js` for your use case
4. Explore individual examples for deeper dives

**The demos prove meaningful LM integration when both NAL derivations AND LM responses appear, aligned on the same conclusions.**
