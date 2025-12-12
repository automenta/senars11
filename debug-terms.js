import { TermFactory } from './core/src/term/TermFactory.js';

const factory = new TermFactory();
const termA = factory.atomic('A');
const termB = factory.atomic('B');

console.log('Term A:', termA.toString());
console.log('Term A components:', termA.components);
console.log('Term A isNALConcept:', termA.isNALConcept);

console.log('Term B:', termB.toString());
console.log('Term B components:', termB.components);
