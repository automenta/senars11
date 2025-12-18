# NARS-GPT Examples

Production-ready NARS-GPT integration examples with real LM providers.

## Quick Start

### Feature Demo (Mock LM)

```bash
node examples/narsgpt/demo-narsgpt.js
```

### Production with Ollama

```bash
# Start Ollama
ollama serve
ollama pull llama2

# Run example
node examples/narsgpt/production-ollama.js
```

### Production with OpenAI

```bash
OPENAI_API_KEY=your-key node examples/narsgpt/production-openai.js
```

### Domain Knowledge Grounding

```bash
node examples/narsgpt/domain-knowledge.js
```

## Examples

| File                                             | Description           | Requirements   |
|--------------------------------------------------|-----------------------|----------------|
| [demo-narsgpt.js](demo-narsgpt.js)               | Feature demonstration | None (mock LM) |
| [integration-narsgpt.js](integration-narsgpt.js) | NAR integration       | None (mock LM) |
| [production-ollama.js](production-ollama.js)     | Ollama integration    | Ollama running |
| [production-openai.js](production-openai.js)     | OpenAI API            | API key        |
| [domain-knowledge.js](domain-knowledge.js)       | Grounding patterns    | None           |

## Features Demonstrated

- **Attention Buffer**: Semantic retrieval with relevance + recency weighting
- **Atomization**: Term deduplication via embedding similarity
- **Grounding**: Sentence→Narsese mapping and verification
- **Perspective Transform**: Swap (I↔You) and neutralize (→3rd person)
- **EventBus Logging**: Observability for debugging
- **Domain Knowledge**: Multi-domain grounding patterns

## Production Setup

### Ollama

```javascript
const lm = new LangChainProvider({
  provider: 'ollama',
  modelName: 'llama2',
  baseURL: 'http://localhost:11434'
});

const strategy = new NarsGPTStrategy({
  embeddingLayer: new EmbeddingLayer({ model: 'ollama-embeddings' }),
  perspectiveMode: 'neutralize'
});
```

### OpenAI

```javascript
const lm = new LangChainProvider({
  provider: 'openai',
  modelName: 'gpt-3.5-turbo',
  apiKey: process.env.OPENAI_API_KEY
});
```

### EventBus Logging

```javascript
eventBus.on('narsgpt:candidates', ({ query, bufferSize }) => {
  console.log(`Buffer: ${bufferSize} items for "${query}"`);
});

eventBus.on('narsgpt:grounded', ({ narsese, sentence }) => {
  console.log(`Grounded: "${sentence}" → ${narsese}`);
});
```

## See Also

- [NARSGPT.md](../../core/src/reason/strategy/NARSGPT.md) - Full documentation
- [Main Examples](../README.md) - All SeNARS examples
