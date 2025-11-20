// Setup file to handle WebSocket properly for Puppeteer tests
// This ensures that Puppeteer can use ws internally while tests can handle browser WebSockets

// Mock the ws module specifically for browser context without breaking Puppeteer functionality
// This is needed because Puppeteer uses ws internally for CDP communication
process.env.JEST_USE_NODE_WS = 'true';