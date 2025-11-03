import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react()],
        define: {
            'process.env': JSON.stringify({
                VITE_TEST_MODE: env.VITE_TEST_MODE
            })
        }
    };
})