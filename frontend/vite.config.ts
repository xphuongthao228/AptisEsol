import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Load styles with the app shell so opening a lazy route never needs an
  // older, separately deployed CSS chunk.
  build: { cssCodeSplit: false },
  server: {
    port: 5173
  }
});
