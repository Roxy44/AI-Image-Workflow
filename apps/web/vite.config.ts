import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const API_PORT = 3001;

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.join(rootDir, 'src'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': `http://127.0.0.1:${API_PORT}`,
            '/references': `http://127.0.0.1:${API_PORT}`,
            '/results': `http://127.0.0.1:${API_PORT}`,
            '/uploads': `http://127.0.0.1:${API_PORT}`,
        },
    },
});
