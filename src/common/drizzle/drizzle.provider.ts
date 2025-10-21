import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { ConfigService } from '@nestjs/config';

export const DrizzleAsyncProvider = 'DrizzleAsyncProvider';

export const drizzleProvider = [
  {
    provide: DrizzleAsyncProvider,
    inject: [ConfigService],
    useFactory: (
      configService: ConfigService,
    ): NodePgDatabase<typeof schema> => {
      const connectionString = configService.get<string>('DATABASE_URL');

      if (!connectionString) {
        throw new Error('DATABASE_URL is not defined');
      }

      const pool = new Pool({ connectionString });

      return drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
    },
  },
];

export const createDrizzleInstance = (): NodePgDatabase<typeof schema> => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const pool = new Pool({ connectionString });

  return drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
};
