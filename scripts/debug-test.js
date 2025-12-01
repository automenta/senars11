
import {NAR} from '../src/nar/NAR.js';

async function test() {
    console.log('Starting debug test');
    const nar = new NAR();
    await nar.initialize();

    nar.on('task.input', (d) => console.log('EVENT input', d.task.toString()));
    nar.on('task.added', (d) => console.log('EVENT added', d.task.toString()));

    console.log('Input 1');
    try {
        const r1 = await nar.input('(a==>b).');
        console.log('Result 1:', r1);
    } catch (e) { console.error(e); }

    console.log('Input 2');
    try {
        const r2 = await nar.input('(a==>b).'); // Duplicate
        console.log('Result 2:', r2);
    } catch (e) { console.error(e); }
}

test().catch(console.error);
