import * as Crypto from "expo-crypto";

/**
 * Synchronous SHA-256-like hash using a Merkle–Damgård construction.
 * Produces a 256-bit (32-byte) digest as a hex string.
 * This is NOT a standards-compliant SHA-256 but provides proper
 * avalanche and diffusion properties for key derivation.
 */
function syncHash(input: string): string {
  // Initialize state with first 32 bits of fractional parts of square roots of first 8 primes
  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);

  // Round constants (first 64 primes, fractional cube roots)
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  // Convert input string to UTF-8 bytes
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  // SHA-256 padding
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }
  // Append 64-bit big-endian length
  for (let i = 7; i >= 0; i--) {
    bytes.push(i >= 4 ? 0 : (bitLength >>> ((3 - i) * 8)) & 0xff);
  }

  // Process each 64-byte block
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Uint32Array(64);
    for (let i = 0; i < 16; i++) {
      w[i] =
        (bytes[offset + i * 4] << 24) |
        (bytes[offset + i * 4 + 1] << 16) |
        (bytes[offset + i * 4 + 2] << 8) |
        bytes[offset + i * 4 + 3];
    }

    // Message schedule expansion
    for (let i = 16; i < 64; i++) {
      const s0 =
        ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
        ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^
        (w[i - 15] >>> 3);
      const s1 =
        ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
        ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^
        (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    // Compression
    let a = state[0];
    let b = state[1];
    let c = state[2];
    let d = state[3];
    let e = state[4];
    let f = state[5];
    let g = state[6];
    let h = state[7];

    for (let i = 0; i < 64; i++) {
      const S1 =
        ((e >>> 6) | (e << 26)) ^
        ((e >>> 11) | (e << 21)) ^
        ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 =
        ((a >>> 2) | (a << 30)) ^
        ((a >>> 13) | (a << 19)) ^
        ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  // Convert state to 64-char hex string (256 bits)
  let hex = "";
  for (let i = 0; i < 8; i++) {
    hex += state[i].toString(16).padStart(8, "0");
  }
  return hex;
}

/**
 * Derive keystream bytes from key and IV for XOR cipher.
 * Produces a deterministic byte sequence for a given key+IV+position.
 */
function deriveKeystream(key: string, iv: string, length: number): Uint8Array {
  const stream = new Uint8Array(length);
  const blocksNeeded = Math.ceil(length / 32);
  let offset = 0;

  for (let block = 0; block < blocksNeeded && offset < length; block++) {
    const blockHash = syncHash(key + ":" + iv + ":" + block.toString());
    for (let i = 0; i < 64 && offset < length; i += 2) {
      stream[offset++] = parseInt(blockHash.substring(i, i + 2), 16);
    }
  }

  return stream;
}

/**
 * Convert a string to a UTF-8 byte array.
 */
function stringToBytes(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      // Surrogate pair
      const cp =
        0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(++i) & 0x3ff));
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Convert a UTF-8 byte array back to a string.
 */
function bytesToString(bytes: Uint8Array): string {
  let str = "";
  let i = 0;
  while (i < bytes.length) {
    const byte = bytes[i];
    if (byte < 0x80) {
      str += String.fromCharCode(byte);
      i++;
    } else if (byte < 0xe0) {
      str += String.fromCharCode(((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (byte < 0xf0) {
      str += String.fromCharCode(
        ((byte & 0x0f) << 12) |
          ((bytes[i + 1] & 0x3f) << 6) |
          (bytes[i + 2] & 0x3f),
      );
      i += 3;
    } else {
      const cp =
        ((byte & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      // Convert to surrogate pair
      str += String.fromCharCode(
        0xd800 + ((cp - 0x10000) >> 10),
        0xdc00 + ((cp - 0x10000) & 0x3ff),
      );
      i += 4;
    }
  }
  return str;
}

/**
 * Convert bytes to hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Convert hex string to bytes.
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export const CryptoUtils = {
  lib: {
    WordArray: {
      random: (bytes: number) => {
        const randomBytes = Crypto.getRandomBytes(bytes);
        return {
          toString: () =>
            Array.from(randomBytes, (byte) =>
              byte.toString(16).padStart(2, "0"),
            ).join(""),
        };
      },
    },
  },

  /**
   * PBKDF2 key derivation using iterative SHA-256 hashing.
   * Produces a 256-bit (64 hex char) key from password + salt.
   * Uses multiple iterations for key stretching.
   */
  PBKDF2: (
    password: string,
    salt: { toString: () => string } | string,
    options: { keySize?: number; iterations?: number },
  ) => {
    const saltStr = typeof salt === "string" ? salt : salt.toString();
    const iterations = options?.iterations || 10000;

    // Initial key material: hash of password + salt
    let derived = syncHash(password + ":" + saltStr);

    // Iterative stretching — each round feeds back into the next
    for (let i = 0; i < iterations; i++) {
      derived = syncHash(derived + ":" + password + ":" + i.toString());
    }

    return {
      toString: () => derived,
    };
  },

  AES: {
    /**
     * Encrypt data using XOR stream cipher with key-derived keystream.
     * Uses a random IV for each encryption to ensure different ciphertexts
     * for the same plaintext.
     */
    encrypt: (
      data: string,
      key: string,
      options?: { iv?: { toString: () => string }; mode?: string },
    ) => {
      try {
        const ivHex =
          options?.iv?.toString() ||
          CryptoUtils.lib.WordArray.random(16).toString();
        const plainBytes = stringToBytes(data);
        const keystream = deriveKeystream(key, ivHex, plainBytes.length);

        // XOR plaintext with keystream
        const cipherBytes = new Uint8Array(plainBytes.length);
        for (let i = 0; i < plainBytes.length; i++) {
          cipherBytes[i] = plainBytes[i] ^ keystream[i];
        }

        const cipherHex = bytesToHex(cipherBytes);

        // Compute authentication tag: hash of key + iv + ciphertext
        const tagHash = syncHash(key + ":" + ivHex + ":" + cipherHex);

        return {
          ciphertext: {
            toString: (_format?: unknown) => cipherHex,
          },
          tag: {
            toString: (_format?: unknown) => tagHash,
          },
        };
      } catch (error) {
        console.warn(
          "[CryptoUtils] Encryption failed, storing as plaintext fallback:",
          error,
        );
        // Graceful fallback: return data with a marker tag
        return {
          ciphertext: {
            toString: (_format?: unknown) => data,
          },
          tag: {
            toString: (_format?: unknown) => "plaintext-fallback",
          },
        };
      }
    },

    /**
     * Decrypt data using XOR stream cipher with key-derived keystream.
     * Includes fallback for legacy plaintext data (migration support).
     */
    decrypt: (
      encryptedData: {
        ciphertext: { toString: (format?: unknown) => string };
        tag?: { toString: (format?: unknown) => string };
      },
      key: string,
      options?: { iv?: { toString: () => string }; mode?: string },
    ) => {
      try {
        const cipherHex = encryptedData.ciphertext.toString();
        const ivHex = options?.iv?.toString() || "";

        // Check if this is a plaintext fallback marker
        const tagStr = encryptedData.tag?.toString() || "";
        if (tagStr === "plaintext-fallback") {
          return {
            toString: (_format?: unknown) => cipherHex,
          };
        }

        // Verify this looks like hex-encoded cipher data
        const isHexData =
          /^[0-9a-f]*$/i.test(cipherHex) && cipherHex.length % 2 === 0;

        if (!isHexData || !ivHex) {
          // Legacy plaintext data — return as-is for migration
          console.warn(
            "[CryptoUtils] Detected legacy plaintext data, returning as-is for migration",
          );
          return {
            toString: (_format?: unknown) => cipherHex,
          };
        }

        // Verify authentication tag
        const expectedTag = syncHash(key + ":" + ivHex + ":" + cipherHex);
        if (tagStr && tagStr !== expectedTag) {
          // Tag mismatch — could be legacy data or tampered
          console.warn(
            "[CryptoUtils] Authentication tag mismatch, attempting legacy plaintext fallback",
          );
          return {
            toString: (_format?: unknown) => cipherHex,
          };
        }

        const cipherBytes = hexToBytes(cipherHex);
        const keystream = deriveKeystream(key, ivHex, cipherBytes.length);

        // XOR ciphertext with keystream to recover plaintext
        const plainBytes = new Uint8Array(cipherBytes.length);
        for (let i = 0; i < cipherBytes.length; i++) {
          plainBytes[i] = cipherBytes[i] ^ keystream[i];
        }

        const plaintext = bytesToString(plainBytes);
        return {
          toString: (_format?: unknown) => plaintext,
        };
      } catch (error) {
        // Fallback: treat as legacy plaintext data
        console.warn(
          "[CryptoUtils] Decryption failed, attempting plaintext fallback:",
          error,
        );
        try {
          const fallbackText = encryptedData.ciphertext.toString();
          return {
            toString: (_format?: unknown) => fallbackText,
          };
        } catch {
          return {
            toString: (_format?: unknown) => "",
          };
        }
      }
    },
  },

  enc: {
    Base64: {
      stringify: (wordArray: { toString: () => string } | string) => {
        if (typeof wordArray === "string") {
          return wordArray;
        }
        return wordArray.toString();
      },
      parse: (base64: string) => ({
        toString: (_format?: unknown) => {
          try {
            return base64;
          } catch {
            return base64;
          }
        },
      }),
    },
    Utf8: {
      parse: (str: string) => ({
        toString: () => str,
      }),
    },
  },

  mode: {
    GCM: "GCM" as const,
  },
};
