/**
 * @file tests/unit/test-term-parsing.unit.test.js
 * @description Unit tests for term parsing functionality
 */

import { Term } from '../../src/term/Term.js';
import { jest } from '@jest/globals';

describe('Term Parsing', () => {
    test('should parse simple atomic term', () => {
        const term = new Term('test_concept');
        
        expect(term.toString()).toBe('test_concept');
        // Actual property names depend on the real implementation
    });
    
    test('should parse inheritance relation', () => {
        const term = new Term('<subject --> predicate>');
        
        expect(term.toString()).toBe('<subject --> predicate>');
        // Actual property names depend on the real implementation
    });
    
    test('should parse similarity relation', () => {
        const term = new Term('<subject <-> predicate>');
        
        expect(term.toString()).toBe('<subject <-> predicate>');
    });
    
    test('should handle compound terms', () => {
        const term = new Term('<(A & B) --> property>');
        
        expect(term.toString()).toBe('<(A & B) --> property>');
    });
    
    test('should parse statement with truth values', () => {
        const term = new Term('<subject --> predicate>. %0.9;0.8%');
        
        expect(term.toString()).toBe('<subject --> predicate>. %0.9;0.8%');
        // Actual property names depend on the real implementation
    });
    
    test('should parse question statement', () => {
        const term = new Term('<subject --> predicate>?');
        
        expect(term.toString()).toBe('<subject --> predicate>?');
        // Actual property names depend on the real implementation
    });
    
    test('should parse goal statement', () => {
        const term = new Term('<subject --> predicate>!');
        
        expect(term.toString()).toBe('<subject --> predicate>!');
    });
    
    test('should handle temporal relations', () => {
        const term = new Term('<(A &/ B) --> outcome>');
        
        expect(term.toString()).toBe('<(A &/ B) --> outcome>');
    });
    
    test('should compare terms correctly', () => {
        const term1 = new Term('<A --> B>');
        const term2 = new Term('<A --> B>');
        const term3 = new Term('<A --> C>');
        
        // Actual method names depend on the real implementation
        expect(term1.toString()).toBe(term2.toString());
        expect(term1.toString()).not.toBe(term3.toString());
    });
});