/**
 * @file src/reason/rules/nal/index.js
 * @description Index file for NAL (Non-Axiomatic Logic) rules
 */

// Base rule class
export { NALRule } from './NALRule.js';

// NAL inference rules
export { SyllogisticRule, InheritanceSyllogisticRule, ImplicationSyllogisticRule } from './SyllogisticRule.js';
export { ModusPonensRule } from './ModusPonensRule.js';
export { Decompose1 } from './Decompose1.js';
export { VariableIntroductionRule, DependentVariableIntroductionRule, VariableIntroductionRules } from './VariableIntroduction.js';

// Metacognition rules
export { MetacognitionRules, AdjustCacheSizeRule } from './MetacognitionRules.js';

