# SeNARS Development Roadmap

> **Status**: Living document  
> **Last Updated**: 2025-12-14  
> **Foundation**: Stream reasoner, modular premise formation, 7 NAL rules, 99.8% test pass rate

---

## Table of Contents

1. [Principles](#principles)
2. [Simplifications](#simplifications)
3. [Implemented](#implemented)
4. [Extractions](#extractions)
5. [Roadmap](#roadmap)
6. [Quick Wins](#quick-wins)
7. [Foundation](#foundation)
8. [NAL Completion](#nal-completion)
9. [Strategies](#strategies)
10. [Memory](#memory)
11. [LM Integration](#lm-integration)
12. [Ecosystem](#ecosystem)

---

## Principles

| Principle | Description |
|-----------|-------------|
| **NAL First** | Formal NAL semantics; LM augments, not replaces |
| **Composable** | Plug-and-play via standard interfaces |
| **Observable** | Derivations traceable; emit events |
| **Resource-Aware** | Budgets, timeouts, graceful degradation (AIKR) |
| **Test-Driven** | No untested inference paths |
| **Substrate** | Enable many futures; prefer generic |

---

## Simplifications

### Negation via Truth Values

Negation = frequency inversion, not separate term operator.

```
Input:   --(bird --> flyer). %0.9;0.8%
Stored:  (bird --> flyer). %0.1;0.8%    ← f' = 1 - f
Display: f < 0.5 → show as --(term) with f' = 1 - f
```

**Eliminates**: `NegationRule`, `NegationPairingStrategy`, negation term operator

**Required**:
- [ ] Parser: detect `--`, invert f, store positive term → [NarseseParser.js](file:///home/me/senars10/core/src/parser/NarseseParser.js)
- [ ] Formatter: if f < 0.5, display with `--` prefix → Task.toString()
- [ ] Contradiction: same term with |f1 - f2| > 0.5

> `Truth.negation()` exists at [Truth.js#L85](file:///home/me/senars10/core/src/Truth.js#L85-L87)

---

## Implemented

### Core

| Component | Location | Notes |
|-----------|----------|-------|
| Stream Reasoner | [Reasoner.js](file:///home/me/senars10/core/src/reason/Reasoner.js) | Async generators, backpressure |
| NAL Rules | [rules/nal/](file:///home/me/senars10/core/src/reason/rules/nal) | 7 rules: Syllogistic, ModusPonens, Induction, Abduction, Conversion, Contraposition, VariableIntroduction |
| Strategies | [strategy/](file:///home/me/senars10/core/src/reason/strategy) | 8 strategies implemented |
| Memory | [memory/](file:///home/me/senars10/core/src/memory) | Bag, Focus, Consolidation, Index, Forgetting |
| Term | [term/](file:///home/me/senars10/core/src/term) | TermFactory, TermCache, canonical forms |
| LM | [lm/](file:///home/me/senars10/core/src/lm) | EmbeddingLayer, providers, translators |
| Tools | [tool/](file:///home/me/senars10/core/src/tool) | 16 tools: NARTool, EmbeddingTool, etc. |

### Truth Functions

All key truth functions exist in [Truth.js](file:///home/me/senars10/core/src/Truth.js):

| Function | Line | Used By |
|----------|------|---------|
| `deduction` | L50 | SyllogisticRule |
| `induction` | L56 | InductionAbductionRule |
| `abduction` | L61 | InductionAbductionRule |
| `exemplification` | L143 | ❌ No rule yet |
| `analogy` | L105 | ❌ No rule yet |
| `comparison` | L97 | ❌ No rule yet |
| `negation` | L85 | ❌ Not wired to parser |
| `revision` | L71 | Memory merge |
| `contraposition` | L115 | ContrapositionRule |
| `intersection` | L123 | ❌ No rule yet |
| `union` | L128 | ❌ No rule yet |

### Unification (in PrologStrategy)

Full unification exists in [PrologStrategy.js](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js):

| Function | Line | Purpose |
|----------|------|---------|
| `_unify` | L288-318 | Recursive unification |
| `_unifyVariable` | L320-336 | Variable binding |
| `_occursCheck` | L394-406 | Circular reference detection |
| `_applySubstitutionToTerm` | L412-432 | Substitute variables |
| `_isVariable` | L380-384 | Variable detection |
| `_isCompound` | L342-346 | Compound detection |
| `_termsEqual` | L369-374 | Term equality |

### Term Properties (in Term.js)

Built-in predicates in [Term.js](file:///home/me/senars10/core/src/term/Term.js):

| Property | Line | Returns |
|----------|------|---------|
| `isVariable` | L105 | `semanticType === VARIABLE` |
| `isCompound` | L93 | `type === COMPOUND` |
| `isAtomic` | L89 | `type === ATOM` |
| `isInheritance` | L57 | `operator === '-->'` |
| `isImplication` | L61 | `operator === '==>'` |
| `isSimilarity` | L65 | `operator === '<->'` |
| `equals(other)` | L165-179 | Deep equality |

---

## Extractions

> **High-ROI refactorings that reduce duplication and strengthen the codebase**

### 1. TermUtils.js (NEW)

**Problem**: `_termsEqual` duplicated in 4 files, `_isCompound` in 3.

**Duplication found**:
- [Strategy.js#L312](file:///home/me/senars10/core/src/reason/Strategy.js#L308-L321)
- [TaskMatchStrategy.js#L118](file:///home/me/senars10/core/src/reason/strategy/TaskMatchStrategy.js#L118)
- [PrologStrategy.js#L369](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js#L369-L374)
- [VariableIntroduction.js#L179](file:///home/me/senars10/core/src/reason/rules/nal/VariableIntroduction.js#L175-L185)

**Solution**: Extract to `core/src/term/TermUtils.js`:

```javascript
// core/src/term/TermUtils.js
export const termsEqual = (t1, t2) => {
  if (!t1 || !t2) return false;
  if (typeof t1.equals === 'function') return t1.equals(t2);
  if (t1.name && t2.name) return t1.name === t2.name;
  return t1.toString() === t2.toString();
};

export const isVariable = (term) => {
  if (!term) return false;
  if (typeof term.isVariable === 'boolean') return term.isVariable;
  const name = term.name || term._name || '';
  return name.startsWith('?') || name.startsWith('$') || name.startsWith('#');
};

export const isCompound = (term) => {
  if (!term) return false;
  if (typeof term.isCompound === 'boolean') return term.isCompound;
  return !!(term.operator || term.components?.length);
};

export const getComponents = (term) => term?.components || term?.args || [];
```

**Effort**: 2-4 hours  
**Unlocks**: Consistent term predicates across codebase, single source of truth

---

### 2. Unifier.js (EXTRACT)

**Problem**: Unification logic embedded in PrologStrategy, cannot be reused.

**Source**: [PrologStrategy.js#L284-432](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js#L284-L432)

**Solution**: Extract to `core/src/term/Unifier.js`:

```javascript
// core/src/term/Unifier.js
import { isVariable, isCompound, getComponents, termsEqual } from './TermUtils.js';

export class Unifier {
  constructor(termFactory) {
    this.termFactory = termFactory;
  }

  /**
   * Unify two terms.
   * @returns {{ success: boolean, bindings: Map<string, Term> }}
   */
  unify(term1, term2, bindings = new Map()) {
    const t1 = this.substitute(term1, bindings);
    const t2 = this.substitute(term2, bindings);

    if (isVariable(t1)) return this._unifyVar(t1, t2, bindings);
    if (isVariable(t2)) return this._unifyVar(t2, t1, bindings);
    if (termsEqual(t1, t2)) return { success: true, bindings };

    if (isCompound(t1) && isCompound(t2)) {
      const c1 = getComponents(t1), c2 = getComponents(t2);
      if (c1.length !== c2.length || t1.operator !== t2.operator) {
        return { success: false, bindings: new Map() };
      }
      let current = bindings;
      for (let i = 0; i < c1.length; i++) {
        const result = this.unify(c1[i], c2[i], current);
        if (!result.success) return { success: false, bindings: new Map() };
        current = result.bindings;
      }
      return { success: true, bindings: current };
    }
    return { success: false, bindings: new Map() };
  }

  /**
   * Apply bindings to term, replacing variables.
   */
  substitute(term, bindings) {
    if (!term) return term;
    if (isVariable(term)) {
      const varName = term.name || term._name;
      return bindings.has(varName) 
        ? this.substitute(bindings.get(varName), bindings) 
        : term;
    }
    if (isCompound(term)) {
      const newComps = getComponents(term).map(c => this.substitute(c, bindings));
      return this.termFactory.create(term.operator, newComps);
    }
    return term;
  }

  /**
   * Check if variable occurs in term (prevents infinite terms).
   */
  occursIn(varName, term, bindings = new Map()) {
    if (isVariable(term)) {
      const name = term.name || term._name;
      if (name === varName) return true;
      if (bindings.has(name)) return this.occursIn(varName, bindings.get(name), bindings);
      return false;
    }
    if (isCompound(term)) {
      return getComponents(term).some(c => this.occursIn(varName, c, bindings));
    }
    return false;
  }

  _unifyVar(variable, term, bindings) {
    const varName = variable.name || variable._name;
    if (bindings.has(varName)) {
      return this.unify(bindings.get(varName), term, bindings);
    }
    if (isVariable(term) && bindings.has(term.name || term._name)) {
      return this.unify(variable, bindings.get(term.name || term._name), bindings);
    }
    if (this.occursIn(varName, term, bindings)) {
      return { success: false, bindings: new Map() };
    }
    const newBindings = new Map(bindings);
    newBindings.set(varName, term);
    return { success: true, bindings: newBindings };
  }
}
```

**Effort**: 4-6 hours (extract + tests + update PrologStrategy to use)  
**Unlocks**: NAL-6 variables, AnalogicalStrategy, ResolutionStrategy reuse, differentiable logic

---

### 3. SemanticStrategy.js (WIRE)

**Problem**: EmbeddingLayer exists but not integrated as premise strategy.

**Solution**: Create `core/src/reason/strategy/SemanticStrategy.js`:

```javascript
// core/src/reason/strategy/SemanticStrategy.js
import { PremiseFormationStrategy } from './PremiseFormationStrategy.js';

export class SemanticStrategy extends PremiseFormationStrategy {
  constructor(embeddingLayer, config = {}) {
    super({ name: 'Semantic', priority: 0.7, ...config });
    this.embeddings = embeddingLayer;
    this.threshold = config.threshold ?? 0.7;
  }

  async* generateCandidates(task, memory, context) {
    const terms = [...memory.getConcepts().keys()].map(t => t.toString());
    const similar = await this.embeddings.findSimilar(task.term.toString(), terms, this.threshold);
    
    for (const { item, similarity } of similar) {
      const concept = memory.getConcept(item);
      if (concept?.getTopBelief) {
        yield { 
          premise1: task, 
          premise2: concept.getTopBelief(), 
          priority: similarity, 
          source: 'semantic' 
        };
      }
    }
  }
}
```

**Effort**: 2-4 hours  
**Unlocks**: Fuzzy premise matching, semantic search, analogical reasoning support

---

### 4. NAL-4 Rules (WIRE)

**Problem**: Truth functions exist, rules don't.

| Rule | Truth Function | Pattern |
|------|----------------|---------|
| `ExemplificationRule` | `Truth.exemplification` ✅ | (M→P), (S→M) ⊢ (S→P)? |
| `AnalogyRule` | `Truth.analogy` ✅ | (S↔M), (M→P) ⊢ (S→P) |
| `ComparisonRule` | `Truth.comparison` ✅ | shared terms → similarity |
| `SetOperationRule` | `Truth.intersection`, `union` ✅ | set ops |

**Template** (use [NALRule.js](file:///home/me/senars10/core/src/reason/rules/nal/NALRule.js) base):

```javascript
// core/src/reason/rules/nal/ExemplificationRule.js
import { NALRule } from './NALRule.js';
import { Truth } from '../../../Truth.js';

export class ExemplificationRule extends NALRule {
  constructor(config = {}) {
    super('Exemplification', 'nal', 0.6, config);
  }

  canApply(p, s, ctx) {
    // (M→P), (S→M) pattern: p.subject === s.predicate
    return p.term?.isInheritance && s.term?.isInheritance &&
           p.term.subject?.equals?.(s.term.predicate);
  }

  apply(p, s, ctx) {
    const truth = Truth.exemplification(p.truth, s.truth);
    const term = ctx.termFactory?.inheritance(s.term.subject, p.term.predicate);
    return this.createDerivedTask(term, truth, [p, s], ctx);
  }
}
```

**Effort**: 1-2 hours per rule  
**Unlocks**: Complete NAL-4

---

## Roadmap

### Phase 0: Consolidation (Now)

| Task | Effort | Unlocks |
|------|--------|---------|
| Create `TermUtils.js` | 2-4 hrs | All extractions |
| Extract `Unifier.js` | 4-6 hrs | NAL-6, Analogical |
| Wire NAL-4 rules | 4-6 hrs | Complete NAL-4 |
| Wire `SemanticStrategy` | 2-4 hrs | Semantic matching |

### Phase 1: Variables (1-2 weeks)

```
TermUtils ──> Unifier ──> NAL-6 Variables ──> AnalogicalStrategy
```

**Exit Criteria**: `(?x → animal)` unifies with `(bird → animal)` → `{?x: bird}`

### Phase 2: Temporal (2-4 weeks)

```
TemporalBuffer ──> NAL-7 Rules ──> CausalStrategy
```

**Exit Criteria**: Temporal operator support, sequence detection

### Phase 3: Goals (4-8 weeks)

```
NAL-6 + NAL-7 ──> NAL-8 Goals ──> Planning
```

---

## Quick Wins

### Immediate (< 1 day)

| Task | Effort | Files |
|------|--------|-------|
| `TermUtils.js` | 2-4 hrs | NEW: `term/TermUtils.js` |
| Negation in parser | 2-4 hrs | `parser/NarseseParser.js` |
| `ExemplificationRule` | 2 hrs | `rules/nal/ExemplificationRule.js` |
| `AnalogyRule` | 2 hrs | `rules/nal/AnalogyRule.js` |
| `ComparisonRule` | 2 hrs | `rules/nal/ComparisonRule.js` |

### Short-term (1-3 days)

| Task | Effort | Files |
|------|--------|-------|
| Extract `Unifier.js` | 4-6 hrs | NEW: `term/Unifier.js`, update `PrologStrategy.js` |
| `SemanticStrategy` | 4 hrs | NEW: `strategy/SemanticStrategy.js` |
| Contradiction detection | 4 hrs | `Memory.js` |

---

## Foundation

### Unifier (EXTRACT)

**Status**: ⚠️ In PrologStrategy, needs extraction  
**Source**: [PrologStrategy.js#L284-432](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js#L284-L432)  
**Target**: `core/src/term/Unifier.js`

### EmbeddingLayer (EXISTS)

**Status**: ✅ Implemented, needs strategy wrapper  
**Location**: [EmbeddingLayer.js](file:///home/me/senars10/core/src/lm/EmbeddingLayer.js)

### TemporalBuffer (NEW)

**Status**: ❌ Not started  
**Target**: `core/src/memory/TemporalBuffer.js`

```javascript
class TemporalBuffer {
  constructor(windowSize, resolution)
  add(event, time?) → void
  getWindow(start, end) → Event[]
  findSequences(pattern, minGap, maxGap) → Sequence[]
}
```

### DerivationTracer (EXTEND)

**Status**: ⚠️ MetricsMonitor partial  
**Source**: [MetricsMonitor.js](file:///home/me/senars10/core/src/reason/MetricsMonitor.js)

---

## NAL Completion

### NAL-4 (Remaining)

| Rule | Status | Depends |
|------|--------|---------|
| `ExemplificationRule` | ❌ | Truth.exemplification ✅ |
| `AnalogyRule` | ❌ | Truth.analogy ✅ |
| `ComparisonRule` | ❌ | Truth.comparison ✅ |
| `SetOperationRule` | ❌ | Truth.intersection/union ✅ |

### NAL-5: Higher-Order

- [ ] Nested inheritance: `((A→B) → C)`
- [ ] Product: `(×, A, B)`
- [ ] Image: `(/,R,_,B)`, `(\,R,A,_)`

### NAL-6: Variables

**Status**: ⚠️ Partial

| Part | Status | Location |
|------|--------|----------|
| Variable terms | ✅ | [Term.js#L105](file:///home/me/senars10/core/src/term/Term.js#L105) |
| VariableIntroduction | ✅ | [VariableIntroduction.js](file:///home/me/senars10/core/src/reason/rules/nal/VariableIntroduction.js) |
| Unification | ⚠️ | In PrologStrategy, extract to Unifier.js |
| Query matching | ❌ | Needs Unifier |

### NAL-7: Temporal

| Part | Status |
|------|--------|
| Temporal operators | ❌ |
| TemporalBuffer | ❌ |
| TemporalInductionRule | ❌ |

### NAL-8: Goals/Planning

*Depends on*: NAL-6 + NAL-7

---

## Strategies

### Implemented

| Strategy | Location | Purpose |
|----------|----------|---------|
| `TaskMatchStrategy` | [strategy/](file:///home/me/senars10/core/src/reason/strategy/TaskMatchStrategy.js) | Syllogistic patterns |
| `DecompositionStrategy` | [strategy/](file:///home/me/senars10/core/src/reason/strategy/DecompositionStrategy.js) | Extract subterms |
| `TermLinkStrategy` | [strategy/](file:///home/me/senars10/core/src/reason/strategy/TermLinkStrategy.js) | Associative links |
| `BagStrategy` | [strategy/](file:///home/me/senars10/core/src/reason/strategy/BagStrategy.js) | Priority sampling |
| `ExhaustiveStrategy` | [strategy/](file:///home/me/senars10/core/src/reason/strategy/ExhaustiveStrategy.js) | Full search |
| `PrologStrategy` | [strategy/](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js) | Backward chaining |
| `ResolutionStrategy` | [strategy/](file:///home/me/senars10/core/src/reason/strategy/ResolutionStrategy.js) | Question answering |

### Planned

| Strategy | Depends | Notes |
|----------|---------|-------|
| `SemanticStrategy` | EmbeddingLayer ✅ | Wire existing EmbeddingLayer |
| `AnalogicalStrategy` | Unifier | Cross-domain mapping |
| `GoalDrivenStrategy` | NAL-8 | Backward from goals |
| `CausalStrategy` | NAL-7 | Multi-hop temporal |

---

## Memory

### Implemented

| Component | Location |
|-----------|----------|
| Bag | [Bag.js](file:///home/me/senars10/core/src/memory/Bag.js) |
| Concept | [Concept.js](file:///home/me/senars10/core/src/memory/Concept.js) |
| Focus | [Focus.js](file:///home/me/senars10/core/src/memory/Focus.js) |
| Memory | [Memory.js](file:///home/me/senars10/core/src/memory/Memory.js) |
| Index | [MemoryIndex.js](file:///home/me/senars10/core/src/memory/MemoryIndex.js) |
| Consolidation | [MemoryConsolidation.js](file:///home/me/senars10/core/src/memory/MemoryConsolidation.js) |
| Forgetting | [ForgettingPolicy.js](file:///home/me/senars10/core/src/memory/ForgettingPolicy.js) |
| Layer | [Layer.js](file:///home/me/senars10/core/src/memory/Layer.js), [TermLayer.js](file:///home/me/senars10/core/src/memory/TermLayer.js) |

### Needed

| Component | Purpose |
|-----------|---------|
| TemporalBuffer | NAL-7 event sequences |
| VectorIndex | Semantic similarity queries |

---

## LM Integration

### Implemented

| Component | Location |
|-----------|----------|
| LM | [LM.js](file:///home/me/senars10/core/src/lm/LM.js) |
| EmbeddingLayer | [EmbeddingLayer.js](file:///home/me/senars10/core/src/lm/EmbeddingLayer.js) |
| LMRuleFactory | [LMRuleFactory.js](file:///home/me/senars10/core/src/lm/LMRuleFactory.js) |
| Translators | [NarseseTranslator.js](file:///home/me/senars10/core/src/lm/NarseseTranslator.js), [AdvancedNarseseTranslator.js](file:///home/me/senars10/core/src/lm/AdvancedNarseseTranslator.js) |
| Providers | HuggingFace, LangChain, TransformersJS |

---

## Ecosystem

### Implemented

| Component | Location |
|-----------|----------|
| NARTool | [tool/NARTool.js](file:///home/me/senars10/core/src/tool/NARTool.js) |
| EmbeddingTool | [tool/EmbeddingTool.js](file:///home/me/senars10/core/src/tool/EmbeddingTool.js) |
| ExplanationService | [tool/ExplanationService.js](file:///home/me/senars10/core/src/tool/ExplanationService.js) |
| ToolRegistry | [tool/ToolRegistry.js](file:///home/me/senars10/core/src/tool/ToolRegistry.js) |

### Planned

| Component | Priority |
|-----------|----------|
| REST API | Medium |
| Web Playground | Low |
| Obsidian plugin | Low |

---

## Key Files

| File | Purpose |
|------|---------|
| [Strategy.js](file:///home/me/senars10/core/src/reason/Strategy.js) | Premise formation base |
| [NALRule.js](file:///home/me/senars10/core/src/reason/rules/nal/NALRule.js) | Rule base class |
| [Truth.js](file:///home/me/senars10/core/src/Truth.js) | All truth functions |
| [Term.js](file:///home/me/senars10/core/src/term/Term.js) | Term predicates |
| [TermFactory.js](file:///home/me/senars10/core/src/term/TermFactory.js) | Term construction |
| [PrologStrategy.js](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js) | Unification source |
| [EmbeddingLayer.js](file:///home/me/senars10/core/src/lm/EmbeddingLayer.js) | Semantic embeddings |

---

*Living document. Revise aggressively.*
