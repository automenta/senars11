const getStatusConfig = (status) => {
  const statusConfig = {
    success: {color: '#28a745', bg: '#d4edda'},
    warning: {color: '#ffc107', bg: '#fff3cd'},
    error: {color: '#dc3545', bg: '#f8d7da'},
    info: {color: '#17a2b8', bg: '#d1ecf1'},
    default: {color: '#6c757d', bg: '#e9ecef'}
  };

  return statusConfig[status] || statusConfig.default;
};

export const createStatusBadge = (React, {status, label, ...props}) => {
  const {color, bg} = getStatusConfig(status);

  return React.createElement('div', {
    style: {
      padding: '0.25rem 0.5rem',
      backgroundColor: bg,
      color: color,
      borderRadius: '12px',
      fontSize: '0.8rem',
      fontWeight: '500',
      display: 'inline-block',
      ...props.style
    }
  }, label);
};

export const createMetricCard = (React, {title, value, description, color = '#007bff'}) =>
  React.createElement('div', {
    style: {
      padding: '1rem',
      margin: '0.5rem',
      backgroundColor: 'white',
      border: `2px solid ${color}`,
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      textAlign: 'center'
    }
  },
  React.createElement('div', {
    style: {fontSize: '1.5rem', fontWeight: 'bold', color, marginBottom: '0.25rem'}
  }, value),
  React.createElement('div', {
    style: {fontSize: '0.9rem', fontWeight: '500', color: '#495057'}
  }, title),
  description && React.createElement('div', {
    style: {fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem'}
  }, description)
  );

export const createProgressBar = (React, {percentage, color = '#007bff', ...props}) =>
  React.createElement('div', {
    style: {
      height: '8px',
      width: '100%',
      backgroundColor: '#e9ecef',
      borderRadius: '4px',
      overflow: 'hidden',
      ...props.containerStyle
    }
  },
  React.createElement('div', {
    style: {
      height: '100%',
      width: `${Math.min(100, Math.max(0, percentage))}%`,
      backgroundColor: color,
      transition: 'width 0.3s ease'
    }
  })
  );

export const createDistributionBar = (React, {segments, ...props}) =>
  React.createElement('div', {
    style: {
      display: 'flex',
      height: '2rem',
      borderRadius: '4px',
      overflow: 'hidden',
      border: '1px solid #ced4da',
      ...props.style
    }
  },
  segments.map((segment, index) =>
    React.createElement('div', {
      key: index,
      style: {
        width: `${segment.percentage}%`,
        backgroundColor: segment.color,
        minWidth: segment.percentage > 0 ? '10px' : '0',
        display: 'flex',
        alignItems: 'center'
      }
    },
    segment.label && segment.percentage > 5 && React.createElement('span', {
      style: {color: 'white', fontSize: '0.7rem', padding: '0 0.5rem'}
    }, segment.label)
    )
  )
  );

export const getStatusColor = (value, threshold) =>
  value === undefined || value === null ? '#6c757d' :
    value > threshold ? '#dc3545' :
      value > threshold * 0.7 ? '#ffc107' : '#28a745';

export const getPerformanceMetricColor = (metricType) => {
  switch (metricType) {
  case 'nars':
    return '#28a745';
  case 'lm':
    return '#ffc107';
  case 'hybrid':
    return '#007bff';
  default:
    return '#6c757d';
  }
};

export default {
  createStatusBadge,
  createMetricCard,
  createProgressBar,
  createDistributionBar,
  getStatusColor,
  getPerformanceMetricColor
};