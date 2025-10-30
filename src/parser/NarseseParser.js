import {parse} from './peggy-parser.js';
import {TermFactory} from '../term/TermFactory.js';

export class NarseseParser {
    constructor(termFactory) {
        this.termFactory = termFactory || new TermFactory();
    }

    parse(input) {
        return parse(input, {termFactory: this.termFactory});
    }
}
