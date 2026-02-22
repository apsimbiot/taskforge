import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgresql://taskforge:taskforge@localhost:5432/taskforge',
  },
  verbose: true,
  strict: true,
});
