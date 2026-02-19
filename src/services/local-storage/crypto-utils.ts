import * as Crypto from "expo-crypto";

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

  PBKDF2: (password: string, salt: any, options: any) => {
    const combined = password + salt.toString();
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return {
      toString: () =>
        Math.abs(hash).toString(16).padStart(64, "0").substring(0, 64),
    };
  },

  AES: {
    encrypt: (data: string, key: string, options?: any) => {
      const encoded = data;
      return {
        ciphertext: {
          toString: (format: any) => encoded,
        },
        tag: {
          toString: (format: any) => "mock-tag",
        },
      };
    },

    decrypt: (encryptedData: any, key: string, options?: any) => {
      try {
        const decoded = encryptedData.ciphertext.toString();
        return {
          toString: (format: any) => decoded,
        };
      } catch (error) {
        return {
          toString: (format: any) => "",
        };
      }
    },
  },

  enc: {
    Base64: {
      stringify: (wordArray: any) => {
        if (typeof wordArray === "string") {
          return wordArray;
        }
        return wordArray.toString();
      },
      parse: (base64: string) => ({
        toString: (format?: any) => {
          try {
            return base64;
          } catch (error) {
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
    GCM: "GCM",
  },
};
