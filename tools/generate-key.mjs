import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const file = process.argv[2];
if (!file) throw new Error('Supply a private output path; fresh installations only.');
await writeFile(file, randomBytes(32).toString('base64') + '\n', { flag: 'wx', mode: 0o600 });
console.log('New key written without displaying it. Never use it over migrated encrypted data.');
