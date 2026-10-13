import {randomBytes, scrypt} from 'node:crypto';
import {promisify} from 'node:util';
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const password = Buffer.concat(chunks).toString().trimEnd();
if (password.length < 12) throw new Error('Gunakan password minimal 12 karakter.');
const salt = randomBytes(16).toString('hex');
const hash = await promisify(scrypt)(password, salt, 64);
console.log(`${salt}:${hash.toString('hex')}`);
