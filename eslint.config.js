// ESLint v9 flat config for FitAI React Native project
const js = require('@eslint/js');
const typescript = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const react = require('eslint-plugin-react');
const reactNative = require('eslint-plugin-react-native');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  // Base JavaScript config
  js.configs.recommended,
  
  // TypeScript config
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __DEV__: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Promise: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        XMLHttpRequest: 'readonly',
        WebSocket: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-native': reactNative,
      'prettier': prettier,
    },
    rules: {
      // TypeScript rules
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      
      // React rules
      'react/prop-types': 'off', // We use TypeScript for prop validation
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+
      'react/display-name': 'off',
      
      // React Native rules
      'react-native/no-unused-styles': 'error',
      'react-native/split-platform-components': 'error',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'off',
      'react-native/no-raw-text': ['error', {
        skip: ['Button', 'Text'],
      }],
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'no-duplicate-imports': 'error',
      
      // Prettier integration
      'prettier/prettier': ['error', {
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 100,
        tabWidth: 2,
        semi: true,
        bracketSpacing: true,
        jsxBracketSameLine: false,
        arrowParens: 'always',
        endOfLine: 'auto',
      }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  
  // DESIGN.md conformance — banned visual patterns (see DESIGN.md §8).
  // Warn-level for now: ~2,300 pre-existing hits (tracked + ratcheted down by
  // src/__tests__/design/tokenConformance.test.ts) mean an immediate `error`
  // would block on legacy code the visual overhaul hasn't reached yet.
  // Promote to `error` per-directory as src/docs/VISUAL_DESIGN_OVERHAUL.md's
  // stages land and that directory's ratchet count reaches zero.
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "Property[key.name='fontWeight']",
          message:
            'DESIGN.md bans fontWeight — RN loads each weight as a separate native font file, so this silently does nothing on native. Use fontFamily / typography.variants instead.',
        },
        {
          selector: "Property[key.name='shadowColor']",
          message: 'DESIGN.md bans drop shadows. Use a border.subtle hairline for separation instead.',
        },
        {
          selector: "Property[key.name='elevation']",
          message: 'DESIGN.md bans elevation (renders as a shadow on native). Use a border.subtle hairline instead.',
        },
        {
          selector: "Property[key.name='boxShadow']",
          message: 'DESIGN.md bans boxShadow. Use a border.subtle hairline for separation instead.',
        },
        {
          selector: "ImportSpecifier[imported.name=/^(flatColors|flatFontSize|flatShadows)$/]",
          message:
            'DESIGN.md bans the deprecated flat token projections — import the nested colors/typography/shadows exports from src/theme/aurora-tokens.ts directly.',
        },
        {
          selector: "ImportSpecifier[imported.name='GlassCard']",
          message:
            'DESIGN.md is retiring GlassCard in favor of a flat surface + hairline pattern (see src/docs/VISUAL_DESIGN_OVERHAUL.md Stage 1). Avoid new usages; existing ones are being migrated.',
        },
      ],
    },
  },

  // Prettier config to disable conflicting rules
  prettierConfig,
  
  // JavaScript files (Node.js scripts) with different rules
  {
    files: ['**/*.js'],
    rules: {
      'no-undef': 'off', // Allow Node.js globals in .js files
      '@typescript-eslint/no-var-requires': 'off',
    },
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Promise: 'readonly',
        fetch: 'readonly',
        fs: 'readonly',
        path: 'readonly',
      },
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'dist/**',
      'build/**',
      '*.config.js',
      'babel.config.js',
      'metro.config.js',
      'jest.config.js',
      'jest.setup.js',
      'src/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.d.ts',
      'coverage/**',
      '.temp/**',
      '.expo-shared/**',
      '*.log',
      '*.cache',
    ],
  },
];