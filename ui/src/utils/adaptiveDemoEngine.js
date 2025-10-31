/**
 * Adaptive Demo Engine
 * Selects and configures demos based on viewer state and interaction patterns
 */

import useUiStore from '../stores/uiStore.js';
import knowledgeInference from './knowledgeInference.js';
import interactionTracker from './interactionTracker.js';
import verificationSystem from './verificationSystem.js';

class AdaptiveDemoEngine {
  constructor() {
    this.demoCatalog = new Map(); // Stores available demos with metadata
    this.viewerPreferences = new Map(); // Stores per-viewer preferences
    this.demoRecommendations = []; // Stores current recommendations
    this.demoHistory = new Map(); // Stores per-viewer demo history
    this.adaptationRules = this.initializeAdaptationRules();
    this.isAdaptationActive = true;
  }

  /**
   * Initialize adaptation rules based on knowledge levels and preferences
   */
  initializeAdaptationRules() {
    return {
      knowledgeBased: {
        beginner: ['introductory', 'basic', 'guided'],
        intermediate: ['exploration', 'moderate', 'example-based'],
        advanced: ['complex', 'challenging', 'deep-dive'],
        expert: ['advanced', 'custom', 'research-focused']
      },
      engagementBased: {
        highInterest: ['interactive', 'hands-on', 'exploration'],
        lowInterest: ['simple', 'quick', 'highlight-reel'],
        focused: ['deep', 'detailed', 'comprehensive'],
        browsing: ['overview', 'quick', 'sample']
      },
      timeBased: {
        short: ['quick-demos', 'highlights', 'overview'],
        medium: ['comprehensive', 'balanced', 'moderate'],
        long: ['deep-exploration', 'complex', 'thorough']
      }
    };
  }

  /**
   * Set the available demos for adaptation
   */
  setDemoCatalog(demos) {
    demos.forEach(demo => {
      this.demoCatalog.set(demo.id, {
        ...demo,
        lastAccessed: null,
        accessCount: 0,
        completionRate: 0,
        averageDuration: null,
        difficulty: this.estimateDifficulty(demo)
      });
    });
  }

  /**
   * Estimate demo difficulty based on metadata
   */
  estimateDifficulty(demo) {
    // Default to medium difficulty if not specified
    if (demo.difficulty) return demo.difficulty;
    
    // Estimate based on description keywords
    const description = demo.description.toLowerCase();
    
    if (description.includes('intro') || description.includes('basic') || description.includes('simple')) {
      return 'beginner';
    } else if (description.includes('advanced') || description.includes('complex') || description.includes('expert')) {
      return 'advanced';
    } else if (description.includes('intermediate') || description.includes('moderate')) {
      return 'intermediate';
    }
    
    return 'intermediate'; // Default
  }

  /**
   * Get the next recommended demo based on viewer state
   */
  getNextDemo(viewerId = null) {
    if (!this.isAdaptationActive) {
      // Return first available demo if adaptation is disabled
      return Array.from(this.demoCatalog.values())[0] || null;
    }

    // Get viewer analytics
    const analytics = interactionTracker.getAnalytics();
    if (!analytics) {
      return Array.from(this.demoCatalog.values())[0] || null;
    }

    // Determine viewer's knowledge level
    const knowledgeLevel = knowledgeInference.inferKnowledgeLevel();
    
    // Get viewer's demo history
    const viewerHistory = this.demoHistory.get(viewerId) || [];
    
    // Get available demos that haven't been recently seen
    const availableDemos = Array.from(this.demoCatalog.values())
      .filter(demo => !viewerHistory.includes(demo.id) || 
                    (Date.now() - (demo.lastAccessed || 0)) > 24 * 60 * 60 * 1000); // 24 hours

    if (availableDemos.length === 0) {
      // If all demos have been seen recently, reset and shuffle
      return this.selectByKnowledgeLevel(knowledgeLevel, Array.from(this.demoCatalog.values()));
    }

    return this.selectByKnowledgeLevel(knowledgeLevel, availableDemos);
  }

  /**
   * Select demo based on knowledge level
   */
  selectByKnowledgeLevel(knowledgeLevel, availableDemos) {
    // Filter demos by knowledge level
    const matchingDemos = availableDemos.filter(demo => 
      demo.difficulty === knowledgeLevel || 
      this.adaptationRules.knowledgeBased[knowledgeLevel]?.includes(demo.category)
    );

    if (matchingDemos.length > 0) {
      // Randomly select from matching demos to avoid repetition
      return matchingDemos[Math.floor(Math.random() * matchingDemos.length)];
    }

    // If no exact match, find closest match
    const levelOrder = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentIndex = levelOrder.indexOf(knowledgeLevel);
    
    // Try lower difficulty first
    for (let i = currentIndex - 1; i >= 0; i--) {
      const lowerDemos = availableDemos.filter(demo => 
        demo.difficulty === levelOrder[i]
      );
      if (lowerDemos.length > 0) {
        return lowerDemos[0];
      }
    }
    
    // Try higher difficulty
    for (let i = currentIndex + 1; i < levelOrder.length; i++) {
      const higherDemos = availableDemos.filter(demo => 
        demo.difficulty === levelOrder[i]
      );
      if (higherDemos.length > 0) {
        return higherDemos[0];
      }
    }

    // Return first available if no match found
    return availableDemos[0];
  }

  /**
   * Adjust demo parameters based on viewer engagement
   */
  adaptDemoParameters(demoId, baseParams = {}) {
    const analytics = interactionTracker.getAnalytics();
    if (!analytics) return baseParams;

    const adaptedParams = { ...baseParams };

    // Adjust complexity based on knowledge level
    const knowledgeLevel = knowledgeInference.inferKnowledgeLevel();
    switch (knowledgeLevel) {
      case 'beginner':
        // Simplify parameters for beginners
        if (adaptedParams.complexity) adaptedParams.complexity = Math.max(1, adaptedParams.complexity * 0.5);
        if (adaptedParams.duration) adaptedParams.duration = Math.min(adaptedParams.duration, 30000); // 30s max
        if (adaptedParams.speed) adaptedParams.speed = Math.max(0.5, adaptedParams.speed * 0.7);
        break;
      case 'intermediate':
        // Moderate parameters
        if (adaptedParams.complexity) adaptedParams.complexity = Math.max(2, adaptedParams.complexity * 0.7);
        break;
      case 'advanced':
      case 'expert':
        // More complex parameters for experts
        if (adaptedParams.complexity) adaptedParams.complexity = Math.min(10, adaptedParams.complexity * 1.5);
        if (adaptedParams.duration) adaptedParams.duration = Math.max(adaptedParams.duration, 60000); // 1min min
        if (adaptedParams.speed) adaptedParams.speed = Math.min(2, adaptedParams.speed * 1.2);
        break;
    }

    // Adjust based on engagement metrics
    const engagement = analytics.engagement;
    if (engagement.totalInteractions > 100) {
      // More engaged users might appreciate more complex demos
      if (adaptedParams.complexity) adaptedParams.complexity = Math.min(10, adaptedParams.complexity * 1.1);
    }

    return adaptedParams;
  }

  /**
   * Adjust demo pace based on user consumption rate
   */
  adaptDemoPace(demoId) {
    const analytics = interactionTracker.getAnalytics();
    if (!analytics) return 'normal';

    const navigationMetrics = knowledgeInference.calculateNavigationMetrics(analytics);
    
    if (navigationMetrics.avgTimeBetweenInteractions < 2000) {
      return 'fast'; // User is moving quickly
    } else if (navigationMetrics.avgTimeBetweenInteractions > 10000) {
      return 'slow'; // User is spending more time
    }
    
    return 'normal';
  }

  /**
   * Generate personalized demo sequence
   */
  generatePersonalizedSequence(viewerId = null, count = 5) {
    const sequence = [];
    let availableDemos = Array.from(this.demoCatalog.values());
    
    for (let i = 0; i < count; i++) {
      const nextDemo = this.getNextDemo(viewerId);
      if (!nextDemo) break;
      
      sequence.push({
        ...nextDemo,
        adaptedParams: this.adaptDemoParameters(nextDemo.id, nextDemo.parameters || {}),
        suggestedPace: this.adaptDemoPace(nextDemo.id)
      });
      
      // Remove selected demo from available pool to avoid immediate repetition
      availableDemos = availableDemos.filter(d => d.id !== nextDemo.id);
    }
    
    return sequence;
  }

  /**
   * Track demo completion and update preferences
   */
  trackDemoCompletion(demoId, viewerId = null, success = true) {
    // Update demo statistics
    const demo = this.demoCatalog.get(demoId);
    if (demo) {
      demo.accessCount = (demo.accessCount || 0) + 1;
      demo.lastAccessed = Date.now();
      
      // Update completion rate
      const totalAttempts = demo.accessCount;
      const completions = success ? (demo.completions || 0) + 1 : (demo.completions || 0);
      demo.completionRate = completions / totalAttempts;
      demo.completions = completions;
    }

    // Update viewer history
    if (viewerId) {
      const history = this.demoHistory.get(viewerId) || [];
      history.push(demoId);
      this.demoHistory.set(viewerId, history);
      
      // Update viewer preferences based on what they completed successfully
      this.updateViewerPreferences(viewerId, demoId, success);
    }
  }

  /**
   * Update viewer preferences based on demo completion
   */
  updateViewerPreferences(viewerId, demoId, success) {
    const preferences = this.viewerPreferences.get(viewerId) || {};
    
    if (success) {
      // Increase preference for demo category/type if successful
      const demo = this.demoCatalog.get(demoId);
      if (demo) {
        const category = demo.category || 'general';
        preferences[category] = (preferences[category] || 0) + 1;
      }
    } else {
      // Decrease preference if not successful
      const demo = this.demoCatalog.get(demoId);
      if (demo) {
        const category = demo.category || 'general';
        preferences[category] = Math.max(0, (preferences[category] || 0) - 1);
      }
    }
    
    this.viewerPreferences.set(viewerId, preferences);
  }

  /**
   * Get recommendations based on viewer state
   */
  getRecommendations(viewerId = null) {
    const analytics = interactionTracker.getAnalytics();
    if (!analytics) return [];

    // Use knowledge inference to get recommendations
    const knowledgeRecs = knowledgeInference.getRecommendations();
    
    // Generate personalized sequence
    const sequence = this.generatePersonalizedSequence(viewerId, 3);
    
    return {
      ...knowledgeRecs,
      personalizedSequence: sequence,
      nextRecommended: sequence[0] || null
    };
  }

  /**
   * Switch demo based on engagement metrics
   */
  shouldSwitchDemo(demoId) {
    const analytics = interactionTracker.getAnalytics();
    if (!analytics) return false;

    const currentDemoState = useUiStore.getState().demoStates[demoId] || {};
    
    // Check if user is disengaged (no interaction for 30 seconds)
    if (analytics.currentSession.lastInteraction) {
      const timeSinceLastInteraction = Date.now() - analytics.currentSession.lastInteraction;
      if (timeSinceLastInteraction > 30000) { // 30 seconds
        return true;
      }
    }

    // Check if demo is taking too long relative to expected duration
    if (currentDemoState.startTime) {
      const elapsed = Date.now() - currentDemoState.startTime;
      const expectedDuration = currentDemoState.expectedDuration || 60000; // 1 minute default
      
      if (elapsed > expectedDuration * 2 && !currentDemoState.interactionDuringDemo) {
        // If demo is taking 2x expected time with no user interaction, switch
        return true;
      }
    }

    return false;
  }

  /**
   * Get real-time demo adaptation suggestions
   */
  getAdaptationSuggestions(demoId) {
    const suggestions = [];
    
    // Get current demo state
    const demoState = useUiStore.getState().demoStates[demoId];
    if (!demoState) return suggestions;

    // Get viewer analytics
    const analytics = interactionTracker.getAnalytics();
    if (!analytics) return suggestions;

    // Suggest pace adjustment based on engagement
    const currentPace = this.adaptDemoPace(demoId);
    if (currentPace === 'slow' && analytics.engagement.totalInteractions < 5) {
      suggestions.push({
        type: 'pace',
        action: 'speedUp',
        reason: 'Viewer seems disengaged, suggesting faster pace'
      });
    } else if (currentPace === 'fast' && analytics.engagement.focusedPanels.length < 3) {
      suggestions.push({
        type: 'pace',
        action: 'slowDown',
        reason: 'Viewer seems to need more time, suggesting slower pace'
      });
    }

    // Suggest content adjustment based on focus areas
    if (analytics.engagement.focusedConcepts.length > 5) {
      suggestions.push({
        type: 'content',
        action: 'deepDive',
        reason: 'Viewer showing interest in concepts, suggesting concept-focused demo'
      });
    }

    // Suggest demo switch if needed
    if (this.shouldSwitchDemo(demoId)) {
      suggestions.push({
        type: 'switch',
        action: 'suggestNewDemo',
        reason: 'Viewer engagement low, suggesting different demo'
      });
    }

    return suggestions;
  }

  /**
   * Enable/disable adaptation
   */
  setAdaptationEnabled(enabled) {
    this.isAdaptationActive = enabled;
  }

  /**
   * Get engine statistics
   */
  getEngineStats() {
    return {
      totalDemos: this.demoCatalog.size,
      totalViewers: this.viewerPreferences.size,
      adaptationEnabled: this.isAdaptationActive,
      totalRecommendations: this.demoRecommendations.length
    };
  }

  /**
   * Initialize the engine with available demos
   */
  async initialize() {
    // Get available demos from store
    const demos = useUiStore.getState().demos;
    if (demos && demos.length > 0) {
      this.setDemoCatalog(demos);
      console.log(`Adaptive Demo Engine initialized with ${demos.length} demos`);
    }

    // Set up periodic adaptation
    this.setupPeriodicAdaptation();
  }

  /**
   * Set up periodic adaptation checks
   */
  setupPeriodicAdaptation() {
    // Check for adaptation opportunities every 10 seconds
    setInterval(() => {
      if (!this.isAdaptationActive) return;

      // Update knowledge level
      const knowledgeLevel = knowledgeInference.updateKnowledgeLevel();
      
      // Update demo recommendations based on current state
      this.demoRecommendations = this.getRecommendations();
      
      // Update store with current recommendations
      useUiStore.getState().batchUpdate({
        demoRecommendations: this.demoRecommendations,
        currentKnowledgeLevel: knowledgeLevel
      });
    }, 10000); // Every 10 seconds
  }
}

// Create a singleton instance
const adaptiveDemoEngine = new AdaptiveDemoEngine();

// Export both the class and instance
export { AdaptiveDemoEngine };
export default adaptiveDemoEngine;