import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: 'unit', include: ['src/**/*.test.ts'], environment: 'node', pool: 'forks' },
      },
      {
        resolve: { alias },
        test: {
          name: 'db',
          include: ['supabase/tests/db/**/*.test.ts'],
          globalSetup: ['supabase/tests/db/global-setup.ts'],
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 60000,
          hookTimeout: 60000,
        },
      },
    ],
  },
});
