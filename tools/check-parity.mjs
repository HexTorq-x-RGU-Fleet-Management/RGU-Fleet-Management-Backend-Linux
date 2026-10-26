import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(
  await readFile(new URL('./parity-manifest.json', import.meta.url), 'utf8'),
);
for (const [name, expected] of Object.entries(manifest.common)) {
  const value = await readFile(new URL('../' + name, import.meta.url), 'utf8');
  if (createHash('sha256').update(value.replace(/\r\n/g, '\n')).digest('hex') !== expected)
    throw new Error(
      'Shared API parity changed: ' + name + '. Review and update the synchronization manifest.',
    );
}
console.log(
  Object.keys(manifest.common).length +
    ' shared files match Windows ' +
    manifest.windowsCommit +
    '. Linux adaptations are documented separately.',
);
