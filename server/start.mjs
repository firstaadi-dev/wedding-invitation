import './env.mjs';
import {database} from './db.mjs';
import {createApp} from './app.mjs';
const port = Number(process.env.PORT || 5174);
const pool = database(process.env.DATABASE_URL);
const server = createApp(pool,{
  origin:process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`,
  production:process.env.NODE_ENV === 'production',
  trustProxy:process.env.TRUST_PROXY === '1',
  passwordHash:process.env.ADMIN_PASSWORD_HASH,
  publicKey:process.env.FINGERPRINT_PUBLIC_KEY,
  secretKey:process.env.FINGERPRINT_SECRET_KEY,
  region:process.env.FINGERPRINT_REGION || 'ap',
  endpoint:process.env.FINGERPRINT_ENDPOINT,
});
await pool.query('SELECT 1 FROM wedding.settings WHERE id=1');
server.listen(port,'0.0.0.0',() => console.log(`Invitation server ready on port ${port}; Neon Postgres connected.`));
const cleanup = setInterval(() => pool.query(`DELETE FROM wedding.sessions WHERE expires_at<now(); DELETE FROM wedding.challenges WHERE expires_at<now();
  DELETE FROM wedding.rate_limits WHERE expires_at<now(); DELETE FROM wedding.used_events WHERE created_at<now()-interval '1 day'`).catch(() => console.error('Session cleanup failed.')),3600000);
cleanup.unref();
function stop() {clearInterval(cleanup);server.close(async () => {await pool.end();process.exit(0);});setTimeout(() => process.exit(1),10000).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
