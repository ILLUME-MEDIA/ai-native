import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    server: {
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
