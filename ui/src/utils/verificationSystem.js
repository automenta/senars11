/**
 * Automated Verification System
 * Validates demo integrity and system behavior during demonstrations
 */

import useUiStore from '../stores/uiStore.js';
import WebSocketService from './websocket.js';

class VerificationSystem {
  constructor() {
    this.verificationQueue = [];
    this.activeVerifications = new Map();
    this.verificationResults = new Map();
    this.checksumHistory = new Map();
    this.errorDetectionEnabled = true;
  }

  /**
   * Perform verification during demo
   */
  async verifyDemoState(demoId, expectedState, currentState) {
    const verificationId = `verify_${demoId}_${Date.now()}`;
    
    const verification = {
      id: verificationId,
      demoId,
      timestamp: Date.now(),
      expectedState,
      currentState,
      checks: [],
      status: 'pending',
      passed: false,
      errors: []
    };

    // Add basic state comparison
    verification.checks.push(await this.verifyStateIntegrity(expectedState, currentState));

    // Add checksum verification
    verification.checks.push(await this.verifyChecksums(currentState));

    // Add timing verification
    verification.checks.push(await this.verifyTimingConstraints(demoId, currentState));

    // Add data consistency verification
    verification.checks.push(await this.verifyDataConsistency(currentState));

    // Evaluate all checks
    verification.passed = verification.checks.every(check => check.passed);
    verification.status = verification.passed ? 'passed' : 'failed';
    
    if (!verification.passed) {
      verification.errors = verification.checks
        .filter(check => !check.passed)
        .map(check => check.error || `Check failed: ${check.name}`);
    }

    // Store result
    this.verificationResults.set(verificationId, verification);

    // Update demo metrics if available
    const updateDemoMetricsFn = useUiStore.getState().updateDemoMetrics;
    if (updateDemoMetricsFn) {
      updateDemoMetricsFn(demoId, {
        lastVerification: {
          id: verificationId,
          timestamp: Date.now(),
          passed: verification.passed,
          errorCount: verification.errors.length
        },
        totalVerifications: (updateDemoMetricsFn(demoId, {}).totalVerifications || 0) + 1,
        successfulVerifications: (updateDemoMetricsFn(demoId, {}).successfulVerifications || 0) + (verification.passed ? 1 : 0)
      });
    }

    return verification;
  }

  /**
   * Verify state integrity
   */
  async verifyStateIntegrity(expected, actual) {
    const check = {
      name: 'stateIntegrity',
      passed: true,
      details: {}
    };

    try {
      // Compare key properties
      if (expected.tasks && actual.tasks) {
        check.details.taskCount = {
          expected: expected.tasks.length,
          actual: actual.tasks.length,
          match: expected.tasks.length === actual.tasks.length
        };
        if (!check.details.taskCount.match) check.passed = false;
      }

      if (expected.concepts && actual.concepts) {
        check.details.conceptCount = {
          expected: expected.concepts.length,
          actual: actual.concepts.length,
          match: expected.concepts.length === actual.concepts.length
        };
        if (!check.details.conceptCount.match) check.passed = false;
      }

      if (expected.cycles && actual.cycles) {
        check.details.cycleCount = {
          expected: expected.cycles.length,
          actual: actual.cycles.length,
          match: expected.cycles.length === actual.cycles.length
        };
        if (!check.details.cycleCount.match) check.passed = false;
      }
      
      // Check for missing or extra keys
      const expectedKeys = Object.keys(expected).sort();
      const actualKeys = Object.keys(actual).sort();
      
      check.details.propertyMatch = {
        expected: expectedKeys,
        actual: actualKeys,
        match: JSON.stringify(expectedKeys) === JSON.stringify(actualKeys)
      };
      
      if (!check.details.propertyMatch.match) check.passed = false;
    } catch (error) {
      check.passed = false;
      check.error = `State integrity check failed: ${error.message}`;
    }

    return check;
  }

  /**
   * Verify checksums for data integrity
   */
  async verifyChecksums(state) {
    const check = {
      name: 'checksum',
      passed: true,
      details: {}
    };

    try {
      // Generate checksum for current state
      const currentStateChecksum = this.generateChecksum(state);
      const previousChecksum = this.checksumHistory.get('currentState');
      
      check.details.currentChecksum = currentStateChecksum;
      check.details.previousChecksum = previousChecksum;
      check.details.changed = previousChecksum !== currentStateChecksum;
      
      // Store the checksum for next verification
      this.checksumHistory.set('currentState', currentStateChecksum);
      
      // If this is not the first verification, check for expected changes
      if (previousChecksum && !check.details.changed) {
        check.warning = 'No state changes detected - this might indicate an issue with the demo';
      }
    } catch (error) {
      check.passed = false;
      check.error = `Checksum verification failed: ${error.message}`;
    }

    return check;
  }

  /**
   * Verify timing constraints
   */
  async verifyTimingConstraints(demoId, state) {
    const check = {
      name: 'timingConstraints',
      passed: true,
      details: {}
    };

    try {
      // Check if demo is taking too long
      const demoStartTime = this.getDemoStartTime(demoId);
      if (demoStartTime) {
        const elapsed = Date.now() - demoStartTime;
        check.details.elapsedTime = elapsed;
        
        // If demo runs more than 10x expected duration, flag as issue
        if (elapsed > 600000) { // 10 minutes
          check.warning = `Demo running longer than expected (${elapsed}ms)`;
        }
      }

      // Check for reasonable update frequency
      if (state.updateCount !== undefined) {
        const updatesPerSecond = state.updateCount / (check.details.elapsedTime / 1000);
        check.details.updatesPerSecond = updatesPerSecond;
        
        // Too few updates might indicate system is stuck
        if (updatesPerSecond < 0.1) {
          check.warning = `Very low update rate (${updatesPerSecond}/sec)`;
        }
      }
    } catch (error) {
      check.passed = false;
      check.error = `Timing verification failed: ${error.message}`;
    }

    return check;
  }

  /**
   * Verify data consistency
   */
  async verifyDataConsistency(state) {
    const check = {
      name: 'dataConsistency',
      passed: true,
      details: {}
    };

    try {
      // Check for valid data types and ranges
      if (state.tasks && Array.isArray(state.tasks)) {
        const invalidTasks = state.tasks.filter(task => 
          !task.id || typeof task.priority !== 'number' || task.priority < 0 || task.priority > 1
        );
        
        check.details.invalidTasks = invalidTasks.length;
        if (invalidTasks.length > 0) {
          check.passed = false;
          check.error = `Found ${invalidTasks.length} invalid tasks`;
        }
      }

      if (state.concepts && Array.isArray(state.concepts)) {
        const invalidConcepts = state.concepts.filter(concept => 
          !concept.term || typeof concept.priority !== 'number'
        );
        
        check.details.invalidConcepts = invalidConcepts.length;
        if (invalidConcepts.length > 0) {
          check.passed = false;
          check.error = `Found ${invalidConcepts.length} invalid concepts`;
        }
      }

      // Check for circular references or other data integrity issues
      if (state.derivations && Array.isArray(state.derivations)) {
        const suspiciousDerivations = state.derivations.filter(derivation => 
          derivation.preconditions && 
          Array.isArray(derivation.preconditions) && 
          derivation.preconditions.length > 10 // Arbitrary limit, might indicate an issue
        );
        
        check.details.suspiciousDerivations = suspiciousDerivations.length;
        if (suspiciousDerivations.length > 0) {
          check.warning = `Found ${suspiciousDerivations.length} derivations with many preconditions`;
        }
      }
    } catch (error) {
      check.passed = false;
      check.error = `Data consistency check failed: ${error.message}`;
    }

    return check;
  }

  /**
   * Detect anomalies in system behavior
   */
  detectSystemAnomalies(demoId, state) {
    const anomalies = [];

    // Check for priority explosions
    if (state.concepts && state.concepts.length > 0) {
      const highPriorityConcepts = state.concepts.filter(c => c.priority > 0.9);
      if (highPriorityConcepts.length / state.concepts.length > 0.8) {
        anomalies.push({
          type: 'priority-explosion',
          description: 'Unusually high proportion of high-priority concepts',
          severity: 'high'
        });
      }
    }

    // Check for task explosions
    if (state.tasks && state.tasks.length > 10000) { // Arbitrary threshold
      anomalies.push({
        type: 'task-explosion',
        description: 'Unusually high number of tasks in memory',
        severity: 'high'
      });
    }

    // Check for performance degradation
    if (state.performanceMetrics) {
      if (state.performanceMetrics.avgCycleTime > 100) { // ms
        anomalies.push({
          type: 'performance-degradation',
          description: 'Slow cycle processing time detected',
          severity: 'medium'
        });
      }
    }

    return anomalies;
  }

  /**
   * Generate checksum for state data
   */
  generateChecksum(data) {
    // Simple checksum implementation - in practice, you might want a more robust approach
    const str = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Get demo start time
   */
  getDemoStartTime(demoId) {
    // This would typically be stored in the store
    const state = useUiStore.getState();
    const demoState = state.demoStates[demoId];
    return demoState ? demoState.startTime : null;
  }

  /**
   * Report verification results
   */
  getVerificationReport(demoId) {
    const results = Array.from(this.verificationResults.values())
      .filter(v => v.demoId === demoId)
      .sort((a, b) => b.timestamp - a.timestamp);

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    return {
      demoId,
      totalVerifications: totalCount,
      passedVerifications: passedCount,
      successRate: totalCount > 0 ? (passedCount / totalCount) * 100 : 100,
      recentResults: results.slice(0, 10), // Last 10 verifications
      anomalies: this.detectSystemAnomalies(demoId, {})
    };
  }

  /**
   * Auto-recovery function for demo errors
   */
  async attemptRecovery(demoId, error) {
    const wsService = useUiStore.getState().wsService;
    
    if (!wsService) {
      console.error('No WebSocket service available for recovery');
      return false;
    }

    console.log(`Attempting recovery for demo ${demoId} after error:`, error);

    try {
      // Send recovery command to backend
      wsService.sendMessage({
        type: 'demoRecovery',
        payload: {
          demoId,
          error: error.message || error.toString(),
          recoveryStrategy: 'reset-state'
        }
      });

      return true;
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      return false;
    }
  }

  /**
   * Initialize verification for a demo
   */
  async startDemoVerification(demoId) {
    console.log(`Starting verification for demo: ${demoId}`);
    
    // Update demo state to indicate verification is active
    const updateDemoStateFn = useUiStore.getState().updateDemoState;
    if (updateDemoStateFn) {
      updateDemoStateFn(demoId, {
        verificationActive: true,
        verificationStartTime: Date.now(),
        verificationResults: []
      });
    }
  }

  /**
   * Complete verification for a demo
   */
  async completeDemoVerification(demoId, finalState) {
    console.log(`Completing verification for demo: ${demoId}`);
    
    // Perform final verification
    const finalVerification = await this.verifyDemoState(
      demoId, 
      {}, // Expected final state would be determined by demo type
      finalState
    );

    // Update demo metrics
    const updateDemoMetricsFn = useUiStore.getState().updateDemoMetrics;
    if (updateDemoMetricsFn) {
      updateDemoMetricsFn(demoId, {
        finalVerification: finalVerification,
        verificationComplete: true
      });
    }

    // Update demo state
    const updateDemoStateFn = useUiStore.getState().updateDemoState;
    if (updateDemoStateFn) {
      updateDemoStateFn(demoId, {
        verificationActive: false,
        verificationEndTime: Date.now()
      });
    }

    return finalVerification;
  }

  /**
   * Enable/disable error detection
   */
  setErrorDetection(enabled) {
    this.errorDetectionEnabled = enabled;
  }

  /**
   * Get verification statistics
   */
  getVerificationStats() {
    const results = Array.from(this.verificationResults.values());
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
      totalVerifications: results.length,
      passedVerifications: passed,
      failedVerifications: failed,
      successRate: results.length > 0 ? (passed / results.length) * 100 : 100
    };
  }
}

// Create a singleton instance
const verificationSystem = new VerificationSystem();

// Export both the class and instance
export { VerificationSystem };
export default verificationSystem;