import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Local/dev uses base `/`.
 * GitHub Pages project site overrides via: vite build --base /sap-daygate/
 */
export default defineConfig({
  plugins: [react()],
  base: '/',
});