/**
 * Design-system conformance scanner — shared between the jest ratchet test
 * (tokenConformance.test.ts) and the baseline-regeneration one-liner. Plain
 * CommonJS (no TS/JSX) so it can be `require()`d directly from a bare `node
 * -e` invocation without a build step, matching the DESIGN.md banned-pattern
 * list (see DESIGN.md §8).
 */
const fs = require('fs');
const path = require('path');

const PATTERNS = {
  GlassCard: /\bGlassCard\b/g,
  flatColors: /\bflatColors\b|\bflatFontSize\b|\bflatShadows\b/g,
  fontWeight: /\bfontWeight\b/g,
  shadowColor: /\bshadowColor\b/g,
  elevationColon: /\belevation\s*:/g,
  boxShadow: /\bboxShadow\b/g,
};

const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx']);
const EXCLUDE_DIR_NAMES = new Set(['node_modules', '__tests__', '.expo', '__mocks__']);

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (SCAN_EXT.has(path.extname(entry.name))) {
      if (/\.(test|spec)\.[tj]sx?$/.test(entry.name)) continue;
      if (entry.name.endsWith('.d.ts')) continue;
      files.push(path.join(dir, entry.name));
    }
  }
}

/**
 * @param {string} srcDir absolute path to the `src` directory to scan
 * @returns {Record<string, Record<string, number>>} counts keyed by
 *   repo-relative directory (e.g. "src/components/diet"), then by pattern name
 */
function scanConformance(srcDir) {
  const files = [];
  walk(srcDir, files);
  const repoRoot = path.join(srcDir, '..');
  const counts = {};
  for (const file of files) {
    const rel = path.relative(repoRoot, file);
    const dir = path.dirname(rel).split(path.sep).join('/');
    const content = fs.readFileSync(file, 'utf8');
    for (const [name, re] of Object.entries(PATTERNS)) {
      re.lastIndex = 0;
      const m = content.match(re);
      if (m && m.length) {
        if (!counts[dir]) counts[dir] = {};
        counts[dir][name] = (counts[dir][name] || 0) + m.length;
      }
    }
  }
  return counts;
}

module.exports = { scanConformance, PATTERNS };
