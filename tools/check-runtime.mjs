import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
if (process.platform !== 'linux' || process.arch !== 'x64')
  throw new Error(
    'Run this check inside the amd64 Linux/Wine container; a Windows host cannot verify it.',
  );
const command =
  process.env.HIK_PYTHON || fileURLToPath(new URL('../runtime/wine-python.sh', import.meta.url));
const result = spawnSync(command, [fileURLToPath(new URL('./check-sdk.py', import.meta.url))], {
  stdio: 'inherit',
});
if (result.error || result.status !== 0) process.exit(result.status || 1);
console.log(
  'Wine Python and SDK loading passed. No provider login or camera playback was attempted.',
);
