import {assertEventuallyTrue, hasTermMatch} from './testHelpers.js';

export const withCleanup = (fn) => async () => {
    const resources = [];
    const track = (r) => {
        resources.push(r);
        return r;
    };
    try {
        await fn(track);
    } finally {
        await Promise.all(resources.map(r => r.cleanup?.()));
    }
};

export const eventually = (predicate, opts) => assertEventuallyTrue(predicate, opts);

export const anyTerm = (...patterns) => (terms) => patterns.some(p => terms.some(t => t.includes(p)));

export const allTerms = (...patterns) => (terms) => patterns.every(p => terms.some(t => t.includes(p)));

export const matchAny = (...patterns) => (terms) => hasTermMatch(terms, ...patterns);

export const generateBeliefs = (count, prefix = 'belief') =>
    Array.from({length: count}, (_, i) => `${prefix}_${i}.`);

export const generateInheritance = (count, prefix = 'item') =>
    Array.from({length: count}, (_, i) => `<${prefix}_${i} --> entity>.`);
