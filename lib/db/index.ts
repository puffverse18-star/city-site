import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { appConfig } from '../config/store';

declare global {
  var __cityPgPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString: appConfig.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export const pool = globalThis.__cityPgPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__cityPgPool = pool;
}

export const db = drizzle(pool, { schema });

/**
 * Checks connectivity to the configured PostgreSQL instance.
 * Returns detailed diagnostics without throwing unhandled exceptions.
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  databaseUrlConfigured: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const isConfigured = Boolean(appConfig.databaseUrl && appConfig.databaseUrl.trim().length > 0);
  if (!isConfigured) {
    return {
      connected: false,
      databaseUrlConfigured: false,
      error: 'DATABASE_URL non configuré',
    };
  }

  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 AS health_check');
      const latencyMs = Date.now() - start;
      return {
        connected: true,
        databaseUrlConfigured: true,
        latencyMs,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      connected: false,
      databaseUrlConfigured: true,
      error: err.message || 'Impossible de se connecter à PostgreSQL',
    };
  }
}
