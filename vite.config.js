import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    server: {
        // Local development server (Vite)
        // Access via: http://127.0.0.1:5173 or http://localhost:5173
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        // cors: true,
        // hmr: {
        //     host: 'localhost',
        // },
    },
    optimizeDeps: {
        // Keep deps scan light to reduce esbuild work on Windows
        force: false,
        entries: [],
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
    // Make esbuild work a bit lighter and avoid huge comment blocks
    esbuild: {
        legalComments: 'none',
    },
    // Build tuning to reduce memory pressure
    build: {
        // Use terser for minification instead of esbuild (more stable on big bundles)
        minify: 'terser',
        // Reasonable target so esbuild/terser don't over‑optimize for cutting‑edge syntax
        target: 'es2018',
        rollupOptions: {
            output: {
                // Manually split some heavy libraries into separate chunks
                manualChunks: {
                    monaco: ['monaco-editor', '@monaco-editor/react'],
                    fullcalendar: [
                        '@fullcalendar/core',
                        '@fullcalendar/daygrid',
                        '@fullcalendar/timegrid',
                        '@fullcalendar/interaction',
                        '@fullcalendar/list',
                        '@fullcalendar/react',
                    ],
                    charts: ['apexcharts', 'react-apexcharts', 'echarts', 'echarts-for-react', 'chart.js', 'react-chartjs-2'],
                },
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
