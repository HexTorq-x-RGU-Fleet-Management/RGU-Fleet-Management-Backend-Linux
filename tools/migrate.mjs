import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readSecretFile } from '../lib/secrets.mjs';
export async function migrate(client, { ownerRole = 'cam_owner' } = {}) {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(ownerRole)) throw new Error('Invalid migration owner role.');
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(187210001)');
    await client.query('SET LOCAL ROLE ' + pg.escapeIdentifier(ownerRole));
    const role = (
      await client.query('SELECT rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname=current_user')
    ).rows[0];
    if (!role?.rolbypassrls || role.rolcanlogin)
      throw new Error('Schema owner must be a NOLOGIN BYPASSRLS role, separate from cam_app.');
    await client.query('CREATE SCHEMA IF NOT EXISTS cam');
    await client.query(
      'CREATE TABLE IF NOT EXISTS cam.schema_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const name of [
      'schema.sql',
      'google-auth.sql',
      'grants.sql',
      'fleet.sql',
      'wheelseye.sql',
      'wheelseye-admin.sql',
      'wheelseye-live.sql',
      'wheelseye-10s.sql',
      'wheelseye-segments.sql',
      'wheelseye-5s-test.sql',
      'wheelseye-segment-fields.sql',
      'workspace.sql',
    ]) {
      const code = await readFile(new URL('../db/' + name, import.meta.url), 'utf8');
      const hash = createHash('sha256').update(code.replace(/\r\n/g, '\n')).digest('hex');
      const existing = (
        await client.query('SELECT sha256 FROM cam.schema_migrations WHERE name=$1', [name])
      ).rows[0];
      if (existing) {
        if (existing.sha256 !== hash)
          throw new Error('Applied migration changed: ' + name + '; add a new migration instead.');
        continue;
      }
      await client.query(code);
      await client.query('INSERT INTO cam.schema_migrations(name,sha256) VALUES($1,$2)', [
        name,
        hash,
      ]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
if (
  process.argv[1] &&
  import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href
) {
  try {
    const url = process.env.MIGRATION_DATABASE_URL_FILE
      ? (await readSecretFile(process.env.MIGRATION_DATABASE_URL_FILE)).toString('utf8').trim()
      : process.env.MIGRATION_DATABASE_URL;
    if (!url) throw new Error('Set a private MIGRATION_DATABASE_URL_FILE for the DBA connection.');
    const database = new URL(url).pathname.slice(1);
    if (!database || ['postgres', 'template0', 'template1'].includes(database))
      throw new Error('Use the dedicated application database.');
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
      await migrate(client);
      console.log('Schema migrations complete. No viewer or provider data seeded.');
    } finally {
      await client.end();
    }
  } catch {
    console.error(
      'Schema migration failed. Check the private database URL, DBA privileges, schema owner and migration checksums. No credentials were logged.',
    );
    process.exitCode = 1;
  }
}
