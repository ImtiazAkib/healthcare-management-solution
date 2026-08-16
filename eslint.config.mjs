import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import cSpellConfigs from '@cspell/eslint-plugin/configs';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import tailwindCanonicalClasses from 'eslint-plugin-tailwind-canonical-classes';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  cSpellConfigs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      prettier: eslintPluginPrettier,
      'tailwind-canonical-classes': tailwindCanonicalClasses,
      'unused-imports': eslintPluginUnusedImports,
    },
    rules: {
      'prettier/prettier': 'error',
      'tailwind-canonical-classes/tailwind-canonical-classes': [
        'error',
        {
          cssPath: './app/globals.css',
        },
      ],
      '@cspell/spellchecker': [
        'error',
        {
          configFile: './cspell.config.json',
        },
      ],
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // node built-ins
            'external', // npm packages
            'internal', // aliases like @/*
            ['parent', 'sibling', 'index'], // relative imports
            'object',
            'type',
          ],
          pathGroups: [
            // React
            {
              pattern: 'react',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: 'react/**',
              group: 'builtin',
              position: 'before',
            },
            // Next.js
            {
              pattern: 'next',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: 'next/**',
              group: 'builtin',
              position: 'before',
            },
            // Internal aliases
            {
              pattern: 'types',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@/types/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@/constants/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@/config/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@/lib/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@/hooks/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@/components/ui/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@/components/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@/styles/**',
              group: 'internal',
              position: 'after',
            },
            // CSS / SCSS
            {
              pattern: '*.s?(c)ss',
              group: 'index',
              patternOptions: { matchBase: true },
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          warnOnUnassignedImports: true,
          'newlines-between': 'always',
        },
      ],
      'no-unused-vars': 'off', // or "@typescript-eslint/no-unused-vars": "off",
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      // non-null assertion
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
