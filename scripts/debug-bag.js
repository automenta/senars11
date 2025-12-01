
import {Bag} from '../src/memory/Bag.js';

async function test() {
    console.log('Testing Bag...');
    const bag = new Bag(100);

    const item1 = { toString: () => "item1", budget: {priority: 0.5} };
    const item2 = { toString: () => "item1", budget: {priority: 0.5} }; // Duplicate content
    const item3 = { toString: () => "item3", budget: {priority: 0.5} };

    console.log('Add item1:', bag.add(item1));
    console.log('Size:', bag.size);

    console.log('Add item2:', bag.add(item2));
    console.log('Size:', bag.size);

    console.log('Add item3:', bag.add(item3));
    console.log('Size:', bag.size);
}

test().catch(console.error);
