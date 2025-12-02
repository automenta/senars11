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

            // Avoid numbers
            if (/^\d+$/.test(name)) return false;

            return isAtomic && type === 'BELIEF';
        },

        prompt: (primaryPremise) => {
            const termStr = primaryPremise.term?.toString() || String(primaryPremise.term || 'unknown term');
            // Remove quotes if present for the prompt
            const concept = typeof termStr === 'string' ?
                termStr.replace(/^"|"$/g, '') :
                String(termStr || 'unknown concept');

            return `Concept property elaboration.
"cat" => <cat --> animal>.
"sun" => <sun --> [hot]>.
"${concept}" => `;
        },

        process: (lmResponse) => {
             return lmResponse?.trim() || '';
        },

        generate: (processedOutput, primaryPremise) => {
            if (!processedOutput) return [];

            let termToCreate = null;
            let punctuation = '.';
            let truth = new Truth(0.9, 0.8); // High confidence if parsed

            // Try to extract Narsese relation
            // Match <A --> B> or (A --> B)
            const match = processedOutput.match(/([<(])[^>)]+([>)])/);

            try {
                if (match || processedOutput.includes('-->')) {
                     const toParse = match ? match[0] : processedOutput;
                     if (dependencies.parser) {
                         const parsed = dependencies.parser.parse(toParse);
                         if (parsed && (parsed.term || parsed instanceof Term)) {
                              // It's a valid term
                              termToCreate = parsed.term || parsed;
                              if (parsed.punctuation) punctuation = parsed.punctuation;
                              if (parsed.truthValue) truth = new Truth(parsed.truthValue.frequency, parsed.truthValue.confidence);
                         }
                     }
                }
            } catch (e) {
                // Parsing failed, ignore
            }

            if (!termToCreate) {
                 // Fallback: create quoted atomic term
                 const cleanContent = processedOutput.replace(/"/g, '').trim();
                 if (!cleanContent) return [];

                 const termStr = `"${cleanContent}"`;

                 try {
                     if (dependencies.termFactory && typeof dependencies.termFactory.atomic === 'function') {
                          termToCreate = dependencies.termFactory.atomic(termStr);
                     } else {
                          termToCreate = termStr;
                     }
                     truth = new Truth(0.8, 0.7); // Lower confidence for fallback
                 } catch (e) {
                     console.warn('ConceptElaborationRule: Failed to create fallback term', e);
                     return [];
                 }
            }

            const newTask = new Task({
                term: termToCreate,
                punctuation: punctuation,
                truth: truth,
                budget: {priority: 0.6, durability: 0.7, quality: 0.5}
            });

            return [newTask];
        }
    });
};
