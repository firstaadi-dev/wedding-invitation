import pg from 'pg';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

export async function provisionAccount(client, {email,slug,name}, passwordHash) {
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Invalid account email');
  email = email.trim().toLowerCase();
  if (typeof slug !== 'string' || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid tenant slug');
  if (typeof name !== 'string' || !name.trim() || name.length > 120) throw new Error('Invalid tenant name');
  const existing = (await client.query('SELECT a.email,t.slug,t.name FROM accounts a JOIN tenants t ON t.owner_id=a.id WHERE a.email=$1 OR t.slug=$2',[email,slug])).rows;
  if (existing.length) {
    if (existing.length !== 1 || existing[0].email !== email || existing[0].slug !== slug || existing[0].name !== name.trim()) throw new Error('Account or tenant already belongs to a different migration');
    return;
  }
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash || '')) throw new Error('A valid password hash is required for a new account');
  const id = randomUUID();
  await client.query('INSERT INTO accounts(id,email,password_hash) VALUES($1,$2,$3)',[id,email,passwordHash]);
  await client.query('INSERT INTO tenants(id,owner_id,slug,name) VALUES($1,$2,$1,$3)',[slug,id,name.trim()]);
  await client.query('INSERT INTO settings(tenant_id) VALUES($1)',[slug]);
}

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

export async function migrate(connectionString, schema = 'wedding', passwordHash = process.env.ADMIN_PASSWORD_HASH) {
  const pool = database(connectionString, schema);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${schema}:migrations`]);
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    if (!(await client.query('SELECT 1 FROM schema_migrations WHERE version=1')).rowCount) {
      if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash || '')) throw new Error('Initial migration requires ADMIN_PASSWORD_HASH to preserve the existing admin password.');
      await client.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
      await client.query("SELECT set_config('weddinvita.legacy_password_hash',$1,true)",[passwordHash]);
      await client.query(await readFile(new URL('../db/001-multi-tenant.sql', import.meta.url), 'utf8'));
      await client.query('INSERT INTO schema_migrations(version) VALUES(1)');
    }
    const directory = new URL('../db/accounts/',import.meta.url);
    for (const file of (await readdir(directory)).filter(file => file.endsWith('.json') && !file.endsWith('.example.json')).sort()) {
      const value = JSON.parse(await readFile(new URL(file,directory),'utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['email','slug','name','passwordHashEnv'].includes(key)) || !/^[A-Z][A-Z0-9_]+$/.test(value.passwordHashEnv || '')) throw new Error(`Invalid account migration: ${file}`);
      await provisionAccount(client,value,process.env[value.passwordHashEnv]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {client.release(); await pool.end();}
}
