import React, {memo, useState} from 'react';
import {format} from 'date-fns';
import useUiStore from '../stores/uiStore.js';
import {themeUtils} from '../utils/themeUtils.js';

const getStatusConfig = (status) => ({
    success: {color: themeUtils.get('COLORS.SUCCESS'), bg: themeUtils.get('COLORS.SUCCESS') + '20'},
    warning: {color: themeUtils.get('COLORS.WARNING'), bg: themeUtils.get('COLORS.WARNING') + '20'},
    error: {color: themeUtils.get('COLORS.DANGER'), bg: themeUtils.get('COLORS.DANGER') + '20'},
    info: {color: themeUtils.get('COLORS.INFO'), bg: themeUtils.get('COLORS.INFO') + '20'),
    default: {color: themeUtils.get('COLORS.SECONDARY'), bg: themeUtils.get('COLORS.GRAY_200')}
}[status] || {color: themeUtils.get('COLORS.SECONDARY'), bg: themeUtils.get('COLORS.GRAY_200')});

const StatusBadge = memo(({status, label, ...props}) => {
    const {color, bg} = getStatusConfig(status);

    return (
        <span style={{
            padding: '0.125rem 0.5rem',
            borderRadius: '12px',
            backgroundColor: bg,
            color: color,
            fontSize: '0.75rem',
            fontWeight: 'normal',
            ...props.style
        }}>
            {label || status}
        </span>
    );
});

const LoadingSpinner = memo(({size = '1.5rem', color = themeUtils.get('COLORS.PRIMARY'), ...props}) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        ...props.style
    }}>
        <div style={{
            width: size,
            height: size,
            border: `2px solid ${color}40`,
            borderTop: `2px solid ${color}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            ...props.spinnerStyle
        }} />
    </div>
));

const EmptyState = memo(({message = 'No data to display', icon = '🔍', ...props}) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        textAlign: 'center',
        color: themeUtils.get('TEXT.MUTED'),
        ...props.style
    }}>
        <div style={{fontSize: '2rem', marginBottom: '1rem'}}>{icon}</div>
        <div>{message}</div>
    </div>
));

const ErrorState = memo(({message = 'An error occurred', onRetry = null, ...props}) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        textAlign: 'center',
        color: themeUtils.get('COLORS.DANGER'),
        ...props.style
    }}>
        <div style={{fontSize: '2rem', marginBottom: '1rem'}}>❌</div>
        <div>{message}</div>
        {onRetry && <Button onClick={onRetry} variant="danger" style={{marginTop: '1rem'}}>Retry</Button>}
    </div>
));

const TimeDisplay = memo(({timestamp, formatType = 'relative', ...props}) => {
    if (!timestamp) return <span>-</span>;

    const date = new Date(timestamp);
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);

    return formatType === 'relative'
        ? diffInSeconds < 60 ? <span>{diffInSeconds}s ago</span> :
          diffInSeconds < 3600 ? <span>{Math.floor(diffInSeconds / 60)}m ago</span> :
          diffInSeconds < 86400 ? <span>{Math.floor(diffInSeconds / 3600)}h ago</span> :
          <span>{Math.floor(diffInSeconds / 86400)}d ago</span>
        : formatType === 'datetime'
            ? <span>{format(date, 'MM/dd/yyyy HH:mm:ss')}</span>
            : <span>{format(date, 'HH:mm:ss')}</span>;
});

const WebSocketStatus = memo(({showLabel = true, ...props}) => {
    const wsConnected = useUiStore(state => state.wsConnected);

    return (
        <div className="websocket-status" style={{display: 'flex', alignItems: 'center', ...props.style}}>
            <div style={{
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '50%',
                backgroundColor: themeUtils.getWebSocketStatusColor(wsConnected),
                marginRight: '0.5rem'
            }} />
            {showLabel && <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>}
        </div>
    );
});

const GenericFormField = ({label, children, required = false, description = null, style = {}}) => (
    <div style={{marginBottom: '1rem', ...style}}>
        <label style={{
            display: 'block',
            fontWeight: 'bold',
            marginBottom: '0.25rem',
            fontSize: themeUtils.get('FONTS.SIZE.SM'),
            color: themeUtils.get('TEXT.PRIMARY')
        }}>
            {label}
            {required && <span style={{color: themeUtils.get('COLORS.DANGER')}}> *</span>}
        </label>
        {children}
        {description && (
            <div style={{
                fontSize: themeUtils.get('FONTS.SIZE.SM'),
                color: themeUtils.get('TEXT.SECONDARY'),
                marginTop: '0.25rem'
            }}>
                {description}
            </div>
        )}
    </div>
);

const GenericInputField = ({label, value, onChange, type = 'text', placeholder = '', required = false, description = null, disabled = false}) => (
    <GenericFormField label={label} required={required} description={description}>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            style={{
                width: '100%',
                padding: '0.5rem',
                border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                fontSize: themeUtils.get('FONTS.SIZE.SM'),
                backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.TERTIARY') : themeUtils.get('BACKGROUNDS.PRIMARY'),
                color: themeUtils.get('TEXT.PRIMARY')
            }}
        />
    </GenericFormField>
);

const GenericSelectField = ({label, value, onChange, options, required = false, description = null, disabled = false}) => (
    <GenericFormField label={label} required={required} description={description}>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            style={{
                width: '100%',
                padding: '0.5rem',
                border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
                fontSize: themeUtils.get('FONTS.SIZE.SM'),
                backgroundColor: disabled ? themeUtils.get('BACKGROUNDS.TERTIARY') : themeUtils.get('BACKGROUNDS.PRIMARY'),
                color: themeUtils.get('TEXT.PRIMARY')
            }}
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
    </GenericFormField>
);

const CollapsibleSection = ({title, children, defaultOpen = false}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div style={{
            border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
            borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
            marginBottom: '1rem'
        }}>
            <div
                style={{
                    padding: '0.75rem',
                    backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'),
                    borderBottom: isOpen ? `1px solid ${themeUtils.get('BORDERS.COLOR')}` : 'none',
                    cursor: 'pointer',
                    fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD')
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span>{title}</span>
                    <span>{isOpen ? '▼' : '▶'}</span>
                </div>
            </div>
            {isOpen && <div style={{padding: '1rem'}}>{children}</div>}
        </div>
    );
};

const ToggleSwitch = ({checked, onChange, label}) => (
    <label style={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        fontSize: themeUtils.get('FONTS.SIZE.SM')
    }}>
        <div style={{
            position: 'relative',
            width: '40px',
            height: '20px',
            backgroundColor: checked ? themeUtils.get('COLORS.PRIMARY') : themeUtils.get('COLORS.GRAY_400'),
            borderRadius: '10px',
            marginRight: '0.5rem',
            transition: 'background-color 0.3s'
        }}>
            <div style={{
                position: 'absolute',
                top: '2px',
                left: checked ? '22px' : '2px',
                width: '16px',
                height: '16px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'left 0.3s'
            }} />
        </div>
        {label}
    </label>
);

const getButtonVariantStyle = (variant) => ({
    primary: {backgroundColor: themeUtils.get('COLORS.PRIMARY'), color: themeUtils.get('TEXT.LIGHT')},
    secondary: {backgroundColor: themeUtils.get('COLORS.SECONDARY'), color: themeUtils.get('TEXT.LIGHT')},
    success: {backgroundColor: themeUtils.get('COLORS.SUCCESS'), color: themeUtils.get('TEXT.LIGHT')},
    warning: {backgroundColor: themeUtils.get('COLORS.WARNING'), color: themeUtils.get('TEXT.PRIMARY')},
    danger: {backgroundColor: themeUtils.get('COLORS.DANGER'), color: themeUtils.get('TEXT.LIGHT')},
    light: {backgroundColor: themeUtils.get('BACKGROUNDS.SECONDARY'), color: themeUtils.get('TEXT.PRIMARY'), border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`},
    dark: {backgroundColor: themeUtils.get('COLORS.DARK'), color: themeUtils.get('TEXT.LIGHT')}
}[variant] || {backgroundColor: themeUtils.get('COLORS.PRIMARY'), color: themeUtils.get('TEXT.LIGHT')});

const Button = ({children, onClick, variant = 'primary', style = {}, disabled = false, size = 'md'}) => {
    const sizeStyles = {
        sm: {padding: '0.25rem 0.5rem', fontSize: themeUtils.get('FONTS.SIZE.SM')},
        md: {padding: '0.5rem 1rem', fontSize: themeUtils.get('FONTS.SIZE.SM')},
        lg: {padding: '0.75rem 1.5rem', fontSize: themeUtils.get('FONTS.SIZE.BASE')}
    };

    const baseStyle = {
        border: 'none',
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        fontWeight: themeUtils.get('FONTS.WEIGHT.NORMAL'),
        ...sizeStyles[size]
    };

    return (
        <button
            style={{...baseStyle, ...getButtonVariantStyle(variant), ...style}}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

const Card = ({children, title, style = {}}) => (
    <div style={{
        border: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
        borderRadius: themeUtils.get('BORDERS.RADIUS.MD'),
        padding: '1rem',
        backgroundColor: themeUtils.get('BACKGROUNDS.PRIMARY'),
        boxShadow: themeUtils.get('SHADOWS.SM'),
        ...style
    }}>
        {title && (
            <div style={{
                fontWeight: themeUtils.get('FONTS.WEIGHT.BOLD'),
                marginBottom: '0.5rem',
                paddingBottom: '0.5rem',
                borderBottom: `1px solid ${themeUtils.get('BORDERS.COLOR')}`,
                color: themeUtils.get('TEXT.PRIMARY')
            }}>
                {title}
            </div>
        )}
        {children}
    </div>
);

export {
    StatusBadge,
    LoadingSpinner,
    EmptyState,
    ErrorState,
    TimeDisplay,
    WebSocketStatus,
    GenericFormField,
    GenericInputField,
    GenericSelectField,
    CollapsibleSection,
    ToggleSwitch,
    Button,
    Card
};