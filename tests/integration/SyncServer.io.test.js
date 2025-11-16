import { NAR } from '../../src/nar/NAR.js';
import { startSyncServer, getSharedDoc } from '../../src/server/SyncServer.js';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import http from 'http';
import ws from 'ws';

jest.setTimeout(30000);

describe('SyncServer I/O', () => {
    let nar;
    let httpServer;
    let syncServer;
    let clientDoc;
    let provider;

    beforeEach(async () => {
        nar = new NAR();
        await nar.initialize();

        httpServer = http.createServer();
        syncServer = startSyncServer(httpServer);

        await new Promise(resolve => httpServer.listen(0, resolve));

        const port = httpServer.address().port;

        clientDoc = new Y.Doc();
        provider = new WebsocketProvider(`ws://localhost:${port}`, 'test-room', clientDoc, { WebSocketPolyfill: ws });

        await new Promise(resolve => provider.on('sync', resolve));
    });

    afterEach(() => {
        provider.disconnect();
        httpServer.close();
        nar.stop();
    });

    it('should sync NAR state to a client after Narsese input', async () => {
        const concepts = clientDoc.getMap('concepts');
        let conceptAdded = false;

        concepts.observe(event => {
            if (concepts.has('cat')) {
                conceptAdded = true;
            }
        });

        await nar.input('<cat --> animal>.');

        // Wait for the event to be processed
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(conceptAdded).toBe(true);

        const catConcept = concepts.get('cat');
        expect(catConcept).toBeDefined();

        const tasks = catConcept.get('tasks');
        expect(tasks.length).toBe(1);

        const task = tasks.toArray()[0][0];
        expect(task.term).toBe('<cat --> animal>');
    });
});
