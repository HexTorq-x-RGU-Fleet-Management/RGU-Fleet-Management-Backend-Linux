import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readSecretFile } from './secrets.mjs';
export const project = fileURLToPath(new URL('../', import.meta.url));
export const privateDirectory = path.join(project, '.local');
// Only the disposable test harness reads this file. Production uses DATABASE_URL(_FILE).
export async function readPrivate(name) {
  if (name !== 'database-admin') throw new Error('Unsupported local test configuration.');
  if (process.env.RGU_TEST_DB_CONFIG) return JSON.parse(process.env.RGU_TEST_DB_CONFIG);
  return JSON.parse(await readFile(path.join(privateDirectory, 'test-database.json'), 'utf8'));
}
export async function runtimeConfig() {
  const databaseUrl = process.env.DATABASE_URL_FILE
    ? (await readSecretFile(process.env.DATABASE_URL_FILE)).toString('utf8').trim()
    : process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Configure DATABASE_URL_FILE or DATABASE_URL.');
  const port = Number(process.env.PORT || 8102);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  return {
    databaseUrl,
    dataDirectory: process.env.HIK_SAAS_DATA_DIR || path.join(project, 'data'),
    port,
    host: process.env.HOST || '127.0.0.1',
  };
}
