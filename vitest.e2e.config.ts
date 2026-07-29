import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./e2e/setup.ts'],
    include: ['e2e/**/*.test.tsx'],
  },
});
