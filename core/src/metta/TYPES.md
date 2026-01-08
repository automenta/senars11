# MeTTa Type System Guide

Complete guide to the SeNARS MeTTa type system with dependent types and type inference.

---

## Overview

SeNARS implements a **gradual dependent type system** for MeTTa with:
- Optional runtime type checking
- Hindley-Milner style type inference
- Dependent types (types depending on values)
- Polymorphic types
- Type constructors

---

## Type Annotations

### Basic Syntax

```metta
; Type annotation
(: term Type)

; Examples
(: 42 Number)
(: "hello" String)
(: Socrates Human)
```

### Function Types

```metta
; Function type: input -> output
(: add (-> Number Number Number))
(= (add $x $y) (+ $x $y))

; Curried function
(: compose (-> (-> B C) (-> A B) (-> A C)))
```

### Polymorphic Types

```metta
; Identity function - works for any type
(: identity (∀ $a (-> $a $a)))
(= (identity $x) $x)

; List map function
(: map (∀ ($a $b) (-> (-> $a $b) (List $a) (List $b))))
```

---

## Type Constructors

### List Type

```metta
(: empty-list (List $a))
(: cons (-> $a (List $a) (List $a)))

; Concrete list
(: my-numbers (List Number))
(= my-numbers (cons 1 (cons 2 (cons 3 empty-list))))
```

### Maybe Type

```metta
(: nothing (Maybe $a))
(: just (-> $a (Maybe $a)))

; Safe division
(: safe-div (-> Number Number (Maybe Number)))
(= (safe-div $x 0) nothing)
(= (safe-div $x $y) (just (/ $x $y)))
```

### Either Type

```metta
(: left (-> $a (Either $a $b)))
(: right (-> $b (Either $a $b)))

; Error handling
(: parse-number (-> String (Either String Number)))
```

---

## Dependent Types

Types that depend on values.

### Vector Type

```metta
; Vector of specific length
(: vec3 (Vector 3))
(= vec3 [1 2 3])

; Safe indexing
(: safe-index (-> (Vector $n) (Fin $n) Number))
```

### Natural Numbers Less Than n

```metta
; Fin n = {0, 1, ..., n-1}
(: index (Fin 5))  ; Can be 0, 1, 2, 3, or 4
```

---

## Type Inference

The TypeChecker automatically infers types using constraint-based inference.

### Examples

```javascript
import {TypeChecker} from './core/src/metta/TypeChecker.js';

const checker = new TypeChecker(typeSystem);

// Infer type of 42
const numTerm = termFactory.atomic('42');
const type = checker.infer(numTerm);
// type = {kind: 'Number'}

// Infer function application
const addTerm = termFactory.predicate(
    termFactory.atomic('add'),
    termFactory.product(termFactory.atomic('5'), termFactory.atomic('3'))
);
const resultType = checker.infer(addTerm, context);
```

### Type Checking

```javascript
// Check if term has expected type
const isNumber = checker.check(numTerm, TypeConstructors.Number);
// true
```

---

## Type System API

### TypeSystem.js

```javascript
// Runtime type checking
typeSystem.inferType(term)           // Infer simple type
typeSystem.hasType(term, 'Number')   // Check type
typeSystem.checkTypeAnnotation(term, expectedType)  // Validate

// Custom types
typeSystem.defineType('Even', (t) => {
    const num = Number(t.name);
    return !isNaN(num) && num % 2 === 0;
});
```

### TypeChecker.js

```javascript
// Type inference
const type = typeChecker.infer(term, context);

// Type checking
const matches = typeChecker.check(term, expectedType, context);

// Type unification
const subst = typeChecker.unify(type1, type2);

// Type to string
const typeStr = typeChecker.typeToString(type);
// "(-> Number Bool)"
```

### Type Constructors

```javascript
import {TypeConstructors} from './core/src/metta/TypeChecker.js';

// Function type
const funcType = TypeConstructors.Arrow(
    TypeConstructors.Number,
    TypeConstructors.Bool
);

// List type
const listType = TypeConstructors.List(TypeConstructors.Number);

// Maybe type
const maybeType = TypeConstructors.Maybe(TypeConstructors.String);

// Dependent type
const vecType = TypeConstructors.Vector(3);

// Polymorphic type
const polyType = TypeConstructors.Forall('a', 
    TypeConstructors.Arrow(TypeConstructors.TypeVar(0), TypeConstructors.TypeVar(0))
);
```

---

## Error Messages

Type errors provide clear feedback:

```
TypeMismatchError: Type mismatch: expected Number, got String
  at term: "hello"
  expected: Number
  actual: String
```

---

## Configuration

```javascript
const interpreter = new MeTTaInterpreter(null, {
    typeChecking: true,  // Enable runtime type checking
    typeInference: true  // Enable type inference
});
```

---

## Examples

### Example 1: Simple Type Annotations

```metta
; Declare types
(: age Number)
(: name String)
(: isAdult Bool)

; Use them
(= age 25)
(= name "Alice")
(= isAdult (> age 18))
```

### Example 2: Polymorphic Functions

```metta
; Generic identity
(: id (∀ $a (-> $a $a)))
(= (id $x) $x)

!(id 42)      ; 42 : Number
!(id "hello") ; "hello" : String
```

### Example 3: Dependent Types

```metta
; Type-safe vectors
(: Vector3 (Vector 3))
(: Vector2 (Vector 2))

(: dot-product (-> (Vector $n) (Vector $n) Number))
(= (dot-product $v1 $v2) ...)

; Type checker ensures lengths match!
```

---

## Implementation Details

### Hindley-Milner Algorithm

1. **Generate constraints** from term structure
2. **Solve constraints** via unification
3. **Apply substitution** to get final type

### Constraint Generation

```javascript
generate(term, context) {
    if (isVar(term)) {
        return {type: lookupOrFresh(term, context), constraints: []};
    }
    if (isApp(term)) {
        const {type: fType, constraints: fC} = generate(term.func, context);
        const {type: xType, constraints: xC} = generate(term.arg, context);
        const resultType = freshTypeVar();
        return {
            type: resultType,
            constraints: [...fC, ...xC, {lhs: fType, rhs: Arrow(xType, resultType)}]
        };
    }
}
```

### Unification

```javascript
unify(t1, t2, subst) {
    if (isVar(t1)) return bind(t1, t2, subst);
    if (isVar(t2)) return bind(t2, t1, subst);
    if (isBase(t1) && isBase(t2)) return t1 === t2 ? subst : null;
    if (isArrow(t1) && isArrow(t2)) {
        const s1 = unify(t1.from, t2.from, subst);
        return s1 ? unify(t1.to, t2.to, s1) : null;
    }
}
```

---

## Best Practices

1. **Use type annotations** for public APIs
2. **Leverage inference** for internal code
3. **Enable type checking** during development
4. **Use dependent types** for safety-critical code
5. **Document polymorphic types** clearly

---

## Future Enhancements

- Row polymorphism
- Higher-kinded types
- Refinement types
- Effect types
- Subtyping

---

## References

- Hindley-Milner type inference
- Dependent type theory
- MeTTa type system specification
- OpenCog Hyperon documentation
