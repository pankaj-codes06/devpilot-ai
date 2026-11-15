import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
