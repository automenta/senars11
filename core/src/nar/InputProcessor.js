import { BaseComponent } from '../util/BaseComponent.js';

export class InputProcessor extends BaseComponent {
    constructor(config = {}, components = {}) {
        super(config, 'InputProcessor');
        this.parser = components.parser;
        this.termFactory = components.termFactory;
        this.taskManager = components.taskManager;
    }

    processInput(input, params = {}) {
        if (!input) return null;

        let task = null;

        try {
            if (typeof input === 'string') {
                task = this._processStringInput(input, params);
            } else if (input.term || input.sentence) {
                task = this._processObjectInput(input, params);
            } else if (input.constructor && input.constructor.name === 'Task') {
                task = input;
            }

            return task;
        } catch (error) {
            this.logger.error('Error processing input:', error);
            return null;
        }
    }

    _processStringInput(input, params) {
        // Simple command check (if not handled by parser)
        if (input.startsWith('/')) {
            // This might be a system command, return special object or handle?
            // For now, assume parser handles Narsese, and we might have simple commands.
            // But NAR.js usually delegates to parser.
            // Let's assume parser.parse returns a Task or Sentence.
        }

        const parsed = this.parser.parse(input);
        if (!parsed) return null;

        return this.taskManager.createTask(parsed, params);
    }

    _processObjectInput(input, params) {
        // If it's already a sentence-like structure
        return this.taskManager.createTask(input, params);
    }
}
