import crypto from 'crypto';

const PASSWORD_PREFIX = 'v1';
const KEY_ENV = 'ACCOUNT_PASSWORD_ENCRYPTION_KEY';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

function loadKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    throw new Error(`Missing ${KEY_ENV} environment variable`);
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `${KEY_ENV} must be ${KEY_LENGTH} bytes when decoded from base64`,
    );
  }

  return key;
}

function encode(parts: Buffer[]) {
  return parts.map((part) => part.toString('base64')).join(':');
}

function decode(value: string): Buffer[] {
  return value.split(':').map((part) => Buffer.from(part, 'base64'));
}

export function encryptPassword(plain: string): string {
  if (!plain) {
    return plain;
  }

  if (plain.startsWith(`${PASSWORD_PREFIX}:`)) {
    return plain;
  }

  const key = loadKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PASSWORD_PREFIX}:${encode([iv, tag, encrypted])}`;
}

export function decryptPassword(value: string): string {
  if (!value) {
    return value;
  }

  if (!value.startsWith(`${PASSWORD_PREFIX}:`)) {
    // Legacy plaintext fallback for existing data.
    return value;
  }

  const payload = value.slice(PASSWORD_PREFIX.length + 1);
  const [iv, tag, encrypted] = decode(payload);

  if (!iv || !tag || !encrypted) {
    throw new Error('Invalid encrypted password format');
  }

  const key = loadKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export const passwordTransformer = {
  to(value: string): string {
    return encryptPassword(value);
  },
  from(value: string): string {
    return decryptPassword(value);
  },
};
