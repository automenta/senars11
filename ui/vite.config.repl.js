import {defineConfig, loadEnv} from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [], // No React plugin for REPL, since it's vanilla JavaScript
        define: {
            'process.env': JSON.stringify({
                VITE_TEST_MODE: env.VITE_TEST_MODE,
                VITE_WS_HOST: env.VITE_WS_HOST || 'localhost',
                VITE_WS_PORT: env.VITE_WS_PORT || '8080'
            })
        },
        server: {
            // Serve the repl directory as the root
            open: '/repl/', // Automatically open the REPL page
        },
        build: {
            outDir: 'dist-repl' // Output directory for REPL build
        }
    };
})