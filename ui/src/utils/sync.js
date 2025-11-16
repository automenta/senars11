import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const host = import.meta.env.VITE_WS_HOST || 'localhost';
const port = import.meta.env.VITE_SYNC_PORT || 8081;
const room = 'my-roomname'; // Or make this dynamic if needed

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(`ws://${host}:${port}`, room, ydoc);

export const getSharedDoc = () => ydoc;
export const getProvider = () => provider;
