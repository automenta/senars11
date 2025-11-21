import {SessionEngine} from './src/session/SessionEngine.js';

try {
    const engine = new SessionEngine();
    console.log('✅ SessionEngine imported and instantiated successfully.');
    process.exit(0);
} catch (e) {
    console.error('❌ Failed:', e);
    process.exit(1);
}
