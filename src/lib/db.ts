import 'server-only';
import { neon, Pool, type PoolClient } from '@neondatabase/serverless';
import { serverConfig } from './config';

export const sql = neon(serverConfig.database.url);

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: serverConfig.database.url });
  }
  return pool;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getDbPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
