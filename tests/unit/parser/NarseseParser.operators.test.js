import {NarseseParser} from '../../../core/src/parser/NarseseParser.js';
import {TermFactory} from '../../../core/src/term/TermFactory.js';

describe('NarseseParser Operators & Syntax', () => {
    let parser;
    let termFactory;

    beforeEach(() => {
        termFactory = new TermFactory();
        parser = new NarseseParser(termFactory);
    });

    test('should parse negation --A', () => {
        const result = parser.parse('--A.');
        expect(result.term.operator).toBe('--');
        expect(result.term.components[0].name).toBe('A');
    });

    test('should parse pattern variable %v', () => {
        const result = parser.parse('(%v --> A).');
        const subj = result.term.components[0];
        expect(subj.name).toBe('%v');
    });

    test('should parse compact inheritance A:B', () => {
        const result = parser.parse('A:B.'); // B --> A
        expect(result.term.operator).toBe('-->');
        expect(result.term.components[0].name).toBe('B');
        expect(result.term.components[1].name).toBe('A');
    });

    test('should parse delta operator ΔA', () => {
        const result = parser.parse('ΔA.');
        expect(result.term.operator).toBe('Δ');
        expect(result.term.components[0].name).toBe('A');
    });

    test('should parse difference operator <~>', () => {
        const result = parser.parse('<A <~> B>.');
        expect(result.term.operator).toBe('<~>');
    });

    test('should parse new punctuation @ and ;', () => {
        const quest = parser.parse('A@');
        expect(quest.taskType).toBe('QUEST');
        expect(quest.punctuation).toBe('@');

        const command = parser.parse('A;');
        expect(command.taskType).toBe('COMMAND');
        expect(command.punctuation).toBe(';');
    });
});
