# LM (Language Model) Examples

This directory contains examples demonstrating the Language Model integration features of the NARS system.

## Examples

### 1. Minimal Inference (`minimal-inference.js`)
**Purpose**: The simplest possible LM demonstration.

**Features**:
- Single inference call
- No agent, no NARS integration
- Basic TransformersJS setup
- Debug mode demonstration

**Run**:
```bash
node examples/lm/minimal-inference.js
```

**First Run**: Downloads ~250MB model (cached for subsequent runs)

---

### 2. Streaming Demo (`streaming-demo.js`)
**Purpose**: Demonstrates incremental token streaming.

**Features**:
- Real-time output display
- Latency metrics (TTFT - Time To First Token)
- Token throughput calculation
- Incremental text generation

**Run**:
```bash
node examples/lm/streaming-demo.js
```

---

### 3. Circuit Breaker Demo (`circuit-breaker-demo.js`)
**Purpose**: Shows fault tolerance and error handling.

**Features**:
- Simulated repeated failures
- CircuitBreaker state transitions (CLOSED → OPEN → HALF_OPEN)
- Fallback behavior
- Recovery demonstration

**Run**:
```bash
node examples/lm/circuit-breaker-demo.js
```

---

### 4. TransformersJS Demo (`demo-transformers-js.js`)
**Purpose**: Comprehensive TransformersJS provider demonstration.

**Features**:
- Multiple inference strategies
- Configuration examples
- Error handling patterns

**Run**:
```bash
node examples/lm/demo-transformers-js.js
```

---

### 5. Multi-Provider Demo (`lm-providers.js`)
**Purpose**: Demonstrates multi-provider setup with fallback.

**Features**:
- Provider registry
- Fallback mechanisms
- Provider switching

**Run**:
```bash
node examples/lm/lm-providers.js
```

---

### 6. Timeout Demo (`timeout-demo.js`)
**Purpose**: Demonstrates model load timeout protection.

**Features**:
- Configurable timeout values
- Timeout event handling
- Model load lifecycle events
- Recovery patterns

**Run**:
```bash
node examples/lm/timeout-demo.js
```

---

## Configuration

All examples support the following LM configuration options:

```javascript
{
  modelName: 'Xenova/LaMini-Flan-T5-248M',  // HuggingFace model
  loadTimeout: 60000,                        // Model load timeout (ms, default: 60s)
  debug: true,                               // Enable debug events
  eventBus: eventBusInstance,                // EventBus for debugging
  validation: {
    emptyOutput: 'warn',                     // 'warn' | 'error' | 'ignore'
    narsese: true                            // Enable Narsese validation
  },
  circuitBreaker: {
    failureThreshold: 5,                     // Open after N failures
    timeout: 60000,                          // Operation timeout (ms)
    resetTimeout: 30000                      // Reset attempt delay (ms)
  }
}
```

## Observability Features

### Debug Events
Enable debug mode to receive events via EventBus:

```javascript
eventBus.on('lm:debug', (data) => {
  console.log('[DEBUG]', data.message, data);
});
```

### Metrics
All examples track:
- **TTFT** (Time To First Token): Latency until first token appears
- **Total inference time**: Complete generation duration
- **Tokens per second**: Throughput metric
- **Memory usage**: Peak heap usage during inference

### Validation
Output validation includes:
- Empty output detection
- Narsese syntax validation (if enabled)
- EventBus notifications for validation failures

---

## Recommended Models

| Model | Size | Task | Performance |
|-------|------|------|-------------|
| `Xenova/LaMini-Flan-T5-248M` | 248M | text2text | Fast, good quality (default) |
| `Xenova/LaMini-Flan-T5-783M` | 783M | text2text | Better quality, slower |
| `Xenova/distilgpt2` | 82M | text-gen | Very fast, lower accuracy |

## Performance Expectations

| Model | Cold Start | Warm Inference | Memory |
|-------|------------|----------------|--------|
| LaMini-Flan-T5-248M | ~30-60s | ~2-5s | ~1.5GB |
| LaMini-Flan-T5-783M | ~60-90s | ~5-10s | ~3GB |
| distilgpt2 | ~10-20s | ~1-2s | ~500MB |

> **Note**: Cold start includes model download on first run. Subsequent runs use cached model from `~/.cache/huggingface/`.

---

## Production Examples

For production-ready examples with full NARS integration, see:
- [`examples/narsgpt/`](../narsgpt/) - Production LM patterns
- [`examples/repl/`](../repl/) - Full agent REPL with LM support

---

## Troubleshooting

### Model Download Fails
- Check internet connection
- Verify disk space (models are ~250MB-3GB)
- Clear cache: `rm -rf ~/.cache/huggingface/`

### Out of Memory
- Use smaller model (e.g., `distilgpt2`)
- Reduce `maxTokens` in generation options
- Close other applications

### Slow Inference
- First run always slow (model loading)
- Consider using Ollama for GPU acceleration (external service)
- Reduce `maxTokens` for faster results

### Model Load Timeout
- **Symptom**: Error message "Model loading timed out after Xms"
- **First run**: Increase `loadTimeout` to 120000 (120s) for large models or slow connections
- **Subsequent runs**: Cached models load faster, default 60s timeout should work
- **Custom timeout**: Configure via `loadTimeout` option in provider config
- **Disable timeout**: Set `loadTimeout: 0` (not recommended for production)
- **Monitor events**: Listen to `lm:model-load-start`, `lm:model-load-timeout`, `lm:model-load-complete` events

---

*Last updated: 2024-12-18*
