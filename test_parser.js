import {NarseseParser} from './src/parser/NarseseParser.js';
import {TermFactory} from './src/term/TermFactory.js';

const parser = new NarseseParser(new TermFactory());

console.log('Testing parser:');

try {
    const result = parser.parse('(a-->b). %1.0;0.9%');
    console.log('Parse result:');
    console.log('  term:', result.term?.toString?.() || result.term);
    console.log('  punctuation:', result.punctuation);
    console.log('  truthValue:', result.truthValue);
    console.log('  truthValue type:', typeof result.truthValue);
    console.log('  truthValue.frequency:', result.truthValue?.frequency);
    console.log('  truthValue.confidence:', result.truthValue?.confidence);
    console.log('  taskType:', result.taskType);
} catch (error) {
    console.error('Parse error:', error.message);
}

console.log('\nTesting parser without truth values:');

try {
    const result2 = parser.parse('(a-->b).');
    console.log('Parse result:');
    console.log('  term:', result2.term?.toString?.() || result2.term);
    console.log('  punctuation:', result2.punctuation);
    console.log('  truthValue:', result2.truthValue);
    console.log('  taskType:', result2.taskType);
} catch (error) {
    console.error('Parse error:', error.message);
}