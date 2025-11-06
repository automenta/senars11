/**
 * @file src/reason/rules/nal/index.js
 * @description Index file for NAL (Non-Axiomatic Logic) rules
 */

// Base rule class
export { NALRule } from './NALRule.js';

// NAL inference rules
export { SyllogisticRule } from './SyllogisticRule.js';
export { ImplicationSyllogisticRule } from './ImplicationSyllogisticRule.js';
export { ModusPonensRule } from './ModusPonensRule.js';

// Metacognition rules
export { MetacognitionRules, AdjustCacheSizeRule } from './MetacognitionRules.js';

