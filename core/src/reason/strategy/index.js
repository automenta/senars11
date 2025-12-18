/**
 * @file index.js
 * @description Exports for premise formation strategies.
 */

export { PremiseFormationStrategy } from './PremiseFormationStrategy.js';
export { DecompositionStrategy } from './DecompositionStrategy.js';
export { TermLinkStrategy } from './TermLinkStrategy.js';
export { TaskMatchStrategy } from './TaskMatchStrategy.js';

// Re-export existing strategies
export { BagStrategy } from './BagStrategy.js';
export { ExhaustiveStrategy } from './ExhaustiveStrategy.js';
export { ResolutionStrategy } from './ResolutionStrategy.js';
export { NarsGPTStrategy } from './NarsGPTStrategy.js';
