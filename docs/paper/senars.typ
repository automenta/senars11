// SeNARS: A Neuro-Symbolic Cognitive Architecture
// Typst format - compile with: typst compile senars.typ

#set document(
  title: "Semantic Non-Axiomatic Reasoning System (SeNARS)",
  author: "SeNARS Developers",
)

#set page(
  paper: "us-letter",
  margin: 1in,
  columns: 2,
  header: context {
    if counter(page).get().first() > 1 [
      #text(size: 9pt, fill: gray)[SeNARS: Neuro-Symbolic Cognitive Architecture #h(1fr) #counter(page).display()]
    ]
  },
)

#set text(font: "New Computer Modern", size: 10pt)
#set par(justify: true)
#set heading(numbering: "1.")

// Color definitions
#let primary = rgb("#173f5f")
#let secondary = rgb("#3c6e8c")
#let accent = rgb("#20b2aa")

// Custom styling
#show link: it => text(fill: secondary, it)
#show heading.where(level: 1): it => block(above: 1.5em, below: 0.8em)[
  #text(fill: primary, weight: "bold", size: 14pt, it)
]
#show heading.where(level: 2): it => block(above: 1.2em, below: 0.6em)[
  #text(fill: primary, weight: "bold", size: 11pt, it)
]

// Abbreviations
#let senars = smallcaps[SeNARS]
#let nal = smallcaps[NAL]
#let nars = smallcaps[NARS]

// ==============================================================================
// TITLE
// ==============================================================================

#align(center)[
  #text(size: 16pt, weight: "bold", fill: primary)[
    Semantic Non-Axiomatic Reasoning System (#senars)
  ]
  #v(0.3em)
  #text(size: 12pt)[
    A Neuro-Symbolic Cognitive Architecture for Reasoning Under Uncertainty
  ]
  #v(1em)
  #text(size: 10pt)[SeNARS Developers]
  #v(0.3em)
  #text(size: 9pt)[
    #link("mailto:senars@narchy.org")[senars\@narchy.org] •
    Matrix: `#senars:narchy.org` •
    #link("https://github.com/automenta/senars11")[github.com/automenta/senars11]
  ]
  #v(0.5em)
  #text(size: 9pt, style: "italic")[Preprint]
  #v(0.3em)
  #text(size: 8pt, style: "italic")[
    This work is licensed under CC-BY-4.0. Source code is AGPL-3.0.
  ]
]

#v(1em)

// ==============================================================================
// ABSTRACT
// ==============================================================================

#block(fill: luma(248), inset: 1em, radius: 4pt)[
  *Abstract.* #senars is a hybrid neuro-symbolic cognitive architecture integrating Non-Axiomatic Logic (NAL) with Large Language Models through a streaming pipeline. Beliefs carry explicit uncertainty that revises as evidence accumulates; LLMs contribute pattern recognition and world knowledge. The architecture processes premise streams into conclusion streams, executing symbolic rules synchronously while dispatching neural queries asynchronously.

  The prototype implements dual memory, pluggable strategies, and real-time visualization. Yet #senars is _deliberately incomplete_: designed as substrate rather than product, it invites diverse forks. This incompleteness is the central innovation---finished systems calcify; open substrates enable ecosystems.
]

#v(1em)

// ==============================================================================
// 1. INTRODUCTION
// ==============================================================================

= Introduction

Artificial intelligence has long been split between two paradigms. *Symbolic AI* offers transparency: conclusions trace to premises, logical soundness is verifiable, and decisions explain themselves in human terms. But symbolic systems prove brittle when knowledge is incomplete, ambiguous, or contradictory---the everyday condition of intelligent agents navigating uncertain worlds. *Neural AI*, epitomized by large language models, offers fluid adaptability and astonishing breadth, recognizing patterns across vast corpora and generating plausible responses to almost any prompt. But neural systems hallucinate, lack persistent memory, and cannot explain their reasoning.

Neither paradigm alone suffices for autonomous agents that must reason continuously, learn incrementally, and act reliably under uncertainty.

== The Neuro-Symbolic Opportunity

The core insight of neuro-symbolic AI is that these paradigms are _complementary_: symbolic reasoning can constrain and validate neural outputs; neural pattern recognition can inform and accelerate symbolic inference. But effective integration demands more than bolting components together. It requires a coherent architecture where both modalities contribute to a unified reasoning stream.

#senars realizes this vision through three architectural commitments:

+ *Epistemic Grounding*: All beliefs carry explicit truth values---frequency and confidence---that propagate through inference and revise as evidence accumulates. The system _knows what it knows_ and _how much it trusts what it knows_.

+ *Streaming Dataflow*: Rather than batch processing, #senars continuously transforms premise streams into conclusion streams, enabling real-time responsiveness and non-blocking hybrid execution.

+ *Deliberate Incompleteness*: The architecture provides a stable, extensible core while leaving higher-level decisions open for specialization, enabling diverse forks rather than one-size-fits-all solutions.

== Vision: An Ecosystem of Minds

Imagine a future where cognitive architectures are as diverse as biological species. A medical diagnostic system might emphasize caution and explanation; an educational tutor might favor Socratic questioning; a creative assistant might embrace exploratory leaps. All would share common primitives---truth values, memory consolidation, hybrid inference---while diverging in strategy, domain knowledge, and personality.

#senars aspires to be the common ancestor: a minimal, coherent substrate from which this ecosystem can evolve. Not a product to be consumed, but a seed to be grown.

// ==============================================================================
// 2. BACKGROUND
// ==============================================================================

= Background

== Non-Axiomatic Logic

#senars builds on Pei Wang's foundational work on Non-Axiomatic Logic. NARS (Non-Axiomatic Reasoning System) was designed for reasoning under the _Assumption of Insufficient Knowledge and Resources_ (AIKR)---the premise that any real agent faces incomplete information and limited computation.

Where classical logics require complete, consistent axiom sets, #nal operates on partial evidence. Every statement carries a _truth value_ comprising frequency (how often true) and confidence (evidential strength). Truth values propagate through inference: conclusions inherit uncertainty from premises, and new evidence revises existing beliefs.

#nal is organized into six layers of increasing expressiveness:

- *NAL-1*: Inheritance relations and basic syllogistic reasoning
- *NAL-2*: Similarity, instances, and properties
- *NAL-3*: Set operations (intersection, union, difference)
- *NAL-4*: Product and image relations
- *NAL-5*: Implication and equivalence (higher-order statements)
- *NAL-6*: Variables, quantification, and temporal reasoning

OpenNARS, the reference Java implementation, demonstrated these principles in research settings. ANSNA explored a minimal C implementation for embedded systems. #senars continues this lineage, reimagining the architecture for modern streaming systems and neural integration.

== The AIKR Principle

The *Assumption of Insufficient Knowledge and Resources* (AIKR) is the foundational premise of #nal. Unlike classical logics that assume complete, consistent knowledge, AIKR acknowledges that any real intelligent agent operates under fundamental constraints:

/ Insufficient Knowledge: The agent never has complete information about its environment. Facts may be unknown, uncertain, or contradictory. No closed-world assumption is valid.
/ Insufficient Resources: Computation, memory, and time are always finite. The agent cannot exhaustively explore all possibilities or maintain perfect records.
/ Real-time Demands: Decisions must be made before complete analysis is possible. Waiting for certainty means missing opportunities.

AIKR has profound implications for system design:

- *Graded truth*: Beliefs carry explicit uncertainty rather than binary true/false values
- *Evidence accumulation*: New observations revise rather than replace existing beliefs
- *Anytime reasoning*: Inference produces useful partial results at any interruption point
- *Resource-bounded*: Computation is allocated by importance rather than exhaustive search
- *Graceful degradation*: Quality degrades smoothly under resource pressure

*How #senars Obeys AIKR.* Every architectural decision in #senars reflects AIKR:
- *Truth values* on all beliefs quantify uncertainty explicitly
- *Priority-based sampling* allocates attention to important tasks
- *Bounded Focus* limits active working memory, forcing forgetting and consolidation
- *Streaming architecture* produces conclusions continuously rather than in batch
- *Circuit breakers* on LM queries ensure responsiveness under external delays
- *Derivation depth limits* prevent unbounded inference chains

== LLM Reasoning Advances

Recent work has shown that Large Language Models can approximate structured reasoning when properly prompted:

*Chain-of-Thought* elicits step-by-step reasoning by including worked examples in prompts, dramatically improving performance on mathematical and logical tasks.

*ReAct* interleaves reasoning traces with actions, enabling LLMs to use external tools and retrieve information mid-reasoning.

*Reflexion* introduces verbal self-critique: the model reviews its reasoning, identifies errors, and iterates toward better solutions.

*Toolformer* teaches models to invoke APIs (calculators, search engines, databases) by embedding tool calls in training data.

These techniques demonstrate that LLMs can _simulate_ structured reasoning. But they lack formal grounding: no explicit uncertainty quantification, no persistent memory across sessions, no guarantee of logical consistency. #senars provides the missing infrastructure, using #nal as the backbone and LLMs as a knowledge-rich oracle.

// ==============================================================================
// 3. ARCHITECTURE
// ==============================================================================

= Architecture

#senars implements a *streaming dataflow architecture* that continuously transforms observations and queries into conclusions and actions. The design emphasizes immutability for correctness, non-blocking execution for responsiveness, and explicit extension points for adaptability.

== Core Data Structures

All foundational data structures are *immutable* and *canonically normalized*, ensuring referential transparency, safe concurrent access, and efficient caching.

*Terms.* The fundamental unit of knowledge representation. A Term may be atomic (a symbol like `bird`) or compound (a relation like `bird → animal`). The `TermFactory` normalizes equivalent terms and caches them for reuse. Each Term carries an operator, complexity measure, and precomputed hash.

*Truth Values.* Every statement carries a truth value comprising frequency (how often true) and confidence (evidential strength). Truth values propagate through inference according to #nal semantics, ensuring conclusions are never more certain than premises.

*Stamps.* Evidence tracking for cyclicity detection, revision, and provenance. Each Stamp records a unique identifier, occurrence time, source (user input, inference, LLM, sensor), and evidential base.

*Tasks.* The unit of processing. A Task contains a Term, truth value, stamp, priority, and punctuation indicating its type: *Belief* (`.`) for declarative knowledge, *Goal* (`!`) for objectives, or *Question* (`?`) for queries.

== The Streaming Pipeline

#figure(
  caption: [The #senars streaming pipeline. Premises flow from Memory through Strategy and RuleProcessor, producing conclusions that feed back to Memory.],
  box(
    fill: luma(250),
    inset: 1em,
    radius: 4pt,
    width: 100%,
  )[
    #align(center)[
      #text(size: 9pt)[
        *Memory* → *Premise Source* → *Strategy* → *Rule Processor* → *Output Stream*
        #v(0.3em)
        #text(size: 8pt, fill: gray)[↳ NAL (sync) + LM (async) → feedback loop ↲]
      ]
    ]
  ]
)

The reasoning engine operates as a continuous pipeline:

/ 1. PremiseSource: Samples Tasks from Memory according to configurable objectives: _priority_ (importance-weighted), _recency_ (temporal relevance), _novelty_ (prefer low-derivation-depth tasks), _punctuation_ (focus on goals or questions), _dynamic_ (adaptive based on performance).

/ 2. Strategy: Pairs each primary premise with suitable secondary premises for inference. Pluggable implementations:
  - *BagStrategy*: NARS-style priority sampling for anytime reasoning
  - *PrologStrategy*: Goal-driven backward chaining with unification
  - *ExhaustiveStrategy*: Comprehensive search over related beliefs
  - *ResolutionStrategy*: Prolog-like resolution for question answering

/ 3. RuleProcessor: Executes inference rules in non-blocking fashion:
  - *Synchronous NAL rules*: Execute immediately, returning derived Tasks
  - *Asynchronous LM rules*: Dispatch without blocking; results merge when ready

/ 4. Output Stream: Unified stream merging results from both rule types. Consumers (Memory, UI, external systems) receive conclusions as they become available.

== Inference Rules

#senars implements the full #nal rule set across all six layers. The table below summarizes the core syllogistic rules:

#figure(
  caption: [Core NAL Syllogistic Rules],
  table(
    columns: (auto, 1fr, 1fr),
    inset: 6pt,
    align: (left, left, left),
    stroke: 0.5pt + luma(200),
    fill: (_, y) => if y == 0 { luma(240) },
    [*Rule*], [*Premises*], [*Conclusion*],
    [Deduction], [A→B, B→C], [A→C],
    [Induction], [A→B, A→C], [C→B],
    [Abduction], [A→C, B→C], [A→B],
    [Exemplification], [A→B, B→C], [C→A],
    [Comparison], [A→B, A→C], [B↔C],
    [Analogy], [A→B, B↔C], [A→C],
    [Resemblance], [A↔B, B↔C], [A↔C],
    [Revision], [Same statement, different evidence], [Merged belief],
  )
)

Each inference rule has an associated _truth function_ that computes the conclusion's truth value from the premises:

#figure(
  caption: [NAL Truth Functions],
  table(
    columns: (auto, 1fr),
    inset: 6pt,
    align: (left, left),
    stroke: 0.5pt + luma(200),
    fill: (_, y) => if y == 0 { luma(240) },
    [*Function*], [*Application*],
    [Deduction], [Strong forward inference],
    [Induction], [Generalizing from shared subject],
    [Abduction], [Hypothesizing shared cause],
    [Exemplification], [Weak backward inference],
    [Comparison], [Deriving similarity from common subject],
    [Analogy], [Transferring via similarity],
    [Resemblance], [Chaining similarities],
    [Revision], [Merging independent evidence],
    [Negation], [Inverting frequency],
    [Intersection], [Conjunctive combination],
    [Union], [Disjunctive combination],
    [Difference], [Set subtraction],
  )
)

#figure(
  caption: [Language Model Integration Rules],
  table(
    columns: (auto, 1fr),
    inset: 6pt,
    align: (left, left),
    stroke: 0.5pt + luma(200),
    fill: (_, y) => if y == 0 { luma(240) },
    [*Rule*], [*Function*],
    [Elaboration], [Generate related beliefs from a concept],
    [WorldKnowledge], [Query factual knowledge to fill gaps],
    [Translation], [Convert natural language to Narsese],
    [Explanation], [Generate natural language from derivations],
    [Disambiguation], [Resolve ambiguous terms using context],
  )
)

== Dual Memory Architecture

Inspired by cognitive science, #senars separates short-term attention from long-term storage:

*Focus (Short-term).* A bounded-capacity priority queue holding tasks for immediate processing. The Focus system implements attention: selecting which tasks receive reasoning resources based on priority, recency, and diversity constraints.

*Long-term Memory.* Persistent storage for all Concepts (collections of Tasks sharing a common Term). Specialized indexes enable efficient retrieval by relation type.

*Consolidation.* Background process that migrates high-value tasks from Focus to long-term storage, and promotes relevant long-term tasks to Focus when attention shifts.

== Hybrid NAL-LLM Integration

The key architectural innovation is *non-blocking hybrid execution*:

- *NAL rules* execute synchronously. The complete NAL-1 through NAL-6 rule set enables inheritance, similarity, conjunction, implication, and temporal reasoning with rigorous truth-value propagation.

- *LM rules* execute asynchronously. Queries dispatch to the language model without blocking the main loop; results integrate as they arrive with assigned confidence values reflecting source reliability.

- *Circuit breakers* detect LM failures (timeouts, rate limits, errors) and automatically fall back to pure symbolic reasoning, ensuring graceful degradation.

- *Validation gates* allow NAL constraints to filter or adjust LM outputs before integration, maintaining epistemic consistency.

== The Cognitive Operating System Analogy

Think of an LLM as a powerful *ALU*---fast at processing symbols but stateless. #senars acts as the *kernel*:
- *Scheduler*: The Reasoner pipeline determines which "processes" get LM time
- *Filesystem*: Memory and Term structures provide persistent state
- *Permissions*: Truth values and stamps determine what information is trusted
- *Goals*: The belief/goal distinction provides intentionality that reactive LLMs lack

Where LLMs are fluid and context-dependent, #senars provides the _anchor_---stable beliefs that persist across sessions and constrain ephemeral neural outputs.

// ==============================================================================
// 4. IMPLEMENTATION
// ==============================================================================

= Prototype Implementation

The current #senars prototype is implemented in JavaScript (Node.js), chosen for cross-platform portability, web integration, and rapid iteration.

== Technology Stack

/ Core Engine: Stream-based reasoning pipeline with configurable components (PremiseSource, Strategy, RuleProcessor)
/ Memory System: Dual-layer architecture (Focus + long-term) with automated consolidation and configurable forgetting policies
/ LM Integration: Provider registry supporting OpenAI, Anthropic, Ollama, and HuggingFace with automatic failover
/ Parser: Complete Narsese parser for NAL syntax including all operators, truth values, and punctuation
/ Web UI: React-based visualization for real-time inspection of reasoning traces
/ Monitoring: WebSocket-based event streaming for remote observation and debugging

== Codebase Architecture

#figure(
  caption: [#senars codebase module structure],
  box(
    fill: luma(250),
    inset: 1em,
    radius: 4pt,
    width: 100%,
  )[
    #align(center)[
      #text(size: 9pt)[
        *core/src:* reason/ • memory/ • lm/ • term/ • task/ • parser/ • util/ • config/
        #v(0.3em)
        #text(size: 8pt, fill: gray)[External: tests/ • ui/ • examples/ • repl/]
      ]
    ]
  ]
)

== Validation

The prototype includes a comprehensive test suite covering:
- Unit tests for all core data structures (Term, Task, Truth, Stamp)
- Integration tests for component interaction
- Property-based tests for normalization invariants
- End-to-end reasoning chain validation

== Performance Metrics

#figure(
  caption: [Performance Metrics for #senars Evaluation],
  table(
    columns: (auto, 1fr),
    inset: 6pt,
    align: (left, left),
    stroke: 0.5pt + luma(200),
    fill: (_, y) => if y == 0 { luma(240) },
    [*Metric*], [*Relevance*],
    table.cell(colspan: 2, fill: luma(230))[_Reasoning Efficiency_],
    [Inferences/second], [Raw symbolic reasoning throughput],
    [Rule match rate], [Fraction of premise pairs yielding valid conclusions],
    [Derivation depth], [Average chain length; indicates transitive reasoning],
    table.cell(colspan: 2, fill: luma(230))[_Memory Management_],
    [Concept count], [Total unique concepts in long-term memory],
    [Focus utilization], [Fraction of Focus capacity actively used],
    [Cache hit ratio], [Term normalization cache effectiveness],
    table.cell(colspan: 2, fill: luma(230))[_Hybrid Integration_],
    [LM query latency], [Time from dispatch to result],
    [LM success rate], [Fraction of queries returning valid results],
    [Circuit breaker trips], [Frequency of fallback activation],
    table.cell(colspan: 2, fill: luma(230))[_System Responsiveness_],
    [End-to-end latency], [Time from input to first output],
    [Memory footprint], [Peak and steady-state memory usage],
  )
)

== Operational Capabilities

What works today:
- Complete NAL-1 through NAL-6 inference with truth propagation
- Multiple reasoning strategies (Bag, Prolog, Exhaustive, Resolution)
- Configurable sampling (priority, recency, novelty, punctuation, dynamic)
- Resource management: CPU throttling, backpressure, derivation depth limits
- LM integration with circuit breaker protection
- Real-time visualization of reasoning traces
- Bidirectional natural language ↔ Narsese translation

== Example: Transitive Inference

```
Input:  (bird --> animal){0.90, 0.90}.
Input:  (robin --> bird){0.95, 0.90}.

Derived: (robin --> animal){0.855, 0.81}.
  Rule: Deduction
  From: robin-->bird, bird-->animal
```

The derived truth value reflects both the frequency and confidence of the premises, reduced through inference to reflect the evidential chain.

== Example: Knowledge Discovery

```
Input:  (salmon --> fish){0.95, 0.90}.
Input:  (fish --> aquatic){0.90, 0.85}.
Input:  (salmon --> pink){0.80, 0.70}.
Query:  (salmon --> ?what)?

Derived: (salmon --> aquatic){0.855, 0.77}.
LM Elaboration: (salmon --> edible){0.85, 0.60}.
LM Elaboration: (salmon --> migratory){0.90, 0.55}.
```

The system combines deductive inference (salmon is aquatic) with LM-derived knowledge. LM contributions carry lower confidence, reflecting their external source.

// ==============================================================================
// 5. DELIBERATE INCOMPLETENESS
// ==============================================================================

= Deliberate Incompleteness

This section articulates the central philosophical and practical innovation of #senars: the recognition that *deliberate incompleteness is a feature, not a bug*.

== The Calcification Problem

History shows that "finished" systems tend to ossify. Once a platform presents itself as complete, the friction required to modify it increases dramatically:
- Users depend on specific behaviors
- Documentation hardens into dogma
- Communities fragment over backward compatibility
- Innovation migrates to workarounds rather than foundations

Consider the most generative platforms in computing history. Early Unix succeeded precisely because it was _unfinished_---minimal primitives that invited completion. The Linux kernel remains perpetually incomplete, enabling everything from supercomputers to embedded devices. Each exemplifies "worse is better": simple, incomplete systems that can be completed differently for different purposes.

== The SeNARS Approach

#senars is explicitly designed as *substrate rather than product*:

#block(inset: (left: 2em, right: 2em), fill: luma(248), radius: 4pt)[
  _"This is not being built to be a finished application. It is being built to be substrate---the common seed for a future industrial ecosystem of cognitive architectures."_
]

We stabilize the _essential_:
- The streaming dataflow architecture
- The immutable data foundation
- The truth-value semantics
- The hybrid execution model

We deliberately leave open the _contingent_:
- Optimal memory parameters
- Application-specific rule sets
- Domain-tailored strategies
- Production deployment patterns

== Invitation to Fork

We envision multiple #senars lineages, each completed differently:

/ Minimal Edge Reasoners: Stripped-down implementations for embedded/IoT applications
/ High-Agency Planners: Extensions for autonomous goal pursuit and decision-making
/ Educational Sandboxes: Interactive environments for teaching AI reasoning
/ Personal Memory Layers: Lifelong persistent context for individual users
/ Multi-Agent Societies: Distributed reasoning across networks of agents
/ Alternative Logics: New formal systems building on the stream architecture

All would share the core pipeline, enabling cross-pollination.

== Explicit Extension Points

The prototype deliberately exposes these interfaces for specialization:

/ Strategy: New premise-pairing algorithms can implement the Strategy interface
/ LM Providers: Custom integrations via the provider registry
/ Memory Policies: Configurable forgetting, consolidation, and indexing
/ Rule Sets: Dynamic registration of custom NAL and LM rules
/ Truth Functions: Alternative uncertainty representations
/ Layers: Custom connection types (TermLayer, EmbeddingLayer, or novel designs)

_If something you need is not here yet, that is by design. Fork it and grow it into the species you need._

// ==============================================================================
// 6. FUTURE DIRECTIONS
// ==============================================================================

= Future Directions

== Reinforcement Learning from Preferences

The belief/goal distinction naturally supports *Reinforcement Learning from Preferences* (RLFP). Rather than hand-crafted reward functions, the system could learn from qualitative comparisons: "reasoning path A was clearer than path B."

== Embodied Grounding

Formal reasoning about "fire → hot" differs from _experiencing_ heat. Future work might integrate with robotics platforms or simulation environments to ground symbols in sensorimotor experience.

== Lifelong Learning

Open questions for long-term deployment:
- How should retention balance against forgetting as knowledge accumulates?
- How can new learning integrate without catastrophic interference?
- How should the system detect and adapt to distributional shift?

== Scaling Laws

The relationship between resources and capability in hybrid systems is unexplored. How does reasoning quality scale with memory capacity? With LM size? Systematic investigation is needed.

== Formal Verification

For safety-critical applications: Can we prove that inferences preserve consistency? Can we bound computation for specific query types?

== Alternative Implementations

The architecture is language-agnostic. Future implementations might target:
- *Rust*: Performance-critical deployments
- *WebAssembly*: Browser-native execution
- *GPU kernels*: Accelerated embedding-based reasoning

== Call for Collaborators

We actively invite contributions:
- Novel reasoning strategies and memory policies
- Domain extensions (medicine, law, education, science)
- Formal analysis of inference properties
- Benchmarking against existing systems
- Documentation, tutorials, and educational materials

To get started, clone the repository and explore the `examples/` directory.

// ==============================================================================
// 7. CONCLUSION
// ==============================================================================

= Conclusion

#senars is an experiment in cognitive architecture---and in research methodology.

Technically, it demonstrates that hybrid neuro-symbolic integration can be _streaming_, _non-blocking_, and _epistemically grounded_. The architecture processes continuous premise streams into conclusion streams, executing symbolic rules synchronously while dispatching neural queries asynchronously. Truth values propagate through inference chains. Dual memory balances attention with persistence.

But the deeper contribution is philosophical. By designing #senars as incomplete substrate rather than finished product, we aim to _enable_ rather than _constrain_ the future of neuro-symbolic AI. We stabilize what must be stable (data structures, dataflow, truth semantics) and leave open what should remain contestable (strategies, parameters, applications).

We release #senars as a public good. We actively seek collaborators, forks, alternative completions, and entirely new directions we haven't imagined.

#align(center)[
  #text(style: "italic")[
    Fork it, strip it, break it, grow it. \
    Build the species you need.
  ]
]

// ==============================================================================
// REFERENCES
// ==============================================================================

#pagebreak()

= References

#set par(hanging-indent: 1.5em)

Gabriel, R. P. (1991). The rise of "worse is better." In _Lisp: Good News, Bad News, How to Win Big_. AI Expert.

Hammer, P. and Lofthouse, T. (2020). ANSNA: An attention-driven non-axiomatic semantic navigation architecture. In _Artificial General Intelligence Conference (AGI)_.

Schick, T., Dwivedi-Yu, J., Dessì, R., et al. (2023). Toolformer: Language models can teach themselves to use tools. _Advances in Neural Information Processing Systems (NeurIPS)_, 36.

Shinn, N., Cassano, F., Gopinath, A., Narasimhan, K., and Yao, S. (2023). Reflexion: Language agents with verbal reinforcement learning. _Advances in Neural Information Processing Systems (NeurIPS)_, 36.

Wang, P. (2006). _Rigid Flexibility: The Logic of Intelligence_. Springer, Dordrecht.

Wang, P. (2013). _Non-Axiomatic Logic: A Model of Intelligent Reasoning_. World Scientific Publishing.

Wei, J., Wang, X., Schuurmans, D., et al. (2022). Chain-of-thought prompting elicits reasoning in large language models. _Advances in Neural Information Processing Systems (NeurIPS)_, 35.

Yao, S., Zhao, J., Yu, D., et al. (2023). ReAct: Synergizing reasoning and acting in language models. _International Conference on Learning Representations (ICLR)_.
