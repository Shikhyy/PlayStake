import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  server: {
    proxy: {
      '/api/rpc': {
        target: 'https://rpc-testnet.onelabs.cc:443',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rpc/, ''),
        secure: false,
      },
    },
  },
});
