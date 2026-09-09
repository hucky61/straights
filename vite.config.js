import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/str8ts-com-proxy': {
        target: 'https://www.str8ts.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/str8ts-com-proxy/, ''),
        secure: false,
      },
      '/str8ts-de-proxy': {
        target: 'https://www.str8ts.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/str8ts-de-proxy/, ''),
        secure: false,
      }
    }
  }
})
