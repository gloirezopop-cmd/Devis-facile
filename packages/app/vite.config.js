import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import packageJson from './package.json'

const univerPackages = Object.keys(packageJson.dependencies).filter(dep => dep.startsWith('@univerjs/'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      ...univerPackages,
      '@wendellhu/redi',
      'react',
      'react-dom',
    ],
  },
})
