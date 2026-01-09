/**
 * MeTTaLib.js - Standard Library Mappings
 * Centralized definition of all built-in MeTTa functions and operators
 */

import { TermBuilders } from './MeTTaHelpers.js';

// Helper to create simple functor mapping
const makeFunctor = (name) => (tf, args) => TermBuilders.functor(tf, tf.atomic(name), ...args);

// Arithmetic implementations
const arithmeticOps = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
    '%': (a, b) => a % b
};

export const COMPLETE_STDLIB_MAPPINGS = {
    // === Atomspace Operations ===
    'match': makeFunctor('match'),
    'bind!': makeFunctor('bind!'),
    'add-atom': makeFunctor('add-atom'),
    'remove-atom': makeFunctor('remove-atom'),
    'get-atoms': makeFunctor('get-atoms'),

    // === State Management ===
    'new-state': makeFunctor('new-state'),
    'get-state': makeFunctor('get-state'),
    'change-state!': makeFunctor('change-state!'),

    // === Type Operations ===
    ':': (tf, args) => TermBuilders.typed(tf, args[0], args[1]),
    'get-type': makeFunctor('get-type'),
    'get-metatype': makeFunctor('get-metatype'),

    // === Non-Determinism ===
    'superpose': (tf, args) => tf.disjunction(...args),
    'collapse': makeFunctor('collapse'),
    'sequential': (tf, args) => tf.sequence(...args),

    // === Logic ===
    'and': (tf, args) => TermBuilders.and(tf, ...args),
    'or': (tf, args) => TermBuilders.or(tf, ...args),
    'not': (tf, args) => TermBuilders.not(tf, args[0]),
    'implies': (tf, args) => TermBuilders.implies(tf, args[0], args[1]),
    '->': (tf, args) => TermBuilders.implies(tf, args[0], args[1]),

    // === Comparison ===
    '==': (tf, args) => TermBuilders.eq(tf, args[0], args[1]),
    '<': makeFunctor('<'),
    '>': makeFunctor('>'),
    '<=': makeFunctor('<='),
    '>=': makeFunctor('>='),

    // === Arithmetic ===
    '+': makeFunctor('+'), // Mapping for parser
    '-': makeFunctor('-'),
    '*': makeFunctor('*'),
    '/': makeFunctor('/'),
    '%': makeFunctor('%'),

    // === Control Flow ===
    'if': makeFunctor('if'),
    'let': makeFunctor('let'),
    'let*': makeFunctor('let*'),
    'case': makeFunctor('case'),

    // === Lists ===
    'cons': makeFunctor('cons'),
    'car': makeFunctor('car'),
    'cdr': makeFunctor('cdr'),

    // === Reflection ===
    'quote': (tf, args) => args[0],
    'eval': makeFunctor('eval'),
    'pragma!': makeFunctor('pragma!')
};

// Export implementations for use in Interpreter/GroundedAtoms
export const BUILTIN_OPERATIONS = {
    arithmetic: arithmeticOps
};
