## Client → Server

{ sessionId: "main", type: "input", payload: { text: "<a --> b>." } }
{ sessionId: "agent1", type: "control/start", payload: {} }

## Server → Client

{ sessionId: "main", type: "output", payload: { lines: [ { text: "...", punctuation: "." } ] } }
{ sessionId: "agent1", type: "status", payload: { cycles: 42, memory: "1.2MB" } }