# SeNARS Development Roadmap

> **Status**: Living document  
> **Last Updated**: 2025-12-14  
> **Foundation**: Stream reasoner, modular premise formation, 7 NAL rules, 99.8% test pass rate

---

## Table of Contents

1. [Principles](#principles)
2. [Simplifications](#simplifications)
3. [Abstractions](#abstractions)
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
| **Composable** | Standard interfaces, plug-and-play |
| **Observable** | Emit events, bounded retention |
| **Resource-Aware** | Budgets, timeouts, graceful degradation |
| **Test-Driven** | No untested inference paths |
| **Substrate** | Enable many futures; prefer generic |

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

**Test**: `nar.input("--(bird --> flyer). %0.9%"); expect(memory.get("(bird --> flyer)").truth.f).toBe(0.1)`

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
| `term.isInheritance` | [Term.js#L57](file:///home/me/senars10/core/src/term/Term.js#L57) | `term.operator === '-->'` |
| `term.isImplication` | [Term.js#L61](file:///home/me/senars10/core/src/term/Term.js#L61) | `term.operator === '==>'` |

**Files with duplication**:
- [Strategy.js#L312](file:///home/me/senars10/core/src/reason/Strategy.js#L312) — `_termsEqual`
- [TaskMatchStrategy.js#L118](file:///home/me/senars10/core/src/reason/strategy/TaskMatchStrategy.js#L118) — `_termsEqual`
- [PrologStrategy.js#L369](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js#L369) — `_termsEqual`, `_isVariable`, `_isCompound`
- [VariableIntroduction.js#L179](file:///home/me/senars10/core/src/reason/rules/nal/VariableIntroduction.js#L179) — `_termsEqual`

---

## Abstractions

> **Rule patterns that enable DRY implementations**

### Three Rule Pattern Categories

| Pattern | Premises | Example Rules | Truth Fn |
|---------|----------|---------------|----------|
| **Syllogistic** | 2, shared middle | Deduction | `Truth.deduction` |
| **Shared-Term** | 2, shared subject/predicate | Induction, Abduction, Comparison | `Truth.induction`, etc. |
| **Unary** | 1 | Conversion, Contraposition | `Truth.conversion` |
| **Detachment** | 2, implication + antecedent | ModusPonens | `Truth.detachment` |

### 1. SyllogisticRule Pattern (EXISTS)

Already parameterized by operator in [SyllogisticRule.js](file:///home/me/senars10/core/src/reason/rules/nal/SyllogisticRule.js):

```javascript
class SyllogisticRule extends NALRule {
  constructor(id, operator, priority, config) {
    this.operator = operator;  // '-->' or '==>'
  }
  // Pattern: (S→M), (M→P) ⊢ (S→P)
}

// Instantiated as:
new InheritanceSyllogisticRule()  // operator = '-->'
new ImplicationSyllogisticRule()  // operator = '==>'
```

---

### 2. SharedTermRule Pattern (PROPOSED)

Generalizes Induction/Abduction/Comparison/Exemplification:

```javascript
// core/src/reason/rules/nal/SharedTermRule.js
import { NALRule } from './NALRule.js';

export class SharedTermRule extends NALRule {
  /**
   * @param {string} id - Rule identifier
   * @param {'subject'|'predicate'} sharedPosition - Which position is shared
   * @param {Function} truthFn - Truth function: (t1, t2) => truth
   * @param {Function} conclusionFn - (p, s, tf) => term
   * @param {number} priority - Rule priority
   */
  constructor(id, sharedPosition, truthFn, conclusionFn, priority = 0.8, config = {}) {
    super(id, 'nal', priority, config);
    this.sharedPosition = sharedPosition;
    this.truthFn = truthFn;
    this.conclusionFn = conclusionFn;
  }

  canApply(p, s, ctx) {
    if (!p?.term?.isInheritance || !s?.term?.isInheritance) return false;
    
    const shared = this.sharedPosition === 'subject'
      ? p.term.subject?.equals?.(s.term.subject)
      : p.term.predicate?.equals?.(s.term.predicate);
    
    const different = this.sharedPosition === 'subject'
      ? !p.term.predicate?.equals?.(s.term.predicate)
      : !p.term.subject?.equals?.(s.term.subject);
    
    return shared && different;
  }

  apply(p, s, ctx) {
    if (!this.canApply(p, s, ctx)) return [];
    
    const truth = this.truthFn(p.truth, s.truth);
    if (!truth) return [];
    
    const term = this.conclusionFn(p, s, ctx.termFactory);
    const task = this.createDerivedTask(term, truth, [p, s], ctx);
    return task ? [task] : [];
  }
}

// Instantiations:
export const InductionRule = () => new SharedTermRule(
  'induction', 'subject', Truth.induction,
  (p, s, tf) => tf.inheritance(s.term.predicate, p.term.predicate),
  0.9
);

export const AbductionRule = () => new SharedTermRule(
  'abduction', 'predicate', Truth.abduction,
  (p, s, tf) => tf.inheritance(s.term.subject, p.term.subject),
  0.9
);

export const ComparisonRule = () => new SharedTermRule(
  'comparison', 'subject', Truth.comparison,
  (p, s, tf) => tf.similarity(s.term.predicate, p.term.predicate),
  0.7
);
```

**Effort**: 2-4 hours  
**Unlocks**: DRY implementation for 4+ rules, easier to add new shared-term rules

---

### 3. UnaryRule Pattern (PROPOSED)

Generalizes Conversion/Contraposition:

```javascript
// core/src/reason/rules/nal/UnaryRule.js
import { NALRule } from './NALRule.js';

export class UnaryRule extends NALRule {
  /**
   * @param {string} id - Rule identifier
   * @param {string} operator - Required operator ('-->' or '==>')
   * @param {Function} truthFn - (truth) => newTruth
   * @param {Function} conclusionFn - (term, tf) => newTerm
   * @param {number} priority
   */
  constructor(id, operator, truthFn, conclusionFn, priority = 0.7, config = {}) {
    super(id, 'nal', priority, config);
    this.operator = operator;
    this.truthFn = truthFn;
    this.conclusionFn = conclusionFn;
  }

  canApply(p, s, ctx) {
    if (s) return false;  // Unary: no secondary premise
    return p?.term?.isCompound && p.term.operator === this.operator;
  }

  apply(p, s, ctx) {
    if (!this.canApply(p, s, ctx)) return [];
    
    const truth = this.truthFn(p.truth);
    if (!truth) return [];
    
    const term = this.conclusionFn(p.term, ctx.termFactory);
    const task = this.createDerivedTask(term, truth, [p], ctx);
    return task ? [task] : [];
  }
}

// Instantiations:
export const ConversionRule = () => new UnaryRule(
  'conversion', '-->',
  Truth.conversion,
  (t, tf) => tf.inheritance(t.predicate, t.subject),
  0.7
);

export const ContrapositionRule = () => new UnaryRule(
  'contraposition', '==>',
  Truth.structuralReduction,
  (t, tf) => tf.implication(tf.negation(t.predicate), tf.negation(t.subject)),
  0.6
);
```

**Effort**: 2 hours  
**Unlocks**: DRY for unary rules

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
| `comparison` | [L97](file:///home/me/senars10/core/src/Truth.js#L97) | ❌ Create rule |
| `analogy` | [L105](file:///home/me/senars10/core/src/Truth.js#L105) | ❌ Create rule |
| `contraposition` | [L115](file:///home/me/senars10/core/src/Truth.js#L115) | — |
| `intersection` | [L123](file:///home/me/senars10/core/src/Truth.js#L123) | ❌ Create rule |
| `union` | [L128](file:///home/me/senars10/core/src/Truth.js#L128) | ❌ Create rule |
| `exemplification` | [L143](file:///home/me/senars10/core/src/Truth.js#L143) | ❌ Create rule |
| `structuralReduction` | [L168](file:///home/me/senars10/core/src/Truth.js#L168) | ✅ ContrapositionRule |

### Unification (in PrologStrategy)

Full unification exists in [PrologStrategy.js](file:///home/me/senars10/core/src/reason/strategy/PrologStrategy.js):

| Function | Line | Purpose |
|----------|------|---------|
| `_unify` | L288-318 | Recursive unification |
| `_unifyVariable` | L320-336 | Variable binding with occurs check |
| `_occursCheck` | L394-406 | Infinite term prevention |
| `_applySubstitutionToTerm` | L412-432 | Apply bindings |
| `_isVariable` | L380-384 | Variable detection |
| `_standardizeRuleVariables` | L205-230 | Alpha-renaming |

---

## Extractions

### 1. TermUtils.js (NEW)

Thin wrappers + consistent API for term operations:

```javascript
// core/src/term/TermUtils.js
export const termsEqual = (t1, t2) => t1?.equals?.(t2) ?? false;
export const isVariable = (term) => term?.isVariable ?? false;
export const isCompound = (term) => term?.isCompound ?? false;
export const isInheritance = (term) => term?.isInheritance ?? false;
export const isImplication = (term) => term?.isImplication ?? false;
export const getSubject = (term) => term?.subject;
export const getPredicate = (term) => term?.predicate;
export const getComponents = (term) => term?.components ?? [];
```

**Effort**: 1 hour  
**Update files**: Strategy.js, TaskMatchStrategy.js, PrologStrategy.js, VariableIntroduction.js

---

### 2. Unifier.js (EXTRACT)

Extract from PrologStrategy for reuse:

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

  substitute(term, bindings) {
    if (!term) return term;
    if (isVariable(term)) {
      const name = term.name;
      return bindings.has(name) ? this.substitute(bindings.get(name), bindings) : term;
    }
    if (isCompound(term)) {
      const comps = getComponents(term).map(c => this.substitute(c, bindings));
      return this.termFactory.create(term.operator, comps);
    }
    return term;
  }

  occursIn(varName, term, bindings = new Map()) {
    if (isVariable(term)) {
      if (term.name === varName) return true;
      if (bindings.has(term.name)) return this.occursIn(varName, bindings.get(term.name), bindings);
      return false;
    }
    if (isCompound(term)) {
      return getComponents(term).some(c => this.occursIn(varName, c, bindings));
    }
    return false;
  }

  _unifyVar(variable, term, bindings) {
    const varName = variable.name;
    if (bindings.has(varName)) return this.unify(bindings.get(varName), term, bindings);
    if (isVariable(term) && bindings.has(term.name)) return this.unify(variable, bindings.get(term.name), bindings);
    if (this.occursIn(varName, term, bindings)) return { success: false, bindings: new Map() };
    
    const newBindings = new Map(bindings);
    newBindings.set(varName, term);
    return { success: true, bindings: newBindings };
  }

  /** Alpha-rename variables to prevent collision */
  standardize(term) {
    const suffix = `_${this._varCounter++}`;
    const mapping = {};
    
    const rename = (t) => {
      if (!t) return t;
      if (isVariable(t)) {
        if (!mapping[t.name]) mapping[t.name] = `${t.name}${suffix}`;
        return this.termFactory.variable(mapping[t.name]);
      }
      if (isCompound(t)) {
        return this.termFactory.create(t.operator, getComponents(t).map(rename));
      }
      return t;
    };
    
    return rename(term);
  }
}
```

**Effort**: 4-6 hours  
**Unlocks**: NAL-6 query matching, AnalogicalStrategy, ResolutionStrategy can share, differentiable logic

---

### 3. SemanticStrategy (WIRE)

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
    if (!this.embeddings?.enabled || !context?.memory) return;
    
    const taskStr = primaryTask.term?.toString();
    if (!taskStr) return;
    
    const terms = [];
    for (const [term] of context.memory.getConcepts()) {
      terms.push(term.toString());
    }
    
    const similar = await this.embeddings.findSimilar(taskStr, terms, this.threshold);
    
    for (const { item, similarity } of similar) {
      const concept = context.memory.getConcept(item);
      const belief = concept?.getTopBelief?.();
      if (belief) {
        this._recordCandidate();
        yield { term: belief.term, priority: similarity, sourceTask: belief, type: 'semantic' };
      }
    }
  }
}
```

**Effort**: 2-4 hours  
**Unlocks**: Fuzzy premise matching

---

## Roadmap

### Phase 0: Consolidation (Now)

| Task | Effort | Unlocks |
|------|--------|---------|
| TermUtils.js | 1 hr | Clean APIs |
| Negation in parser | 2-4 hrs | Simplification |
| SharedTermRule base | 2-4 hrs | DRY rules |
| ComparisonRule | 1 hr | NAL-4 |
| ExemplificationRule | 1 hr | NAL-4 |
| AnalogyRule | 1 hr | NAL-4 |
| SetOperationRule | 2 hrs | NAL-4 |

### Phase 1: Variables (1-2 weeks)

| Task | Effort | Unlocks |
|------|--------|---------|
| Unifier.js extraction | 4-6 hrs | NAL-6, reuse |
| SemanticStrategy | 2-4 hrs | Fuzzy matching |
| Query variable matching | 4 hrs | Questions |
| AnalogicalStrategy | 4 hrs | Cross-domain |

### Phase 2: Temporal (2-4 weeks)

| Task | Effort | Unlocks |
|------|--------|---------|
| TemporalBuffer | 1 week | NAL-7 |
| Temporal operators in parser | 4 hrs | `=/>`, `=|>` |
| TemporalInductionRule | 4 hrs | Sequence learning |
| CausalStrategy | 4 hrs | Multi-hop |

### Phase 3: Goals (4-8 weeks)

| Task | Effort | Unlocks |
|------|--------|---------|
| Goal task handling | 1 week | NAL-8 |
| GoalDrivenStrategy | 1 week | Backward chaining |
| Plan synthesis | 2 weeks | Action sequences |

---

## Quick Wins

### Immediate (< 4 hours)

| Task | Effort | How |
|------|--------|-----|
| TermUtils.js | 1 hr | Copy snippet above, update imports |
| ComparisonRule | 1 hr | Use SharedTermRule pattern |
| ExemplificationRule | 1 hr | Pattern: p.subject === s.predicate |
| AnalogyRule | 1 hr | Pattern: similarity + inheritance |

### Short (1-3 days)

| Task | Effort | How |
|------|--------|-----|
| Negation parser | 2-4 hrs | Detect `--`, call `Truth.negation()` |
| SharedTermRule base | 2-4 hrs | Copy snippet above |
| Unifier.js | 4-6 hrs | Copy snippet, update PrologStrategy |
| SemanticStrategy | 2-4 hrs | Copy snippet, register in ReasonerBuilder |

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

### NAL-4 Remaining

| Rule | Pattern | Truth Fn | Priority |
|------|---------|----------|----------|
| ComparisonRule | Shared subject → similarity | `Truth.comparison` | 0.7 |
| ExemplificationRule | p.subject === s.predicate | `Truth.exemplification` | 0.6 |
| AnalogyRule | (S↔M), (M→P) ⊢ (S→P) | `Truth.analogy` | 0.7 |
| SetOperationRule | Set terms | `Truth.intersection`/`union` | 0.8 |

### NAL-5: Higher-Order

- [ ] Nested: `((A→B) → C)`
- [ ] Product: `(×, A, B)`
- [ ] Image: `(/,R,_,B)`, `(\,R,A,_)`

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

### NAL-9: Introspection

- [ ] Self-referential statements
- [ ] MetacognitionRules exists: [MetacognitionRules.js](file:///home/me/senars10/core/src/reason/rules/nal/MetacognitionRules.js)

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
