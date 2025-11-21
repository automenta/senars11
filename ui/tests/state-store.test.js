/**
 * Unit tests for StateStore
 */

import StateStore from '../src/state-store.js';
import { MAX_LOG_ENTRIES } from '../src/config.js';

const PASSED = '✅';
const FAILED = '❌';
const TEST_SUMMARY = '🎉';
const TEST_WARNING = '⚠️';

function runTest(description, testFn) {
    try {
        testFn();
        console.log(`${PASSED} PASS: ${description}`);
        return true;
    } catch (error) {
        console.error(`${FAILED} FAIL: ${description}`);
        console.error(`   Error: ${error.message}`);
        return false;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function testStateStore() {
    console.log('Starting StateStore unit tests...\n');

    let passed = 0;
    let total = 0;

    const tests = [
        {
            desc: 'Constructor initializes state properly',
            fn: () => {
                const store = new StateStore();
                const state = store.getState();

                assert(state.connectionStatus === 'disconnected', 'Initial connection status should be disconnected');
                assert(state.isLiveUpdateEnabled === true, 'Initial live update should be enabled');
                assert(Array.isArray(state.logEntries), 'Log entries should be an array');
                assert(state.graph.nodes instanceof Map, 'Graph nodes should be a Map');
                assert(state.graph.edges instanceof Map, 'Graph edges should be a Map');
            }
        },
        {
            desc: 'Subscribe and get state',
            fn: () => {
                const store = new StateStore();
                let receivedState = null;

                const unsubscribe = store.subscribe((state) => {
                    receivedState = state;
                });

                store.dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });

                assert(receivedState !== null, 'Subscriber should receive state updates');
                assert(receivedState.connectionStatus === 'connected', 'Subscriber should receive updated state');

                unsubscribe();
            }
        },
        {
            desc: 'SET_CONNECTION_STATUS action',
            fn: () => {
                const store = new StateStore();

                store.dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
                assert(store.getState().connectionStatus === 'connecting', 'Connection status should update to connecting');

                store.dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
                assert(store.getState().connectionStatus === 'connected', 'Connection status should update to connected');
            }
        },
        {
            desc: 'SET_LIVE_UPDATE_ENABLED action',
            fn: () => {
                const store = new StateStore();

                store.dispatch({ type: 'SET_LIVE_UPDATE_ENABLED', payload: false });
                assert(store.getState().isLiveUpdateEnabled === false, 'Live update should be disabled');

                store.dispatch({ type: 'SET_LIVE_UPDATE_ENABLED', payload: true });
                assert(store.getState().isLiveUpdateEnabled === true, 'Live update should be enabled');
            }
        },
        {
            desc: 'ADD_LOG_ENTRY action with proper limiting',
            fn: () => {
                const store = new StateStore();

                for (let i = 0; i < MAX_LOG_ENTRIES + 5; i++) {
                    store.dispatch({
                        type: 'ADD_LOG_ENTRY',
                        payload: {
                            content: `Log entry ${i}`,
                            type: 'out'
                        }
                    });
                }

                const logEntries = store.getState().logEntries;
                assert(logEntries.length <= MAX_LOG_ENTRIES, `Log entries should be limited to ${MAX_LOG_ENTRIES}`);
                assert(logEntries[0].content === `Log entry ${MAX_LOG_ENTRIES + 4}`, 'Latest entry should be first');
            }
        },
        {
            desc: 'ADD_NODE, UPDATE_NODE, REMOVE_NODE actions',
            fn: () => {
                const store = new StateStore();
                const nodeId = 'node1';

                // Add a node
                store.dispatch({
                    type: 'ADD_NODE',
                    payload: { id: nodeId, label: 'Test Node', type: 'concept' }
                });

                let nodes = store.getState().graph.nodes;
                assert(nodes.has(nodeId), 'Node should be added to the graph');
                assert(nodes.get(nodeId).label === 'Test Node', 'Node should have correct label');

                // Update the node
                store.dispatch({
                    type: 'UPDATE_NODE',
                    payload: { id: nodeId, label: 'Updated Node' }
                });

                nodes = store.getState().graph.nodes;
                assert(nodes.get(nodeId).label === 'Updated Node', 'Node should be updated');

                // Remove the node
                store.dispatch({
                    type: 'REMOVE_NODE',
                    payload: { id: nodeId }
                });

                nodes = store.getState().graph.nodes;
                assert(!nodes.has(nodeId), 'Node should be removed from the graph');
            }
        },
        {
            desc: 'ADD_EDGE, UPDATE_EDGE, REMOVE_EDGE actions',
            fn: () => {
                const store = new StateStore();
                const edgeId = 'edge1';

                // Add an edge
                store.dispatch({
                    type: 'ADD_EDGE',
                    payload: { id: edgeId, source: 'node1', target: 'node2', type: 'relation' }
                });

                let edges = store.getState().graph.edges;
                assert(edges.has(edgeId), 'Edge should be added to the graph');
                assert(edges.get(edgeId).source === 'node1', 'Edge should have correct source');

                // Update the edge
                store.dispatch({
                    type: 'UPDATE_EDGE',
                    payload: { id: edgeId, source: 'node3' }
                });

                edges = store.getState().graph.edges;
                assert(edges.get(edgeId).source === 'node3', 'Edge should be updated');

                // Remove the edge
                store.dispatch({
                    type: 'REMOVE_EDGE',
                    payload: { id: edgeId }
                });

                edges = store.getState().graph.edges;
                assert(!edges.has(edgeId), 'Edge should be removed from the graph');
            }
        },
        {
            desc: 'SET_GRAPH_SNAPSHOT action',
            fn: () => {
                const store = new StateStore();

                const snapshot = {
                    nodes: [
                        { id: 'test_node1', label: 'Test Node 1' },
                        { id: 'test_node2', label: 'Test Node 2' }
                    ],
                    edges: [
                        { id: 'test_edge1', source: 'test_node1', target: 'test_node2' }
                    ]
                };

                store.dispatch({
                    type: 'SET_GRAPH_SNAPSHOT',
                    payload: snapshot
                });

                const state = store.getState();
                assert(state.graph.nodes.size === 2, 'Graph should have 2 nodes from snapshot');
                assert(state.graph.edges.size === 1, 'Graph should have 1 edge from snapshot');
                assert(state.graph.nodes.has('test_node1'), 'Graph should contain test_node1');
                assert(state.graph.nodes.has('test_node2'), 'Graph should contain test_node2');
                assert(state.graph.edges.has('test_edge1'), 'Graph should contain test_edge1');
            }
        },
        {
            desc: 'PROCESS_EVENT_BATCH action',
            fn: () => {
                const store = new StateStore();

                const events = [
                    {
                        type: 'concept.created',
                        data: { term: 'test_concept' },
                        timestamp: Date.now()
                    },
                    {
                        type: 'task.added',
                        data: { task: 'test_task' },
                        timestamp: Date.now()
                    }
                ];

                store.dispatch({
                    type: 'PROCESS_EVENT_BATCH',
                    payload: { events }
                });

                const state = store.getState();
                assert(state.logEntries.length === 2, 'Should have 2 log entries from events');

                const nodes = state.graph.nodes;
                const foundNodes = Array.from(nodes.values()).some(node =>
                    node.label === 'test_concept' || node.label === 'test_task'
                );

                assert(foundNodes, 'State should update graph based on events');
            }
        }
    ];

    tests.forEach(test => {
        total++;
        passed += runTest(test.desc, test.fn);
    });

    console.log(`\nTests completed: ${passed}/${total} passed`);

    if (passed === total) {
        console.log(`${TEST_SUMMARY} All tests passed!`);
    } else {
        console.log(`${TEST_WARNING} Some tests failed`);
        process.exitCode = 1;
    }
}

// Run the tests
testStateStore();