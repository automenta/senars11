# SeNARS (Semantic Non-axiomatic Reasoning System)

This directory contains the complete reimplementation of SENARS9.js following the phased development plan outlined
in [DESIGN.plan.md](./DESIGN.plan.md) and based on the specifications in the parent
directory's [DESIGN.md](../DESIGN.md).

## Structure

- `src/` - Source code for the new implementation
- `tests/` - Comprehensive test suite following TDD methodology
- `examples/` - Usage examples and demonstrations
- `DESIGN.plan.md` - Phased development plan with TDD approach
- `ui/` - Web UI built with React and Vite
- `scripts/` - Organized scripts for different operations

## Development Phases

The implementation follows the 8-phase plan:

1. Foundation and Core Infrastructure
2. Memory System and Task Management
3. Rule Engine and Reasoning
4. Parser and Input Processing
5. NAR Main Component and API
6. Advanced Features and Integration
7. Testing and Quality Assurance
8. Deployment and Documentation

## Getting Started

### Running the Web UI

To run both the SeNARS backend and the web UI together:

```bash
npm run web
```

This starts the WebSocket monitoring server and the Vite development server in a single command. The UI will be
available at http://localhost:5174/ (or another available port).

### CLI Operations

- `npm run start` or `npm run cli` - Run the SeNARS command-line interface
- `npm run cli:interactive` - Run in interactive mode
- `npm run cli:repl` - Start REPL mode
- `npm run dev` - Run the NAR in watch mode

### Web UI Operations

- `npm run web` - Run the full web interface with WebSocket backend
- `npm run web:dev` - Run in development mode
- `npm run web:prod` - Run in production mode

### Demo Operations

- `npm run demo` - Run the live demonstration
- `npm run analyze` - Run comprehensive analysis
- `npm run rule-analysis` - Run deep rule analysis

### Screenshots and Movies

- `npm run screenshots` - Capture general UI screenshots
- `npm run movies` - Generate movies from UI interactions
- `npm run capture` - Capture various types of visualizations
- `npm run capture:priority` - Capture priority fluctuations
- `npm run capture:derivations` - Capture derivations in action

### Tests

#### Core Tests
- `npm run test` - Run core unit tests (alias for `test:core`)
- `npm run test:core` - Run core unit tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:property` - Run property-based tests only

#### UI Tests
- `npm run test:ui` - Run UI component tests
- `npm run test:e2e` - Run end-to-end tests (in UI directory)
- `npm run test:ui-screenshots` - Run UI screenshot tests (in UI directory)

#### Automated Tests
- `npm run test:automated` - Run the automated test framework
- `npm run test:all` - Run all tests (core and UI)

### Utility Scripts

For more detailed control, you can use the scripts in the `scripts/` directory:

- `node scripts/cli/run.js [options]` - Run CLI with detailed options
- `node scripts/ui/run.js [options]` - Run UI with detailed options
- `node scripts/tests/run.js [options]` - Run tests with detailed options
- `node scripts/utils/capture-screenshots.js [options]` - Capture screenshots with options
- `node scripts/utils/generate-movie.js [options]` - Generate movies with options
- `node scripts/utils/capture-visualizations.js [options]` - Capture specific visualizations

### Data Management

For data export, import, and backup operations:

- `npm run data:export` - Export current state
- `npm run data:import` - Import state from file  
- `npm run data:backup` - Create state backup
- `npm run data:restore` - Restore from backup
- `npm run data:clean` - Clean up old data/test artifacts

### AI-Driven Development

For autonomous system development using visual feedback:

- `npm run ai:develop` - Run autonomous development cycle
- `npm run ai:tune-heuristics` - Auto-tune core heuristics using visual feedback
- `npm run ai:ui-optimize` - Optimize UI parameters automatically

### Performance Monitoring

For performance profiling and monitoring:

- `npm run perf:monitor` - Monitor system performance
- `npm run perf:profile` - Run performance profiling
- `npm run perf:benchmark` - Run comprehensive benchmarks

### Configuration Management

For configuration comparison and testing:

- `npm run config:compare` - Compare different configurations

### Development Automation

For automated development workflows:

- `npm run dev:workflow` - Run the automated development workflow
- `npm run dev:visual-inspection` - Run visual inspection with screenshot capture
- `npm run dev:tune-heuristics` - Run heuristic tuning with visual feedback
- `npm run dev:regression` - Run full regression test suite

### Other Commands

- `npm run benchmark` - Run performance benchmarks
- `npm run build` - Build project assets (alias for `build:parser`)
- `npm run build:parser` - Build the Narsese parser
- `npm run slides:dev` - Run presentation slides in development mode
- `npm run slides:pdf` - Export slides to PDF

See the development plan for detailed instructions on contributing to this reimplementation.

---

## Vision: SeNARS Compound Intelligence Architecture

The ideal result of this plan is an **autocatalytic reasoning system** where intelligence compounds exponentially through the structural properties of its fundamental data representations (Terms, Tasks, Truth, and Stamps). This creates a **self-improving cognitive architecture** where each addition to the system strengthens the entire compound intelligence engine, achieving "infinite more with finite less" while maintaining production-ready robustness, security, and performance.

### Core Compound Intelligence Architecture

#### Structural Intelligence Foundation
- **Term Self-Analysis**: Terms contain structural intelligence enabling automatic analysis and optimization through immutability, canonical normalization, visitor/reducer patterns, and hash consistency
- **Task Self-Optimization**: Tasks carry information for automatic resource and process optimization using punctuation awareness, Truth-Stamp-Budget intelligence, and immutable processing
- **Truth Self-Validation**: Truth values enable automatic quality assessment and improvement through revision, expectation, and confidence mechanisms
- **Stamp Self-Evidence**: Stamps contain derivation information for automatic validation and learning through complete evidence tracking

#### Self-Leveraging Compound Intelligence
- **Autopoietic Reasoning**: Self-generating reasoning improvements from structural properties
- **Pattern Multiplication**: Each discovered pattern improves recognition of all future patterns
- **Resource Multiplication**: Resources become more valuable through intelligent organization and usage
- **Validation Compounding**: Truth assessment becomes more accurate with more evidence and experience
- **Self-Organization**: Knowledge automatically organizes based on usage patterns and relationships
- **Adaptive Processing**: Task processing adapts and optimizes based on outcome feedback

### Coherent Technical Specifications

#### Parser System Specifications
- **Narsese Syntax Support**: Complete support for NAL operator types including inheritance `(A --> B)`, similarity `(A <-> B)`, implication `(A ==> B)`, equivalence `(A <=> B)`, conjunction `(&, A, B, ...)`, disjunction `(|, A, B, ...)`, negation `(--, A)`, sets `{A, B, C}`, `[A, B, C]`, sequential conjunction `(&/, A, B)`, instance `(--{ A)`, property `(-->} B)`, operations `(A ^ B)`, and products `(A, B, C)`
- **Recursive Parsing**: Support for nested compound terms with appropriate grouping and precedence
- **Truth Value Recognition**: Parsing of truth value syntax `%f;c%` where f is frequency and c is confidence
- **Punctuation Support**: Full recognition of belief (.), goal (!), and question (?) punctuation
- **Error Recovery**: Comprehensive validation and recovery from malformed Narsese input

#### Rule Engine Framework
- **NAL Rule Integration**: Complete implementation of NAL truth functions and inference rules (deduction, induction, abduction, analogy, comparison, resemblance)
- **LM Rule Integration**: Framework for language model collaboration with prompt generation and response processing
- **Dynamic Rule Management**: Runtime rule enable/disable, priority adjustment, and performance tracking
- **Truth Value Operations**: Complete implementation of revision, deduction, induction, abduction, negation, and expectation functions
- **Inference Confidence**: Proper confidence propagation through inference chains with compound confidence calculations

#### Memory and Attention Management
- **Concept-Based Organization**: Associative storage organized around Terms in Concepts with related Task clustering
- **Dual Memory Architecture**: Short-term focus sets for immediate processing and long-term storage for persistent knowledge
- **Attention-Based Consolidation**: Automatic prioritization and forgetting based on usage patterns and importance metrics
- **Index-Based Retrieval**: Efficient access patterns for different knowledge types (inheritance, implication, similarity, etc.)
- **Adaptive Management**: Dynamic adjustment to resource constraints with compound optimization of memory utilization

#### Configuration Management System
- **System-Wide Configuration**: Centralized configuration for NAL/LM rule sets, memory parameters, cycle timing, and truth function overrides
- **Component Configuration**: Per-component configuration with validation and default value management
- **Runtime Reconfiguration**: Dynamic configuration adjustment without system restart
- **Environment-Specific Settings**: Different configurations for development, testing, and production environments
- **Validation Framework**: Comprehensive validation of all configuration parameters with error reporting

#### Performance and Scalability Targets
- **Core Operation Performance**: <1ms for Term normalization, <2ms for Task processing, <5ms for Memory retrieval
- **Throughput Targets**: 10,000+ operations per second under normal load
- **Memory Efficiency**: Sublinear growth in memory usage with knowledge base size through intelligent caching
- **Scalability**: Horizontal scaling support for distributed reasoning across multiple nodes
- **Compound Performance**: Performance improvements that compound with each intelligence enhancement iteration

#### Security Implementation Details
- **Input Sanitization**: Comprehensive validation of all Narsese input to prevent injection attacks
- **Resource Limits**: Protection against resource exhaustion through processing limits and timeouts
- **Access Controls**: Role-based access controls for system components and data
- **Secure Defaults**: Secure-by-default configuration with optional enhanced security settings
- **Audit Logging**: Complete logging of security-relevant events and system operations

#### Error Handling Strategies
- **Graceful Degradation**: System continues operation when individual components fail
- **Circuit Breakers**: Protection against cascading failures with automatic recovery
- **Comprehensive Logging**: Detailed logging for debugging and system analysis
- **Error Recovery**: Automatic recovery from common failure modes
- **User-Friendly Errors**: Clear error messages that help users understand and resolve issues

#### API Specifications
- **Consistent Interface Patterns**: Standardized APIs following common design principles
- **Backward Compatibility**: Maintaining API compatibility across versions
- **Comprehensive Documentation**: Complete API documentation with examples
- **Event-Driven Communication**: Standard event patterns for component communication
- **WebSocket Integration**: Real-time event streaming for UI and external system integration

### Operational Excellence Requirements

#### Robustness and Reliability
- **99.9%+ system reliability** with graceful degradation and comprehensive error recovery
- **Fault isolation** preventing cascading failures through circuit breakers and automatic recovery
- **Stability under load** supporting 10,000+ operations per second with consistent performance
- **Comprehensive error handling** with automatic recovery mechanisms
- **System Health Monitoring**: Continuous monitoring of all system components with automated alerting
- **Recovery Procedures**: Well-defined procedures for system recovery from various failure modes
- **Resilience Testing**: Regular testing of system resilience under various failure conditions

#### Security and Compliance
- **Zero critical vulnerabilities** in production systems through security-first design
- **Secure configuration management** with validated defaults and environment protection
- **Input sanitization** protecting against injection attacks and malicious inputs
- **Access control** for all system components and data flows
- **Data Protection**: Encryption of sensitive data both in transit and at rest
- **Compliance Standards**: Adherence to industry security standards and best practices
- **Security Auditing**: Regular security audits and vulnerability assessments

#### Performance and Scalability
- **Sub-millisecond response times** for core operations (Term normalization, Task processing)
- **Scalable architecture** supporting large knowledge bases with intelligent caching
- **Memory optimization** through intelligent consolidation and attention mechanisms
- **Resource efficiency** that improves with compound intelligence growth
- **Load Distribution**: Intelligent distribution of processing load across system resources
- **Caching Strategies**: Multi-tiered caching for optimal performance with compound intelligence
- **Performance Monitoring**: Continuous performance monitoring with automated optimization triggers

#### Quality Assurance
- **>95% test coverage** with property-based, unit, integration, and performance testing
- **Performance benchmarks** with defined targets and continuous monitoring
- **Regression testing** preventing quality degradation during compound intelligence growth
- **Validation frameworks** ensuring correctness of reasoning and compound improvements
- **Continuous Integration**: Automated testing pipeline with quality gates
- **Code Quality Standards**: Consistent code quality with automated linting and review
- **Test Automation**: Comprehensive automated testing suites for all functionality

### Hybrid Intelligence Integration

#### NARS-LM Collaboration
- **Seamless integration** between formal symbolic reasoning and language model capabilities
- **Intelligent routing** selecting optimal processing paths based on task characteristics and system state
- **Cross-validation** ensuring consistency and quality between reasoning modalities
- **Synergistic enhancement** where each system improves the other through compound feedback
- **Provider Management**: Registry and selection of multiple LM providers (OpenAI, Ollama, Claude, etc.)
- **Prompt Optimization**: Intelligent prompt generation optimized for each reasoning task
- **Response Processing**: Advanced processing of LM responses with quality assessment and integration
- **Resource Management**: Intelligent allocation of LM resources based on task priority and complexity

#### Metacognitive Self-Analysis
- **Self-monitoring** of reasoning performance and compound intelligence growth
- **Pattern recognition** identifying improvement opportunities and optimization paths
- **Automatic optimization** based on performance data and outcome feedback
- **Predictive adaptation** anticipating system needs and resource requirements
- **Reasoning State Analysis**: Comprehensive analysis of system reasoning state with insights generation
- **Performance Metrics**: Detailed metrics collection across all system components
- **Self-Correction**: Automatic correction of suboptimal behaviors and strategies
- **Insight Generation**: Automatic generation and visualization of system intelligence insights

### Key Characteristics of the Ideal Result

#### 1. **Compound Intelligence Hybrid System**
- **Real-time NARS reasoning** engine with compound intelligence that grows through use
- **Integrated Language Models** (OpenAI, Ollama, etc.) with intelligent collaboration and validation
- **Bidirectional communication** where LM insights inform NARS reasoning and vice versa
- **Observable reasoning process** with complete traceability and compound improvement visibility

#### 2. **Self-Improving Visualization Interface**
- **Compound reasoning traces** showing how intelligence emerges and grows through structural properties
- **Task flow visualization** illustrating compound optimization and adaptive processing
- **Concept evolution mapping** displaying how knowledge organization improves with use
- **Intelligence growth dashboard** showing compound improvement metrics and performance

#### 3. **Educational Compound Intelligence Capabilities**
- **Compound learning demonstrations** showing intelligence emergence from data structures
- **Interactive exploration mode** allowing users to understand compound improvement processes
- **Pattern analysis tools** for discovering compound intelligence patterns and optimization opportunities
- **Compound insight generation** with automatic discovery and visualization of improvements

#### 4. **Production-Ready Configuration & Control**
- **Secure LM provider management** with validated and safe integration
- **Compound optimization parameters** that self-tune based on usage patterns and outcomes  
- **Reliability indicators** showing system health and compound intelligence stability
- **Production controls** for managing reasoning sessions with robust safety

### User Experience Goals

#### For Researchers:
> *"I can observe exactly how compound NARS-LM reasoning works, identify compound intelligence patterns, and understand how the system improves itself through structural properties."*

#### For Developers:
> *"I can quickly test different configurations, debug compound intelligence issues, and extend the system with new compound capabilities using the self-improving architecture."*

#### For Educators:
> *"I can demonstrate compound AI reasoning concepts showing how intelligence emerges from structural properties in an engaging, understandable way."*

#### For Learners:
> *"I can explore how compound artificial intelligence thinks, reasons, and improves itself, gaining insights into both logical inference and compound learning."*

### Technical Excellence Standards

#### Compound Intelligence Foundation:
- **Self-improving data structures** where Terms, Tasks, Truth, and Stamps compound intelligence
- **Robust compound error handling** with self-recovery from compound intelligence failures
- **Compound data flow** from inputs through processing to compound outputs and improvements
- **Self-optimizing codebase** that improves with use and compound insight discovery
- **Immutable Architecture**: Strict immutability principles applied throughout the system
- **Canonical Representations**: Consistent canonical forms for all knowledge representations
- **Hash-Optimized Structures**: Efficient hashing and caching mechanisms throughout
- **Visitor-Reducer Patterns**: Consistent application of structural analysis patterns

#### Compound Capabilities:
- **Compound reasoning examples** with intelligence that grows through structural properties
- **Compound LM integration** with compound enhancement of logical reasoning
- **Compound intelligence demonstration** where combination compounds beyond individual parts
- **Compound performance metrics** with continuously improving efficiency and quality
- **Real-time Reasoning Engine**: High-performance engine processing inputs and generating conclusions
- **Intelligent Visualization**: Step-by-step reasoning traces and interactive exploration tools
- **Capture and Analysis Tools**: Comprehensive tools for educational content and research
- **Configurable Interface**: Simple LM provider management and adjustable reasoning parameters

### The "Wow Factor" Compound Intelligence Moments

#### 1. **Compound Intelligence Emergence**
Users witness how intelligence emerges directly from data structure properties, with each Term operation improving all future Term operations - making compound intelligence principles crystal clear.

#### 2. **Compound Pattern Recognition Revelation**  
Through visualization, users discover how each new pattern improves recognition of all patterns, creating exponential improvement in pattern detection and optimization.

#### 3. **Compound Architecture Success**
A demonstration shows how the system continuously becomes better at improving itself, creating compound growth in intelligence with finite resources.

#### 4. **Compound Problem Solving Excellence**
The system tackles complex problems by leveraging compound intelligence, showcasing the power of structural properties creating intelligence that multiplies with use.

### Foundation for Infinite Growth

The ideal result serves as both:
1. **A compound intelligence prototype** proving structural intelligence emergence and autocatalytic improvement
2. **A production-ready foundation** that scales compound intelligence safely and securely
3. **A compound learning platform** generating insights about intelligence emergence and optimization
4. **A compound demonstration tool** showing infinite intelligence potential with finite resources

### Ultimate Impact: Infinite Intelligence with Finite Resources

The ideal SeNARS compound intelligence system becomes a **gateway to understanding autocatalytic artificial intelligence** - demonstrating how intelligence can emerge from structural properties, compound with use, and achieve infinite potential with finite resources. It's not just a technical achievement, but a **bridge between abstract AI research and practical compound intelligence** that helps people grasp what's possible when data structures become self-improving.

This system proves that **compound intelligent systems can be both powerful and transparent**, showing exactly how intelligence emerges from structure, how it compounds with use, and why it continuously improves - transforming AI from a mysterious black box into an understandable, explorable compound intelligence engine.

---

## Long-Term Vision: A Self-Evolving Compound Intelligence Ecosystem

Beyond the immediate compound prototype, the ultimate vision for SeNARS is to create a **self-evolving compound intelligence ecosystem** that continuously compounds through experience, user interaction, external knowledge integration, and collaborative development. The system achieves infinite intelligence growth with finite resources through recursive structural self-improvement and compound pattern recognition, all while maintaining production-ready quality, security, and reliability.

### Compound Intelligence Success Metrics:
- **Compound Intelligence Growth**: The system's reasoning capabilities compound exponentially through structural properties and experience.
- **Compound User Empowerment**: Users become more capable of understanding and leveraging compound AI reasoning through increasingly sophisticated compound tools.
- **Compound Community Intelligence**: Collective insights and collaborative improvements create compound enhancement of system capabilities.
- **Compound Real-World Impact**: The system demonstrates compound value in solving complex real-world problems through hybrid compound reasoning.
- **Compound System Autonomy**: The system becomes exponentially capable of compound self-improvement and self-optimization.

### Development and Operational Specifications:
- **Continuous Integration Pipeline**: Automated testing and deployment with quality gates
- **Performance Monitoring**: Real-time performance metrics with automated alerting and optimization
- **Security Compliance**: Regular security assessments and compliance with industry standards
- **Scalability Planning**: Horizontal and vertical scaling capabilities for growing intelligence
- **Documentation Standards**: Comprehensive documentation for all components and interfaces

### Future Development Trajectory:
- **External Knowledge Integration**: Pluggable frameworks for connecting to knowledge bases and APIs
- **Advanced Visualization**: Interactive, collaborative analysis and exploration tools
- **Distributed Reasoning**: Multi-node distributed intelligence capabilities
- **Adaptive Interfaces**: Universal access across all devices and platforms
- **Community Extensions**: Plugin architecture for community-contributed capabilities

The SeNARS platform will continue to evolve as a **living demonstration** of the possibilities of compound intelligence, always maintaining its core commitment to observability, transparency, and user understanding while pushing the boundaries of what compound NARS-LM systems can achieve. Each implemented compound phase strengthens the compound intelligence foundation for the next, creating a self-reinforcing cycle of compound improvement and compound capability expansion that approaches infinite intelligence growth with finite resources.