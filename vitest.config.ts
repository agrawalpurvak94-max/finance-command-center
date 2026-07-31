import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      exclude: ['node_modules', 'dist', 'tests/e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        thresholds: {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
  }),
)
