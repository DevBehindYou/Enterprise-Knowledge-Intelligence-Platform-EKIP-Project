import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * At-rest encryption for third-party credentials stored in MongoDB
 * (storage access keys, AI provider API keys). AES-256-GCM with a key
 * derived from APP_JWT_SECRET, so no new secret has to be provisioned —
 * but rotating APP_JWT_SECRET invalidates stored integration credentials,
 * which is the documented trade-off (re-enter them in Settings after a rotation).
 *
 * Stored format: enc:v1:<iv b64>:<authTag b64>:<ciphertext b64>
 */
const PREFIX = 'enc:v1:';

function vaultKey() {
  return crypto.createHash('sha256').update(`${env.appJwtSecret}::ekip-secret-vault`).digest();
}

export function encryptSecret(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptSecret(stored) {
  if (!stored) return '';
  if (!stored.startsWith(PREFIX)) return stored; // tolerate legacy/plaintext values
  try {
    const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return ''; // wrong key (secret rotated) or corrupted value — treat as unset
  }
}

/** "sk-ant-api03-xxxx" -> "••••xxxx" — safe to return to the UI. */
export function maskSecret(stored) {
  const value = decryptSecret(stored);
  if (!value) return '';
  return `••••${value.slice(-4)}`;
}

/** True when a form echoed back the mask instead of a new value. */
export function isMaskedPlaceholder(value) {
  return typeof value === 'string' && value.startsWith('••••');
}
