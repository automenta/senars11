import { expect } from '@playwright/test';
import { NarPage } from './NarPage.js';
import { TaskMatch } from '../../../../src/testing/TaskMatch.js';
import { NarseseParser } from '../../../../src/parser/NarseseParser.js';
import { TermFactory } from '../../../../src/term/TermFactory.js';

export class TestNARPlaywright {
    constructor(page) {
        this.page = page;
        this.narPage = new NarPage(page);
        this.operations = [];
        this.termFactory = new TermFactory();
        this.parser = new NarseseParser(this.termFactory);
    }

    input(termStr, freq, conf) {
        this.operations.push({type: 'input', termStr, freq, conf});
        return this;
    }

    run(cycles = 1) {
        this.operations.push({type: 'run', cycles});
        return this;
    }

    step(count = 1) {
        this.operations.push({type: 'step', count});
        return this;
    }

    expect(term) {
        const matcher = term instanceof TaskMatch ? term : new TaskMatch(term);
        this.operations.push({type: 'expect', matcher, shouldExist: true});
        return this;
    }

    expectNot(term) {
        const matcher = term instanceof TaskMatch ? term : new TaskMatch(term);
        this.operations.push({type: 'expect', matcher, shouldExist: false});
        return this;
    }

    expectGraph(nodeName) {
         this.operations.push({ type: 'expectGraph', nodeName, shouldExist: true });
         return this;
    }

    async execute() {
        for (const op of this.operations) {
             if (op.type === 'input') {
                 let input = op.termStr;
                 if (op.freq !== undefined && op.conf !== undefined) {
                     const lastChar = input.trim().slice(-1);
                     if (!['.', '!', '?', '@'].includes(lastChar)) {
                         input += '.';
                     }
                     input += ` %${op.freq};${op.conf}%`;
                 }
                 await this.narPage.sendCommand(input);
                 await this.page.waitForTimeout(100);
             } else if (op.type === 'run') {
                 await this.page.waitForTimeout(op.cycles * 50);
             } else if (op.type === 'step') {
                 for(let i=0; i<op.count; i++) {
                     await this.page.click('#btn-step');
                     await this.page.waitForTimeout(50);
                 }
             } else if (op.type === 'expect') {
                 await this._checkExpectation(op);
             } else if (op.type === 'expectGraph') {
                 await this._checkGraphExpectation(op);
             }
        }
        this.operations = [];
    }

    async _checkExpectation(op) {
        await expect(async () => {
            const logsText = await this.narPage.logsContainer.innerText();
            const lines = logsText.split('\n');
            let found = false;

            for (const line of lines) {
                const match = line.match(/[<()].*[>).?!%]/);
                if (match) {
                    const narsese = match[0];
                    try {
                         const parsed = this.parser.parse(narsese);
                         const taskMock = {
                             term: parsed.term,
                             type: parsed.type || 'BELIEF',
                             truth: parsed.truth
                         };

                         if (await op.matcher.matches(taskMock)) {
                             found = true;
                             break;
                         }
                    } catch (e) {
                        // ignore parse errors
                    }
                }
            }

            if (op.shouldExist && !found) {
                throw new Error(`Expected term not found: ${op.matcher.termFilter}`);
            }
            if (!op.shouldExist && found) {
                throw new Error(`Unexpected term found: ${op.matcher.termFilter}`);
            }
        }).toPass({ timeout: 10000, intervals: [500] });
    }

    async _checkGraphExpectation(op) {
        // Use the debug command /nodes to list nodes in logs to verify graph content
        await this.narPage.sendCommand('/nodes');
        await this.narPage.expectLog(op.nodeName);
    }
}
