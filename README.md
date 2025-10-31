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