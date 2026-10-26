import { spawnSync } from 'node:child_process';
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
for (const [command, args] of [
  [process.execPath, ['tools/check-source.mjs']],
  [process.execPath, ['tools/check-parity.mjs']],
  [process.execPath, ['--test', 'test/*.test.mjs']],
  [python, ['vendor/camera-sdk/native/test_audio.py']],
  [python, ['vendor/camera-sdk/native/test_smooth.py']],
]) {
  const result = spawnSync(command, args, { stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
console.log(
  'Portable checks passed. Linux/Wine, real cameras and production deployment are separate acceptance steps.',
);
