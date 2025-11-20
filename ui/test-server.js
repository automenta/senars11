// Test server for Playwright
import {spawn} from 'child_process';
import {setTimeout} from 'timers/promises';

// Start the mock backend server
// Using a separate file avoids shell escaping issues
const mockBackend = spawn('node', ['mock-backend.js'], {
    stdio: 'inherit',
    env: {
        ...process.env,
        WS_PORT: '8081'
    }
});

// Wait for mock backend to start
await setTimeout(2000);

// Start the UI server
const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: {
        ...process.env,
        HTTP_PORT: '8080',
        WS_PORT: '8081'
    }
});

// Keep the process alive
process.on('exit', () => {
    mockBackend.kill();
    server.kill();
});

process.on('SIGINT', () => {
    mockBackend.kill();
    server.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    mockBackend.kill();
    server.kill();
    process.exit(0);
});
