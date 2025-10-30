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

### Other Commands

- `npm run dev` - Run the NAR in watch mode
- `npm run start` - Run the NAR normally
- `npm run cli` - Run the SeNARS command-line interface
- `npm run test` - Run the test suite

See the development plan for detailed instructions on contributing to this reimplementation.