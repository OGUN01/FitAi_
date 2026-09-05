/**
 * Design-system conformance ratchet — see DESIGN.md for the banned-pattern
 * rules this enforces (GlassCard, flatColors/flatFontSize/flatShadows,
 * fontWeight, shadowColor, elevation:, boxShadow) and
 * src/docs/VISUAL_DESIGN_OVERHAUL.md for the staged rollout this test
 * guards. ~2,300 pre-existing violations cannot be fixed in one pass, so
 * this is a RATCHET, not a zero-tolerance gate: it fails if any directory's
 * count for any pattern INCREASES versus the checked-in baseline, and
 * expects counts to strictly decrease as the rollout's stages land fixes.
 *
 * To regenerate the baseline after fixing violations (counts must only go
 * DOWN — never edit this file to paper over a real increase):
 *   node -e "const p=require('path');const{scanConformance}=require('./src/__tests__/design/conformanceScan.js');require('fs').writeFileSync('src/__tests__/design/conformance-baseline.json',JSON.stringify(scanConformance(p.join(process.cwd(),'src')),null,2)+'\n')"
 */
import path from 'path';
// conformanceScan.js is plain CommonJS (no build step needed for the
// baseline-regeneration one-liner) — required, not imported, since this
// repo's tsconfig has no `allowJs` and `import` would fail `tsc --noEmit`.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { scanConformance } = require('./conformanceScan');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const baseline: Record<string, Record<string, number>> = require('./conformance-baseline.json');

describe('Design-system conformance ratchet (DESIGN.md banned patterns)', () => {
  it('never increases banned-pattern usage in any directory versus the checked-in baseline', () => {
    const current = scanConformance(path.join(__dirname, '..', '..'));
    const regressions: string[] = [];

    for (const [dir, patterns] of Object.entries(current)) {
      for (const [pattern, count] of Object.entries(patterns)) {
        const baselineCount = baseline[dir]?.[pattern] ?? 0;
        if (count > baselineCount) {
          regressions.push(
            `${dir} :: ${pattern} — baseline ${baselineCount}, now ${count} (+${count - baselineCount})`
          );
        }
      }
    }

    if (regressions.length > 0) {
      throw new Error(
        `Design-system conformance regressed in ${regressions.length} directory/pattern pair(s) ` +
          `(see DESIGN.md for the rules):\n` +
          regressions.join('\n') +
          `\n\nIf you just FIXED violations and a count legitimately went down elsewhere, that's fine ` +
          `and won't fail this test — only increases fail. If you added a new banned pattern, fix the ` +
          `code instead of the baseline.`
      );
    }
  });

  it('total banned-pattern count is trending down, not up (informational ratchet)', () => {
    const current = scanConformance(path.join(__dirname, '..', '..'));
    const sum = (obj: Record<string, Record<string, number>>) =>
      Object.values(obj).reduce(
        (acc, patterns) => acc + Object.values(patterns).reduce((a, b) => a + b, 0),
        0
      );
    const currentTotal = sum(current);
    const baselineTotal = sum(baseline);
    expect(currentTotal).toBeLessThanOrEqual(baselineTotal);
  });
});
