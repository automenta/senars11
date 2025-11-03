import React, { useState, useEffect } from 'react';
import { Panel } from './Panel.js';
import { VirtualizedList } from './VirtualizedList.js';

const IntrospectionPanel = ({ client }) => {
    const [events, setEvents] = useState([]);
    const [beliefs, setBeliefs] = useState([]);
    const [selfOptimizationEnabled, setSelfOptimizationEnabled] = useState(false);

    useEffect(() => {
        const handleEvent = (event) => {
            setEvents(prevEvents => [event, ...prevEvents]);
        };

        const handleBeliefUpdate = (belief) => {
            if (belief.term.name.includes('SELF')) {
                setBeliefs(prevBeliefs => [belief, ...prevBeliefs]);
            }
        };

        client.on('introspection', handleEvent);
        client.on('belief_updated', handleBeliefUpdate);

        // Fetch initial state
        client.sendMessage({ type: 'GET_INTROSPECTION_STATE' });

        return () => {
            client.off('introspection', handleEvent);
            client.off('belief_updated', handleBeliefUpdate);
        };
    }, [client]);

    const toggleSelfOptimization = () => {
        const newState = !selfOptimizationEnabled;
        setSelfOptimizationEnabled(newState);
        client.sendMessage({
            type: 'SET_CONFIG',
            payload: { 'metacognition.selfOptimization.enabled': newState }
        });
    };

    return (
        <Panel title="Metacognition & System Analysis">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '10px' }}>
                    <label>
                        <input
                            type="checkbox"
                            checked={selfOptimizationEnabled}
                            onChange={toggleSelfOptimization}
                        />
                        Enable Self-Optimization
                    </label>
                </div>
                <div style={{ flex: 1, borderTop: '1px solid #ccc', overflow: 'hidden' }}>
                    <h2>System Beliefs</h2>
                    <VirtualizedList
                        items={beliefs}
                        renderItem={(belief) => (
                            <div>{belief.term.name}</div>
                        )}
                    />
                </div>
                <div style={{ flex: 1, borderTop: '1px solid #ccc', overflow: 'hidden' }}>
                    <h2>Introspection Events</h2>
                    <VirtualizedList
                        items={events}
                        renderItem={(event) => (
                            <div>
                                <strong>{event.eventName}</strong>: {JSON.stringify(event.payload)}
                            </div>
                        )}
                    />
                </div>
            </div>
        </Panel>
    );
};

export default IntrospectionPanel;
