import React from 'react';
import PropTypes from 'prop-types';

export const ViewControls = ({
  limit,
  sortBy,
  liveUpdateEnabled,
  onLimitChange,
  onSortByChange,
  onToggleLive,
  onRefresh,
}) => {
  return (
    <div className="view-controls">
      <label>
        Limit:
        <input
          type="number"
          value={limit}
          onChange={(e) => onLimitChange(e.target.value)}
          data-testid="limit-input"
        />
      </label>
      <label>
        Sort By:
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          data-testid="sort-by-select"
        >
          <option value="priority">Priority</option>
          <option value="recency">Recency</option>
        </select>
      </label>
      <button onClick={onRefresh} data-testid="refresh-button">
        Refresh View
      </button>
      <label>
        Live Update:
        <input
          type="checkbox"
          checked={liveUpdateEnabled}
          onChange={onToggleLive}
          data-testid="live-update-toggle"
        />
      </label>
    </div>
  );
};

ViewControls.propTypes = {
  limit: PropTypes.number.isRequired,
  sortBy: PropTypes.string.isRequired,
  liveUpdateEnabled: PropTypes.bool.isRequired,
  onLimitChange: PropTypes.func.isRequired,
  onSortByChange: PropTypes.func.isRequired,
  onToggleLive: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
};
