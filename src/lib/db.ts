import 'server-only';
import { neon, Pool, type NeonQueryFunction, type PoolClient } from '@neondatabase/serverless';
import { serverConfig } from './config';

let _sql: NeonQueryFunction<false, false> | null = null;

function getSqlClient(): NeonQueryFunction<false, false> {
  if (!_sql) {
    _sql = neon(serverConfig.database.url);
  }
  return _sql;
}

export function sql(
  strings: TemplateStringsArray,
  ...params: unknown[]
): Promise<Record<string, unknown>[]> {
  return getSqlClient()(strings, ...params) as Promise<Record<string, unknown>[]>;
}

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
