import {expect, test as base} from '@playwright/test';
import {NarPage} from '../utils/NarPage.js';
import {spawn} from 'child_process';
import {setTimeout} from 'timers/promises';
import net from 'net';

// Helper to wait for port
async function waitForPort(port, timeout = 20000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            await new Promise((resolve, reject) => {
                const socket = new net.Socket();
                socket.setTimeout(500);
                socket.on('connect', () => {
                    socket.destroy();
                    resolve();
                });
                socket.on('timeout', () => {
                    socket.destroy();
                    reject(new Error('timeout'));
                });
                socket.on('error', (e) => {
                    socket.destroy();
                    reject(e);
                });
                socket.connect(port, 'localhost');
            });
            return true;
        } catch (e) {
            await setTimeout(200);
        }
    }
    throw new Error(`Timeout waiting for port ${port}`);
}

export const test = base.extend({
    realBackend: async ({}, use) => {
        console.log('🚀 Starting Real NAR backend...');
        const wsPort = 8201;
        const httpPort = 8202;

        // Use the new utility script
        const narProcess = spawn('node', ['tests/e2e/utils/start-backend.js'], {
            cwd: process.cwd(), // ui/
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                WS_PORT: wsPort.toString(),
                HTTP_PORT: httpPort.toString()
            }
        });

        narProcess.stdout.on('data', (d) => console.log(`[NAR]: ${d}`));
        narProcess.stderr.on('data', (d) => console.error(`[NAR ERR]: ${d}`));

        try {
            await waitForPort(wsPort, 20000);
        } catch (e) {
            console.error('Backend failed to start');
            narProcess.kill();
            throw e;
        }

        await use({wsPort, httpPort});

        narProcess.kill();
    },

    productionPage: async ({page, realBackend}, use) => {
        const uiPort = 8200;

        const uiProcess = spawn('node', ['server.js'], {
            cwd: process.cwd(), // ui/
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                HTTP_PORT: uiPort.toString(),
                WS_PORT: realBackend.wsPort.toString()
            }
        });

        uiProcess.stdout.on('data', (d) => console.log(`[UI]: ${d}`));
        uiProcess.stderr.on('data', (d) => console.error(`[UI ERR]: ${d}`));

        try {
            await waitForPort(uiPort, 20000);
        } catch (e) {
            console.error('UI Server failed to start');
            uiProcess.kill();
            throw e;
        }

        const narPage = new NarPage(page);
        await page.goto(`http://localhost:${uiPort}`);
        await narPage.waitForConnection();

        await use(narPage);

        uiProcess.kill();
    }
});

export {expect};
