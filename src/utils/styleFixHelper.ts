/**
 * Style Fix Helper - Utility to systematically fix style issues
 * This helper provides functions to fix common React Native style problems
 */

interface StyleFix {
  pattern: RegExp;
  replacement: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface FixResult {
  success: boolean;
  fixesApplied: number;
  description: string;
  details: string[];
}

export class StyleFixHelper {
  /**
   * Common style fixes for React Native compatibility
   */
  private static readonly STYLE_FIXES: StyleFix[] = [
    // FontWeight fixes
    {
      pattern: /fontWeight:\s*['"]300['"]/g,
      replacement: 'fontWeight: THEME.fontWeight.light',
      description: 'Replace fontWeight: "300" with THEME constant',
      riskLevel: 'low',
    },
    {
      pattern: /fontWeight:\s*['"]400['"]/g,
      replacement: 'fontWeight: THEME.fontWeight.normal',
      description: 'Replace fontWeight: "400" with THEME constant',
      riskLevel: 'low',
    },
    {
      pattern: /fontWeight:\s*['"]500['"]/g,
      replacement: 'fontWeight: THEME.fontWeight.medium',
      description: 'Replace fontWeight: "500" with THEME constant',
      riskLevel: 'low',
    },
    {
      pattern: /fontWeight:\s*['"]600['"]/g,
      replacement: 'fontWeight: THEME.fontWeight.semibold',
      description: 'Replace fontWeight: "600" with THEME constant',
      riskLevel: 'low',
    },
    {
      pattern: /fontWeight:\s*['"]700['"]/g,
      replacement: 'fontWeight: THEME.fontWeight.bold',
      description: 'Replace fontWeight: "700" with THEME constant',
      riskLevel: 'low',
    },
    {
      pattern: /fontWeight:\s*['"]800['"]/g,
      replacement: 'fontWeight: THEME.fontWeight.extrabold',
      description: 'Replace fontWeight: "800" with THEME constant',
      riskLevel: 'low',
    },
    {
      pattern: /fontWeight:\s*['"]bold['"]/g,
      replacement: 'fontWeight: THEME.fontWeight.bold',
      description: 'Replace fontWeight: "bold" with THEME constant',
      riskLevel: 'low',
    },
    {
      pattern: /fontWeight:\s*['"]normal['"]/g,
      replacement: 'fontWeight: THEME.fontWeight.normal',
      description: 'Replace fontWeight: "normal" with THEME constant',
      riskLevel: 'low',
    },

    // LineHeight fixes (potentially dangerous - remove or convert to multipliers)
    {
      pattern: /lineHeight:\s*\d+,/g,
      replacement: '// lineHeight: removed (causes HostFunction errors),',
      description: 'Comment out lineHeight with fixed values',
      riskLevel: 'high',
    },

    // FontFamily fixes (potentially dangerous)
    {
      pattern: /fontFamily:\s*['"][^'"]*['"],?/g,
      replacement: '// fontFamily: removed (causes compatibility issues),',
      description: 'Comment out fontFamily declarations',
      riskLevel: 'medium',
    },
  ];

  /**
   * Apply style fixes to a file content
   */
  static applyStyleFixes(content: string, riskLevel: 'low' | 'medium' | 'high' = 'low'): FixResult {
    let modifiedContent = content;
    const appliedFixes: string[] = [];
    let totalFixes = 0;

    const riskLevels = ['low', 'medium', 'high'];
    const maxRiskIndex = riskLevels.indexOf(riskLevel);

    for (const fix of this.STYLE_FIXES) {
      const fixRiskIndex = riskLevels.indexOf(fix.riskLevel);

      // Only apply fixes at or below the specified risk level
      if (fixRiskIndex <= maxRiskIndex) {
        const matches = modifiedContent.match(fix.pattern);
        if (matches && matches.length > 0) {
          modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
          totalFixes += matches.length;
          appliedFixes.push(`${fix.description} (${matches.length} instances)`);
        }
      }
    }

    return {
      success: totalFixes > 0,
      fixesApplied: totalFixes,
      description: `Applied ${totalFixes} style fixes`,
      details: appliedFixes,
    };
  }

  /**
   * Generate import statement for THEME if not present
   */
  static ensureThemeImport(content: string): string {
    // Check if THEME is already imported
    if (
      content.includes("from '../utils/constants'") ||
      content.includes("from '../../utils/constants'") ||
      content.includes("from '../../../utils/constants'") ||
      (content.includes('THEME') && content.includes('import'))
    ) {
      return content;
    }

    // Check if there are any THEME.fontWeight references that would need the import
    if (content.includes('THEME.fontWeight')) {
      // Find the right import path based on file structure
      const lines = content.split('\n');
      const importIndex = lines.findIndex(
        (line) => line.includes('import') && line.includes('react')
      );

      if (importIndex >= 0) {
        // Add THEME import after React import
        const themeImport = "import { THEME } from '../utils/constants';";
        lines.splice(importIndex + 1, 0, themeImport);
        return lines.join('\n');
      } else {
        // Add at the top of the file
        return `import { THEME } from '../utils/constants';\n${content}`;
      }
    }

    return content;
  }

  /**
   * Validate that all style fixes are safe
   */
  static validateFixes(
    originalContent: string,
    modifiedContent: string
  ): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for potential syntax errors
    const openBraces = (modifiedContent.match(/\{/g) || []).length;
    const closeBraces = (modifiedContent.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      issues.push('Mismatched braces detected after style fixes');
    }

    // Check for missing THEME imports
    if (
      modifiedContent.includes('THEME.fontWeight') &&
      !modifiedContent.includes('THEME') &&
      !modifiedContent.includes('import')
    ) {
      warnings.push('THEME constants used but import may be missing');
    }

    // Check for commented out styles that might be important
    const commentedStyles = modifiedContent.match(/\/\/ (lineHeight|fontFamily):/g);
    if (commentedStyles && commentedStyles.length > 0) {
      warnings.push(`Commented out ${commentedStyles.length} potentially important styles`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Get style fix statistics for a file
   */
  static getStyleStats(content: string): {
    fontWeightIssues: number;
    lineHeightIssues: number;
    fontFamilyIssues: number;
    consoleLogIssues: number;
    totalIssues: number;
  } {
    const fontWeightIssues = (content.match(/fontWeight:\s*['"][^'"]*['"]/g) || []).length;
    const lineHeightIssues = (content.match(/lineHeight:\s*\d+/g) || []).length;
    const fontFamilyIssues = (content.match(/fontFamily:\s*['"][^'"]*['"]/g) || []).length;
    const consoleLogIssues = (content.match(/console\.log/g) || []).length;

    return {
      fontWeightIssues,
      lineHeightIssues,
      fontFamilyIssues,
      consoleLogIssues,
      totalIssues: fontWeightIssues + lineHeightIssues + fontFamilyIssues + consoleLogIssues,
    };
  }
}

/**
 * Priority files that should be fixed first
 */
export const PRIORITY_FILES = [
  'src/components/ErrorBoundary.tsx',
  'src/components/AsyncInitializer.tsx',
  'src/screens/main/DietScreen.tsx',
  'src/screens/main/FitnessScreen.tsx',
  'src/screens/main/ProgressScreen.tsx',
  'src/screens/workout/WorkoutSessionScreen.tsx',
  'src/components/navigation/TabBar.tsx',
];

export default StyleFixHelper;
