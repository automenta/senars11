# SeNARS Development Roadmap

> **Status**: Living document  
> **Last Updated**: 2025-12-14  
> **Foundation**: Stream reasoner, modular premise formation, 7 NAL rules, 99.8% test pass rate

---

## Table of Contents

1. [Principles](#principles)
2. [Simplifications](#simplifications)
3. [Rule Engine Architecture](#rule-engine-architecture)
4. [Implemented](#implemented)
5. [Extractions](#extractions)
6. [Roadmap](#roadmap)
7. [Quick Wins](#quick-wins)
8. [Foundation](#foundation)
9. [NAL](#nal)
10. [Strategies](#strategies)
11. [Memory](#memory)
12. [LM](#lm)
13. [Cross-Cutting](#cross-cutting)
14. [Ecosystem](#ecosystem)
15. [Speculative](#speculative)

---

## Principles

| Principle | Implication |
|-----------|-------------|
| **NAL First** | LM augments, not replaces formal semantics |
| **Declarative** | Logic defined by patterns, not imperative code |
| **Compiled** | Patterns compiled to optimized decision trees |
| **Composable** | Standard interfaces, plug-and-play |
| **Observable** | Emit events, bounded retention |
| **Resource-Aware** | Budgets, timeouts, graceful degradation |

---

## Simplifications

### 1. Negation via Truth (Not Term)

Negation = frequency inversion. Eliminates `NegationRule`, `NegationPairingStrategy`, negation operator.

```
Input:   --(bird --> flyer). %0.9%
Stored:  (bird --> flyer). %0.1%    ← f' = 1 - f
Display: f < 0.5 → show as --(term)
```

**Implementation**:
1. [NarseseParser.js](file:///home/me/senars10/core/src/parser/NarseseParser.js): Detect `--` prefix
2. Call `Truth.negation()` → [Truth.js#L85](file:///home/me/senars10/core/src/Truth.js#L85)
3. Store positive term with inverted frequency
4. `Task.toString()`: If f < 0.5, display with `--` prefix

---

### 2. Use Existing Term Predicates

Term.js already provides these — replace all reimplementations:

| Method | Location | Use Instead Of |
|--------|----------|----------------|
| `term.isVariable` | [Term.js#L105](file:///home/me/senars10/core/src/term/Term.js#L105) | `_isVariable(term)` |
| `term.isCompound` | [Term.js#L93](file:///home/me/senars10/core/src/term/Term.js#L93) | `_isCompound(term)` |
| `term.equals(other)` | [Term.js#L165](file:///home/me/senars10/core/src/term/Term.js#L165) | `_termsEqual(t1, t2)` |
| `term.subject` | [Term.js#L49](file:///home/me/senars10/core/src/term/Term.js#L49) | `term.components[0]` |
| `term.predicate` | [Term.js#L53](file:///home/me/senars10/core/src/term/Term.js#L53) | `term.components[1]` |

---

## Rule Engine Architecture

> **Insight**: 72+ `.nal` files imply hundreds of rules. Linear matching is too slow.
> **Solution**: A **Rule Compiler** that transforms declarative patterns into an optimized **Discrimination Tree** (Rete-like).

### 1. Pattern Definitions (JS)

Rules are defined as data, porting logic from `.nal` files:

```javascript
// core/src/reason/rules/nal/definitions/NAL4.js
export const Exemplification = {
  id: 'exemplification',
  pattern: {
    p: { operator: '-->', subject: '$S', predicate: '$M' },
    s: { operator: '-->', subject: '$M', predicate: '$P' }
  },
  conclusion: (b, tf) => tf.inheritance(b.get('$P'), b.get('$S')),
  truth: Truth.exemplification
};
```

### 2. Rule Compiler (The Brain)

Transforms a list of Patterns into an executable Decision Tree.

**Responsibilities**:
1.  **Guard Extraction**: Decompose patterns into atomic checks (e.g., `op==-->`, `arity==2`, `p.pred==s.subj`).
2.  **Ranking**: Order checks by cost (cheap first) and selectivity (fail fast).
    *   *Tier 1*: Operator checks, Literal equality (O(1))
    *   *Tier 2*: Variable absorption/equality (O(1) pointer check)
    *   *Tier 3*: Structural unification (Recursive)
3.  **Deduplication**: Merge common prefixes. If 50 rules check `op==-->`, check it once.
4.  **Tree Construction**: Build the execution graph.

```javascript
// core/src/reason/rules/compiler/RuleCompiler.js
export class RuleCompiler {
  compile(patterns) {
    const root = new DecisionNode();
    for (const pat of patterns) {
      const guards = this.extractGuards(pat);
      this.insertIntoTree(root, guards, pat);
    }
    return root; // Executable strategy pattern
  }

  extractGuards(pattern) {
    // 1. Static Checks
    const checks = [
      { type: 'op', target: 'p', val: pattern.p.operator },
      { type: 'op', target: 's', val: pattern.s.operator }
    ];
    // 2. Variable Topology (Absorption)
    // If $M is in p.pred and s.subj, add equality constraint
    if (pattern.p.predicate === pattern.s.subject) {
      checks.push({ type: 'eq', t1: 'p.pred', t2: 's.subj' });
    }
    return this.rankChecks(checks);
  }
}
```

### 3. Runtime Execution

The `RuleExecutor` traverses the compiled tree.

```javascript
// core/src/reason/rules/RuleExecutor.js
export class RuleExecutor {
  constructor(compiledTree, unifier) {
    this.tree = compiledTree;
    this.unifier = unifier;
  }

  execute(p, s, ctx) {
    // 1. Fast Traversal (Guards)
    const candidates = this.tree.query(p, s); 
    
    // 2. Full Unification (Only on survivors)
    const results = [];
    for (const rule of candidates) {
      const match = this.unifier.match(rule.pattern, p, s);
      if (match.success) {
        results.push(rule.apply(match.bindings, ctx));
      }
    }
    return results;
  }
}
```

**Critical Dependency**: `Unifier.js` (for the final binding step).

---

## Implemented

### Core Components

| Component | Location | Lines |
|-----------|----------|-------|
| Stream Reasoner | [Reasoner.js](file:///home/me/senars10/core/src/reason/Reasoner.js) | 365 |
| Strategy | [Strategy.js](file:///home/me/senars10/core/src/reason/Strategy.js) | 365 |
| NAL Rules (7) | [rules/nal/](file:///home/me/senars10/core/src/reason/rules/nal) | 9 files |
| Strategies (8) | [strategy/](file:///home/me/senars10/core/src/reason/strategy) | 8 files |
| Memory | [memory/](file:///home/me/senars10/core/src/memory) | 22 files |
| Term | [term/](file:///home/me/senars10/core/src/term) | 6 files |
| LM | [lm/](file:///home/me/senars10/core/src/lm) | 21 files |
| Tools | [tool/](file:///home/me/senars10/core/src/tool) | 16 files |

### Truth Functions

| Function | Line | Has Rule? |
|----------|------|-----------|
| `deduction` | [L50](file:///home/me/senars10/core/src/Truth.js#L50) | ✅ SyllogisticRule |
| `induction` | [L56](file:///home/me/senars10/core/src/Truth.js#L56) | ✅ InductionRule |
| `abduction` | [L61](file:///home/me/senars10/core/src/Truth.js#L61) | ✅ AbductionRule |
| `detachment` | [L66](file:///home/me/senars10/core/src/Truth.js#L66) | ✅ ModusPonensRule |
| `revision` | [L71](file:///home/me/senars10/core/src/Truth.js#L71) | ✅ Memory |
| `negation` | [L85](file:///home/me/senars10/core/src/Truth.js#L85) | ❌ Wire to parser |
| `conversion` | [L89](file:///home/me/senars10/core/src/Truth.js#L89) | ✅ ConversionRule |
| `comparison` | [L97](file:///home/me/senars10/core/src/Truth.js#L97) | ❌ PatternRule |
| `analogy` | [L105](file:///home/me/senars10/core/src/Truth.js#L105) | ❌ PatternRule |
| `exemplification` | [L143](file:///home/me/senars10/core/src/Truth.js#L143) | ❌ PatternRule |

### Unification (in PrologStrategy)

Full unification exists in [PrologStrategy.js](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js):

| Function | Line | Purpose |
|----------|------|---------|
| `_unify` | L288-318 | Recursive unification |
| `_unifyVariable` | L320-336 | Variable binding with occurs check |
| `_occursCheck` | L394-406 | Infinite term prevention |
| `_applySubstitutionToTerm` | L412-432 | Apply bindings |

---

## Extractions

### 1. TermUtils.js (NEW)

Thin wrappers + consistent API for term operations:

```javascript
// core/src/term/TermUtils.js
export const termsEqual = (t1, t2) => t1?.equals?.(t2) ?? false;
export const isVariable = (term) => term?.isVariable ?? false;
export const isCompound = (term) => term?.isCompound ?? false;
export const getComponents = (term) => term?.components ?? [];
```

**Effort**: 1 hour  
**Update files**: Strategy.js, TaskMatchStrategy.js, PrologStrategy.js, VariableIntroduction.js

---

### 2. Unifier.js (EXTRACT)

Extract from PrologStrategy for reuse. **MUST** support pattern matching (one-way unification).

```javascript
// core/src/term/Unifier.js
import { isVariable, isCompound, termsEqual, getComponents } from './TermUtils.js';

export class Unifier {
  constructor(termFactory) {
    this.termFactory = termFactory;
    this._varCounter = 0;
  }

  /**
   * Unify two terms.
   * @returns {{ success: boolean, bindings: Map<string, Term> }}
   */
  unify(term1, term2, bindings = new Map()) {
    // ... (existing logic from PrologStrategy) ...
  }
  
  /** 
   * Match term against pattern (one-way unification)
   * Used for PatternRule matching
   */
  match(pattern, term, bindings = new Map()) {
    // Treat pattern variables ($S, $P) as variables to be bound
    // Treat term variables as constants (unless unifying two variables)
    // ...
  }
}
```

**Effort**: 4-6 hours  
**Unlocks**: PatternRules, NAL-6 query matching, AnalogicalStrategy

---

### 3. RuleCompiler (NEW)

The optimization engine.

```javascript
// core/src/reason/rules/compiler/RuleCompiler.js
export class RuleCompiler {
  /**
   * Compiles patterns into an optimized decision tree.
   * @param {Array<PatternRule>} rules
   * @returns {DecisionNode} Root of the execution tree
   */
  compile(rules) {
    // 1. Extract guards for each rule
    // 2. Rank guards (cheap -> expensive)
    // 3. Build Trie (deduplicate common prefixes)
    // 4. Return root
  }
}
```

**Effort**: 6-8 hours  
**Unlocks**: Scalable NAL-4+ support (hundreds of rules with O(1) lookup)

---

### 4. SemanticStrategy (WIRE)

Wrap existing EmbeddingLayer:

```javascript
// core/src/reason/strategy/SemanticStrategy.js
import { PremiseFormationStrategy } from './PremiseFormationStrategy.js';

export class SemanticStrategy extends PremiseFormationStrategy {
  constructor(embeddingLayer, config = {}) {
    super({ priority: config.priority ?? 0.7, ...config });
    this._name = 'Semantic';
    this.embeddings = embeddingLayer;
    this.threshold = config.threshold ?? 0.7;
  }

  async* generateCandidates(primaryTask, context) {
    // ... findSimilar() ... yield candidates ...
  }
}
```

**Effort**: 2-4 hours  
**Unlocks**: Fuzzy premise matching

---

## Roadmap

### Phase 0: Foundation (Now)

| Task | Effort | Unlocks |
|------|--------|---------|
| TermUtils.js | 1 hr | Clean APIs |
| Negation in parser | 2-4 hrs | Simplification |
| **Unifier.js extraction** | 4-6 hrs | Pattern Rules |
| SemanticStrategy | 2-4 hrs | Fuzzy matching |

### Phase 1: Rule Engine (1-2 weeks)

| Task | Effort | Unlocks |
|------|--------|---------|
| RuleCompiler | 6-8 hrs | Optimized matching |
| RuleExecutor | 2 hrs | Tree traversal |
| Define NAL-4 rules (JS) | 2 hrs | NAL-4 completion |
| Define NAL-5 rules (JS) | 2 hrs | NAL-5 completion |

### Phase 2: Variables & Temporal (2-4 weeks)

| Task | Effort | Unlocks |
|------|--------|---------|
| NAL-6 Query matching | 4 hrs | Questions |
| TemporalBuffer | 1 week | NAL-7 |
| CausalStrategy | 4 hrs | Multi-hop |

### Phase 3: Goals (4-8 weeks)

| Task | Effort | Unlocks |
|------|--------|---------|
| Goal task handling | 1 week | NAL-8 |
| GoalDrivenStrategy | 1 week | Backward chaining |

---

## Quick Wins

### Immediate (< 4 hours)

| Task | Effort | How |
|------|--------|-----|
| TermUtils.js | 1 hr | Copy snippet above |
| Negation parser | 2-4 hrs | Detect `--`, call `Truth.negation()` |
| SemanticStrategy | 2-4 hrs | Copy snippet, register in ReasonerBuilder |

### Short (1-3 days)

| Task | Effort | How |
|------|--------|-----|
| **Unifier.js** | 4-6 hrs | Extract from PrologStrategy |
| RuleCompiler | 6-8 hrs | Implement decision tree builder |

---

## NAL

### Implemented Rules

| Rule | File | Pattern |
|------|------|---------|
| SyllogisticRule | [SyllogisticRule.js](file:///home/me/senars10/core/src/reason/rules/nal/SyllogisticRule.js) | Shared middle |
| InductionRule | [InductionAbductionRule.js](file:///home/me/senars10/core/src/reason/rules/nal/InductionAbductionRule.js) | Shared subject |
| AbductionRule | [InductionAbductionRule.js](file:///home/me/senars10/core/src/reason/rules/nal/InductionAbductionRule.js) | Shared predicate |
| ConversionRule | [ConversionRule.js](file:///home/me/senars10/core/src/reason/rules/nal/ConversionRule.js) | Unary reversal |
| ContrapositionRule | [ConversionRule.js](file:///home/me/senars10/core/src/reason/rules/nal/ConversionRule.js) | Unary negation |
| ModusPonensRule | [ModusPonensRule.js](file:///home/me/senars10/core/src/reason/rules/nal/ModusPonensRule.js) | Detachment |
| VariableIntroduction | [VariableIntroduction.js](file:///home/me/senars10/core/src/reason/rules/nal/VariableIntroduction.js) | Generalization |

### NAL-4+ (Compiled Patterns)

Implement via `PatternRule` definitions in JS, compiled at startup:

- `Comparison`: Shared subject → similarity
- `Exemplification`: p.subject === s.predicate
- `Analogy`: (S↔M), (M→P) ⊢ (S→P)
- `Intersection`/`Union`/`Difference`

### NAL-6: Variables

| Part | Status | Location |
|------|--------|----------|
| Variable terms | ✅ | [Term.js#L105](file:///home/me/senars10/core/src/term/Term.js#L105) |
| VariableIntroduction | ✅ | [VariableIntroduction.js](file:///home/me/senars10/core/src/reason/rules/nal/VariableIntroduction.js) |
| Unification | ⚠️ | [PrologStrategy.js#L288](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js#L288) |
| Query matching | ❌ | Needs Unifier extraction |

### NAL-7: Temporal

- [ ] Operators: `=/>`, `=|>`, `=\>`
- [ ] TemporalBuffer
- [ ] TemporalInductionRule

### NAL-8: Goals

- [ ] Goal representation
- [ ] Plan synthesis
- [ ] Execution monitoring

---

## Strategies

### Implemented

| Strategy | Base | Purpose |
|----------|------|---------|
| TaskMatchStrategy | PremiseFormationStrategy | Syllogistic patterns |
| DecompositionStrategy | PremiseFormationStrategy | Extract subterms |
| TermLinkStrategy | PremiseFormationStrategy | Associative links |
| BagStrategy | Strategy | Priority sampling |
| ExhaustiveStrategy | Strategy | Full search |
| PrologStrategy | Strategy | Backward chaining + unification |
| ResolutionStrategy | Strategy | Question answering |

### Planned

| Strategy | Depends | Priority |
|----------|---------|----------|
| SemanticStrategy | EmbeddingLayer ✅ | High |
| AnalogicalStrategy | Unifier | High |
| GoalDrivenStrategy | NAL-8 | Medium |
| CausalStrategy | NAL-7 | Medium |

---

## Memory

| Component | Location | Purpose |
|-----------|----------|---------|
| Bag | [Bag.js](file:///home/me/senars10/core/src/memory/Bag.js) | Priority-based collection |
| Concept | [Concept.js](file:///home/me/senars10/core/src/memory/Concept.js) | Task grouping |
| Focus | [Focus.js](file:///home/me/senars10/core/src/memory/Focus.js) | Short-term attention |
| Memory | [Memory.js](file:///home/me/senars10/core/src/memory/Memory.js) | Central store |
| Index | [MemoryIndex.js](file:///home/me/senars10/core/src/memory/MemoryIndex.js) | Fast lookup |
| Consolidation | [MemoryConsolidation.js](file:///home/me/senars10/core/src/memory/MemoryConsolidation.js) | STM→LTM |
| Forgetting | [ForgettingPolicy.js](file:///home/me/senars10/core/src/memory/ForgettingPolicy.js) | Resource management |
| Layer | [Layer.js](file:///home/me/senars10/core/src/memory/Layer.js) | Abstract associations |
| TermLayer | [TermLayer.js](file:///home/me/senars10/core/src/memory/TermLayer.js) | Term associations |

**Needed**:
- TemporalBuffer — NAL-7 event sequences
- VectorIndex — Semantic similarity queries

---

## LM

| Component | Location | Purpose |
|-----------|----------|---------|
| LM | [LM.js](file:///home/me/senars10/core/src/lm/LM.js) | Main orchestrator |
| EmbeddingLayer | [EmbeddingLayer.js](file:///home/me/senars10/core/src/lm/EmbeddingLayer.js) | Vector embeddings |
| LMRuleFactory | [LMRuleFactory.js](file:///home/me/senars10/core/src/lm/LMRuleFactory.js) | LM-based rules |
| Translators | NarseseTranslator, AdvancedNarseseTranslator | NL ↔ Narsese |
| Providers | HuggingFace, LangChain, TransformersJS | Model backends |

---

## Cross-Cutting

### Observability

- [x] Metrics: [MetricsMonitor.js](file:///home/me/senars10/core/src/reason/MetricsMonitor.js)
- [x] Logs: [Logger.js](file:///home/me/senars10/core/src/util/Logger.js)
- [ ] Traces: Derivation graph export
- [ ] Health: Endpoints

### Resource Management

- [x] CPU throttle: Reasoner config
- [x] Backpressure: Stream architecture
- [x] Derivation depth: `maxDerivationDepth`
- [ ] Memory budgets

### Testability

- [x] Pure functions: Truth, Term
- [x] DI: Constructor injection
- [x] Test suite: 99.8% pass rate

---

## Ecosystem

| Component | Status |
|-----------|--------|
| NARTool | ✅ [tool/NARTool.js](file:///home/me/senars10/core/src/tool/NARTool.js) |
| EmbeddingTool | ✅ [tool/EmbeddingTool.js](file:///home/me/senars10/core/src/tool/EmbeddingTool.js) |
| ExplanationService | ✅ [tool/ExplanationService.js](file:///home/me/senars10/core/src/tool/ExplanationService.js) |
| ToolRegistry | ✅ [tool/ToolRegistry.js](file:///home/me/senars10/core/src/tool/ToolRegistry.js) |
| REST API | ❌ |
| Web Playground | ❌ |
| Obsidian Plugin | ❌ |

---

## Speculative

### Near-Term

- [ ] Belief compression
- [ ] Rule induction from derivations
- [ ] Active learning (knowledge gap detection)

### Long-Term

- [ ] Neuromorphic NARS
- [ ] Embodied reasoning
- [ ] Distributed multi-agent
- [ ] Self-modifying architecture

---

## Key Files

| File | Purpose |
|------|---------|
| [NALRule.js](file:///home/me/senars10/core/src/reason/rules/nal/NALRule.js) | Rule base class |
| [PremiseFormationStrategy.js](file:///home/me/senars10/core/src/reason/strategy/PremiseFormationStrategy.js) | Strategy base |
| [Truth.js](file:///home/me/senars10/core/src/Truth.js) | All truth functions |
| [Term.js](file:///home/me/senars10/core/src/term/Term.js) | Term predicates |
| [TermFactory.js](file:///home/me/senars10/core/src/term/TermFactory.js) | Term construction |
| [PrologStrategy.js](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js) | Unification source |
| [EmbeddingLayer.js](file:///home/me/senars10/core/src/lm/EmbeddingLayer.js) | Embeddings |
| [ReasonerBuilder.js](file:///home/me/senars10/core/src/reason/ReasonerBuilder.js) | Registration |

---

*Living document. Revise aggressively.*
