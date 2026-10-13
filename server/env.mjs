import {existsSync} from 'node:fs';
for (const file of ['.env', '.env.local']) {
  if (existsSync(file)) process.loadEnvFile(file);
}
