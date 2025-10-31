/**
 * Interaction Tracker for Viewer State
 * Tracks user interactions, mouse movements, and focus areas
 */

import useUiStore from '../stores/uiStore.js';

class InteractionTracker {
  constructor() {
    this.isTracking = false;
    this.mouseMoveThrottle = null;
    this.lastPosition = { x: 0, y: 0 };
    this.lastClickTime = 0;
    this.focusAreas = new Map(); // Track focus on different UI elements
  }

  /**
   * Initialize interaction tracking
   */
  initialize() {
    if (this.isTracking) return;
    
    // Initialize viewer state
    useUiStore.getState().initializeViewer();
    
    // Set up event listeners
    this.setupEventListeners();
    this.isTracking = true;
    
    console.log('Interaction tracking initialized');
  }

  /**
   * Set up global event listeners for tracking
   */
  setupEventListeners() {
    // Mouse movement tracking (throttled to reduce performance impact)
    document.addEventListener('mousemove', this.throttledMouseMove.bind(this), { passive: true });
    
    // Click tracking
    document.addEventListener('click', this.trackClick.bind(this), { passive: false });
    
    // Focus tracking
    document.addEventListener('focusin', this.trackFocus.bind(this), { passive: true });
    document.addEventListener('focusout', this.trackFocusOut.bind(this), { passive: true });
    
    // Hover tracking
    document.addEventListener('mouseover', this.trackHover.bind(this), { passive: true });
    
    // Panel visibility tracking
    document.addEventListener('visibilitychange', this.trackVisibilityChange.bind(this), { passive: true });
    
    // Scroll tracking
    document.addEventListener('scroll', this.throttledScroll.bind(this), { passive: true });
    
    // Window focus/blur tracking
    window.addEventListener('focus', this.trackWindowFocus.bind(this), { passive: true });
    window.addEventListener('blur', this.trackWindowBlur.bind(this), { passive: true });
  }

  /**
   * Throttled mouse movement tracking
   */
  throttledMouseMove(event) {
    // Throttle mouse movement to maximum 5 events per second
    if (this.mouseMoveThrottle) return;
    
    this.mouseMoveThrottle = setTimeout(() => {
      this.mouseMoveThrottle = null;
    }, 200); // 200ms = 5 events per second
    
    this.trackInteraction('mouseMove', {
      x: event.clientX,
      y: event.clientY,
      element: event.target.tagName,
      timestamp: Date.now()
    });
    
    this.lastPosition = { x: event.clientX, y: event.clientY };
  }

  /**
   * Track click events
   */
  trackClick(event) {
    const elementInfo = this.getElementInfo(event.target);
    const timeSinceLastClick = Date.now() - this.lastClickTime;
    this.lastClickTime = Date.now();
    
    this.trackInteraction('click', {
      element: elementInfo,
      position: { x: event.clientX, y: event.clientY },
      timeSinceLastClick,
      button: event.button
    });
  }

  /**
   * Track focus events
   */
  trackFocus(event) {
    const elementInfo = this.getElementInfo(event.target);
    
    this.trackInteraction('focus', {
      element: elementInfo
    });
    
    // Track focus area for engagement metrics
    if (elementInfo.id || elementInfo.className || elementInfo.tagName) {
      const areaKey = elementInfo.id || elementInfo.className || elementInfo.tagName;
      this.focusAreas.set(areaKey, Date.now());
    }
  }

  /**
   * Track focus out events
   */
  trackFocusOut(event) {
    const elementInfo = this.getElementInfo(event.target);
    
    if (elementInfo.id || elementInfo.className || elementInfo.tagName) {
      const areaKey = elementInfo.id || elementInfo.className || elementInfo.tagName;
      const startTime = this.focusAreas.get(areaKey);
      if (startTime) {
        const duration = Date.now() - startTime;
        
        this.trackInteraction('focusOut', {
          element: elementInfo,
          duration
        });
        
        // Update viewer engagement metrics
        this.updateViewerEngagementMetrics(areaKey, duration);
        this.focusAreas.delete(areaKey);
      }
    }
  }

  /**
   * Track hover events
   */
  trackHover(event) {
    const elementInfo = this.getElementInfo(event.target);
    
    this.trackInteraction('hover', {
      element: elementInfo,
      position: { x: event.clientX, y: event.clientY }
    });
  }

  /**
   * Track visibility changes
   */
  trackVisibilityChange() {
    this.trackInteraction('visibilityChange', {
      hidden: document.hidden,
      visibilityState: document.visibilityState
    });
  }

  /**
   * Throttled scroll tracking
   */
  throttledScroll(event) {
    if (this.scrollThrottle) return;
    
    this.scrollThrottle = setTimeout(() => {
      this.scrollThrottle = null;
    }, 100); // Throttle to 10 events per second
    
    this.trackInteraction('scroll', {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      target: event.target.tagName
    });
  }

  /**
   * Track window focus
   */
  trackWindowFocus() {
    this.trackInteraction('windowFocus', {});
  }

  /**
   * Track window blur
   */
  trackWindowBlur() {
    this.trackInteraction('windowBlur', {});
  }

  /**
   * Generic interaction tracker
   */
  trackInteraction(type, details) {
    const updateFn = useUiStore.getState().updateViewerInteraction;
    if (updateFn) {
      updateFn(type, details);
    }
  }

  /**
   * Update viewer engagement metrics based on focus time
   */
  updateViewerEngagementMetrics(areaKey, duration) {
    // Determine if this is a panel or concept based on the element
    if (areaKey.includes('Panel') || areaKey.includes('panel')) {
      // Update panel focus time
      this.trackInteraction('panelFocusTime', {
        panelId: areaKey,
        duration
      });
    } else if (areaKey.includes('concept') || areaKey.includes('Concept')) {
      // Update concept focus time
      this.trackInteraction('conceptFocusTime', {
        conceptId: areaKey,
        duration
      });
    }
  }

  /**
   * Get detailed information about an element
   */
  getElementInfo(element) {
    if (!element) return {};
    
    return {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent ? element.textContent.substring(0, 50) : '',
      rect: element.getBoundingClientRect ? element.getBoundingClientRect() : null,
      dataset: element.dataset || {},
      ariaLabel: element.getAttribute('aria-label'),
      title: element.getAttribute('title')
    };
  }

  /**
   * Track panel view
   */
  trackPanelView(panelId) {
    this.trackInteraction('panelView', {
      panelId,
      position: this.lastPosition
    });
  }

  /**
   * Track demo start
   */
  trackDemoStart(demoId) {
    this.trackInteraction('demoStart', {
      demoId,
      position: this.lastPosition
    });
  }

  /**
   * Track demo completion
   */
  trackDemoCompletion(demoId, completed) {
    const updateFn = useUiStore.getState().updateDemoCompletion;
    if (updateFn) {
      updateFn(demoId, completed);
    }
    
    this.trackInteraction('demoCompletion', {
      demoId,
      completed,
      timestamp: Date.now()
    });
  }

  /**
   * Track concept interaction
   */
  trackConceptInteraction(conceptId, action) {
    this.trackInteraction('conceptInteraction', {
      conceptId,
      action,
      position: this.lastPosition
    });
  }

  /**
   * Get current viewer analytics
   */
  getAnalytics() {
    const getAnalyticsFn = useUiStore.getState().getViewerAnalytics;
    return getAnalyticsFn ? getAnalyticsFn() : null;
  }

  /**
   * Stop tracking
   */
  stopTracking() {
    this.isTracking = false;
    console.log('Interaction tracking stopped');
  }

  /**
   * Reset tracking data
   */
  resetTracking() {
    // Add a function to clear interactions if needed
    console.log('Interaction tracking reset');
  }
}

// Create a singleton instance
const interactionTracker = new InteractionTracker();

// Export both the class and instance
export { InteractionTracker };
export default interactionTracker;