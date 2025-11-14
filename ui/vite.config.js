import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react({
            jsxRuntime: 'classic',
            include: /\.(js|jsx)$/
        })],
        define: {
            'process.env': JSON.stringify({
                VITE_TEST_MODE: env.VITE_TEST_MODE,
                VITE_WS_HOST: env.VITE_WS_HOST || 'localhost',
                VITE_WS_PORT: env.VITE_WS_PORT || '8080',
                VITE_DEFAULT_LAYOUT: env.VITE_DEFAULT_LAYOUT || 'default'
            })
        },
        server: {
            open: '/', // Open the launcher by default
        },
    };
})