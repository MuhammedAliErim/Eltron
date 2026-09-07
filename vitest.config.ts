import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    env: {
      DISCORD_TOKEN: 'test-token',
      DISCORD_CLIENT_ID: '1545723966080163912',
      DISCORD_PUBLIC_KEY: 'test-public-key',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      NODE_ENV: 'development',
    },
  },
});
