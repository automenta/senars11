import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { setupWSConnection } from '@y/websocket-server/utils';

const wss = new WebSocketServer({ noServer: true });

// This map stores Y.Doc instances, keyed by the room name.
const docs = new Map();

const getDoc = (roomname) => {
    if (!docs.has(roomname)) {
        const doc = new Y.Doc();
        docs.set(roomname, doc);
    }
    return docs.get(roomname);
};

wss.on('connection', (ws, req) => {
    // NOTE: The room name is expected to be in the URL query string.
    // For example: ws://localhost:1234?room=my-roomname
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomname = url.searchParams.get('room') || 'default-room';

    const doc = getDoc(roomname);
    setupWSConnection(ws, req, { doc });
});

export function startSyncServer(server) {
    server.on('upgrade', (request, socket, head) => {
        // Handle authentication here if needed.

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });

    console.log('Y.js sync server started');
    return wss;
}

export function getSharedDoc(roomname = 'default-room') {
    return getDoc(roomname);
}
