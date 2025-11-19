import { Config } from '../config/Config.js';

/**
 * DemoManager handles demo sequences and execution
 */
export class DemoManager {
  constructor(commandProcessor, logger) {
    this.commandProcessor = commandProcessor;
    this.logger = logger;
    this.demoDelay = Config.getConstants().DEMO_DELAY;
    this.isRunning = false;
    
    // Define demo sequences
    this.demos = {
      inheritance: [
        '<{cat} --> animal>.',
        '<{lion} --> cat>.',
        '<lion --> animal>?',
        '5'
      ],
      similarity: [
        '<(bird & flyer) <-> (bat & flyer)>.',
        '<bird <-> flyer>?',
        '<bat <-> flyer>?'
      ],
      temporal: [
        '<(sky & dark) =/> (rain & likely)>.',
        '<(clouds & gathering) =/> (sky & dark)>.',
        '<clouds & gathering> ?'
      ]
    };
  }

  /**
   * Run a specific demo
   */
  runDemo(demoName) {
    if (!demoName) {
      this.logger.log('Please select a demo', 'warning', '⚠️');
      return false;
    }

    if (this.isRunning) {
      this.logger.log('Demo already running', 'warning', '⚠️');
      return false;
    }

    if (!this.demos[demoName]) {
      this.logger.log(`Unknown demo: ${demoName}`, 'error', '❌');
      return false;
    }

    this.isRunning = true;
    const commands = this.demos[demoName];
    
    this.logger.log(`Running ${demoName} demo`, 'info', '🎬');

    // Execute commands sequentially with delay
    commands.forEach((cmd, i) => {
      setTimeout(() => {
        this.commandProcessor.processCommand(cmd);
        
        // Mark demo as finished after the last command
        if (i === commands.length - 1) {
          setTimeout(() => {
            this.isRunning = false;
          }, this.demoDelay);
        }
      }, i * this.demoDelay);
    });

    return true;
  }

  /**
   * Get available demo names
   */
  getDemoNames() {
    return Object.keys(this.demos);
  }

  /**
   * Get demo description
   */
  getDemoDescription(demoName) {
    const descriptions = {
      inheritance: 'Demonstrates inheritance relationships in NARS',
      similarity: 'Shows similarity-based reasoning',
      temporal: 'Explores temporal inference capabilities'
    };
    
    return descriptions[demoName] || 'Demo description not available';
  }
}