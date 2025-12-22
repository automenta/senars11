# Knowledge System

Structured knowledge management, templates, and external KB integration.

## Components

| File                        | Purpose                           |
|-----------------------------|-----------------------------------|
| `Knowing.js`                | Core knowledge operations         |
| `Knowledge.js`              | Base knowledge representation     |
| `KnowledgeBaseConnector.js` | External KB integration           |
| `NarseseTemplate.js`        | Template-based Narsese generation |
| `DataTableKnowledge.js`     | Tabular data as knowledge         |
| `SoftwareKnowledge.js`      | Code/API knowledge extraction     |

## Usage

### Knowing

```javascript
import { Knowing } from './Knowing.js';

const knowing = new Knowing({ nar });

// Add knowledge
await knowing.learn('Birds can fly');

// Query
const result = await knowing.ask('What can fly?');

// Integrate external source
await knowing.integrate(externalKB);
```

### NarseseTemplate

```javascript
import { NarseseTemplate } from './NarseseTemplate.js';

const template = new NarseseTemplate({
    pattern: '({subject} --> {predicate}). %{freq};{conf}%',
    defaults: { freq: 1.0, conf: 0.9 }
});

const narsese = template.render({
    subject: 'bird',
    predicate: 'animal'
});
// -> "(bird --> animal). %1.0;0.9%"
```

### KnowledgeBaseConnector

```javascript
import { KnowledgeBaseConnector } from './KnowledgeBaseConnector.js';

const connector = new KnowledgeBaseConnector({
    sources: ['wikidata', 'conceptnet'],
    cache: true
});

// Fetch external knowledge
const facts = await connector.query('bird');

// Convert to Narsese
const narsese = connector.toNarsese(facts);
```

### SoftwareKnowledge

```javascript
import { SoftwareKnowledge } from './SoftwareKnowledge.js';

const sk = new SoftwareKnowledge();

// Extract knowledge from code
const knowledge = await sk.fromSourceFile('MyClass.js');

// Knowledge includes:
// - Class/function definitions
// - Dependencies
// - Type information
// - Documentation
```

## Templates

NarseseTemplate supports:

- Variable substitution: `{varName}`
- Default values
- Conditional sections
- Loops for lists

## Integration Points

- **NAR**: All knowledge feeds into reasoning
- **LM**: Natural language → Narsese conversion
- **Demo**: Knowledge-based demo scenarios
- **RLFP**: Learn from knowledge interactions
