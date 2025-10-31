/**
 * Educational Content System
 * Provides contextual information, tooltips, and learning elements based on viewer state
 */

import useUiStore from '../stores/uiStore.js';
import knowledgeInference from './knowledgeInference.js';
import adaptiveDemoEngine from './adaptiveDemoEngine.js';

class EducationalContent {
  constructor() {
    this.contentDatabase = this.initializeContentDatabase();
    this.activeTooltips = new Set();
    this.curiosityTriggers = new Map();
    this.tutorialSteps = new Map();
    this.accessibilityFeatures = {
      screenReader: false,
      highContrast: false,
      largeText: false,
      keyboardNavigation: true
    };
  }

  /**
   * Initialize the educational content database
   */
  initializeContentDatabase() {
    return {
      // Core concepts explanations
      concepts: {
        'reasoning': {
          short: 'The process of drawing conclusions from beliefs and goals',
          long: 'Reasoning in NARS involves deriving new tasks from existing beliefs using inference rules. It combines inheritance, similarity, and temporal relations to form new knowledge.',
          beginner: 'Think of reasoning like solving puzzles - combining facts to discover new facts',
          intermediate: 'NARS uses a sophisticated inference system that handles uncertainty and novelty',
          advanced: 'Reasoning operates on a priority-based resource allocation system with efficient conflict resolution',
          examples: ['If birds fly AND tweety is a bird, THEN tweety flies'],
          related: ['inference', 'truth-value', 'priority']
        },
        'concept': {
          short: 'A knowledge unit about a term in the NARS language',
          long: 'Concepts represent knowledge about terms. Each concept maintains beliefs, goals, and questions related to its term, with priority-based resource allocation.',
          beginner: 'A concept is like a container that holds all knowledge about a specific thing',
          intermediate: 'Concepts maintain multiple tasks with different truth values and priorities',
          advanced: 'Concepts implement efficient belief revision and anticipation mechanisms',
          examples: ['bird concept contains beliefs about birds, goals related to birds, and answers to bird-related questions'],
          related: ['task', 'belief', 'truth-value']
        },
        'task': {
          short: 'A basic unit of work in NARS - can be a belief, goal, or question',
          long: 'Tasks represent the basic units of processing in NARS. They include beliefs (information), goals (desired states), and questions (unknowns to be answered).',
          beginner: 'Think of tasks as things the system needs to think about',
          intermediate: 'Each task has a truth value, priority, and budget for processing',
          advanced: 'Tasks undergo efficient allocation in a limited resource environment',
          examples: ['<bird -> animal> is a belief task', '<bird -> fly>? is a question task'],
          related: ['concept', 'narsese', 'truth-value']
        },
        'narsese': {
          short: 'The formal language used to express knowledge in NARS',
          long: 'Narsese is the language of NARS, using operators like inheritance (->), similarity (<->), conjunction (&&), and temporal relations (&).',
          beginner: 'Narsese is like a special language for expressing knowledge',
          intermediate: 'Uses mathematical notation to express complex relationships',
          advanced: 'Implements compositional semantics with efficient parsing and evaluation',
          examples: ['<bird -> animal>', '<tweety <-> bird>', '<bird && fly>'],
          related: ['inheritance', 'similarity', 'conjunction']
        }
      },

      // Technical terms explanations
      terms: {
        'inheritance': {
          short: 'A type-of relationship (A -> B means A is a type of B)',
          long: 'Inheritance (->) represents a subtype relationship where the subject is a special case of the predicate.',
          beginner: 'Like saying "a dog is a type of animal"',
          examples: ['<dog -> animal>', '<robin -> bird>'],
          related: ['similarity', 'instance', 'property']
        },
        'similarity': {
          short: 'A bidirectional type relationship (A <-> B means A is similar to B)',
          long: 'Similarity (<->) represents a bidirectional inheritance relationship.',
          beginner: 'Like saying "a penguin is like a bird" and "a bird is like a penguin"',
          examples: ['<penguin <-> bird>'],
          related: ['inheritance', 'property', 'instance']
        },
        'truth-value': {
          short: 'A pair of frequency and confidence that measures belief strength',
          long: 'Truth values have frequency (how often something is true) and confidence (how sure we are about the frequency).',
          beginner: 'Like a scale from 0 to 1 showing how sure the system is about something',
          intermediate: 'Combines empirical frequency with confidence based on evidence amount',
          advanced: 'Implements Bayes and/or rules for truth value revision',
          examples: ['(0.9, 0.8) means 90% frequency with 80% confidence'],
          related: ['frequency', 'confidence', 'revision']
        },
        'priority': {
          short: 'A measure of how important a task or concept is to process',
          long: 'Priority determines resource allocation in the system, ranging from 0 to 1.',
          beginner: 'Like a measure of how important something is to think about next',
          intermediate: 'Used for efficient resource allocation among competing tasks',
          advanced: 'Implements dynamic resource allocation with self-modification',
          examples: ['Tasks with higher priority get processed first'],
          related: ['budget', 'resource', 'attention']
        }
      },

      // Panel-specific explanations
      panels: {
        'TaskPanel': {
          title: 'Task Panel',
          description: 'Shows the current tasks (beliefs, goals, questions) being processed by the system',
          beginner: 'This panel shows what the system is currently thinking about',
          intermediate: 'Tasks are prioritized and processed based on their importance and urgency',
          advanced: 'The panel shows task budgets, truth values, and processing statistics',
          tips: [
            'Tasks with higher priority are processed first',
            'Beliefs become goals which become questions and vice versa',
            'Task revision happens when similar tasks are processed'
          ]
        },
        'ConceptPanel': {
          title: 'Concept Panel', 
          description: 'Displays concepts and their associated beliefs, goals, and questions',
          beginner: 'This panel shows what the system knows about different concepts',
          intermediate: 'Concepts organize knowledge hierarchically with inheritance relationships',
          advanced: 'Concepts implement sophisticated belief revision and anticipation',
          tips: [
            'Concepts with higher priority get more processing resources',
            'Inheritance hierarchies enable efficient knowledge organization',
            'Concepts can form and merge dynamically'
          ]
        },
        'ReasoningTracePanel': {
          title: 'Reasoning Trace Panel',
          description: 'Shows the logical steps and derivations in the reasoning process',
          beginner: 'This panel shows how the system draws conclusions',
          intermediate: 'Traces show belief revision and derivation rules in action',
          advanced: 'Tracks multi-step inference chains and conflict resolution',
          tips: [
            'Each trace shows the inputs and rule used for derivation',
            'Look for how beliefs combine to form new insights',
            'Traces show the reasoning confidence and reliability'
          ]
        }
      },

      // Demo-specific explanations
      demos: {
        'basic-reasoning': {
          title: 'Basic Reasoning Demo',
          description: 'Demonstrates fundamental reasoning patterns with inheritance',
          beginner: 'This demo shows how the system combines facts to draw conclusions',
          intermediate: 'Watch how inheritance rules create new knowledge from existing beliefs',
          advanced: 'Observe the priority dynamics and resource allocation during reasoning',
          steps: [
            'System receives initial beliefs',
            'Reasoning rules apply to derive new beliefs', 
            'Beliefs are revised based on new evidence',
            'Priority values update resource allocation'
          ]
        },
        'concept-formation': {
          title: 'Concept Formation Demo',
          description: 'Shows how the system creates new concepts from experience',
          beginner: 'This demo shows how the system learns new concepts',
          intermediate: 'New concepts form when similar patterns are observed',
          advanced: 'Concept formation uses statistical patterns and similarity measures',
          steps: [
            'Similar tasks trigger concept formation',
            'New concept is created with appropriate relations',
            'New concept is integrated into knowledge base',
            'System learns from the new concept'
          ]
        }
      }
    };
  }

  /**
   * Get contextual explanation for an element
   */
  getContextualExplanation(elementId, knowledgeLevel = null) {
    // If knowledge level not provided, infer it
    if (!knowledgeLevel) {
      knowledgeLevel = knowledgeInference.inferKnowledgeLevel();
    }

    // Check different categories in order of precedence
    let explanation = this.contentDatabase.concepts[elementId];
    if (!explanation) {
      explanation = this.contentDatabase.terms[elementId];
    }
    if (!explanation) {
      explanation = this.contentDatabase.panels[elementId];
    }
    if (!explanation) {
      explanation = this.contentDatabase.demos[elementId];
    }

    if (!explanation) {
      return {
        title: elementId,
        content: `No specific explanation available for ${elementId}`,
        knowledgeLevel: knowledgeLevel
      };
    }

    // Return explanation based on knowledge level
    const levelSpecific = explanation[knowledgeLevel] || explanation.beginner;
    const generalExplanation = explanation.long || explanation.short || `Information about ${elementId}`;

    return {
      title: explanation.title || elementId,
      content: levelSpecific,
      fullContent: generalExplanation,
      knowledgeLevel,
      examples: explanation.examples || [],
      related: explanation.related || []
    };
  }

  /**
   * Show tooltip for an element
   */
  showTooltip(elementId, targetElement) {
    const explanation = this.getContextualExplanation(elementId);
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'educational-tooltip';
    tooltip.id = `tooltip-${elementId}`;
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <strong>${explanation.title}</strong>
        <button class="tooltip-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="tooltip-content">
        <p>${explanation.content}</p>
        ${explanation.examples.length > 0 ? `
          <div class="tooltip-examples">
            <strong>Examples:</strong>
            <ul>${explanation.examples.map(e => `<li>${e}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>
    `;

    // Position tooltip near the target element
    const rect = targetElement.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    tooltip.style.zIndex = '10000';
    tooltip.style.backgroundColor = '#333';
    tooltip.style.color = 'white';
    tooltip.style.padding = '10px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.maxWidth = '300px';
    tooltip.style.fontSize = '12px';

    document.body.appendChild(tooltip);
    this.activeTooltips.add(elementId);
    
    return tooltip;
  }

  /**
   * Hide tooltip for an element
   */
  hideTooltip(elementId) {
    const tooltip = document.getElementById(`tooltip-${elementId}`);
    if (tooltip) {
      tooltip.remove();
    }
    this.activeTooltips.delete(elementId);
  }

  /**
   * Create curiosity trigger for an element
   */
  createCuriosityTrigger(elementId, targetElement, options = {}) {
    const knowledgeLevel = knowledgeInference.inferKnowledgeLevel();
    const explanation = this.getContextualExplanation(elementId, knowledgeLevel);
    
    // Only show triggers for elements the user shows interest in
    const analytics = useUiStore.getState().getViewerAnalytics();
    if (analytics) {
      const focusedTime = analytics.engagement.focusedConcepts.find(([id]) => id === elementId);
      if (focusedTime && focusedTime[1] > 5000) { // If focused for more than 5 seconds
        // Create a curiosity trigger element
        const trigger = document.createElement('div');
        trigger.className = 'curiosity-trigger';
        trigger.innerHTML = `
          <div class="trigger-icon">💡</div>
          <div class="trigger-content">
            <p><strong>Did you know?</strong> ${explanation.content.substring(0, 60)}...</p>
            <button class="trigger-learn-more" onclick="this.parentElement.parentElement.showMoreInfo()">Learn more</button>
          </div>
        `;

        // Position near the target element
        const rect = targetElement.getBoundingClientRect();
        trigger.style.position = 'fixed';
        trigger.style.left = `${rect.left + rect.width + 5}px`;
        trigger.style.top = `${rect.top + window.scrollY}px`;
        trigger.style.zIndex = '9999';
        trigger.style.backgroundColor = 'rgba(255, 255, 200, 0.95)';
        trigger.style.border = '1px solid #ffcc00';
        trigger.style.borderRadius = '5px';
        trigger.style.padding = '8px';
        trigger.style.maxWidth = '250px';
        trigger.style.fontSize = '11px';

        // Add showMoreInfo method to trigger
        trigger.showMoreInfo = () => {
          this.showDetailedExplanation(elementId);
          trigger.remove();
        };

        document.body.appendChild(trigger);
        this.curiosityTriggers.set(elementId, trigger);

        // Auto-remove after 10 seconds if not interacted with
        setTimeout(() => {
          if (this.curiosityTriggers.has(elementId)) {
            trigger.remove();
            this.curiosityTriggers.delete(elementId);
          }
        }, 10000);
      }
    }
  }

  /**
   * Show detailed explanation in modal
   */
  showDetailedExplanation(elementId) {
    const explanation = this.getContextualExplanation(elementId);
    
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'educational-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${explanation.title}</h3>
          <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
        </div>
        <div class="modal-body">
          <p>${explanation.fullContent}</p>
          ${explanation.examples.length > 0 ? `
            <div class="modal-examples">
              <h4>Examples:</h4>
              <ul>${explanation.examples.map(e => `<li>${e}</li>`).join('')}</ul>
            </div>
          ` : ''}
          ${explanation.related.length > 0 ? `
            <div class="modal-related">
              <h4>Related Topics:</h4>
              <ul>${explanation.related.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button onclick="window.open('https://github.com/opennars/OpenNARS/wiki', '_blank')">Learn More</button>
          ${explanation.related.length > 0 ? 
            `<button onclick="this.parentElement.parentElement.showRelated('${explanation.related[0]}')">Explore "${explanation.related[0]}"</button>` 
            : ''}
        </div>
      </div>
    `;

    // Add modal styles
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '11000';
    modal.style.fontFamily = 'Arial, sans-serif';

    // Add method to show related content
    modal.showRelated = (relatedTopic) => {
      this.showDetailedExplanation(relatedTopic);
      modal.remove();
    };

    document.body.appendChild(modal);
  }

  /**
   * Create guided tour for a panel or feature
   */
  createGuidedTour(panelId, steps) {
    const knowledgeLevel = knowledgeInference.inferKnowledgeLevel();
    const panelInfo = this.contentDatabase.panels[panelId];
    
    if (!panelInfo) {
      console.warn(`No tour available for panel: ${panelId}`);
      return null;
    }

    // Filter steps based on knowledge level
    const filteredSteps = steps || [
      {
        elementId: panelId,
        title: `Welcome to ${panelInfo.title}`,
        content: panelInfo[knowledgeLevel] || panelInfo.description,
        position: 'center'
      },
      ...(panelInfo.tips || []).map((tip, index) => ({
        elementId: `${panelId}-tip-${index}`,
        title: `Tip #${index + 1}`,
        content: tip,
        position: 'auto'
      }))
    ];

    this.tutorialSteps.set(panelId, filteredSteps);
    return this.startTour(panelId);
  }

  /**
   * Start a guided tour
   */
  startTour(panelId) {
    const steps = this.tutorialSteps.get(panelId);
    if (!steps || steps.length === 0) return null;

    let currentStep = 0;
    
    const tourElement = document.createElement('div');
    tourElement.className = 'guided-tour';
    tourElement.style.position = 'fixed';
    tourElement.style.top = '0';
    tourElement.style.left = '0';
    tourElement.style.width = '100%';
    tourElement.style.height = '100%';
    tourElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    tourElement.style.zIndex = '10000';
    tourElement.style.display = 'flex';
    tourElement.style.justifyContent = 'center';
    tourElement.style.alignItems = 'center';

    const showStep = (stepIndex) => {
      // Clear previous step
      const existingStep = tourElement.querySelector('.tour-step');
      if (existingStep) existingStep.remove();

      if (stepIndex >= steps.length) {
        // Tour completed
        tourElement.remove();
        return;
      }

      const step = steps[stepIndex];
      
      const stepElement = document.createElement('div');
      stepElement.className = 'tour-step';
      stepElement.innerHTML = `
        <div class="tour-content">
          <div class="tour-header">
            <h3>${step.title}</h3>
            <button class="tour-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
          </div>
          <p>${step.content}</p>
          <div class="tour-navigation">
            <button onclick="this.parentElement.parentElement.parentElement.showPreviousStep()" 
                    ${stepIndex === 0 ? 'disabled' : ''}>Previous</button>
            <span>Step ${stepIndex + 1} of ${steps.length}</span>
            <button onclick="this.parentElement.parentElement.parentElement.showNextStep()">
              ${stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      `;

      // Add navigation methods
      stepElement.showNextStep = () => {
        showStep(stepIndex + 1);
      };
      
      stepElement.showPreviousStep = () => {
        showStep(Math.max(0, stepIndex - 1));
      };

      stepElement.style.backgroundColor = 'white';
      stepElement.style.padding = '20px';
      stepElement.style.borderRadius = '10px';
      stepElement.style.maxWidth = '500px';
      stepElement.style.maxHeight = '300px';
      stepElement.style.overflowY = 'auto';

      tourElement.appendChild(stepElement);
    };

    // Add navigation methods to tour
    tourElement.showNextStep = () => {
      showStep(currentStep + 1);
      currentStep++;
    };
    
    tourElement.showPreviousStep = () => {
      showStep(Math.max(0, currentStep - 1));
      currentStep--;
    };

    document.body.appendChild(tourElement);
    showStep(0);

    return tourElement;
  }

  /**
   * Generate dynamic labels based on knowledge level
   */
  generateDynamicLabel(elementId, baseLabel) {
    const knowledgeLevel = knowledgeInference.inferKnowledgeLevel();
    const explanation = this.getContextualExplanation(elementId, knowledgeLevel);
    
    // Return a simplified label for beginners, more detailed for advanced users
    switch (knowledgeLevel) {
      case 'beginner':
        return explanation.title || baseLabel;
      case 'intermediate':
        return `${baseLabel}: ${explanation.content.substring(0, 40)}...`;
      case 'advanced':
        return `${baseLabel} (${explanation.related ? explanation.related.join(', ') : ''})`;
      default:
        return baseLabel;
    }
  }

  /**
   * Create accessibility features
   */
  enableAccessibilityFeatures() {
    // Add aria labels and descriptions based on knowledge level
    document.querySelectorAll('[data-educational-element]').forEach(element => {
      const elementId = element.getAttribute('data-educational-element');
      const explanation = this.getContextualExplanation(elementId);
      
      // Add ARIA label
      element.setAttribute('aria-label', explanation.title);
      
      // Add ARIA description for screen readers
      const descId = `desc-${elementId}`;
      element.setAttribute('aria-describedby', descId);
      
      // Create description element if it doesn't exist
      let descElement = document.getElementById(descId);
      if (!descElement) {
        descElement = document.createElement('div');
        descElement.id = descId;
        descElement.className = 'sr-only'; // Screen reader only
        descElement.innerHTML = explanation.fullContent;
        document.body.appendChild(descElement);
      } else {
        descElement.innerHTML = explanation.fullContent;
      }
    });
  }

  /**
   * Get educational recommendations based on viewer state
   */
  getEducationalRecommendations() {
    const analytics = useUiStore.getState().getViewerAnalytics();
    if (!analytics) return [];

    const recommendations = [];
    const knowledgeLevel = knowledgeInference.inferKnowledgeLevel();
    const knowledgeAreas = knowledgeInference.inferKnowledgeAreas();

    // Recommend concepts based on what the user hasn't focused on
    const unfocusedConcepts = knowledgeInference.getUnfocusedConcepts(analytics);
    recommendations.push(...unfocusedConcepts.map(concept => ({
      type: 'concept',
      target: concept,
      reason: 'This concept appears relevant but you haven\'t focused on it much',
      priority: 'medium'
    })));

    // Suggest panel explanations based on usage patterns
    Object.keys(analytics.engagement.panelFocusTime).forEach(panelId => {
      if (analytics.engagement.panelFocusTime[panelId] < 10000) { // Less than 10 seconds
        recommendations.push({
          type: 'panel-explanation',
          target: panelId,
          reason: 'You\'ve spent less time on this panel, would you like an explanation?',
          priority: 'low'
        });
      }
    });

    // Suggest specific learning paths based on inferred knowledge areas
    Object.entries(knowledgeAreas).forEach(([area, level]) => {
      if (level === 'low') {
        recommendations.push({
          type: 'learning-path',
          target: area,
          reason: `Your knowledge in ${area} appears to need development`,
          priority: 'high'
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Update accessibility settings
   */
  setAccessibilitySettings(settings) {
    this.accessibilityFeatures = { ...this.accessibilityFeatures, ...settings };
    
    // Apply settings to the UI
    if (this.accessibilityFeatures.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    
    if (this.accessibilityFeatures.largeText) {
      document.body.classList.add('large-text');
    } else {
      document.body.classList.remove('large-text');
    }
  }

  /**
   * Get the content database
   */
  getContentDatabase() {
    return this.contentDatabase;
  }

  /**
   * Add custom content to the database
   */
  addCustomContent(category, key, content) {
    if (!this.contentDatabase[category]) {
      this.contentDatabase[category] = {};
    }
    
    this.contentDatabase[category][key] = content;
  }
}

// Create a singleton instance
const educationalContent = new EducationalContent();

// Export both the class and instance
export { EducationalContent };
export default educationalContent;