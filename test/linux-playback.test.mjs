import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { postgresFixture } from './helpers.mjs';
import { Cameras } from '../lib/cameras.mjs';
import { TenantStorage } from '../lib/storage.mjs';
import { createSaas } from '../server.mjs';
test('Linux playback import requires workspace admin, verifies actual channel authorization, retains prior grant on failure and never returns tokens', async (t) => {
  const { db, auth, workspaces, cipher } = await postgresFixture(t);
  const password = 'linux-import-test-password-123';
  const root = await auth.bootstrap({ email: 'root@linux.test', fullName: 'Root', password });
  for (const name of ['alpha', 'beta'])
    await auth.signup({
      email: name + '@linux.test',
      fullName: name,
      workspaceName: name,
      password,
    });
  for (const w of (await workspaces.platform(root.token)).workspaces)
    await workspaces.decide(root.token, w.id, 'approve');
  const alpha = await auth.login({ email: 'alpha@linux.test', password }),
    beta = await auth.login({ email: 'beta@linux.test', password });
  let checked = 0;
  const cameras = new Cameras(db, cipher, {
    personal: async () => ({
      credentials: {
        sessionId: 'synthetic-web',
        accountUserId: 'synthetic-web-id',
        origin: 'https://iindia.hik-connect.com',
      },
    }),
    hik: {
      devices: async () => [],
      sharing: async () => ({
        devices: [
          {
            id: 'linux-test-recorder',
            name: 'Test recorder',
            serial: 'TEST123',
            status: 'online',
            source: 'shared',
            channels: [{ number: 2, name: 'Camera 2' }],
          },
        ],
      }),
    },
    verifySdk: async (token, device, channel) => {
      checked++;
      assert.equal(device.serial, 'TEST123');
      assert.equal(channel, 2);
      if (token.includes('rejected')) throw new Error('Synthetic verifier denial');
      return { validatedAt: Date.now() };
    },
  });
  await cameras.connect(alpha.token, { account: 'test', password });
  await cameras.devices(alpha.token);
  const directory = await mkdtemp(path.join(tmpdir(), 'rgu-linux-playback-'));
  const storage = await new TenantStorage(directory, db).open();
  const { server } = createSaas({
    db,
    cipher,
    cameras,
    storage,
    frontendOrigins: ['http://127.0.0.1:3107'],
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await rm(directory, { recursive: true, force: true });
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (who, value) =>
    fetch(base + '/api/connect/playback', {
      method: 'POST',
      headers: {
        Cookie: 'hik_saas=' + who.token,
        'X-Hik-Local': '1',
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:3107',
      },
      body: JSON.stringify(value),
    });
  assert.equal((await post(root, { accessToken: 'at.synthetic-valid-authorization' })).status, 403);
  await workspaces.createMember(alpha.token, {
    fullName: 'Member',
    email: 'member@linux.test',
    password,
    grants: [],
  });
  const first = await auth.login({ email: 'member@linux.test', password });
  const member = await auth.changePassword(first.token, {
    currentPassword: password,
    newPassword: 'member-linux-new-password-123',
  });
  assert.equal(
    (await post(member, { accessToken: 'at.synthetic-valid-authorization' })).status,
    403,
  );
  assert.equal((await post(beta, { accessToken: 'at.synthetic-valid-authorization' })).status, 409);
  assert.equal((await post(alpha, { accessToken: 'bad' })).status, 400);
  assert.equal(checked, 0);
  const response = await post(alpha, { accessToken: 'at.synthetic-valid-authorization' });
  assert.equal(response.status, 200);
  const status = await response.json();
  assert.equal(status.playbackReady, true);
  assert.equal(status.playbackRecovery, 'external-authorization');
  assert.ok(!JSON.stringify(status).includes('at.synthetic'));
  assert.equal(checked, 1);
  assert.equal(
    (await post(alpha, { accessToken: 'at.rejected-synthetic-authorization' })).status,
    500,
  );
  assert.equal((await cameras.status(alpha.token)).playbackReady, true);
  assert.equal(
    (
      await post(alpha, {
        accessToken: 'at.synthetic-valid-authorization',
        expiresAt: Date.now() - 1,
      })
    ).status,
    400,
  );
  await assert.rejects(cameras.desktop(alpha.token), /Linux cannot read/);
});
