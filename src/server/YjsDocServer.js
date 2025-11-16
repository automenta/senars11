import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { createMutex } from 'lib0/mutex';

/**
 * YjsDocServer - Standard Yjs WebSocket server implementation
 * This creates a proper WebSocket server that handles Yjs document synchronization
 */
class YjsDocServer {
  constructor(options = {}) {
    this.options = {
      port: options.port || 1234,
      host: options.host || 'localhost',
      documentId: options.documentId || 'senars-document'
    };

    // Document storage
    this.documents = new Map();
    this.conns = new Map(); // Map<websocket, Set<Y.Doc>>
    this.awareness = new Map(); // Map<docName, Awareness>
    this.muxs = new Map(); // Mutex for document access

    // Create WebSocket server
    this.wss = new WebSocketServer({ port: this.options.port, host: this.options.host });

    this.wss.on('connection', (conn, req) => {
      // Extract document name from URL path
      const docName = req.url.slice(1) || this.options.documentId;
      
      // Get or create document
      let doc = this.documents.get(docName);
      if (!doc) {
        doc = new Y.Doc({ gc: true });
        this.documents.set(docName, doc);
        
        // Initialize shared types
        doc.getMap('tasks');
        doc.getMap('concepts');
        doc.getMap('systemMetrics');
        doc.getArray('cycles');
        doc.getArray('reasoningSteps');
        doc.getArray('notifications');
        
        this.muxs.set(docName, createMutex());
      }

      // Get or create awareness instance
      let docAwareness = this.awareness.get(docName);
      if (!docAwareness) {
        docAwareness = new awarenessProtocol.Awareness(doc);
        this.awareness.set(docName, docAwareness);
      }

      // Add connection to tracking
      if (!this.conns.has(conn)) {
        this.conns.set(conn, new Set());
      }
      this.conns.get(conn).add(doc);

      // Setup connection handlers
      this.setupConnection(conn, doc, docName, docAwareness);

      // Send current document state
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep1);
      syncProtocol.writeSyncStep1(encoder, doc);
      if (encoding.length(encoder) > 1) {
        conn.send(encoding.toUint8Array(encoder));
      }
    });

    console.log(`YjsDocServer started on ws://${this.options.host}:${this.options.port}`);
    console.log(`Default document ID: ${this.options.documentId}`);
  }

  /**
   * Setup connection handlers for document synchronization
   */
  setupConnection(conn, doc, docName, awareness) {
    // Send awareness updates to this client
    const awarenessChangeHandler = ({ added, updated, removed }, origin) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, awarenessProtocol.messageAwareness);
      awarenessProtocol.writeAwarenessUpdate(encoder, awareness, changedClients);
      try {
        conn.send(encoding.toUint8Array(encoder));
      } catch (e) {}
    };
    
    // Listen to awareness changes
    awareness.on('change', awarenessChangeHandler);

    // Handle document updates
    const docUpdateHandler = (update, origin) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, syncProtocol.messageYjsUpdate);
      syncProtocol.writeUpdate(encoder, update);
      try {
        conn.send(encoding.toUint8Array(encoder));
      } catch (e) {}
    };
    
    doc.on('update', docUpdateHandler);

    // Handle messages from client
    conn.on('message', (message) => {
      try {
        const decoder = decoding.createDecoder(new Uint8Array(message));
        const encoder = encoding.createEncoder();
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case syncProtocol.messageYjsSyncStep1:
          case syncProtocol.messageYjsSyncStep2:
            syncProtocol.readSyncMessage(decoder, encoder, doc, null);
            if (encoding.length(encoder) > 1) {
              conn.send(encoding.toUint8Array(encoder));
            }
            break;
          case awarenessProtocol.messageAwareness:
            awarenessProtocol.readAwarenessUpdate(decoder, awareness, conn);
            break;
          default:
            console.warn('YjsDocServer: Unexpected message type:', messageType);
        }
      } catch (err) {
        console.error('YjsDocServer: Error processing message:', err);
      }
    });

    // Cleanup on connection close
    conn.on('close', () => {
      awareness.off('change', awarenessChangeHandler);
      doc.off('update', docUpdateHandler);
      
      if (this.conns.has(conn)) {
        this.conns.get(conn).delete(doc);
        if (this.conns.get(conn).size === 0) {
          this.conns.delete(conn);
        }
      }
    });
  }

  /**
   * Update a document from server-side (e.g., from NAR events)
   */
  updateDocument(documentName, updateFunction) {
    let doc = this.documents.get(documentName);
    if (!doc) {
      // Create document if it doesn't exist
      doc = new Y.Doc({ gc: true });
      this.documents.set(documentName, doc);
      
      // Initialize shared types
      doc.getMap('tasks');
      doc.getMap('concepts');
      doc.getMap('systemMetrics');
      doc.getArray('cycles');
      doc.getArray('reasoningSteps');
      doc.getArray('notifications');
      
      this.muxs.set(documentName, createMutex());
    }
    
    const mux = this.muxs.get(documentName);
    if (mux) {
      mux(() => {
        doc.transact(() => {
          updateFunction(doc);
        });
      });
    } else {
      doc.transact(() => {
        updateFunction(doc);
      });
    }
  }

  /**
   * Get a document by name
   */
  getDocument(documentName) {
    return this.documents.get(documentName);
  }

  /**
   * Get document names
   */
  getDocumentNames() {
    return Array.from(this.documents.keys());
  }

  /**
   * Close the server
   */
  close() {
    this.wss.close(() => {
      // Destroy all documents
      this.documents.forEach(doc => doc.destroy());
    });
  }
}

export { YjsDocServer };