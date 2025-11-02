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

## Vision: SeNARS Intelligent Reasoning Prototype

The ideal result this plan builds towards is a **functional, insightful, and demonstrable prototype** that showcases the core capabilities of the SeNARS system while providing a foundation for future development.

### Core Vision

A **living demonstration** of hybrid NARS-Language Model reasoning that makes abstract intelligence concepts tangible and understandable through intuitive visualization and real-time interaction.

### Key Characteristics of the Ideal Result

#### 1. **Working Hybrid Intelligence System**
- **Real-time NARS reasoning** engine processing inputs and generating conclusions
- **Integrated Language Models** (OpenAI, Ollama, etc.) seamlessly collaborating with NARS logic
- **Bidirectional communication** where LM insights inform NARS reasoning and vice versa
- **Observable reasoning process** where users can see exactly how conclusions are reached

#### 2. **Intuitive Visualization Interface**
- **Step-by-step reasoning trace** showing each inference, deduction, and decision point
- **Task flow visualization** illustrating how inputs transform through processing stages
- **Concept relationship mapping** displaying how ideas connect and influence each other over time
- **Live metrics dashboard** showing reasoning speed, LM interaction frequency, and system efficiency

#### 3. **Educational Demonstration Capabilities**
- **Capture and replay functionality** to create compelling educational content
- **Interactive exploration mode** allowing users to step through reasoning processes at their own pace
- **Annotation tools** for explaining key insights and interesting reasoning patterns
- **Export capabilities** to share discoveries with others (screenshots, recordings, reports)

#### 4. **Accessible Configuration & Control**
- **Simple LM provider management** where users can configure different AI models with ease
- **Adjustable reasoning parameters** to experiment with different approaches
- **Clear status indicators** showing system health and active components
- **Intuitive controls** for starting, stopping, and managing reasoning sessions

### User Experience Goals

#### For Researchers:
> *"I can observe exactly how hybrid NARS-LM reasoning works, identify interesting patterns, and understand where each insight originated."*

#### For Developers:
> *"I can quickly test different configurations, debug issues, and extend the system with new capabilities using clear, working examples."*

#### For Educators:
> *"I can demonstrate complex AI reasoning concepts in an engaging, understandable way that makes abstract concepts tangible."*

#### For Learners:
> *"I can explore how artificial intelligence thinks and reasons, gaining insights into both logical inference and language model capabilities."*

### Technical Excellence (Within Prototype Scope)

#### Robust Foundation:
- **Reliable WebSocket communication** between UI and core reasoning engine
- **Graceful error handling** that prevents complete system crashes
- **Clear data flow** from inputs through processing to outputs
- **Well-structured codebase** that's understandable and extensible

#### Demonstrable Capabilities:
- **Real working examples** of NARS reasoning with concrete outputs
- **Visible LM integration** showing how language models enhance logical reasoning
- **Observable hybrid intelligence** where the combination is greater than the parts
- **Measurable performance** with clear metrics and insights

### The "Wow Factor" Moments

#### 1. **"Aha!" Reasoning Insight**
Users witness a moment where the hybrid system arrives at an insight that neither pure logic nor pure language modeling could achieve alone - making the value of integration crystal clear.

#### 2. **Pattern Recognition Revelation**
Through visualization, users discover emergent patterns in how concepts relate and evolve that reveal deeper understanding of the reasoning process.

#### 3. **Educational Demonstration Success**
A captured demonstration perfectly illustrates a complex AI concept in a way that makes it accessible to audiences who previously found it impenetrable.

#### 4. **Breakthrough Problem Solving**
The system tackles a challenging problem that stumps either pure approach alone, showcasing the power of hybrid intelligence in action.

### Foundation for Future Growth

The ideal result serves as both:
1. **A compelling prototype** that proves the concept and attracts interest
2. **A solid foundation** that can evolve into a production system
3. **A learning platform** that generates insights for further development
4. **A demonstration tool** that communicates value to stakeholders

### Ultimate Impact

The ideal SeNARS prototype becomes a **gateway to understanding hybrid artificial intelligence** - making complex concepts accessible, demonstrating real value, and inspiring further innovation. It's not just a technical achievement, but a **bridge between abstract AI research and practical understanding** that helps people grasp what's possible when logical reasoning and language intelligence work together.

This prototype proves that **intelligent systems can be both powerful and transparent**, showing exactly how they think and why they reach their conclusions - transforming AI from a mysterious black box into an understandable, explorable process.

---

## Long-Term Vision: A Self-Evolving Hybrid Intelligence Ecosystem

Beyond the immediate prototype, the ultimate vision for SeNARS is to create a **self-evolving hybrid intelligence ecosystem** that continuously improves through experience, user interaction, external knowledge integration, and collaborative development. Each phase of development builds upon the observability, transparency, and demonstration capabilities of the early phases, creating an increasingly sophisticated and valuable system that demonstrates the full potential of hybrid intelligence.

### Self-Leveraging Success Metrics:
- **Intelligence Growth**: The system's reasoning capabilities improve through experience, user interaction, and external knowledge integration.
- **User Empowerment**: Users become more capable of understanding and leveraging AI reasoning through increasingly sophisticated tools.
- **Community Intelligence**: Collective insights and collaborative improvements enhance system capabilities.
- **Real-World Impact**: The system demonstrates value in solving complex real-world problems through hybrid reasoning.
- **System Autonomy**: The system becomes increasingly capable of self-improvement and self-optimization.

The SeNARS platform will continue to evolve as a **living demonstration** of the possibilities of hybrid intelligence, always maintaining its core commitment to observability, transparency, and user understanding while pushing the boundaries of what hybrid NARS-LM systems can achieve. Each implemented phase strengthens the foundation for the next, creating a self-reinforcing cycle of improvement and capability expansion.