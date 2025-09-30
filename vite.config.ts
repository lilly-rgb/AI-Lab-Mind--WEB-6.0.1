import path from 'path';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

// FIX: __dirname is not defined in ES modules. The following lines are the workaround.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [],
    };
});