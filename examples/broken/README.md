# Broken Examples

Examples that need fixing before they can be used. These files have been restored from git but have broken imports or reference non-existent classes.

---

## Broken REPL Examples (10 files)

All reference non-existent `SessionEngine` class:

| File | Issue |
|------|-------|
| `repl/demo-advanced.js` | Import: `../../src/session/SessionEngine.js` |
| `repl/demo-agent-repl.js` | Import: `./src/session/SessionEngine.js` |
| `repl/demo-offline-lm.js` | Import: `../../src/lm/TransformersJSProvider.js` |
| `repl/example-advanced-capabilities.js` | Import: `../../src/session/SessionEngine.js` |
| `repl/example-agent-management.js` | Import: `../../src/session/SessionEngine.js` |
| `repl/example-complex-queries.js` | Import: `../../src/session/SessionEngine.js` |
| `repl/example-hybrid-integration.js` | Import: `../../src/session/SessionEngine.js` |
| `repl/example-planning-goals.js` | Import: `../../src/session/SessionEngine.js` |
| `repl/example-problem-solving.js` | Import: `../../src/session/SessionEngine.js` |
| `repl/example-reasoning-chains.js` | Import: `../../src/session/SessionEngine.js` |

**Fix:** Either create `SessionEngine` class OR refactor to use `@senars/agent` `App` class like the working examples.

---

## Redundant Stream Demos (3 files)

These files work correctly but were consolidated into `examples/advanced/stream-reasoning.js`:

| File | Status |
|------|--------|
| `advanced/simple-stream-demo.js` | Working (redundant) |
| `advanced/stream-reasoner-demo.js` | Working (redundant) |
| `advanced/advanced-stream-features-demo.js` | Working (redundant) |

**Note:** Can be deleted or kept as reference. Functionality merged into consolidated demo.

---

## How to Fix Broken Examples

1. Identify the missing dependency
2. Either:
   - Create the missing module/class, OR
   - Update imports to use existing equivalents
3. Fix import paths if needed
4. Test the example works
5. Move to appropriate `examples/` subdirectory
