import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/e2e-tests/**',
            '**/.{idea,git,cache,output,temp}/**'
        ],
        environment: 'jsdom', // Simulate browser environment for React components
    },
});