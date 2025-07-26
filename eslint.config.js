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
  
  // Prettier config to disable conflicting rules
  prettierConfig,
  
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
    ],
  },
];