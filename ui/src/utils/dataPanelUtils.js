import React from 'react';
import {themeUtils} from './themeUtils.js';

export const createSearchInput = ({searchTerm, onSearchChange, placeholder, style = {}}) =>
    React.createElement('input', {
        type: 'text',
        placeholder,
        value: searchTerm,
        onChange: onSearchChange,
        style: {
            padding: '0.25rem 0.5rem',
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            fontSize: '0.9rem',
            flex: '1 1 200px',
            ...style
        }
    });

export const createSortButton = ({option, isActive, direction, onClick, style = {}}) =>
    React.createElement('button', {
        key: option.key,
        onClick,
        style: {
            padding: '0.25rem 0.5rem',
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
            backgroundColor: isActive ? themeUtils.get('COLORS.PRIMARY') : themeUtils.get('BACKGROUNDS.SECONDARY'),
            color: isActive ? themeUtils.get('TEXT.LIGHT') : themeUtils.get('TEXT.PRIMARY'),
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            ...style
        }
    },
    option.label,
    isActive && React.createElement('span', {style: {fontSize: '0.7rem'}},
        direction === 'asc' ? '↑' : '↓'
    )
    );

export const createPaginationControls = ({currentPage, totalPages, onPageChange, style = {}}) => {
    if (totalPages <= 1) return null;
    
    return React.createElement('div', {
        style: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginLeft: 'auto',
            ...style
        }
    },
    React.createElement('button', {
        onClick: () => onPageChange(Math.max(currentPage - 1, 1)),
        disabled: currentPage === 1,
        style: {
            padding: '0.25rem 0.5rem',
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            backgroundColor: currentPage === 1 ? themeUtils.get('COLORS.GRAY_300') : themeUtils.get('BACKGROUNDS.SECONDARY'),
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
        }
    }, '←'),
    React.createElement('span', {style: {minWidth: '40px', textAlign: 'center'}},
        `${currentPage} / ${totalPages}`
    ),
    React.createElement('button', {
        onClick: () => onPageChange(Math.min(currentPage + 1, totalPages)),
        disabled: currentPage === totalPages,
        style: {
            padding: '0.25rem 0.5rem',
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
            borderRadius: themeUtils.get('BORDERS.RADIUS.SM'),
            backgroundColor: currentPage === totalPages ? themeUtils.get('COLORS.GRAY_300') : themeUtils.get('BACKGROUNDS.SECONDARY'),
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
        }
    }, '→')
    );
};

export const createItemCount = ({visibleCount, totalCount, itemLabel, style = {}}) =>
    React.createElement('div', {
        style: {
            fontSize: '0.8rem',
            color: themeUtils.get('TEXT.MUTED'),
            textAlign: 'right',
            marginBottom: '0.25rem',
            ...style
        }
    },
    `${visibleCount} of ${totalCount} ${itemLabel || 'items'}`
    );

export const createEmptyState = ({message, style = {}}) =>
    React.createElement('div', {
        style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            color: themeUtils.get('TEXT.MUTED'),
            textAlign: 'center',
            height: '200px',
            fontStyle: 'italic',
            ...style
        }
    },
    React.createElement('div', {style: {fontSize: '2rem', marginBottom: '0.5rem'}}, '🔍'),
    React.createElement('div', null, message)
    );