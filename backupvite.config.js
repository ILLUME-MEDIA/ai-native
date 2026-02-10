import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    server: {
        // Local development server (Vite)
        // Access via: http://127.0.0.1:5173
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        cors: true,
    },
    css: {
        preprocessorOptions: {
            scss: {
                quietDeps: true,
                silenceDeprecations: [
                    'import',
                    'strict-unary',
                    'global-builtin',
                    'color-functions',
                    'if-function',
                ],
            },
        },
    },
    plugins: [
        laravel({
            input: [
                'resources/js/app.jsx',
                'resources/js/Admin/main.jsx',
                'resources/js/Admin/assets/scss/app.scss',
            ],
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@admin': path.resolve(__dirname, 'resources/js/Admin'),
            '@': path.resolve(__dirname, 'resources/js'),
        },
    },
});
