import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateSecretStat } from '../lib/secrets.mjs';
import { ProviderCipher } from '../lib/cipher.mjs';
import { spawnPooled, closeReceiverPools } from '../vendor/camera-sdk/lib/pool-runner.mjs';
test('Linux key ownership/mode rules reject shared secrets; original key restores encrypted tenant data', async (t) => {
  const info = { isFile: () => true, size: 44, uid: 10001, mode: 0o100600 };
  validateSecretStat(info, 10001);
  assert.throws(() => validateSecretStat({ ...info, mode: 0o100644 }, 10001), /mode/);
  assert.throws(() => validateSecretStat({ ...info, uid: 0 }, 10001), /owned/);
  assert.throws(() => validateSecretStat({ ...info, isFile: () => false }, 10001), /Invalid/);
  const dir = await mkdtemp(path.join(tmpdir(), 'rgu-linux-key-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'key'),
    key = randomBytes(32);
  await writeFile(file, key.toString('base64'), { mode: 0o600 });
  const oldFile = process.env.HIK_SAAS_MASTER_KEY_FILE,
    oldKey = process.env.HIK_SAAS_MASTER_KEY;
  try {
    process.env.HIK_SAAS_MASTER_KEY_FILE = file;
    delete process.env.HIK_SAAS_MASTER_KEY;
    const a = await ProviderCipher.open(),
      sealed = a.seal({ private: 'synthetic-only' }, 'tenant-A');
    assert.deepEqual((await ProviderCipher.open()).open(sealed, 'tenant-A'), {
      private: 'synthetic-only',
    });
    assert.throws(() => a.open(sealed, 'tenant-B'));
    delete process.env.HIK_SAAS_MASTER_KEY_FILE;
    await assert.rejects(ProviderCipher.open(), /never regenerated/);
  } finally {
    for (const [k, v] of [
      ['HIK_SAAS_MASTER_KEY_FILE', oldFile],
      ['HIK_SAAS_MASTER_KEY', oldKey],
    ])
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
});
test('Linux pooled receiver routes each stream, isolates grants and stops one camera without stopping siblings', async () => {
  const children = [];
  const runner = (command, args) =>
    spawn(process.execPath, [fileURLToPath(new URL('./fixtures/pool-echo.mjs', import.meta.url))], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  const create = (grant, serial) => {
    const child = spawnPooled(process.execPath, [], { poolRunner: runner });
    children.push(child);
    const messages = [],
      waiters = [];
    let buffer = '';
    child.stdout.on('data', (data) => {
      buffer += data;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const l of lines) {
        const v = JSON.parse(l);
        waiters.length ? waiters.shift()(v) : messages.push(v);
      }
    });
    child.stdin.write(JSON.stringify({ accessToken: grant, serial }) + '\n');
    return {
      child,
      next: () =>
        messages.length ? Promise.resolve(messages.shift()) : new Promise((r) => waiters.push(r)),
    };
  };
  try {
    const a = create('synthetic-A', 'camera-A'),
      b = create('synthetic-A', 'camera-B'),
      c = create('synthetic-B', 'camera-C');
    const aa = await a.next(),
      bb = await b.next(),
      cc = await c.next();
    assert.equal(aa.camera, 'camera-A');
    assert.equal(bb.camera, 'camera-B');
    assert.equal(aa.pid, bb.pid);
    assert.notEqual(aa.pid, cc.pid);
    a.child.stdin.end();
    b.child.stdin.write('{"command":"preview"}\n');
    assert.equal((await b.next()).camera, 'camera-B');
  } finally {
    for (const c of children) c.stdin.end();
    closeReceiverPools();
  }
});
