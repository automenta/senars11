import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * A component with controls for the graph view.
 * @param {{
 *   onUpdate: (query: {
 *     concept: string;
 *     limit: number;
 *   }) => void;
 * }} props
 */
export const ViewControls = ({ onUpdate }) => {
  const [concept, setConcept] = useState('');
  const [limit, setLimit] = useState(100);

  const handleUpdate = () => {
    onUpdate({ concept, limit });
  };

  return (
    <div className="view-controls">
      <input
        type="text"
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        placeholder="Concept"
      />
      <input
        type="number"
        value={limit}
        onChange={(e) => setLimit(parseInt(e.target.value, 10))}
        placeholder="Limit"
      />
      <button onClick={handleUpdate}>Update</button>
    </div>
  );
};

ViewControls.propTypes = {
  /**
   * The function to call when the update button is clicked.
   */
  onUpdate: PropTypes.func.isRequired,
};
