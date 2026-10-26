import { spawnSync } from 'node:child_process';
for (const script of ['tools/run-portable-tests.mjs', 'tools/check-runtime.mjs']) {
  const r = spawnSync(process.execPath, [script], { stdio: 'inherit', windowsHide: true });
  if (r.error || r.status !== 0) process.exit(r.status || 1);
}
