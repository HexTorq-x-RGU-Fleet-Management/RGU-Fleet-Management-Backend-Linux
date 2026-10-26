import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { postgresFixture } from './helpers.mjs';
import { readPrivate } from '../lib/config.mjs';
import { migrate } from '../tools/migrate.mjs';
test('fresh Linux schema migrates transactionally under a separate NOLOGIN owner, reruns safely and keeps runtime behind RLS', async (t) => {
  const { db, auth } = await postgresFixture(t, { migrate: false });
  const secret = await readPrivate('database-admin'),
    url = new URL(db.pool.options.connectionString);
  url.username = 'saas_bootstrap';
  url.password = secret.bootstrapPassword;
  const c = new pg.Client({ connectionString: url.href });
  await c.connect();
  const role = 'cam_test_owner_' + process.pid + '_' + randomBytes(4).toString('hex');
  await c.query('CREATE ROLE ' + role + ' NOLOGIN BYPASSRLS');
  await c.query(
    'GRANT CREATE ON DATABASE ' + pg.escapeIdentifier(url.pathname.slice(1)) + ' TO ' + role,
  );
  t.after(async () => {
    const admin = new pg.Client({
      host: '127.0.0.1',
      port: 55432,
      user: 'saas_bootstrap',
      password: secret.bootstrapPassword,
      database: 'postgres',
    });
    await admin.connect();
    try {
      await admin.query('DROP ROLE ' + role);
    } finally {
      await admin.end();
    }
  });
  try {
    await migrate(c, { ownerRole: role });
    await migrate(c, { ownerRole: role });
    assert.equal(
      (await c.query('SELECT count(*)::int AS n FROM cam.schema_migrations')).rows[0].n,
      4,
    );
    const root = await auth.bootstrap({
      email: 'owner@linux.test',
      fullName: 'Linux Owner',
      password: 'linux-migrate-password-123',
    });
    assert.equal(root.principal.role, 'superadmin');
    await assert.rejects(db.pool.query('SET ROLE ' + role), /permission denied/);
    await assert.rejects(db.pool.query('SELECT * FROM cam.schema_migrations'), /permission denied/);
    assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM cam.users')).rows[0].n, 0);
    await assert.rejects(migrate(c, { ownerRole: 'cam_app' }), /NOLOGIN/);
  } finally {
    await c.end();
  }
});
