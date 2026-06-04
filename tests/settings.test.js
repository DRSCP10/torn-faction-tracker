import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { encryptSecret, decryptSecret } from '../lib/crypto-store.js';

describe('admin secrets', () => {
  it('hashes and verifies admin password', () => {
    const stored = hashPassword('test-password-123');
    assert.ok(verifyPassword('test-password-123', stored));
    assert.equal(verifyPassword('wrong', stored), false);
  });

  it('encrypts and decrypts torn api key', () => {
    process.env.SESSION_SECRET = 'test-session-secret-for-crypto';
    const enc = encryptSecret('abcd1234efgh5678');
    assert.equal(decryptSecret(enc), 'abcd1234efgh5678');
    delete process.env.SESSION_SECRET;
  });
});
