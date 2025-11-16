import React from 'react';
import PropTypes from 'prop-types';

export const ViewControls = ({ onRefresh, onToggleLive }) => {
  return (
    <div className="view-controls">
      <label>
        Limit:
        <input type="number" defaultValue="100" />
      </label>
      <label>
        Sort By:
        <select>
          <option>Priority</option>
          <option>Recency</option>
        </select>
      </label>
      <button onClick={onRefresh}>Refresh View</button>
      <label>
        Live Update:
        <input type="checkbox" onChange={(e) => onToggleLive(e.target.checked)} />
      </label>
    </div>
  );
};

ViewControls.propTypes = {
    onRefresh: PropTypes.func.isRequired,
    onToggleLive: PropTypes.func.isRequired,
};
