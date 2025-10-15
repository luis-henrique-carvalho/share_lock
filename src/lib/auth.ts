import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDrizzleInstance } from '../drizzle/drizzle.provider';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../drizzle/schema';

const db: NodePgDatabase<typeof schema> = createDrizzleInstance();

export const auth = betterAuth({
  basePath: process.env.BETTER_AUTH_BASE_PATH,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true },
  user: { modelName: 'user' },
});
