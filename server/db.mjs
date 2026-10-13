import pg from 'pg';
import {readFile} from 'node:fs/promises';

export function database(connectionString, schema = 'wedding') {
  if (!connectionString) throw new Error('DATABASE_URL belum diisi. Jalankan neon deploy.');
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema)) throw new Error('Invalid database schema');
  const url = new URL(connectionString);
  url.searchParams.set('sslmode','verify-full');
  const pool = new pg.Pool({connectionString: url.toString(), max: 5, connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000});
  pool.on('error', () => console.error('Database connection interrupted; pool will reconnect.'));
  return pool;
}

export async function migrate(connectionString, schema = 'wedding') {
  const pool = database(connectionString, schema);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    await client.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {client.release(); await pool.end();}
}
