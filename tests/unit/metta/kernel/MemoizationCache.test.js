import { strict as assert } from 'assert';
import { MemoizationCache } from '../../../../core/src/metta/kernel/MemoizationCache.js';

console.log('Testing MemoizationCache...');

// Mock Term objects (just plain objects for testing)
const t1 = { id: 1 };
const t2 = { id: 2 };
const t3 = { id: 3 };
const t4 = { id: 4 };

// Test 1: Basic Set/Get
{
    const cache = new MemoizationCache(10);
    cache.set(t1, 'val1');
    assert.equal(cache.get(t1), 'val1', 'Should retrieve cached value');
    assert.equal(cache.get(t2), undefined, 'Should return undefined for missing key');
    console.log('✓ Basic Set/Get passes');
}

// Test 2: Capacity Eviction (LRU)
{
    const cache = new MemoizationCache(2); // Capacity 2

    cache.set(t1, 'a');
    cache.set(t2, 'b');
    // Cache: [t2=b, t1=a]

    assert.equal(cache.get(t1), 'a'); // Access t1, making it MRU
    // Cache: [t1=a, t2=b]

    cache.set(t3, 'c');
    // Cache full, should evict LRU (t2)
    // Cache: [t3=c, t1=a]

    assert.equal(cache.get(t3), 'c', 't3 should be present');
    assert.equal(cache.get(t1), 'a', 't1 should be present');
    assert.equal(cache.get(t2), undefined, 't2 should be evicted');

    const stats = cache.getStats();
    assert.equal(stats.size, 2, 'Size should be 2');
    assert.equal(stats.evictions, 1, 'Should have 1 eviction');
    console.log('✓ Capacity Eviction passes');
}

// Test 3: Updates and "Resurrection"
{
    const cache = new MemoizationCache(2);
    cache.set(t1, 'old');
    cache.set(t2, 'b');
    cache.set(t3, 'c'); // Evicts t1

    assert.equal(cache.get(t1), undefined, 't1 evicted');

    // Set t1 again (Resurrection)
    cache.set(t1, 'new');

    assert.equal(cache.get(t1), 'new', 't1 should be updated');
    assert.equal(cache.getStats().size, 2, 'Size should stay at capacity');
    console.log('✓ Updates and Resurrection passes');
}

console.log('All MemoizationCache tests passed!');
