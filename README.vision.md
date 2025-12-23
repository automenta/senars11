# SeNARS Vision and Philosophy

## About

This is not being built to be a finished application.

It is being built to be substrate — the common seed for a future industrial ecosystem of cognitive architectures.

The less complete it is right now, the more possibilities it can grow into.

What matters is that the core reasoning stream, the observation contract, and the hybrid NAL–LM integration remain stable and extensible. Everything else is deliberately left rough, partial, or missing so that different groups can fork and mutate it toward radically different goals: minimal edge reasoners, high-agency planners, educational sandboxes, lifelong personal memory layers, distributed multi-agent societies, or entirely new logics.

If something you need is not here yet, that is by design.

Fork it, strip it, break it, and grow it into the species you need.

## Practical Use Cases

**Knowledge Discovery:**
- Input: Domain-specific facts and relationships
- Process: System discovers implicit connections and patterns
- Output: Previously unknown relationships or insights

**Decision Support:**
- Input: Current situation and possible options
- Process: Weighs pros/cons based on system knowledge
- Output: Recommended actions with confidence levels

**Educational Tool:**
- Input: Student questions and knowledge state
- Process: Explains concepts with logical reasoning chains
- Output: Step-by-step explanations of how conclusions are reached

## Reinforcement Learning from Preferences (RLFP): Teaching SeNARS How to Think

SeNARS incorporates a Reinforcement Learning from Preferences (RLFP) framework to optimize its internal reasoning strategies and align them with human preferences for effective, coherent, and efficient thought. Rather than simply programming *what* the system thinks, RLFP enables teaching the system *how* to think more effectively.

**Core Concepts:**

- **Learning from Preferences**: Instead of explicit reward functions, the system learns from qualitative comparisons like "reasoning path A was more insightful than path B"
- **Optimized Decision Making**: RLFP enhances discretionary choices during the reasoning cycle, including task selection, rule application, and modality selection between symbolic (NAL) and neural (LM) reasoning
- **Trajectory-Based Learning**: The system captures complete reasoning episodes (trajectories) and learns from user feedback on these reasoning paths

**Architecture:**

The RLFP system operates through three functional layers:

1. **Data Layer**: `ReasoningTrajectoryLogger` records complete reasoning episodes, while `PreferenceCollector` gathers feedback from users comparing different reasoning paths
2. **Learning Layer**: `RLFPLearner` trains a preference model that predicts the expected preference score for actions or trajectories
3. **Policy Layer**: `ReasoningPolicyAdapter` bridges learned insights with core reasoning, using predictions to guide decisions in components like `FocusManager` and `RuleEngine`

**Benefits:**

- **Strategic Reasoning**: Ability to prioritize long-term objectives and resist distractions
- **Explainability Awareness**: Preference for generating clear and interpretable reasoning paths
- **Error Recovery**: Recognition of unproductive thought patterns and dynamic pivoting to better strategies
- **Domain Adaptation**: Tailoring thinking style to specific problem domains

The RLFP framework enables SeNARS to develop increasingly effective and trustworthy reasoning patterns through continuous learning from human preferences.

## NAR: Cognitive Agent

A NAR is a 'Non-Axiomatic Reasoner' instance.

We are transitioning from **Model-Centric** AI (making the LLM bigger/smarter) to **System-Centric** AI (building a cognitive architecture *around* the model). The SeNARS Stream Reasoner embodies this transition by treating the Language Model as a substrate for processing context, while the NAR provides the agency.

**The SeNARS Solution**: The `Focus` and `Bag` systems act as a **Dynamic Context Manager**. The NAR decides *what* goes into the LM's context window based on goals and urgency.

### The "Operating System" Analogy

Think of the LM as the **CPU/ALU** (Arithmetic Logic Unit). It is incredibly fast at processing symbols and pattern matching, but it has no state. The NAR acts as the **Kernel**:

- **Scheduler**: The `Reasoner` pipeline determines which process gets CPU (LM) time
- **File System**: The `Memory` and `Term` structures provide persistent storage of state
- **Permissions/Security**: The `Truth` values and `Stamps` determine what information is trusted

### Epistemic Stability (The Anchor)

LMs are fluid. If you ask an LM the same question twice with slightly different settings, you get different answers. This is fatal for an autonomous agent.

**The NAR's Job**: It provides the **Anchor**. If SeNARS holds a belief `<fire --> hot> {1.0, 0.9}`, it doesn't matter if the LM hallucinates that fire is cold in a poetic context. The NAR enforces consistency.

### The "Goal" Vector

LMs are reactive. They only complete the pattern you give them. They have no intrinsic drive.

**The NAR's Job**: It holds the **Intention**. By separating Beliefs (`.`) from Goals (`!`), the architecture allows the system to have a "nagging" drive. The LM might get distracted by a tangent, but the SeNARS `Task` with high priority remains in the system, forcing the system to return to the objective.

## Long-Term Vision: Self-Evolving Intelligence Ecosystem

The long-term vision for SeNARS is a self-evolving intelligence ecosystem that adapts through experience, user interaction, external knowledge integration, and collaborative development.

### Core Capabilities

1.  **Compound Intelligence**: Real-time NARS reasoning with integrated Language Models where each component enhances the other
2.  **Self-Improvement**: Intelligence that grows through structural properties and pattern recognition
3.  **Observable Reasoning**: Complete traceability showing how conclusions emerge from data structures
4.  **Production-Ready**: Secure, reliable, and scalable for real-world applications

### Visualization and Analysis

-   **Reasoning Traces**: Step-by-step visualization with annotation capabilities
-   **Task Flow Diagrams**: Interactive exploration of task processing and dependencies
-   **Concept Evolution**: Real-time monitoring of knowledge organization improvements
-   **Intelligence Metrics**: Dashboards showing system growth and performance
-   **Pattern Discovery**: Automated identification of optimization opportunities

### User Experience Goals

**For Researchers**: Observe compound NARS-LM reasoning, identify intelligence patterns, and understand self-improvement mechanisms

**For Developers**: Test configurations, debug issues, and extend capabilities using self-improving architecture

**For Educators**: Demonstrate AI reasoning concepts showing intelligence emergence from structural properties

**For Learners**: Explore how artificial intelligence thinks, reasons, and improves itself

## Reinforcement Learning Foundation

The Belief-Goal distinction enables general-purpose reinforcement learning:

-   **World Model**: Beliefs form predictive models of environment dynamics
-   **Reward Structure**: Goals define reward functions for policy learning
-   **Balance**: Truth revision implements exploration-exploitation tradeoff
-   **Adaptation**: Continuous learning from environmental feedback
-   **Transfer**: Knowledge transfers across domains via structural similarity

This architecture naturally implements RL where:
-   **Beliefs** predict action outcomes
-   **Goals** guide policy learning
-   **Interaction** enables learning from experience
-   **Truth Revision** balances exploration and exploitation

### Technical Excellence Standards

**Immutable Architecture**: Strict immutability, canonical representations, hash-optimized structures, visitor-reducer patterns

**Component Management**: Standardized lifecycle, event-driven architecture, circuit breaker patterns, comprehensive metrics

**Self-Improvement**: Intelligence emerges from data structure properties, with each operation potentially improving all future operations

## Roadmap Connection

For concrete implementation steps and timelines, see [README.roadmap.md](README.roadmap.md).

Current capabilities and future development are tracked in the roadmap document, which outlines:
-   **Current Features**: Available now for use
-   **Technical Challenges**: Known issues and optimization opportunities
-   **Future Development**: Planned enhancements and extensions
-   **Success Metrics**: Measures of system growth and capability

## See Also

-   [Roadmap](README.roadmap.md) - Implementation timeline and features
-   [Architecture](README.architecture.md) - Current system design
-   [RLFP](agent/src/rlfp/README.md) - Reinforcement learning implementation
-   [Introduction](README.intro.md) - System overview
