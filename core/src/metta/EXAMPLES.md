# MeTTa Examples Gallery

Comprehensive guide to MeTTa programming in SeNARS with categorized examples and best practices.

---

## Table of Contents

1. [Basics](#basics)
2. [Logic & Reasoning](#logic--reasoning)
3. [Type System](#type-system)
4. [Advanced Features](#advanced-features)
5. [Common Patterns](#common-patterns)
6. [Best Practices](#best-practices)

---

## Basics

### Arithmetic Operations

render_diffs(file:///home/me/senars11/examples/metta/basics/arithmetic.metta)

**Key Concepts:**
- Function definition with `=`
- Immediate evaluation with `!`
- Basic operators: `+`, `-`, `*`, `/`

### Variable Binding

render_diffs(file:///home/me/senars11/examples/metta/basics/variables.metta)

**Key Concepts:**
- Variable prefix `$`
- Pattern matching with variables
- Simple unification

### Equality as Rewriting

render_diffs(file:///home/me/senars11/examples/metta/basics/equality.metta)

**Key Concepts:**
- Equality operator `=` for rewrite rules
- Nested definitions
- Rule-based evaluation

---

## Logic & Reasoning

### Classic Syllogism

render_diffs(file:///home/me/senars11/examples/metta/logic/syllogism.metta)

**Key Concepts:**
- Knowledge representation
- Logical inference
- Rule application

### Rewrite Rules

render_diffs(file:///home/me/senars11/examples/metta/logic/rules.metta)

**Key Concepts:**
- Conditional rewriting
- Boolean algebra
- Simplification rules

---

## Type System

### Type Annotations

render_diffs(file:///home/me/senars11/examples/metta/types/annotations.metta)

**Key Concepts:**
- Type declarations with `:`
- Function types `(-> A B)`
- Polymorphic types `∀`
- Type constructors

---

## Advanced Features

### Macro Expansion

render_diffs(file:///home/me/senars11/examples/metta/advanced/macros.metta)

**Key Concepts:**
- Macro definition
- Syntax transformation
- Code generation

### Non-Determinism

render_diffs(file:///home/me/senars11/examples/metta/advanced/nondeterminism.metta)

**Key Concepts:**
- `superpose` for multiple values
- `collapse` for choice
- Non-deterministic search

---

## Common Patterns

### Pattern 1: Recursive Functions

```metta
; Factorial
(= (factorial 0) 1)
(= (factorial $n) (* $n (factorial (- $n 1))))

; Usage
!(factorial 5)  ; 120
```

### Pattern 2: List Processing

```metta
; List length
(= (length []) 0)
(= (length [$head . $tail]) (+ 1 (length $tail)))

; List map
(= (map $f []) [])
(= (map $f [$x . $xs]) [($ $f $x) . (map $f $xs)])
```

### Pattern 3: Guard Conditions

```metta
; Absolute value
(= (abs $x) 
   (if (< $x 0) 
       (- 0 $x) 
       $x))

; Max of two numbers
(= (max $a $b) (if (> $a $b) $a $b))
```

### Pattern 4: Pattern Matching

```metta
; Case analysis
(= (describe $x)
   (case $x
     (0 "zero")
     (1 "one")
     ($n "many")))
```

### Pattern 5: Higher-Order Functions

```metta
; Compose
(= (compose $f $g $x) ($f ($g $x)))

; Apply twice
(= (twice $f $x) ($f ($f $x)))

; Usage
!(twice (+ 1) 5)  ; 7
```

---

## Best Practices

### 1. Use Meaningful Names

```metta
; Good
(= (is-even $n) (== (% $n 2) 0))

; Bad
(= (f $x) (== (% $x 2) 0))
```

### 2. Add Type Annotations

```metta
; Annotate public functions
(: factorial (-> Number Number))
(= (factorial $n) ...)

; Annotate complex expressions
(: complex-calculation (-> Number Number Bool))
```

### 3. Document with Comments

```metta
; Compute Fibonacci numbers recursively
; Base case: fib(0) = 0, fib(1) = 1
(= (fib 0) 0)
(= (fib 1) 1)
  
; Recursive case: fib(n) = fib(n-1) + fib(n-2)
(= (fib $n) (+ (fib (- $n 1)) (fib (- $n 2))))
```

### 4. Keep Functions Pure

```metta
; Good - pure function
(= (double $x) (* $x 2))

; Avoid - side effects (use carefully)
(= (log-and-double $x)
   (let $result (* $x 2)
        (change-state! logger-state $result)))
```

### 5. Use Pattern Matching Effectively

```metta
; Match on structure
(= (first [$x . $_]) $x)
(= (second [_ $x . $_]) $x)

; Guard with types
(: safe-div (-> Number Number (Maybe Number)))
(= (safe-div $_ 0) Nothing)
(= (safe-div $x $y) (Just (/ $x $y)))
```

---

## Running Examples

### Using the Example Runner

```bash
# Run all examples
node examples/metta/run_examples.js

# Run specific category
node examples/metta/run_examples.js basics/

# Test a single file
node -e "import('./core/src/metta/MeTTaInterpreter.js').then(m => {
    const i = new m.MeTTaInterpreter(); 
    console.log(i.run('!(+ 5 3)'));
})"
```

### In Code

```javascript
import {MeTTaInterpreter} from './core/src/metta/MeTTaInterpreter.js';
import fs from 'fs';

const interpreter = new MeTTaInterpreter();

// Load example file
const code = fs.readFileSync('examples/metta/basics/arithmetic.metta', 'utf-8');
interpreter.load(code);

// Execute queries
const results = interpreter.run(code);
console.log(results);
```

---

## Example Categories

### By Difficulty

**Beginner:**
- `basics/arithmetic.metta`
- `basics/variables.metta`
- `basics/equality.metta`

**Intermediate:**
- `logic/syllogism.metta`
- `logic/rules.metta`
- `types/annotations.metta`

**Advanced:**
- `advanced/macros.metta`
- `advanced/nondeterminism.metta`

### By Feature

**Core Language:**
- Variables, equality, functions

**Type System:**
- Annotations, inference, polymorphism

**Advanced:**
- Macros, non-determinism, state

---

## Compatibility Notes

### OpenCog Hyperon

Most examples are compatible with OpenCog Hyperon with minor adaptations:

**SeNARS → Hyperon:**
- `(^, f, (*, x, y))` → `(f x y)`
- Grounded atoms use `&` prefix
- State management differences

**Hyperon → SeNARS:**
- Use MeTTa parser for automatic conversion
- Some advanced features may need manual adaptation

### MeTTa Specification

Examples follow MeTTa language specification:
- S-expression syntax
- Pattern matching semantics
- Type system conventions

---

## Additional Resources

- [Type System Guide](file:///home/me/senars11/docs/TYPES.md)
- [Complete Walkthrough](file:///home/me/.gemini/antigravity/brain/134b2191-2b75-459c-9493-997cd45fa938/walkthrough.md)
- [Integration Tests](file:///home/me/senars11/tests/integration/metta/MeTTaIntegration.test.js)

---

## Contributing Examples

To add new examples:

1. Create `.metta` file in appropriate directory
2. Include comments explaining key concepts
3. Use `!(expression)` for executable examples
4. Test with `run_examples.js`
5. Update this guide

Example template:

```metta
; Example Name
; Description of what this example demonstrates

; Setup/definitions
(= (my-function $x) ...)

; Usage examples
!(my-function 42)
; Expected: result
```

---

## Troubleshooting

### Common Issues

**Example doesn't run:**
- Check syntax (balanced parentheses)
- Verify imports if using modules
- Enable debug logging

**Unexpected results:**
- Check evaluation order
- Verify variable binding
- Test with simpler cases

**Type errors:**
- Add type annotations
- Check type compatibility
- Disable strict type checking if needed

---

## Summary

This example gallery provides:
- 8+ working `.metta` examples
- 4 categories (basics, logic, types, advanced)
- Common patterns and best practices
- Compatibility notes for Hyperon
- Running and debugging guide

All examples are tested and verified with the SeNARS MeTTa interpreter.
