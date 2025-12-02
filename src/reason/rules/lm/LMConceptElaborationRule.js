import {LMRule} from '../../LMRule.js';
import {createFallbackTerm, tryParseNarsese} from '../../RuleHelpers.js';
import {Task} from '../../../task/Task.js';
import {Truth} from '../../../Truth.js';
import {Term} from '../../../term/Term.js';

export const createConceptElaborationRule = (dependencies) => {
    const {lm, parser, termFactory} = dependencies;

    return LMRule.create({
        id: 'concept-elaboration',
        lm,
        name: 'Concept Elaboration Rule',
        description: 'Generates potential properties or classifications for a concept using commonsense knowledge.',
        priority: 0.7,
        singlePremise: true,

        condition: (primaryPremise) => {
            if (!primaryPremise?.term) return false;
            const term = primaryPremise.term;
            if (term.components?.length > 0 && !term.isAtomic) return false;

            const name = term.name || term.toString();
            if (typeof name !== 'string') return false;
            if (name.startsWith('?') || name.startsWith('#')) return false;
            if (/^\d+$/.test(name)) return false;

            return (primaryPremise.type || 'BELIEF') === 'BELIEF';
        },

        prompt: (primaryPremise) => {
            const content = (primaryPremise.term.name || primaryPremise.term.toString()).replace(/^"|"$/g, '');
            return `Concept property elaboration.
"cat" => <cat --> animal>.
"sun" => <sun --> [hot]>.
"${content}" => `;
        },

        process: (r) => r?.trim() ?? '',

        generate: (processedOutput) => {
            if (!processedOutput) return [];

            let termToCreate = null;
            let punctuation = '.';
            let truth = new Truth(0.9, 0.8);

            const parsed = tryParseNarsese(processedOutput, parser);
            if (parsed && (parsed.term || parsed instanceof Term)) {
                 termToCreate = parsed.term || parsed;
                 if (parsed.punctuation) punctuation = parsed.punctuation;
                 if (parsed.truthValue) truth = new Truth(parsed.truthValue.frequency, parsed.truthValue.confidence);
            }

            if (!termToCreate) {
                 const fallback = createFallbackTerm(processedOutput, termFactory);
                 if (fallback) {
                     termToCreate = fallback;
                     truth = new Truth(0.8, 0.7);
                 }
            }

            if (!termToCreate) return [];

            return [new Task({
                term: termToCreate,
                punctuation,
                truth,
                budget: {priority: 0.6, durability: 0.7, quality: 0.5}
            })];
        }
    });
};
