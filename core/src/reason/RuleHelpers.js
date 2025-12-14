/**
 * @file src/reason/RuleHelpers.js
 * @description Shared helper functions for reasoning rules, enhanced for stream-based architecture.
 */

import { Logger } from '../util/Logger.js';
import { Punctuation } from '../task/Task.js';

export function extractPrimaryTask(primaryPremise, secondaryPremise, context) {
    return primaryPremise ?? null;
}

export function extractSecondaryTask(primaryPremise, secondaryPremise, context) {
    return secondaryPremise ?? null;
}

export function extractTaskFromContext(primaryPremise, secondaryPremise, context) {
    return extractPrimaryTask(primaryPremise, secondaryPremise, context);
}

export function isSynchronousRule(rule) {
    return (rule.type ?? '').toLowerCase().includes('nal');
}

export function isAsyncRule(rule) {
    return (rule.type ?? '').toLowerCase().includes('lm');
}

export function parseListFromResponse(lmResponse, options = {}) {
    const { removeEmpty = true } = options;
    if (!lmResponse) return [];

    const lines = lmResponse
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^\s*\d+[\.)]|\s*|^[-*]\s*/, '').trim());

    return removeEmpty ? lines.filter(item => item.length > 0) : lines;
}

// Alias for backward compatibility - use parseListFromResponse instead
export const parseSubGoals = (lmResponse) => parseListFromResponse(lmResponse, { removeEmpty: false });

export function isValidSubGoal(goal, minLength, maxLength) {
    if (!goal || goal.length < minLength || goal.length > maxLength) {
        return false;
    }
    const lowerGoal = goal.toLowerCase();
    return !['sorry', 'cannot', 'unable'].some(pattern => lowerGoal.includes(pattern));
}

export function cleanText(text) {
    if (!text) return '';
    return text.replace(/^["']|["']$/g, '').replace(/[.,;!?]+$/, '').trim();
}

export function isValidText(text, minLength = 1, maxLength = 1000) {
    if (!text || text.length < minLength || text.length > maxLength) {
        return false;
    }

    const lowerText = text.toLowerCase();
    return !['sorry', 'cannot', 'unable', 'no information'].some(pattern => lowerText.includes(pattern));
}

export function processDerivation(result, maxDerivationDepth) {
    if (!result?.stamp) return result;

    try {
        const derivationDepth = result.stamp.depth ?? 0;

        if (derivationDepth > maxDerivationDepth) {
            console.debug(`Discarding derivation - exceeds max depth (${derivationDepth} > ${maxDerivationDepth})`);
            return null;
        }

        return result;
    } catch (error) {
        console.debug('Error processing derivation:', error.message);
        return null;
    }
}

export function createDerivedTask(originalTask, newProps) {
    return {
        ...originalTask,
        ...newProps,
        derivedFrom: originalTask.id ?? originalTask.term?.toString?.() ?? 'unknown'
    };
}

export function deriveTruthValue(originalTruth, confidenceMultiplier = 0.9) {
    if (!originalTruth) {
        return { frequency: 0.5, confidence: 0.9 };
    }

    return {
        frequency: originalTruth.frequency ?? 0.5,
        confidence: (originalTruth.confidence ?? 0.9) * confidenceMultiplier
    };
}

export function hasPattern(term, patterns) {
    const termStr = term?.toString?.() ?? String(term ?? '');
    const lowerTerm = termStr.toLowerCase();

    return patterns.some(pattern => lowerTerm.includes(pattern.toLowerCase()));
}

export function createContext(primaryPremise, secondaryPremise, systemContext = {}) {
    return {
        primary: primaryPremise,
        secondary: secondaryPremise,
        ...systemContext,
        timestamp: Date.now(),
        metadata: {
            source: 'lm-rule',
            processingStage: 'apply',
            ...systemContext.metadata
        }
    };
}

export function isGoal(task) {
    return task?.punctuation === Punctuation.GOAL;
}

export function isQuestion(task) {
    return task?.punctuation === Punctuation.QUESTION;
}

export function isBelief(task) {
    return task?.punctuation === Punctuation.BELIEF;
}

export function tryParseNarsese(text, parser) {
    if (!text || !parser) return null;

    const match = text.match(/([<(])[^>)]+([>)])/);
    const toParse = match ? match[0] : text;

    try {
        return parser.parse(toParse);
    } catch (error) {
        Logger.debug('Failed to parse Narsese text', { text: toParse, error: error.message });
        return null;
    }
}

export function createFallbackTerm(text, termFactory) {
    if (!text) return null;

    const cleanContent = text.replace(/"/g, '').trim();
    if (!cleanContent) return null;

    const termStr = `"${cleanContent}"`;

    try {
        if (termFactory?.atomic) {
            return termFactory.atomic(termStr);
        }
        return termStr;
    } catch (error) {
        Logger.debug('Failed to create atomic term', { termStr, error: error.message });
        return termStr;
    }
}

export const KeywordPatterns = {
    problemSolving: [
        'solve', 'fix', 'repair', 'improve', 'handle', 'address', 'resolve', 'overcome', 'manage', 'operate',
        'apply', 'adapt', 'implement', 'execute', 'create', 'build', 'design', 'plan', 'organize', 'find a way to'
    ],

    conflict: ['contradict', 'conflict', 'inconsistent', 'opposite', 'versus', 'vs'],

    complexRelation: (termStr) => {
        return termStr.includes('-->') || termStr.includes('<->') || termStr.includes('==>');
    },

    narrative: [
        'when', 'then', 'if', 'first', 'after', 'before', 'sequence', 'procedure', 'instruction', 'process', 'step', 'guide', 'how to'
    ],

    temporalCausal: [
        'before', 'after', 'when', 'then', 'while', 'during', 'causes', 'leads to', 'results in',
        'because', 'since', 'due to', 'therefore', 'consequently', 'if', 'precedes', 'follows'
    ],

    uncertainty: [
        'maybe', 'perhaps', 'likely', 'unlikely', 'uncertain', 'probably', 'possibly', 'might',
        'tend to', 'often', 'sometimes', 'generally', 'usually', 'could be', 'seems'
    ],

    ambiguous: [
        'it', 'this', 'that', 'they', 'them', 'which', 'what', 'how', 'some', 'few', 'many', 'most', 'thing', 'stuff', 'deal with'
    ],

    complexity: [
        'solve', 'achieve', 'optimize', 'balance', 'maximize', 'minimize', 'understand', 'analyze',
        'investigate', 'discover', 'resolve', 'plan', 'design', 'create', 'develop', 'implement'
    ]
};