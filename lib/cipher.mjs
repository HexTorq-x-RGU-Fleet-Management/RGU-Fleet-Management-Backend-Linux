import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readSecretFile } from './secrets.mjs';
export class ProviderCipher {
  constructor(key) {
    if (!Buffer.isBuffer(key) || key.length !== 32)
      throw new Error('A 32-byte provider encryption key is required.');
    this.key = key;
  }
  static async open(directory, db) {
    if (process.env.HIK_SAAS_MASTER_KEY_FILE)
      return new ProviderCipher(
        Buffer.from(
          (await readSecretFile(process.env.HIK_SAAS_MASTER_KEY_FILE)).toString('utf8').trim(),
          'base64',
        ),
      );
    if (process.env.HIK_SAAS_MASTER_KEY)
      return new ProviderCipher(Buffer.from(process.env.HIK_SAAS_MASTER_KEY, 'base64'));
    throw new Error(
      'Restore or create HIK_SAAS_MASTER_KEY_FILE before starting; keys are never regenerated automatically.',
    );
  }
  seal(value, tenantId) {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(tenantId));
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(JSON.stringify(value))),
      cipher.final(),
    ]);
    return Buffer.concat([iv, encrypted, cipher.getAuthTag()]);
  }
  open(value, tenantId) {
    const bytes = Buffer.from(value);
    if (bytes.length < 29) throw new Error('Encrypted provider data is invalid.');
    const decipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(tenantId));
    decipher.setAuthTag(bytes.subarray(-16));
    return JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString('utf8'),
    );
  }
}
