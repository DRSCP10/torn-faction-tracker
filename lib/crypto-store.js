import crypto from 'crypto';

function getKeyMaterial() {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET required to encrypt stored secrets');
  return crypto.scryptSync(secret, 'faction-settings-v1', 32);
}

export function encryptSecret(plain) {
  const key = getKeyMaterial();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptSecret(blob) {
  if (!blob) return null;
  const [ivHex, tagHex, dataHex] = blob.split(':');
  if (!ivHex || !tagHex || !dataHex) return null;
  const key = getKeyMaterial();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}

export function maskSecret(value) {
  if (!value || value.length < 8) return value ? '••••' : null;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
