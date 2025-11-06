/**
 * Parser spacing tests
 * Tests to ensure Narsese parsing works with and without spaces around operators
 */

import {NarseseParser} from '../../../src/parser/NarseseParser.js';
import {TermFactory} from '../../../src/term/TermFactory.js';

describe('NarseseParser spacing tests', () => {
    let parser;

    beforeEach(() => {
        const termFactory = new TermFactory();
        parser = new NarseseParser(termFactory);
    });

    test('angle-bracket format with spaces should work', () => {
        const result = parser.parse('<a ==> b>.');
        expect(result.term._operator).toBe('==>');
        expect(result.term._components.length).toBe(2);
        expect(result.term._components[0]._name).toBe('a');
        expect(result.term._components[1]._name).toBe('b');
    });

    test('parentheses format with spaces should work', () => {
        const result = parser.parse('(a ==> b).');
        expect(result.term._operator).toBe('==>');
        expect(result.term._components.length).toBe(2);
        expect(result.term._components[0]._name).toBe('a');
        expect(result.term._components[1]._name).toBe('b');
    });

    test('angle-bracket format without spaces should work - BUG: THIS TEST SHOULD FAIL', () => {
        // This test is designed to fail to highlight the bug
        // Both spaced and tight formats should parse equivalently, but tight currently fails
        const spacedResult = parser.parse('<a ==> b>.'); 
        expect(spacedResult.term._operator).toBe('==>');

        // This line should succeed but currently fails due to the bug
        const tightResult = parser.parse('<a==>b>.'); // This is expected to fail and make test fail
        expect(tightResult.term._operator).toBe('==>');
    });

    test('parentheses format without spaces should work - BUG: THIS TEST SHOULD FAIL', () => {
        // This test is designed to fail to highlight the bug
        // Both spaced and tight formats should parse equivalently, but tight currently fails
        const spacedResult = parser.parse('(a ==> b).'); 
        expect(spacedResult.term._operator).toBe('==>');

        // This line should succeed but currently fails due to the bug
        const tightResult = parser.parse('(a==>b).'); // This is expected to fail and make test fail
        expect(tightResult.term._operator).toBe('==>');
    });

    test('separate test: check if certain tight formats work', () => {
        // Test specific tight formats to see which work and which don't
        const tightFormats = [
            '(a==>b).',   // This should fail
            '<a==>b>.',   // This should fail
        ];
        
        for (const format of tightFormats) {
            expect(() => {
                parser.parse(format);
            }).toThrow();
        }
    });

    test('atomic terms should work regardless', () => {
        const result = parser.parse('a.');
        expect(result.term._name).toBe('a');
    });

    test('compound terms with spaces should work', () => {
        const result = parser.parse('(a && b).');
        expect(result.term._operator).toBe('&&');
    });
});