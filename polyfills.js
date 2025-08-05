/**
 * React Native Polyfills - DEPRECATED
 * 
 * This file is NO LONGER USED to prevent JSC engine bundle corruption.
 * Polyfills are now loaded manually in index.js AFTER React Native initialization.
 * 
 * Keeping this file for reference only.
 */

// FormData polyfill - JSC Engine Compatible
if (typeof global.FormData === 'undefined') {
  // For JSC engine, use React Native's built-in FormData
  try {
    // React Native provides FormData globally, check if it exists
    if (typeof FormData !== 'undefined') {
      global.FormData = FormData;
    } else {
      // Fallback for JSC - minimal FormData implementation
      global.FormData = class FormData {
        constructor() {
          this._boundary = Math.random().toString(36).substring(2);
          this._parts = [];
        }

        append(key, value, filename) {
          this._parts.push({
            name: key,
            value: value,
            filename: filename
          });
        }

        toString() {
          return '[object FormData]';
        }

        // JSC compatibility methods
        _getBoundary() {
          return this._boundary;
        }

        _getParts() {
          return this._parts;
        }
      };
    }
  } catch (e) {
    console.warn('FormData polyfill setup failed:', e);
  }
}

// URLSearchParams polyfill
if (typeof global.URLSearchParams === 'undefined') {
  global.URLSearchParams = class URLSearchParams {
    constructor(params = {}) {
      this.params = new Map();
      if (typeof params === 'string') {
        // Parse query string
        params.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key) {
            this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
          }
        });
      } else if (params) {
        // Parse object
        Object.entries(params).forEach(([key, value]) => {
          this.params.set(key, String(value));
        });
      }
    }

    toString() {
      const pairs = [];
      this.params.forEach((value, key) => {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      });
      return pairs.join('&');
    }

    get(key) {
      return this.params.get(key);
    }

    set(key, value) {
      this.params.set(key, String(value));
    }

    append(key, value) {
      this.params.set(key, String(value));
    }

    has(key) {
      return this.params.has(key);
    }

    delete(key) {
      return this.params.delete(key);
    }
  };
}

// TextEncoder/TextDecoder polyfill
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      const utf8 = unescape(encodeURIComponent(str));
      const result = new Uint8Array(utf8.length);
      for (let i = 0; i < utf8.length; i++) {
        result[i] = utf8.charCodeAt(i);
      }
      return result;
    }
  };
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(arr) {
      let utf8 = '';
      for (let i = 0; i < arr.length; i++) {
        utf8 += String.fromCharCode(arr[i]);
      }
      return decodeURIComponent(escape(utf8));
    }
  };
}

// Base64 encoding polyfills
if (typeof global.btoa === 'undefined') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  global.btoa = (input) => {
    let str = String(input);
    let output = '';

    for (let block = 0, charCode, i = 0, map = chars;
      str.charAt(i | 0) || (map = '=', i % 1);
      output += map.charAt(63 & block >> 8 - i % 1 * 8)) {

      charCode = str.charCodeAt(i += 3/4);

      if (charCode > 0xFF) {
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }

      block = block << 8 | charCode;
    }

    return output;
  };
}

if (typeof global.atob === 'undefined') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  global.atob = (input) => {
    let str = String(input).replace(/[=]+$/, '');
    let output = '';

    if (str.length % 4 === 1) {
      throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }

    for (let bc = 0, bs = 0, buffer, i = 0;
      buffer = str.charAt(i++);
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      buffer = chars.indexOf(buffer);
    }

    return output;
  };
}

console.log('✅ React Native polyfills loaded successfully');