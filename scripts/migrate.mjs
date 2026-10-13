import '../server/env.mjs';
import {migrate} from '../server/db.mjs';
await migrate(process.env.DATABASE_URL_UNPOOLED);
console.log('Migration applied: wedding schema (Neon Postgres).');
