import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
export function validateSecretStat(info, uid) {
  if (!info.isFile() || info.size < 1 || info.size > 65536) throw new Error('Invalid secret file.');
  if (uid !== undefined && (info.uid !== uid || (info.mode & 0o077) !== 0))
    throw new Error('Secret file must be owned by the service user with mode 600 or 400.');
}
export async function readSecretFile(file) {
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    validateSecretStat(await handle.stat(), process.getuid?.());
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}
