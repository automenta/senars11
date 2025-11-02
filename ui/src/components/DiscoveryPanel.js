import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { captureScreenshot } from '../utils/screenshot.js';

const sampleInsights = [
  {
    id: 1,
    title: 'Emergent Behavior Pattern',
    description: 'NARS shows unexpected behavior when combining temporal and spatial reasoning',
    reasoningPattern: 'Temporal + Spatial reasoning chains creating novel inferences',
    tags: ['temporal', 'spatial', 'emergent', 'complexity'],
    timestamp: Date.now() - 3600000,
    author: 'System',
    confidence: 0.85
  },
  {
    id: 2,
    title: 'LM-NARS Synergy',
    description: 'Language model assistance significantly improves reasoning speed for complex queries',
    reasoningPattern: 'LM preprocessing + NARS inference',
    tags: ['hybrid', 'efficiency', 'collaboration'],
    timestamp: Date.now() - 86400000,
    author: 'System',
    confidence: 0.92
  },
  {
    id: 3,
    title: 'Concept Evolution',
    description: 'Concepts change priority dynamically based on recent inputs and context',
    reasoningPattern: 'Dynamic concept adaptation',
    tags: ['concepts', 'priority', 'adaptation'],
    timestamp: Date.now() - 172800000,
    author: 'System',
    confidence: 0.78
  }
];

const DiscoveryPanel = () => {
  const [insights, setInsights] = useState([]);
  const [activeTab, setActiveTab] = useState('discover');
  const [newInsight, setNewInsight] = useState({
    title: '',
    description: '',
    tags: [],
    reasoningPattern: '',
    timestamp: null
  });
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [tagInput, setTagInput] = useState('');
  
  useEffect(() => {
    if (insights.length === 0) setInsights(sampleInsights);
  }, [insights]);

  const handleInputChange = useCallback((field, value) => 
    setNewInsight(prev => ({ ...prev, [field]: value })), []);

  const addTag = useCallback(() => {
    if (tagInput.trim() && !newInsight.tags.includes(tagInput.trim())) {
      setNewInsight(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  }, [tagInput, newInsight.tags]);

  const removeTag = useCallback((tagToRemove) => 
    setNewInsight(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) })), []);

  const saveInsight = useCallback(() => {
    if (!newInsight.title.trim() || !newInsight.description.trim()) {
      alert('Please provide a title and description for the insight');
      return;
    }

    const insight = {
      id: Date.now(),
      ...newInsight,
      timestamp: Date.now(),
      author: 'User',
      confidence: Math.random() * 0.3 + 0.7
    };

    setInsights(prev => [insight, ...prev]);
    setNewInsight({ title: '', description: '', tags: [], reasoningPattern: '', timestamp: null });
    console.log('Saved new insight:', insight.title);
  }, [newInsight]);

  const selectInsight = setSelectedInsight;

  const shareInsight = useCallback((insightId) => {
    console.log('Sharing insight:', insightId);
    alert(`Insight ${insightId} shared successfully! (Simulated)`);
  }, []);

  const exportInsights = useCallback(async () => {
    try {
      const dataStr = JSON.stringify(insights, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seNARS-insights-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('Insights exported');
    } catch (error) {
      console.error('Insights export failed:', error);
    }
  }, [insights]);

  const captureInsightVisualization = useCallback(async (insight) => {
    try {
      const element = document.getElementById('discovery-panel');
      if (element) {
        const blob = await captureScreenshot(element);
        console.log('Captured insight visualization');
      }
    } catch (error) {
      console.error('Failed to capture insight visualization:', error);
    }
  }, []);

  const formatDate = useCallback((timestamp) => new Date(timestamp).toLocaleString(), []);

  const tabButtonStyle = useCallback((isActive) => ({
    padding: '10px 15px',
    backgroundColor: isActive ? '#3498db' : '#ecf0f1',
    color: isActive ? 'white' : '#2c3e50',
    border: 'none',
    borderBottom: isActive ? '2px solid #3498db' : '1px solid #ddd',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0'
  }), []);

  const tagStyle = useMemo(() => ({
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#3498db',
    color: 'white',
    borderRadius: '12px',
    fontSize: '12px'
  }), []);

  const insightCard = useCallback((insight) => 
    React.createElement('div', {
      key: insight.id,
      onClick: () => selectInsight(insight),
      style: {
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: selectedInsight?.id === insight.id ? '#e3f2fd' : '#fff',
        cursor: 'pointer',
        transition: 'background-color 0.3s'
      }
    },
      React.createElement('h4', { style: { margin: '0 0 8px 0', color: '#2c3e50' } }, insight.title),
      React.createElement('p', { style: { margin: '0 0 10px 0', fontSize: '14px', color: '#555', maxHeight: '60px', overflow: 'hidden' } }, insight.description),
      React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' } },
        insight.tags.map((tag, idx) => 
          React.createElement('span', { key: idx, style: { ...tagStyle, fontSize: '10px', padding: '3px 6px' } }, tag)
        )
      ),
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#7f8c8d' } },
        React.createElement('span', null, formatDate(insight.timestamp)),
        React.createElement('div', { style: { display: 'flex', gap: '8px' } },
          React.createElement('button', {
            onClick: (e) => { e.stopPropagation(); shareInsight(insight.id); },
            style: { padding: '4px 8px', backgroundColor: '#9b59b6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }
          }, 'Share'),
          React.createElement('button', {
            onClick: (e) => { e.stopPropagation(); captureInsightVisualization(insight); },
            style: { padding: '4px 8px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }
          }, 'Visualize')
        )
      )
    ), [selectInsight, selectedInsight, tagStyle, formatDate, shareInsight, captureInsightVisualization]);

  const renderNewInsightForm = useCallback(() => 
    React.createElement('div', { style: { border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '20px', backgroundColor: '#fff' } },
      React.createElement('h3', { style: { color: '#2c3e50', marginBottom: '15px' } }, 'Document New Insight'),
      
      React.createElement('div', { style: { marginBottom: '10px' } },
        React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Title:'),
        React.createElement('input', {
          type: 'text',
          value: newInsight.title,
          onChange: (e) => handleInputChange('title', e.target.value),
          placeholder: 'Enter insight title',
          style: { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }
        })
      ),
      
      React.createElement('div', { style: { marginBottom: '10px' } },
        React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Description:'),
        React.createElement('textarea', {
          value: newInsight.description,
          onChange: (e) => handleInputChange('description', e.target.value),
          placeholder: 'Describe the interesting reasoning pattern you observed',
          rows: 3,
          style: { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }
        })
      ),
      
      React.createElement('div', { style: { marginBottom: '10px' } },
        React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Reasoning Pattern:'),
        React.createElement('input', {
          type: 'text',
          value: newInsight.reasoningPattern,
          onChange: (e) => handleInputChange('reasoningPattern', e.target.value),
          placeholder: 'Describe the pattern of reasoning',
          style: { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }
        })
      ),
      
      React.createElement('div', { style: { marginBottom: '10px' } },
        React.createElement('label', { style: { display: 'block', marginBottom: '5px', fontWeight: 'bold' } }, 'Tags:'),
        React.createElement('div', { style: { display: 'flex', marginBottom: '5px' } },
          React.createElement('input', {
            type: 'text',
            value: tagInput,
            onChange: (e) => setTagInput(e.target.value),
            onKeyPress: (e) => e.key === 'Enter' && addTag(),
            placeholder: 'Add a tag and press Enter',
            style: { flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px 0 0 4px' }
          }),
          React.createElement('button', {
            onClick: addTag,
            style: { padding: '8px 12px', backgroundColor: '#3498db', color: 'white', border: '1px solid #ddd', borderLeft: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer' }
          }, '+')
        ),
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '5px' } },
          newInsight.tags.map((tag, index) => 
            React.createElement('span', {
              key: index,
              style: tagStyle
            },
              tag,
              React.createElement('button', {
                onClick: () => removeTag(tag),
                style: { marginLeft: '5px', backgroundColor: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', fontSize: '10px', lineHeight: '14px' }
              }, '×')
            )
          )
        )
      ),
      
      React.createElement('button', {
        onClick: saveInsight,
        style: { padding: '10px 15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
      }, 'Save Insight')
    ), [newInsight, tagInput, handleInputChange, setTagInput, addTag, removeTag, saveInsight, tagStyle]);

  const renderDiscoveryTools = useCallback(() => 
    React.createElement('div', { style: { border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff', marginBottom: '20px' } },
      React.createElement('h3', { style: { color: '#2c3e50', marginBottom: '15px' } }, 'Discovery Tools'),
      
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' } },
        React.createElement('button', {
          onClick: () => console.log('Pattern analysis initiated'),
          style: { padding: '15px', backgroundColor: '#9b59b6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'center' }
        }, 'Pattern Analysis'),
        
        React.createElement('button', {
          onClick: () => console.log('Anomaly detection initiated'),
          style: { padding: '15px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'center' }
        }, 'Anomaly Detection'),
        
        React.createElement('button', {
          onClick: () => console.log('Trend identification initiated'),
          style: { padding: '15px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'center' }
        }, 'Trend Identification'),
        
        React.createElement('button', {
          onClick: () => console.log('Relationship mapping initiated'),
          style: { padding: '15px', backgroundColor: '#1abc9c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'center' }
        }, 'Relationship Mapping')
      )
    ), []);

  const renderSavedInsights = useCallback(() => 
    React.createElement('div', null,
      React.createElement('div', { style: { marginBottom: '15px', textAlign: 'right' } },
        React.createElement('button', {
          onClick: exportInsights,
          style: { padding: '8px 15px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
        }, 'Export Insights')
      ),

      insights.length === 0 
        ? React.createElement('p', { style: { textAlign: 'center', color: '#7f8c8d' } }, 'No saved insights yet. Document your first insight in the Discover tab.')
        : React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' } },
            insights.map(insightCard)
          )
    ), [insights, exportInsights, insightCard]);

  const renderSharedInsights = useCallback(() => 
    React.createElement('div', null,
      React.createElement('div', { style: { textAlign: 'center', padding: '40px 20px' } },
        React.createElement('h3', { style: { color: '#2c3e50', marginBottom: '15px' } }, 'Shared Insights'),
        React.createElement('p', { style: { color: '#7f8c8d', marginBottom: '20px' } }, 
          'In a full implementation, this would show insights shared with the community.'
        ),
        React.createElement('button', {
          onClick: () => console.log('Community insights requested'),
          style: { padding: '10px 20px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
        }, 'Browse Community Insights')
      )
    ), []);

  const renderInsightDetailModal = useCallback(() => 
    React.createElement('div', { 
      style: { 
        position: 'fixed', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)', 
        zIndex: 1000, 
        backgroundColor: 'white', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        padding: '20px',
        width: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      } 
    },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' } },
        React.createElement('h3', { style: { margin: 0, color: '#2c3e50' } }, selectedInsight.title),
        React.createElement('button', {
          onClick: () => setSelectedInsight(null),
          style: { backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }
        }, '×')
      ),
      
      React.createElement('p', { style: { color: '#555', marginBottom: '15px' } }, selectedInsight.description),
      
      React.createElement('div', { style: { marginBottom: '10px' } },
        React.createElement('strong', { style: { color: '#2c3e50' } }, 'Reasoning Pattern:'),
        React.createElement('p', { style: { margin: '5px 0', color: '#555' } }, selectedInsight.reasoningPattern)
      ),
      
      React.createElement('div', { style: { marginBottom: '10px' } },
        React.createElement('strong', { style: { color: '#2c3e50' } }, 'Tags:'),
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' } },
          selectedInsight.tags.map((tag, idx) => 
            React.createElement('span', { key: idx, style: { ...tagStyle, fontSize: '12px' } }, tag)
          )
        )
      ),
      
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' } },
        React.createElement('div', null,
          React.createElement('strong', { style: { color: '#2c3e50' } }, 'Confidence:'),
          React.createElement('span', { style: { marginLeft: '5px', color: '#555' } }, 
            `${(selectedInsight.confidence * 100).toFixed(1)}%`
          )
        ),
        React.createElement('div', null,
          React.createElement('strong', { style: { color: '#2c3e50' } }, 'Date:'),
          React.createElement('span', { style: { marginLeft: '5px', color: '#555' } }, formatDate(selectedInsight.timestamp))
        )
      ),
      
      React.createElement('div', { style: { display: 'flex', gap: '10px', marginTop: '15px' } },
        React.createElement('button', {
          onClick: () => captureInsightVisualization(selectedInsight),
          style: { padding: '8px 15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
        }, 'Capture Visualization'),
        
        React.createElement('button', {
          onClick: () => shareInsight(selectedInsight.id),
          style: { padding: '8px 15px', backgroundColor: '#9b59b6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
        }, 'Share Insight')
      )
    ), [selectedInsight, tagStyle, formatDate, captureInsightVisualization, shareInsight]);

  return React.createElement('div', { 
    className: 'discovery-panel panel', 
    id: 'discovery-panel',
    style: { 
      padding: '20px', 
      border: '1px solid #ddd', 
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      minHeight: '500px',
      display: 'flex',
      flexDirection: 'column'
    } 
  },
    React.createElement('div', { style: { marginBottom: '20px' } },
      React.createElement('h2', { style: { color: '#2c3e50', marginBottom: '10px' } }, 'Insight Discovery & Sharing'),
      React.createElement('p', { style: { color: '#7f8c8d' } }, 
        'Discover, document, and share interesting patterns in hybrid NARS-LM reasoning'
      )
    ),

    React.createElement('div', { style: { display: 'flex', marginBottom: '20px', borderBottom: '1px solid #ddd' } },
      React.createElement('button', { onClick: () => setActiveTab('discover'), style: tabButtonStyle(activeTab === 'discover') }, 'Discover'),
      React.createElement('button', { onClick: () => setActiveTab('saved'), style: { ...tabButtonStyle(activeTab === 'saved'), marginLeft: '5px' } }, 'Saved Insights'),
      React.createElement('button', { onClick: () => setActiveTab('shared'), style: { ...tabButtonStyle(activeTab === 'shared'), marginLeft: '5px' } }, 'Shared Insights')
    ),

    activeTab === 'discover' && React.createElement('div', null,
      renderNewInsightForm(),
      renderDiscoveryTools()
    ),

    activeTab === 'saved' && renderSavedInsights(),

    activeTab === 'shared' && renderSharedInsights(),

    selectedInsight && renderInsightDetailModal(),

    selectedInsight && React.createElement('div', {
      style: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 },
      onClick: () => setSelectedInsight(null)
    })
  );
};

export default DiscoveryPanel;