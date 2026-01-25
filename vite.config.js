import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        lib: {
            entry: resolve(__dirname, 'js/app.js'),
            name: 'OpenWebUIPromptEnhancement',
            fileName: 'app',
            formats: ['es']
        },
        rollupOptions: {
            output: {
                entryFileNames: 'js/[name].js',
                chunkFileNames: 'js/[name]-[hash].js',
                assetFileNames: '[name][extname]'
            }
        }
    }
});
