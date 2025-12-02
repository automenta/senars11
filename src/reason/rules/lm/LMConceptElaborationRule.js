import {LMRule} from '../../LMRule.js';
import {Punctuation} from '../../utils/TaskUtils.js';
import {Task} from '../../../task/Task.js';
import {Truth} from '../../../Truth.js';
import {Term} from '../../../term/Term.js';

export const createConceptElaborationRule = (dependencies) => {
    const {lm, parser} = dependencies;

    return LMRule.create({
        id: 'concept-elaboration',
        lm,
        name: 'Concept Elaboration Rule',
        description: 'Generates potential properties or classifications for a concept using commonsense knowledge.',
        priority: 0.7,
        singlePremise: true,

        condition: (primaryPremise) => {
            if (!primaryPremise || !primaryPremise.term) return false;

            // Only elaborate on atomic terms (simple concepts)
            const term = primaryPremise.term;
            const isAtomic = term.isAtomic || term.type === 'atom' || (term.components && term.components.length === 0);

            // Check type. Use property accessors if available or property
            const type = primaryPremise.type || (primaryPremise.isBelief?.() ? 'BELIEF' : 'UNKNOWN');

            // Avoid elaborating special system terms or variables
            const name = term.name || term.toString();
            if (typeof name === 'string' && (name.startsWith('?') || name.startsWith('#'))) return false;

            return isAtomic && type === 'BELIEF';
        },

        prompt: (primaryPremise) => {
            const termStr = primaryPremise.term?.toString() || String(primaryPremise.term || 'unknown term');
            // Remove quotes if present for the prompt
            const concept = typeof termStr === 'string' ?
                termStr.replace(/^"|"$/g, '') :
                String(termStr || 'unknown concept');

            return `Given the concept "${concept}", provide ONE likely property, classification, or capability in Narsese format.
Examples:
Concept: "cat" -> (cat --> animal).
Concept: "sun" -> (sun --> [hot]).
Concept: "run" -> (run --> action).

Concept: "${concept}"`;
        },

        process: (lmResponse) => {
             return lmResponse?.trim() || '';
        },

        generate: (processedOutput, primaryPremise) => {
            if (!processedOutput) return [];

            try {
                // First, try to parse as Narsese if it looks like Narsese
                if (processedOutput.includes(' --> ') || processedOutput.includes(' <-> ') ||
                    processedOutput.startsWith('<') || processedOutput.startsWith('(')) {

                    if (!dependencies.parser) return [];

                    const parsed = dependencies.parser.parse(processedOutput);
                    if (parsed && (parsed.term || parsed instanceof Term)) {
                         // Handle both parsed Task structure and raw Term
                         let term = parsed.term || parsed;
                         let punctuation = parsed.punctuation || dependencies.Punctuation?.BELIEF;
                         let truth = parsed.truthValue;

                         const newTask = new Task({
                             term: term,
                             punctuation: punctuation || '.',
                             truth: truth ? new Truth(truth.frequency, truth.confidence) : new Truth(0.9, 0.8),
                             budget: {priority: 0.6, durability: 0.7, quality: 0.5}
                         });

                         return [newTask];
                    }
                }

                // If it's natural language text or couldn't be parsed as formal Narsese,
                // create a quoted atomic belief term
                //console.debug(`DEBUG: Creating quoted atomic belief from: "${processedOutput}"`);

                // Create a new task with the natural language as a quoted atomic term
                // Use termFactory to create a proper Term object
                let term;

                try {
                    const termFactory = dependencies.termFactory;
                    if (termFactory && typeof termFactory.atomic === 'function') {
                        term = termFactory.atomic(`"${processedOutput}"`);  // Create quoted atomic term
                    } else {
                        // Fallback to string if no termFactory is available
                        term = `"${processedOutput}"`;
                    }
                } catch (factoryError) {
                    console.warn('TermFactory failed to create term:', factoryError.message);
                    // Fallback to string if termFactory fails
                    term = `"${processedOutput}"`;
                }

                const newTask = new Task({
                    term: term,
                    punctuation: '.',
                    truth: new Truth(0.8, 0.7),
                    budget: {priority: 0.6, durability: 0.5, quality: 0.4}
                });

                return [newTask];
            } catch (e) {
                // If all parsing fails, at least create the quoted atomic belief
                console.debug(`DEBUG: Error parsing, creating quoted atomic belief from: "${processedOutput}", error: ${e.message}`);

                // Use termFactory to create a proper Term object
                let term;

                try {
                    const termFactory = dependencies.termFactory;
                    if (termFactory && typeof termFactory.atomic === 'function') {
                        term = termFactory.atomic(`"${processedOutput}"`);  // Create quoted atomic term
                    } else {
                        // Fallback to string if no termFactory is available
                        term = `"${processedOutput}"`;
                    }
                } catch (factoryError) {
                    console.warn('TermFactory failed to create term in catch block:', factoryError.message);
                    // Fallback to string if termFactory fails
                    term = `"${processedOutput}"`;
                }

                const newTask = new Task({
                    term: term,
                    punctuation: '.',
                    truth: new Truth(0.7, 0.6),
                    budget: {priority: 0.5, durability: 0.4, quality: 0.3}
                });

                return [newTask];
            }
        }
    });
};
