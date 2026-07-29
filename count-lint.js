const { spawnSync } = require('child_process');

const result = spawnSync('npx', ['eslint', 'src/', '--rule', 'prettier/prettier:off', '-f', 'json'], {
  encoding: 'utf8',
  maxBuffer: 100 * 1024 * 1024,
  shell: true,
});

const out = result.stdout || '';
let data;
try {
  data = JSON.parse(out);
} catch (e) {
  console.error('Failed to parse JSON. First 500 chars of stdout:');
  console.error(out.substring(0, 500));
  console.error('stderr:', result.stderr?.substring(0, 500));
  process.exit(1);
}

const counts = data
  .map(f => ({
    file: f.filePath.replace(/\\/g, '/'),
    errors: f.messages.filter(m => m.severity === 2).length,
    byRule: f.messages.filter(m => m.severity === 2).reduce((acc, m) => { acc[m.ruleId] = (acc[m.ruleId] || 0) + 1; return acc; }, {})
  }))
  .filter(f => f.errors > 0)
  .sort((a, b) => b.errors - a.errors);

console.log('=== TOP 25 FILES BY ERROR COUNT ===');
counts.slice(0, 25).forEach(f => console.log(`${f.errors}\t${f.file}`));

console.log('\n=== TOTAL ERRORS ===');
const total = counts.reduce((s, f) => s + f.errors, 0);
console.log(`${total} errors across ${counts.length} files`);

console.log('\n=== TOP RULES ===');
const ruleTotals = {};
counts.forEach(f => Object.entries(f.byRule).forEach(([r, c]) => { ruleTotals[r] = (ruleTotals[r] || 0) + c; }));
Object.entries(ruleTotals).sort((a, b) => b[1] - a[1]).forEach(([r, c]) => console.log(`${c}\t${r}`));
