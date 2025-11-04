import React, { useState, useEffect } from 'react';
import { Card } from './GenericComponents.js';

/**
 * Abstracted data-driven dashboard panel component
 * @param {Object} props 
 * @param {string} props.title - Dashboard title 
 * @param {string} props.dataRequestType - WebSocket message type for requesting data
 * @param {string} props.dataResponseType - WebSocket message type for receiving data
 * @param {Function} props.renderContent - Function to render dashboard content from data
 * @param {Function} props.onDataReceived - Optional callback when data is received
 */
const DataDashboardPanel = ({ 
  title = 'Dashboard', 
  dataRequestType = 'requestData', 
  dataResponseType = 'dataResponse', 
  renderContent = (data) => React.createElement('div', null, 'No renderer provided'),
  onDataReceived = null
}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const wsService = window.wsService;

  useEffect(() => {
    if (!wsService) {
      setError('WebSocket service not available');
      setIsLoading(false);
      return;
    }

    const handleMessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === dataResponseType) {
          setData(message.payload);
          if (onDataReceived) onDataReceived(message.payload);
          setIsLoading(false);
        } else if (message.type === `${dataResponseType}Error`) {
          setError(message.payload?.message || 'Unknown error');
          setIsLoading(false);
        }
      } catch (err) {
        console.error(`Error parsing ${title} data:`, err);
      }
    };

    wsService.ws.addEventListener('message', handleMessage);
    wsService.sendMessage({ type: dataRequestType, payload: {} });

    return () => wsService.ws.removeEventListener('message', handleMessage);
  }, [wsService, dataRequestType, dataResponseType, onDataReceived]);

  if (isLoading) {
    return React.createElement('div', { style: { padding: '1rem' } },
      React.createElement('h2', null, title),
      React.createElement('p', null, 'Loading analysis data...')
    );
  }

  if (error) {
    return React.createElement('div', { style: { padding: '1rem' } },
      React.createElement('h2', null, title),
      React.createElement('div', { 
        style: { 
          padding: '0.5rem', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          margin: '0.5rem 0'
        }
      }, 'Error: ' + error)
    );
  }

  if (!data) {
    return React.createElement('div', { style: { padding: '1rem' } },
      React.createElement('h2', null, title),
      React.createElement('p', null, 'No data available.')
    );
  }

  return renderContent(data);
};

// Utility functions for analysis dashboards
const getStatusStyle = (level) => ({
  critical: { bg: '#f8d7da', border: '#f5c6cb' },
  high: { bg: '#ffeaa7', border: '#ffeaa7' },
  medium: { bg: '#fdcb6e', border: '#fdcb6e' },
  low: { bg: '#d1f2eb', border: '#d1f2eb' }
})[level] || { bg: '#f8f9fa', border: '#e9ecef' };

const getStatusBadge = (score, thresholds = { high: 95, medium: 80 }) => score >= thresholds.high 
  ? { text: 'Excellent', style: { color: '#28a745', backgroundColor: '#d4edda' } }
  : score >= thresholds.medium 
    ? { text: 'Good but needs improvement', style: { color: '#ffc107', backgroundColor: '#fff3cd' } }
    : { text: 'Needs attention', style: { color: '#dc3545', backgroundColor: '#f8d7da' } };

const renderCardSection = (title, content) => React.createElement('div', { style: { marginBottom: '1.5rem' } },
  React.createElement(Card, { title }, content)
);

const SelfAnalysisPanel = () => {
  const renderAnalysisContent = (analysisData) => {
    const { 
      project, 
      tests, 
      coverage, 
      static: staticAnalysis, 
      requirements, 
      developmentPlan, 
      timestamp 
    } = analysisData;

    return React.createElement('div', { style: { padding: '1rem' } },
      React.createElement('h2', null, 'Self Analysis Dashboard'),
      React.createElement('p', { 
        style: { color: '#6c757d', fontSize: '0.9rem', marginBottom: '1rem' } 
      }, 'Last updated: ' + new Date(timestamp).toISOString().replace('T', ' ').substring(0, 19)),

      project && renderCardSection('Project Information',
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' } },
          React.createElement('div', null,
            React.createElement('p', null, React.createElement('strong', null, 'Name:'), ' ', project.name),
            React.createElement('p', null, React.createElement('strong', null, 'Version:'), ' ', project.version),
            React.createElement('p', null, React.createElement('strong', null, 'Description:'), ' ', project.description)
          ),
          React.createElement('div', null,
            React.createElement('p', null, React.createElement('strong', null, 'Dependencies:'), ' ', project.dependencies),
            React.createElement('p', null, React.createElement('strong', null, 'Dev Dependencies:'), ' ', project.devDependencies),
            React.createElement('p', null, React.createElement('strong', null, 'Scripts:'), ' ', project.scripts)
          )
        )
      ),

      tests && renderCardSection('Testing Metrics',
        React.createElement('div', null,
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' } },
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement('p', { style: { fontSize: '1.75rem', fontWeight: 'bold' } }, tests.totalTests),
              React.createElement('p', { style: { fontSize: '0.8rem', color: '#6c757d' } }, 'Total Tests')
            ),
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement('p', { style: { fontSize: '1.75rem', fontWeight: 'bold', color: '#28a745' } }, tests.passedTests),
              React.createElement('p', { style: { fontSize: '0.8rem', color: '#6c757d' } }, 'Passed Tests')
            ),
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement('p', { style: { fontSize: '1.75rem', fontWeight: 'bold', color: '#dc3545' } }, tests.failedTests),
              React.createElement('p', { style: { fontSize: '0.8rem', color: '#6c757d' } }, 'Failed Tests')
            )
          ),
          tests.passRate !== undefined && React.createElement('div', { style: { marginTop: '1rem' } },
            React.createElement('p', null, React.createElement('strong', null, 'Pass Rate:'), ' ', tests.passRate, '%'),
            React.createElement('span', { style: getStatusBadge(tests.passRate).style }, getStatusBadge(tests.passRate).text)
          ),
          tests.individualTestResults && React.createElement('div', { style: { marginTop: '1rem' } },
            React.createElement('p', null, React.createElement('strong', null, 'Individual Test Results:'), ' ', tests.individualTestResults.length, ' results'),
            React.createElement('div', null,
              tests.individualTestResults.slice(0, 5).map((test) =>
                React.createElement('div', {
                  key: test.fullName,
                  style: {
                    fontSize: '0.875rem',
                    marginTop: '0.25rem',
                    padding: '0.25rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px'
                  }
                },
                  React.createElement('span', {
                    style: {
                      marginRight: '0.5rem',
                      color: test.status === 'passed' ? '#28a745' : test.status === 'failed' ? '#dc3545' : '#ffc107'
                    }
                  }, test.status.toUpperCase()),
                  test.fullName
                )
              ),
              tests.individualTestResults.length > 5 && 
                React.createElement('p', { style: { fontSize: '0.875rem', color: '#6c757d' } }, 
                  '... and ', tests.individualTestResults.length - 5, ' more'
                )
            )
          )
        )
      ),

      coverage && !coverage.error && coverage.available !== false && renderCardSection('Code Coverage',
        React.createElement('div', null,
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1rem' } },
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement('p', { style: { fontSize: '1.5rem', fontWeight: 'bold' } }, coverage.lines, '%'),
              React.createElement('p', { style: { fontSize: '0.8rem', color: '#6c757d' } }, 'Lines')
            ),
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement('p', { style: { fontSize: '1.5rem', fontWeight: 'bold' } }, coverage.functions, '%'),
              React.createElement('p', { style: { fontSize: '0.8rem', color: '#6c757d' } }, 'Functions')
            ),
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement('p', { style: { fontSize: '1.5rem', fontWeight: 'bold' } }, coverage.branches, '%'),
              React.createElement('p', { style: { fontSize: '0.8rem', color: '#6c757d' } }, 'Branches')
            ),
            React.createElement('div', { style: { textAlign: 'center' } },
              React.createElement('p', { style: { fontSize: '1.5rem', fontWeight: 'bold' } }, coverage.statements, '%'),
              React.createElement('p', { style: { fontSize: '0.8rem', color: '#6c757d' } }, 'Statements')
            )
          ),
          coverage.fileAnalysis && coverage.fileAnalysis.length > 0 && React.createElement('div', { style: { marginTop: '1rem' } },
            React.createElement('h4', { style: { fontWeight: 'bold', marginBottom: '0.5rem' } }, 'Lowest Coverage Files:'),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.25rem' } },
              coverage.fileAnalysis.slice(0, 3).map((file) =>
                React.createElement('div', { key: file.filePath, style: { fontSize: '0.875rem' } },
                  React.createElement('span', { style: { fontWeight: 'bold' } }, file.filePath, ': ', file.lineCoverage, '% coverage')
                )
              )
            )
          )
        )
      ),

      staticAnalysis && !staticAnalysis.error && renderCardSection('Code Structure',
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' } },
          React.createElement('div', null,
            React.createElement('p', null, React.createElement('strong', null, 'JS Files:'), ' ', staticAnalysis.jsFiles),
            React.createElement('p', null, React.createElement('strong', null, 'Total Lines:'), ' ', staticAnalysis.totalLines),
            React.createElement('p', null, React.createElement('strong', null, 'Directories:'), ' ', staticAnalysis.directories),
            React.createElement('p', null, React.createElement('strong', null, 'Avg Lines/File:'), ' ', staticAnalysis.avgLinesPerFile)
          ),
          React.createElement('div', null,
            React.createElement('p', null, React.createElement('strong', null, 'Complexity:'), ' ', staticAnalysis.complexity),
            staticAnalysis.largestFile && React.createElement('p', null, 
              React.createElement('strong', null, 'Largest File:'), ' ', 
              staticAnalysis.largestFile.path, ' (', staticAnalysis.largestFile.lines, ' lines)'
            ),
            staticAnalysis.smallestFile && React.createElement('p', null, 
              React.createElement('strong', null, 'Smallest File:'), ' ', 
              staticAnalysis.smallestFile.path, ' (', staticAnalysis.smallestFile.lines, ' lines)'
            )
          )
        )
      ),

      requirements && !requirements.error && renderCardSection('Documentation Compliance',
        React.createElement('div', null,
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' } },
            React.createElement('div', null,
              React.createElement('p', null, React.createElement('strong', null, 'Compliance Score:'), ' ', requirements.complianceScore, '%'),
              React.createElement('p', null, React.createElement('strong', null, 'Satisfied Requirements:'), ' ', 
                requirements.satisfiedRequirements, '/', requirements.totalRequirements),
              React.createElement('span', { style: getStatusBadge(requirements.complianceScore, { high: 90, medium: 70 }).style },
                getStatusBadge(requirements.complianceScore, { high: 90, medium: 70 }).text
              )
            ),
            React.createElement('div', null,
              React.createElement('p', null, React.createElement('strong', null, 'Immutable Architecture:'), ' ', 
                requirements.hasImmutableDataFoundation ? '✅' : '❌'),
              React.createElement('p', null, React.createElement('strong', null, 'Component Architecture:'), ' ', 
                requirements.hasComponentBasedArchitecture ? '✅' : '❌'),
              React.createElement('p', null, React.createElement('strong', null, 'Dual Memory Architecture:'), ' ', 
                requirements.hasDualMemoryArchitecture ? '✅' : '❌'),
              React.createElement('p', null, React.createElement('strong', null, 'Hybrid Reasoning:'), ' ', 
                requirements.hasHybridReasoningIntegration ? '✅' : '❌')
            )
          ),
          requirements.missing && requirements.missing.length > 0 && React.createElement('div', { style: { marginTop: '1rem' } },
            React.createElement('p', null, React.createElement('strong', null, 'Missing Key Sections:')),
            React.createElement('ul', { style: { listStyleType: 'disc', paddingLeft: '1.5rem' } },
              requirements.missing.map((missing) =>
                React.createElement('li', { key: missing }, missing)
              )
            )
          )
        )
      ),

      developmentPlan && renderCardSection('Development Plan',
        React.createElement('div', null,
          React.createElement('h4', { style: { fontWeight: 'bold', marginBottom: '0.5rem' } }, 'Priorities:'),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' } },
            developmentPlan.priorities?.map((priority) =>
              React.createElement('div', {
                key: `${priority.priority}-${priority.area}`,
                style: {
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid',
                  ...getStatusStyle(priority.priority)
                }
              },
                React.createElement('p', { style: { fontWeight: 'bold' } },
                  '[', priority.priority.toUpperCase(), '] ', priority.area
                ),
                React.createElement('p', null, 'Reason: ', priority.reason),
                React.createElement('p', null, 'Recommended Action: ', priority.suggestedAction)
              )
            )
          ),

          React.createElement('h4', { style: { fontWeight: 'bold', marginTop: '1rem', marginBottom: '0.5rem' } }, 'Action Items:'),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' } },
            developmentPlan.actionItems?.map((item) =>
              React.createElement('div', {
                key: `${item.priority}-${item.area}`,
                style: {
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #e9ecef',
                  backgroundColor: '#f8f9fa'
                }
              },
                React.createElement('p', { style: { fontWeight: 'bold' } },
                  '[', item.priority.toUpperCase(), '] ', item.area
                ),
                React.createElement('p', null, 'Action: ', item.task),
                React.createElement('p', null, 'Estimated time: ', item.estimatedTime),
                item.dependsOn && item.dependsOn.length > 0 &&
                  React.createElement('p', null, 'Depends on: ', item.dependsOn.join(', '))
              )
            )
          ),

          React.createElement('h4', { style: { fontWeight: 'bold', marginTop: '1rem', marginBottom: '0.5rem' } }, 'Recommendations:'),
          React.createElement('ul', { 
            style: { listStyleType: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' } 
          },
            developmentPlan.recommendations?.map((rec) =>
              React.createElement('li', { key: rec, style: { fontSize: '0.875rem' } }, rec)
            )
          )
        )
      )
    );
  };

  return React.createElement(DataDashboardPanel, {
    title: 'Self Analysis Dashboard',
    dataRequestType: 'requestSelfAnalysisData',
    dataResponseType: 'selfAnalysisData',
    renderContent: renderAnalysisContent
  });
};

export default SelfAnalysisPanel;