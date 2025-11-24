import { spawn } from 'child_process';
import path from 'path';

export class ProcessDemoRunner {
    constructor() {
        this.process = null;
    }

    /**
     * Start a Node.js script as a child process
     * @param {string} scriptPath - Absolute path to the script
     * @param {function} onOutput - Callback for output (text, type)
     * @param {function} onExit - Callback for process exit (code)
     */
    start(scriptPath, onOutput, onExit) {
        if (this.process) {
            this.stop();
        }

        // Ensure we run from project root
        const cwd = process.cwd();

        this.process = spawn('node', [scriptPath], {
            cwd: cwd,
            env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '1' },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout.on('data', (data) => {
            const text = data.toString();
            // Try to parse lines if needed, but raw streaming is fine for now
            // We might want to strip ANSI codes if the UI doesn't support them,
            // but keeping them might be good if we add an ANSI parser to the UI.
            // For now, let's just send text.
            onOutput(text, 'info');
        });

        this.process.stderr.on('data', (data) => {
            onOutput(data.toString(), 'error');
        });

        this.process.on('close', (code) => {
            if (onExit) onExit(code);
            this.process = null;
        });

        this.process.on('error', (err) => {
            onOutput(`Failed to start process: ${err.message}`, 'error');
            if (onExit) onExit(1);
            this.process = null;
        });

        return true;
    }

    stop() {
        if (this.process) {
            // Kill the process and its children (if any)
            // On Windows this might need 'taskkill'
            this.process.kill();
            this.process = null;
        }
    }

    input(text) {
        if (this.process && this.process.stdin) {
            this.process.stdin.write(text + '\n');
        }
    }
}
