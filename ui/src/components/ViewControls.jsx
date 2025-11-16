import React from 'react';
import { useReactFlow } from 'reactflow';
import useNarStore from '../store/nar-store';

const ViewControls = () => {
    const { fitView } = useReactFlow();
    const { actions, liveUpdateEnabled } = useNarStore();

    return (
        <div className="view-controls">
            <button onClick={() => actions.requestSnapshot()}>Refresh</button>
            <button onClick={() => fitView()}>Fit to View</button>
            <label>
                <input
                    type="checkbox"
                    checked={liveUpdateEnabled}
                    onChange={actions.toggleLiveUpdate}
                />
                Live Update
            </label>
        </div>
    );
};

export default ViewControls;
