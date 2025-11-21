import React from 'react';
import {FaCompress, FaExpand, FaFilter, FaSearch, FaSync} from 'react-icons/fa';

const GraphControls = ({
                           onZoomIn,
                           onZoomOut,
                           onFitView,
                           onRefresh,
                           onSearch,
                           onFilter,
                           zoomLevel
                       }) => {
    return React.createElement('div', {
            style: {
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '10px',
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }
        },
        React.createElement('button', {
            onClick: onZoomIn,
            title: "Zoom In",
            style: {
                padding: '5px',
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '3px',
                cursor: 'pointer'
            }
        }, React.createElement(FaExpand)),
        React.createElement('button', {
            onClick: onZoomOut,
            title: "Zoom Out",
            style: {
                padding: '5px',
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '3px',
                cursor: 'pointer'
            }
        }, React.createElement(FaCompress)),
        React.createElement('button', {
            onClick: onFitView,
            title: "Fit View",
            style: {
                padding: '5px',
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '3px',
                cursor: 'pointer'
            }
        }, React.createElement(FaSync)),
        onSearch && React.createElement('button', {
            title: "Search",
            style: {
                padding: '5px',
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '3px',
                cursor: 'pointer'
            }
        }, React.createElement(FaSearch)),
        onFilter && React.createElement('button', {
            title: "Filter",
            style: {
                padding: '5px',
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '3px',
                cursor: 'pointer'
            }
        }, React.createElement(FaFilter))
    );
};

export default GraphControls;