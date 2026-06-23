import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vitest configuration for React component testing.
 *
 * Scoped to frontend/tests only to avoid conflicts with Playwright E2E tests
 * in e2e/ folder at the project root.
 *
 * Uses jsdom to simulate browser environment.
 * Path aliases match vite.config.ts for consistency.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '../e2e'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
