import {LMRule} from '../../LMRule.js';
import {Punctuation} from '../../utils/TaskUtils.js';
import {Task} from '../../../task/Task.js';
import {Truth} from '../../../Truth.js';

/**
 * Creates a Narsese translation rule.
 * This rule identifies quoted natural language strings and uses an LM to translate them into Narsese.
 */
export const createNarseseTranslationRule = (dependencies) => {
    const {lm, termFactory, parser} = dependencies;

    return LMRule.create({
        id: 'narsese-translation',
        lm,
        name: 'Narsese Translation Rule',
        description: 'Translates natural language string concepts into formal Narsese.',
        priority: 0.9,
        singlePremise: true,

        condition: (primaryPremise, secondaryPremise, context) => {
            if (!primaryPremise || !primaryPremise.term) return false;

            const term = primaryPremise.term;
            // Check for Atomic Term
            const isAtomic = term.isAtomic || term.type === 'atom' || (term.components && term.components.length === 0);

            if (!isAtomic) return false;

            const name = term.name || term.toString();
            // Check if it is a quoted string - ensure name is a string before calling .startsWith()
            return typeof name === 'string' && name.startsWith('"') && name.endsWith('"');
        },

        prompt: (primaryPremise) => {
            const termStr = primaryPremise.term.name || primaryPremise.term.toString();
            // Remove quotes safely
            const content = termStr.replace(/^"|"$/g, '');

            return `Translate the English sentence to a Narsese relation.
"Dogs are animals" => <dog --> animal>.
"Birds can fly" => <bird --> [fly]>.
"${content}" => `;
        },

        process: (lmResponse) => {
             return lmResponse?.trim() || '';
        },

        generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
            if (!processedOutput) return [];
            if (!dependencies.parser) {
                console.warn('NarseseTranslationRule: Parser not available for translation result');
                return [];
            }

            try {
                // Try to extract Narsese relation if embedded in text
                const match = processedOutput.match(/<[^>]+>/);
                const toParse = match ? match[0] : processedOutput;

                // Parse the Narsese string returned by LM
                const parsed = dependencies.parser.parse(toParse);
                if (parsed) {
                     let term = parsed;
                     let punctuation = Punctuation.BELIEF;
                     let truth = null;

                     if (parsed.term) {
                         term = parsed.term;
                         punctuation = parsed.punctuation || Punctuation.BELIEF;
                         truth = parsed.truthValue;
                     }

                     const newTask = new Task({
                         term: term,
                         punctuation: punctuation,
                         truth: truth ? new Truth(truth.frequency, truth.confidence) : (punctuation === Punctuation.BELIEF ? new Truth(1.0, 0.9) : null),
                         budget: {priority: 0.8, durability: 0.8, quality: 0.5}
                     });

                     return [newTask];
                }
            } catch (e) {
                console.warn(`NarseseTranslationRule: Failed to parse translation "${processedOutput}":`, e.message);
            }
            return [];
        }
    });
};
