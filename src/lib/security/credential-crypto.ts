// src/lib/security/credential-crypto.ts
// ============================================================================
// OWNERCLAN_INTEGRATION_2026-09-09 — symmetric encryption for third-party
// platform login credentials (e.g. OwnerClan seller ID/password) that must be
// stored server-side so a cron job can auto-refresh a short-lived JWT without
// the operator manually re-logging in every few hours.
//
// This is DIFFERENT from the existing supplier_sessions pattern (domemae/
// domeggook), which never stores a password — only a post-login cookie jar.
// That pattern works because Domeggook/Domemae only need browser-style
// scraping. OwnerClan's GraphQL API requires a password-based JWT re-issue on
// every expiry, so the password itself must be recoverable server-side.
//
// Algorithm: AES-256-GCM (authenticated encryption — tamper-evident, unlike
// AES-CBC). Key comes from CREDENTIAL_ENCRYPTION_KEY (64 hex chars = 32
// bytes), which the operator must set in Vercel env vars (Settings > Project
// > Environment Variables). This key is NOT a password — it's a random secret
// Claude can generate, since its only job is to encrypt/decrypt, and it never
// leaves server-side code.
//
// Storage format: `${ivHex}:${authTagHex}:${ciphertextHex}` — a single string
// column can hold it. Decryption fails loudly (throws) if the key is missing
// or the ciphertext was tampered with — never silently returns garbage.
// ============================================================================

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard nonce size

function getKey(): Buffer {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY is not set or is not a 64-char hex string (32 bytes). ' +
        'Set it in Vercel env vars before storing any platform credentials.',
    );
  }
  return Buffer.from(hex, 'hex');
}

/** Encrypt a plaintext string (e.g. a password) for storage. */
export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Decrypt a value produced by encryptCredential. Throws on tamper/wrong key. */
export function decryptCredential(stored: string): string {
  const key = getKey();
  const [ivHex, tagHex, dataHex] = stored.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Malformed encrypted credential (expected iv:tag:data format).');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
