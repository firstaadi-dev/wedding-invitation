import '../server/env.mjs';
import {migrate} from '../server/db.mjs';
await migrate(process.env.DATABASE_URL_UNPOOLED);
console.log('Migration applied: tenant schema and account migrations (Neon Postgres).');
