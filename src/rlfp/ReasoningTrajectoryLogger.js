/**
 * Logs the reasoning trajectory of the SeNARS agent.
 *
 * This component captures the internal state and decision-making process of the agent
 * at each step of a reasoning task. The logged data can be used for debugging,
 * analysis, and as input for the RLFP learner.
 */
class ReasoningTrajectoryLogger {
  constructor() {
    this.trajectory = [];
  }

  /**
   * Starts logging a new trajectory.
   */
  startTrajectory() {
    this.trajectory = [];
  }

  /**
   * Adds a new step to the current trajectory.
   * @param {object} step - The reasoning step to log.
   */
  logStep(step) {
    this.trajectory.push(step);
  }

  /**
   * Ends the current trajectory and returns it.
   * @returns {Array} The completed trajectory.
   */
  endTrajectory() {
    return this.trajectory;
  }
}

export { ReasoningTrajectoryLogger };
