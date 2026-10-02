import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { PasswordHasher } from '../../domain/services/password-hasher.js';

const ALGORITHM = 'scrypt';
const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const SALT_BYTES = 16;

export interface ScryptOptions {
  cost?: number;
  blockSize?: number;
  parallelization?: number;
}

export class ScryptPasswordHasher implements PasswordHasher {
  private readonly cost: number;
  private readonly blockSize: number;
  private readonly parallelization: number;

  constructor(options: ScryptOptions = {}) {
    this.cost = options.cost ?? COST;
    this.blockSize = options.blockSize ?? BLOCK_SIZE;
    this.parallelization = options.parallelization ?? PARALLELIZATION;
  }

  public async hash(plainPassword: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const derived = await this.derive(plainPassword, salt, this.cost, this.blockSize, this.parallelization);
    return [
      ALGORITHM,
      this.cost,
      this.blockSize,
      this.parallelization,
      salt.toString('base64'),
      derived.toString('base64'),
    ].join('$');
  }

  public async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    const parsed = this.parse(passwordHash);
    if (!parsed) {
      return false;
    }
    const [cost, blockSize, parallelization, salt, expected] = parsed;
    const derived = await this.derive(plainPassword, salt, cost, blockSize, parallelization);
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  }

  private async derive(
    plainPassword: string,
    salt: Buffer,
    cost: number,
    blockSize: number,
    parallelization: number,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      scrypt(
        plainPassword,
        salt,
        KEY_LENGTH,
        { N: cost, r: blockSize, p: parallelization },
        (error, key) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(key);
        },
      );
    });
  }

  private parse(passwordHash: string): [number, number, number, Buffer, Buffer] | null {
    const parts = passwordHash.split('$');
    if (parts.length !== 6 || parts[0] !== ALGORITHM) {
      return null;
    }
    const [, cost, blockSize, parallelization, salt, hash] = parts;
    if (
      cost === undefined ||
      blockSize === undefined ||
      parallelization === undefined ||
      salt === undefined ||
      hash === undefined
    ) {
      return null;
    }
    return [
      Number(cost),
      Number(blockSize),
      Number(parallelization),
      Buffer.from(salt, 'base64'),
      Buffer.from(hash, 'base64'),
    ];
  }
}
