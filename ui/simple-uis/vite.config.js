import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3001, // Use a different port to avoid conflicts
        open: true, // Open browser automatically
    },
    build: {
        outDir: 'dist-simple', // Separate build directory
    },
    resolve: {
        alias: {
            // Map the import paths to the correct source files
            './src/stores/uiStore': './src/stores/uiStore.js',
            '../src/stores/uiStore': './src/stores/uiStore.js',
            '../../src/stores/uiStore': './src/stores/uiStore.js',
            './src/utils/websocket': './src/utils/websocket.js',
            '../src/utils/websocket': './src/utils/websocket.js',
            '../../src/utils/websocket': './src/utils/websocket.js',
        },
    },
});
