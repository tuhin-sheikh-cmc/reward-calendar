import { describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from '../../../src/infrastructure/security/scrypt-password-hasher.js';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('produces a scrypt hash that verifies against the plain password', async () => {
    const hash = await hasher.hash('correct-horse-battery');

    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash.split('$')).toHaveLength(6);
    await expect(hasher.verify('correct-horse-battery', hash)).resolves.toBe(true);
  });

  it('never stores the plain password', async () => {
    const hash = await hasher.hash('correct-horse-battery');
    expect(hash).not.toContain('correct-horse-battery');
  });

  it('salts so the same password hashes differently', async () => {
    const first = await hasher.hash('correct-horse-battery');
    const second = await hasher.hash('correct-horse-battery');

    expect(first).not.toBe(second);
    await expect(hasher.verify('correct-horse-battery', second)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('correct-horse-battery');
    await expect(hasher.verify('wrong-password', hash)).resolves.toBe(false);
  });

  it('rejects an empty password', async () => {
    const hash = await hasher.hash('correct-horse-battery');
    await expect(hasher.verify('', hash)).resolves.toBe(false);
  });

  it('resolves false for a malformed hash instead of throwing', async () => {
    await expect(hasher.verify('correct-horse-battery', 'not-a-hash')).resolves.toBe(false);
    await expect(hasher.verify('correct-horse-battery', '')).resolves.toBe(false);
    await expect(hasher.verify('correct-horse-battery', 'scrypt$16384$8$1$onlysalt')).resolves.toBe(
      false,
    );
  });
});
