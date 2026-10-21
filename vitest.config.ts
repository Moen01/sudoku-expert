import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    // Pure-logic tests run in node; storage tests opt into jsdom via a
    // `// @vitest-environment jsdom` comment at the top of the file.
    environment: 'node',
    // jsdom only exposes localStorage for a real origin, not about:blank.
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'out', '.next'],
  },
});
