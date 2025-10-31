/**
 * Knowledge Inference Model
 * Determines viewer's knowledge level based on interaction patterns
 */

import useUiStore from '../stores/uiStore.js';

class KnowledgeInference {
  constructor() {
    this.knowledgeLevelThresholds = {
      beginner: {
        minInteractions: 0,
        maxInteractions: 50,
        minPanelTime: 0, // ms
        maxPanelTime: 30000, // 30 seconds
        minDemoCompletions: 0,
        maxDemoCompletions: 2,
        conceptFocusPattern: 'frequent-short'
      },
      intermediate: {
        minInteractions: 50,
        maxInteractions: 200,
        minPanelTime: 30000, // 30 seconds
        maxPanelTime: 120000, // 2 minutes
        minDemoCompletions: 2,
        maxDemoCompletions: 5,
        conceptFocusPattern: 'moderate-duration'
      },
      advanced: {
        minInteractions: 200,
        maxInteractions: 500,
        minPanelTime: 120000, // 2 minutes
        maxPanelTime: 300000, // 5 minutes
        minDemoCompletions: 5,
        maxDemoCompletions: 10,
        conceptFocusPattern: 'extended-focus'
      },
      expert: {
        minInteractions: 500,
        maxInteractions: Infinity,
        minPanelTime: 300000, // 5 minutes+
        maxPanelTime: Infinity,
        minDemoCompletions: 10,
        maxDemoCompletions: Infinity,
        conceptFocusPattern: 'deep-dive'
      }
    };
  }

  /**
   * Infer knowledge level based on current viewer state
   */
  inferKnowledgeLevel() {
    const analytics = this.getAnalytics();
    if (!analytics) return 'unknown';

    const { engagement } = analytics;
    const { totalInteractions, focusedPanels, focusedConcepts } = engagement;

    // Calculate various metrics for knowledge inference
    const panelTimeMetrics = this.calculatePanelTimeMetrics(analytics);
    const conceptFocusMetrics = this.calculateConceptFocusMetrics(analytics);
    const navigationMetrics = this.calculateNavigationMetrics(analytics);

    // Weighted scoring system
    const interactionScore = this.calculateInteractionScore(totalInteractions);
    const panelTimeScore = this.calculatePanelTimeScore(panelTimeMetrics);
    const conceptFocusScore = this.calculateConceptFocusScore(conceptFocusMetrics);
    const navigationScore = this.calculateNavigationScore(navigationMetrics);

    // Calculate aggregate score
    const aggregateScore = (
      interactionScore * 0.25 +
      panelTimeScore * 0.25 +
      conceptFocusScore * 0.25 +
      navigationScore * 0.25
    );

    // Determine knowledge level based on aggregate score
    if (aggregateScore < 0.3) return 'beginner';
    if (aggregateScore < 0.5) return 'intermediate';
    if (aggregateScore < 0.8) return 'advanced';
    return 'expert';
  }

  /**
   * Calculate metrics for panel time analysis
   */
  calculatePanelTimeMetrics(analytics) {
    const { engagement } = analytics;
    if (!engagement.focusedPanels || engagement.focusedPanels.length === 0) {
      return {
        totalFocusTime: 0,
        averageFocusTime: 0,
        uniquePanels: 0
      };
    }

    const totalFocusTime = engagement.focusedPanels.reduce((sum, [, time]) => sum + time, 0);
    const uniquePanels = engagement.focusedPanels.length;

    return {
      totalFocusTime,
      averageFocusTime: totalFocusTime / uniquePanels,
      uniquePanels
    };
  }

  /**
   * Calculate metrics for concept focus analysis
   */
  calculateConceptFocusMetrics(analytics) {
    const { engagement } = analytics;
    if (!engagement.focusedConcepts || engagement.focusedConcepts.length === 0) {
      return {
        totalFocusTime: 0,
        averageFocusTime: 0,
        uniqueConcepts: 0
      };
    }

    const totalFocusTime = engagement.focusedConcepts.reduce((sum, [, time]) => sum + time, 0);
    const uniqueConcepts = engagement.focusedConcepts.length;

    return {
      totalFocusTime,
      averageFocusTime: totalFocusTime / uniqueConcepts,
      uniqueConcepts
    };
  }

  /**
   * Calculate navigation metrics
   */
  calculateNavigationMetrics(analytics) {
    const { session } = analytics;
    const navigationPath = session.navigationPath || [];
    
    // Count panel switches
    const panelSwitches = navigationPath.filter(item => 
      item.type === 'panelView' || 
      item.details?.element?.includes('Panel')
    ).length;
    
    // Count demo starts
    const demoStarts = navigationPath.filter(item => 
      item.type === 'demoStart'
    ).length;
    
    // Calculate navigation speed (time between interactions)
    let avgTimeBetweenInteractions = 0;
    if (navigationPath.length > 1) {
      let totalDiff = 0;
      for (let i = 1; i < navigationPath.length; i++) {
        totalDiff += navigationPath[i].timestamp - navigationPath[i-1].timestamp;
      }
      avgTimeBetweenInteractions = totalDiff / (navigationPath.length - 1);
    }

    return {
      panelSwitches,
      demoStarts,
      avgTimeBetweenInteractions,
      totalNavigationEvents: navigationPath.length
    };
  }

  /**
   * Calculate interaction score (0-1)
   */
  calculateInteractionScore(totalInteractions) {
    // Normalize based on logarithmic scale for better distribution
    return Math.min(1, Math.log(totalInteractions + 1) / Math.log(1000));
  }

  /**
   * Calculate panel time score (0-1)
   */
  calculatePanelTimeScore(metrics) {
    if (metrics.averageFocusTime === 0) return 0;
    
    // Higher average time indicates deeper knowledge
    return Math.min(1, Math.log(metrics.averageFocusTime / 1000 + 1) / Math.log(300)); // 300 = log(300k ms / 1000)
  }

  /**
   * Calculate concept focus score (0-1)
   */
  calculateConceptFocusScore(metrics) {
    if (metrics.averageFocusTime === 0) return 0;
    
    // More unique concepts and longer focus times indicate higher knowledge
    const conceptDiversity = Math.min(1, Math.log(metrics.uniqueConcepts + 1) / Math.log(50));
    const focusDepth = Math.min(1, Math.log(metrics.averageFocusTime / 1000 + 1) / Math.log(300));
    
    return (conceptDiversity + focusDepth) / 2;
  }

  /**
   * Calculate navigation score (0-1)
   */
  calculateNavigationScore(metrics) {
    if (metrics.totalNavigationEvents === 0) return 0;
    
    // Faster navigation (shorter time between interactions) indicates expertise
    if (metrics.avgTimeBetweenInteractions === 0) return 1;
    
    // Invert the time: shorter time = higher score
    const speedScore = Math.max(0, 1 - (Math.log(metrics.avgTimeBetweenInteractions) / Math.log(10000)));
    
    // Panel switches: moderate amount indicates exploration without confusion
    const panelSwitchScore = Math.min(1, (metrics.panelSwitches / Math.max(1, metrics.totalNavigationEvents)) * 2);
    
    return (speedScore * 0.7 + panelSwitchScore * 0.3);
  }

  /**
   * Get analytics data from store
   */
  getAnalytics() {
    const getAnalyticsFn = useUiStore.getState().getViewerAnalytics;
    return getAnalyticsFn ? getAnalyticsFn() : null;
  }

  /**
   * Update knowledge level in the store
   */
  updateKnowledgeLevel() {
    const knowledgeLevel = this.inferKnowledgeLevel();
    const updateKnowledgeLevelFn = useUiStore.getState().updateKnowledgeLevel;
    
    if (updateKnowledgeLevelFn) {
      updateKnowledgeLevelFn(knowledgeLevel);
      return knowledgeLevel;
    }
    
    return 'unknown';
  }

  /**
   * Get recommendations based on knowledge level
   */
  getRecommendations() {
    const knowledgeLevel = this.inferKnowledgeLevel();
    const analytics = this.getAnalytics();
    
    const recommendations = {
      knowledgeLevel,
      demoRecommendations: [],
      conceptRecommendations: [],
      learningPath: []
    };

    switch (knowledgeLevel) {
      case 'beginner':
        recommendations.demoRecommendations = [
          'Getting Started with NARS',
          'Basic Reasoning Concepts',
          'Simple Inference Chains'
        ];
        recommendations.learningPath = [
          'Start with basic demos',
          'Focus on understanding core concepts',
          'Spend time on visualization panels'
        ];
        break;
        
      case 'intermediate':
        recommendations.demoRecommendations = [
          'Advanced Reasoning Patterns',
          'Priority Dynamics',
          'Concept Formation'
        ];
        recommendations.learningPath = [
          'Explore multi-step reasoning',
          'Analyze priority fluctuations',
          'Observe concept evolution'
        ];
        break;
        
      case 'advanced':
        recommendations.demoRecommendations = [
          'Self-Modification Processes',
          'Complex Derivations',
          'Reasoning Meta-Cycles'
        ];
        recommendations.learningPath = [
          'Investigate system internals',
          'Focus on meta-reasoning',
          'Explore advanced parameter tuning'
        ];
        break;
        
      case 'expert':
        recommendations.demoRecommendations = [
          'Custom Rule Development',
          'Performance Optimization',
          'System Architecture Deep Dive'
        ];
        recommendations.learningPath = [
          'Customize system behavior',
          'Develop new components',
          'Optimize for specific tasks'
        ];
        break;
    }

    // Add concept recommendations based on focus patterns
    if (analytics && analytics.engagement) {
      const unfocusedConcepts = this.getUnfocusedConcepts(analytics);
      recommendations.conceptRecommendations = unfocusedConcepts.slice(0, 3);
    }

    return recommendations;
  }

  /**
   * Get concepts user hasn't focused on much
   */
  getUnfocusedConcepts(analytics) {
    // This would implement logic to identify concepts the user hasn't spent much time on
    // For now, we'll return a placeholder
    return [
      'Inheritance Relations',
      'Similarity Relations', 
      'Temporal Reasoning',
      'Goal-Directed Reasoning'
    ];
  }

  /**
   * Get learning pace recommendations
   */
  getLearningPace() {
    const analytics = this.getAnalytics();
    if (!analytics) return 'moderate';

    const navigationMetrics = this.calculateNavigationMetrics(analytics);
    
    if (navigationMetrics.avgTimeBetweenInteractions < 2000) {
      return 'fast'; // Quick navigation suggests experienced user
    } else if (navigationMetrics.avgTimeBetweenInteractions > 10000) {
      return 'slow'; // Slow navigation suggests learning user
    }
    
    return 'moderate';
  }

  /**
   * Infer specific knowledge areas
   */
  inferKnowledgeAreas() {
    const analytics = this.getAnalytics();
    if (!analytics) return {};

    const knowledgeAreas = {
      reasoning: 'unknown',
      concepts: 'unknown',
      tasks: 'unknown',
      priority: 'unknown',
      demos: 'unknown'
    };

    const panelTimeMetrics = this.calculatePanelTimeMetrics(analytics);
    const navigationMetrics = this.calculateNavigationMetrics(analytics);

    // Infer reasoning knowledge from time spent on reasoning-related panels
    const reasoningPanels = ['ReasoningTracePanel', 'TaskPanel', 'DerivationPanel'];
    const reasoningTime = analytics.engagement.focusedPanels
      .filter(([panelId]) => reasoningPanels.some(rp => panelId.includes(rp)))
      .reduce((sum, [, time]) => sum + time, 0);

    const totalPanelTime = panelTimeMetrics.totalFocusTime;
    const reasoningPercentage = totalPanelTime > 0 ? reasoningTime / totalPanelTime : 0;

    if (reasoningPercentage > 0.3) knowledgeAreas.reasoning = 'high';
    else if (reasoningPercentage > 0.1) knowledgeAreas.reasoning = 'medium';
    else knowledgeAreas.reasoning = 'low';

    // Similar logic for other areas...
    knowledgeAreas.demos = navigationMetrics.demoStarts > 5 ? 'high' : 
                          navigationMetrics.demoStarts > 2 ? 'medium' : 'low';

    return knowledgeAreas;
  }
}

// Create a singleton instance
const knowledgeInference = new KnowledgeInference();

// Export both the class and instance
export { KnowledgeInference };
export default knowledgeInference;