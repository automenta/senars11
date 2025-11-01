import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    prettier,
    {
        languageOptions: {
            globals: {
                browser: true,
                es2021: true,
                node: true,
                console: true,
                document: true,
                window: true,
                localStorage: true,
                setTimeout: true,
                clearTimeout: true,
                setInterval: true,
                clearInterval: true,
                WebSocket: true,
                React: true,
                zustand: true,
                performance: true,
                process: true
            },
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: false // We're not using JSX
                }
            }
        },
        plugins: {
            // Note: We don't include 'react' plugin here since it doesn't support flat config yet
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'warn', // Changed to warn to allow console messages
            'no-undef': 'error',
            'semi': ['error', 'always'],
            'quotes': ['error', 'single'],
            'indent': ['error', 2],
            'comma-dangle': ['error', 'only-multiline']
        }
    },
    {
        files: ['src/utils/consoleBridge.js', 'src/utils/websocket.js', 'src/schemas/messages.js'],
        rules: {
            'no-console': 'off' // Allow console statements in utility files where they are intentional
        }
    }
];