import {LMRule} from '../../LMRule.js';
import {tryParseNarsese} from '../../RuleHelpers.js';
import {Punctuation} from '../../utils/TaskUtils.js';
import {Task} from '../../../task/Task.js';
import {Truth} from '../../../Truth.js';

export const createNarseseTranslationRule = (dependencies) => {
    const {lm, parser, eventBus} = dependencies;

    return LMRule.create({
        id: 'narsese-translation',
        lm,
        eventBus,
        name: 'Narsese Translation Rule',
        description: 'Translates natural language string concepts into formal Narsese.',
        priority: 0.9,
        singlePremise: true,

        condition: (primaryPremise) => {
            if (!primaryPremise?.term) return false;
            const term = primaryPremise.term;
            if (term.components?.length > 0 && !term.isAtomic) return false;

            const name = term.name || term.toString();
            return typeof name === 'string' && name.startsWith('"') && name.endsWith('"');
        },

        prompt: (primaryPremise) => {
            const content = (primaryPremise.term.name || primaryPremise.term.toString()).replace(/^"|"$/g, '');
            return `Translate the English sentence to a Narsese relation.
"Dogs are animals" => <dog --> animal>.
"Birds can fly" => <bird --> [fly]>.
"${content}" => `;
        },

        process: (r) => r?.trim() ?? '',

        generate: (processedOutput) => {
            if (!processedOutput) return [];

            const parsed = tryParseNarsese(processedOutput, parser);
            if (!parsed) return [];

            let term = parsed;
            let punctuation = Punctuation.BELIEF;
            let truth = null;

            if (parsed.term) {
                term = parsed.term;
                punctuation = parsed.punctuation || Punctuation.BELIEF;
                truth = parsed.truthValue;
            }

            return [new Task({
                term,
                punctuation,
                truth: truth ? new Truth(truth.frequency, truth.confidence) : (punctuation === Punctuation.BELIEF ? new Truth(1.0, 0.9) : null),
                budget: {priority: 0.8, durability: 0.8, quality: 0.5}
            })];
        }
    });
};
