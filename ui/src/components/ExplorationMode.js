import React, {useCallback, useMemo, useState} from 'react';
import {captureScreenshot} from '../utils/screenshot.js';
import {playbackRecording} from '../utils/recording.js';

const reasoningExamples = [
  {
    id: 'example-1',
    title: 'Basic NARS Inference',
    description: 'Demonstrates how NARS performs basic logical inference',
    steps: [
      {id: 1, description: 'Input: <{bird} --> {animal}>', explanation: 'This is a basic inheritance statement'},
      {
        id: 2,
        description: 'Input: <{robin} --> {bird}>',
        explanation: 'This establishes that a robin is a type of bird'
      },
      {
        id: 3,
        description: 'Derivation: <{robin} --> {animal}>',
        explanation: 'NARS derives that a robin is an animal'
      },
      {
        id: 4,
        description: 'Priority: High',
        explanation: 'This inference has high confidence due to strong logical connection'
      }
    ]
  },
  {
    id: 'example-2',
    title: 'LM-Enhanced Reasoning',
    description: 'Demonstrates how the Language Model assists NARS reasoning',
    steps: [
      {
        id: 1,
        description: 'Input: Natural language query about ethics',
        explanation: 'User asks a complex ethical question'
      },
      {id: 2, description: 'LM processing: Context analysis', explanation: 'LM breaks down the ethical concepts'},
      {
        id: 3,
        description: 'NARS reasoning: Rule formation',
        explanation: 'NARS creates formal statements from the analysis'
      },
      {
        id: 4,
        description: 'Combined result: Ethical reasoning chain',
        explanation: 'Hybrid system produces comprehensive answer'
      }
    ]
  },
  {
    id: 'example-3',
    title: 'Temporal Reasoning',
    description: 'Shows how NARS handles temporal relationships',
    steps: [
      {
        id: 1,
        description: 'Input: Event A occurs before Event B',
        explanation: 'Temporal relationship established'
      },
      {
        id: 2,
        description: 'Input: Event B occurs before Event C',
        explanation: 'Additional temporal relationship'
      },
      {
        id: 3,
        description: 'Derivation: Event A occurs before Event C',
        explanation: 'NARS derives transitive relationship'
      },
      {
        id: 4,
        description: 'Confidence: Medium-High',
        explanation: 'Temporal reasoning typically has moderate confidence'
      }
    ]
  }
];

const ExplorationMode = ({onExit}) => {
  const [isExploring, setIsExploring] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [explorationHistory, setExplorationHistory] = useState([]);
  const [selectedReasoningExample, setSelectedReasoningExample] = useState(null);

  const startExploration = useCallback((exampleId) => {
    const example = reasoningExamples.find(ex => ex.id === exampleId);
    if (example) {
      setSelectedReasoningExample(example);
      setCurrentStep(0);
      setIsExploring(true);
      setExplorationHistory(prev => [...prev, {exampleId, timestamp: Date.now()}]);
      console.log('Started exploration of:', example.title);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (selectedReasoningExample && currentStep < selectedReasoningExample.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endExploration();
    }
  }, [selectedReasoningExample, currentStep]);

  const previousStep = useCallback(() => currentStep > 0 && setCurrentStep(prev => prev - 1), [currentStep]);

  const endExploration = useCallback(() => {
    setIsExploring(false);
    setCurrentStep(0);
    setSelectedReasoningExample(null);
    console.log('Ended exploration');
  }, []);

  const captureCurrentStep = useCallback(async () => {
    try {
      const element = document.getElementById('exploration-container');
      if (element) {
        const blob = await captureScreenshot(element);
        console.log('Captured exploration step screenshot');
      }
    } catch (error) {
      console.error('Failed to capture exploration step:', error);
    }
  }, []);

  const playBackRecording = useCallback(async (recordingEvents) => {
    await playbackRecording(recordingEvents, (event) => console.log('Playback event:', event.type));
  }, []);

  const getCurrentStep = useMemo(() =>
    selectedReasoningExample?.steps[currentStep] || null,
  [selectedReasoningExample, currentStep]);

  const title = useMemo(() =>
    isExploring
      ? `Exploring: ${selectedReasoningExample?.title || 'Example'}`
      : 'Interactive Exploration Mode',
  [isExploring, selectedReasoningExample]);

  const buttonStyle = useCallback((bg) => ({
    padding: '8px 15px',
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }), []);

  const handleExit = useCallback(() => {
    if (isExploring) endExploration();
    else onExit();
  }, [isExploring, endExploration, onExit]);

  const handleExampleClick = useCallback((exampleId) => startExploration(exampleId), [startExploration]);

  return React.createElement('div', {
    className: 'exploration-mode panel',
    id: 'exploration-container',
    style: {
      padding: '20px',
      border: '2px solid #4a90e2',
      backgroundColor: '#f0f8ff',
      borderRadius: '8px',
      minHeight: '500px'
    }
  },
  React.createElement('div', {style: {marginBottom: '20px'}},
    React.createElement('h2', {style: {color: '#2c3e50', marginBottom: '10px'}}, title),
    !isExploring && React.createElement('p', {style: {color: '#7f8c8d', marginBottom: '15px'}},
      'Explore guided examples of hybrid NARS-LM reasoning. Select an example to begin your journey.'
    )
  ),

  !isExploring && React.createElement('div', {style: {marginBottom: '20px'}},
    React.createElement('h3', {style: {color: '#34495e', marginBottom: '10px'}}, 'Select a Reasoning Example:'),
    reasoningExamples.map(example =>
      React.createElement('div', {
        key: example.id,
        style: {
          border: '1px solid #ddd',
          borderRadius: '5px',
          padding: '10px',
          marginBottom: '10px',
          cursor: 'pointer',
          backgroundColor: '#fff',
          transition: 'background-color 0.3s'
        },
        onClick: () => handleExampleClick(example.id),
        onMouseEnter: (e) => e.target.style.backgroundColor = '#e3f2fd',
        onMouseLeave: (e) => e.target.style.backgroundColor = '#fff'
      },
      React.createElement('h4', {style: {margin: '0 0 5px 0', color: '#2980b9'}}, example.title),
      React.createElement('p', {style: {margin: '5px 0', color: '#555'}}, example.description)
      )
    )
  ),

  isExploring && React.createElement('div', {style: {marginBottom: '20px'}},
    React.createElement('div', {style: {marginBottom: '15px'}},
      React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}},
        React.createElement('span', {style: {fontWeight: 'bold'}},
          `Step ${currentStep + 1} of ${selectedReasoningExample?.steps.length}`
        ),
        React.createElement('span', {style: {color: '#7f8c8d'}},
          selectedReasoningExample?.title
        )
      ),
      React.createElement('div', {style: {height: '6px', backgroundColor: '#ecf0f1', borderRadius: '3px'}},
        React.createElement('div', {
          style: {
            height: '100%',
            width: `${((currentStep + 1) / selectedReasoningExample?.steps.length) * 100}%`,
            backgroundColor: '#3498db',
            borderRadius: '3px',
            transition: 'width 0.3s ease'
          }
        })
      )
    ),

    getCurrentStep && React.createElement('div', {
      style: {
        border: '1px solid #b3c8e3',
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: '#e8f4ff',
        marginBottom: '15px'
      }
    },
    React.createElement('h4', {style: {margin: '0 0 10px 0', color: '#2980b9'}},
      `Step ${getCurrentStep.id}: ${getCurrentStep.description}`
    ),
    React.createElement('p', {style: {margin: '0', color: '#2c3e50'}},
      `Explanation: ${getCurrentStep.explanation}`
    )
    ),

    React.createElement('div', {style: {display: 'flex', gap: '10px', marginBottom: '15px'}},
      React.createElement('button', {
        onClick: previousStep,
        disabled: currentStep === 0,
        style: buttonStyle(currentStep === 0 ? '#bdc3c7' : '#3498db')
      }, 'Previous'),

      React.createElement('button', {
        onClick: captureCurrentStep,
        style: buttonStyle('#2ecc71')
      }, 'Capture Screenshot'),

      React.createElement('button', {
        onClick: nextStep,
        style: buttonStyle('#3498db')
      }, currentStep === selectedReasoningExample?.steps.length - 1 ? 'Finish Exploration' : 'Next')
    ),

    React.createElement('div', {style: {marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd'}},
      React.createElement('h4', {style: {margin: '0 0 10px 0', color: '#34495e'}}, 'Exploration Tools:'),
      React.createElement('div', {style: {display: 'flex', gap: '10px', flexWrap: 'wrap'}},
        React.createElement('button', {
          onClick: () => playBackRecording([]),
          style: buttonStyle('#9b59b6')
        }, 'Replay Reasoning'),

        React.createElement('button', {
          onClick: () => console.log('Annotated explanation requested'),
          style: buttonStyle('#f39c12')
        }, 'Add Annotation'),

        React.createElement('button', {
          onClick: () => console.log('Share insight requested'),
          style: buttonStyle('#e74c3c')
        }, 'Share Insight')
      )
    )
  ),

  React.createElement('div', {style: {textAlign: 'center', marginTop: '20px'}},
    React.createElement('button', {
      onClick: handleExit,
      style: buttonStyle(isExploring ? '#e74c3c' : '#95a5a6')
    }, isExploring ? 'End Exploration' : 'Exit Exploration Mode')
  )
  );
};

export default ExplorationMode;