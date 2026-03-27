#!/usr/bin/env node
/**
 * test-sqlite-base64.mjs
 *
 * Verifies that the base64 chunking logic used in sqliteFood.ts
 * produces correct output for various payload sizes — including sizes
 * that are NOT multiples of 3 (the old bug) and sizes that ARE.
 *
 * Also tests the full gzip → inflate → base64 → decode round-trip
 * using pako, simulating the actual on-device flow.
 *
 * Usage: node scripts/test-sqlite-base64.mjs
 */

import { gzipSync } from "zlib";

// ---------------------------------------------------------------------------
// 1. Pure base64 chunking test (the core fix)
// ---------------------------------------------------------------------------

/**
 * OLD buggy implementation — chunk size 8192 (not a multiple of 3).
 * Each chunk independently base64-encoded → padding in the middle.
 */
function encodeBase64_BUGGY(uint8) {
  const CHUNK = 8192;
  let b64 = "";
  for (let i = 0; i < uint8.length; i += CHUNK) {
    const slice = uint8.subarray(i, i + CHUNK);
    b64 += btoa(String.fromCharCode(...Array.from(slice)));
  }
  return b64;
}

/**
 * NEW fixed implementation — chunk size 12288 (multiple of 3).
 * Only the final chunk may have padding.
 */
function encodeBase64_FIXED(uint8) {
  const CHUNK = 12288; // 3 * 4096
  let b64 = "";
  for (let i = 0; i < uint8.length; i += CHUNK) {
    const slice = uint8.subarray(i, i + CHUNK);
    let binaryChunk = "";
    for (let j = 0; j < slice.length; j++) {
      binaryChunk += String.fromCharCode(slice[j]);
    }
    b64 += btoa(binaryChunk);
  }
  return b64;
}

/** Reference: encode entire buffer in one go (no chunking) */
function encodeBase64_REFERENCE(uint8) {
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

/** Decode base64 back to Uint8Array */
function decodeBase64(b64) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/** Compare two Uint8Arrays byte-by-byte */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL  ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "assertion failed");
}

console.log("\n=== Base64 Chunking Tests ===\n");

// Various sizes that stress chunk boundaries
const testSizes = [
  0,        // empty
  1,        // 1 byte
  2,        // 2 bytes (not multiple of 3)
  3,        // exactly 3
  100,      // small
  8191,     // just under old chunk size
  8192,     // exactly old chunk size (1 chunk boundary)
  8193,     // just over old chunk size (triggers 2nd chunk with 1 byte → padding bug)
  12287,    // just under new chunk size
  12288,    // exactly new chunk size
  12289,    // just over new chunk size
  16384,    // 2x old chunk (2 full chunks)
  16385,    // 2x old chunk + 1 (triggers bug on each boundary)
  24576,    // 2x new chunk (2 full chunks)
  50000,    // medium
  100000,   // larger
  500000,   // ~500KB — simulates a portion of the real DB
];

for (const size of testSizes) {
  // Generate random-ish data
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = (i * 7 + 13) & 0xff;
  }

  const reference = encodeBase64_REFERENCE(data);

  // Test FIXED implementation matches reference
  test(`FIXED  matches reference for ${size} bytes`, () => {
    const result = encodeBase64_FIXED(data);
    assert(result === reference,
      `length ${result.length} vs ${reference.length}, first diff at ${
        [...result].findIndex((c, i) => c !== reference[i])
      }`);
  });

  // Test round-trip: FIXED encode → decode → compare bytes
  test(`FIXED  round-trip for ${size} bytes`, () => {
    const encoded = encodeBase64_FIXED(data);
    const decoded = decodeBase64(encoded);
    assert(arraysEqual(data, decoded),
      `decoded length ${decoded.length} vs original ${data.length}`);
  });

  // Test that BUGGY implementation FAILS for multi-chunk non-multiple-of-3 sizes
  if (size > 8192) {
    test(`BUGGY  produces wrong output for ${size} bytes (proving the bug)`, () => {
      const buggyResult = encodeBase64_BUGGY(data);
      // The buggy version should NOT match the reference for sizes > 8192
      // that aren't perfectly aligned
      if (size % 8192 !== 0 || (8192 % 3 !== 0 && size > 8192)) {
        assert(buggyResult !== reference,
          `Bug NOT demonstrated — buggy output unexpectedly matches reference`);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 2. Gzip round-trip test (simulates the actual sqliteFood.ts flow)
// ---------------------------------------------------------------------------

console.log("\n=== Gzip Round-Trip Test ===\n");

test("gzip → inflate → base64 encode → decode round-trip", async () => {
  // Dynamically import pako (same lib used in the app)
  let inflate;
  try {
    const pako = await import("pako");
    inflate = pako.inflate || pako.default?.inflate;
  } catch {
    console.log("  SKIP  pako not installed — run: npm install pako");
    return;
  }

  // Create test data that resembles a SQLite file header
  const testData = new Uint8Array(50000);
  // SQLite magic: "SQLite format 3\0"
  const magic = "SQLite format 3\0";
  for (let i = 0; i < magic.length; i++) {
    testData[i] = magic.charCodeAt(i);
  }
  // Fill rest with pseudo-random data
  for (let i = magic.length; i < testData.length; i++) {
    testData[i] = (i * 31 + 17) & 0xff;
  }

  // Compress with gzip (simulates the .gz file on Supabase)
  const compressed = gzipSync(Buffer.from(testData));

  // Simulate the app's flow:
  // 1. Read .gz as base64 (simulates FileSystem.readAsStringAsync with Base64 encoding)
  const gzBase64 = Buffer.from(compressed).toString("base64");

  // 2. Decode base64 → Uint8Array (same as sqliteFood.ts)
  const binaryStr = atob(gzBase64);
  const inputArr = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    inputArr[i] = binaryStr.charCodeAt(i);
  }

  // 3. Decompress (same as sqliteFood.ts)
  const outputArr = inflate(inputArr);

  // 4. Encode to base64 using FIXED method (same as sqliteFood.ts after fix)
  const resultBase64 = encodeBase64_FIXED(outputArr);

  // 5. Decode back (simulates what FileSystem.writeAsStringAsync does internally)
  const finalBytes = decodeBase64(resultBase64);

  // 6. Verify the round-trip matches the original data
  assert(arraysEqual(testData, finalBytes),
    `Round-trip mismatch: original ${testData.length} bytes vs final ${finalBytes.length} bytes`);

  // 7. Verify SQLite header survived
  let headerStr = "";
  for (let i = 0; i < magic.length; i++) {
    headerStr += String.fromCharCode(finalBytes[i]);
  }
  assert(headerStr === magic,
    `SQLite header corrupted: got "${headerStr}"`);

  console.log("    -> 50KB test payload: gzip → inflate → base64 → decode ✓");
  console.log("    -> SQLite header preserved ✓");
});

// ---------------------------------------------------------------------------
// 3. Specific regression: padding chars in the middle
// ---------------------------------------------------------------------------

console.log("\n=== Padding Regression Test ===\n");

test("FIXED output has no '=' padding except at the very end", () => {
  // 20000 bytes → will span multiple chunks
  const data = new Uint8Array(20000);
  for (let i = 0; i < data.length; i++) data[i] = i & 0xff;

  const encoded = encodeBase64_FIXED(data);

  // Find all '=' positions
  const padPositions = [];
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === "=") padPositions.push(i);
  }

  // All padding must be at the very end
  if (padPositions.length > 0) {
    const firstPad = padPositions[0];
    assert(firstPad >= encoded.length - 2,
      `Padding found at position ${firstPad} of ${encoded.length} — should only be at end`);
    // All remaining chars after first '=' must also be '='
    for (let i = firstPad; i < encoded.length; i++) {
      assert(encoded[i] === "=",
        `Non-padding char '${encoded[i]}' found after padding at position ${i}`);
    }
  }
});

test("BUGGY output HAS '=' padding in the middle (proving the bug)", () => {
  const data = new Uint8Array(20000);
  for (let i = 0; i < data.length; i++) data[i] = i & 0xff;

  const encoded = encodeBase64_BUGGY(data);

  // Find '=' NOT at the end
  let hasMiddlePadding = false;
  for (let i = 0; i < encoded.length - 2; i++) {
    if (encoded[i] === "=" && encoded[i + 1] !== "=" && i < encoded.length - 1) {
      // There's a non-'=' char after a '=' — that's mid-string padding
      hasMiddlePadding = true;
      break;
    }
  }

  // Actually, just check if '=' appears before the last 2 chars
  const body = encoded.slice(0, -2);
  hasMiddlePadding = body.includes("=");

  assert(hasMiddlePadding,
    "Expected buggy encoder to produce mid-string padding, but it didn't");
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
