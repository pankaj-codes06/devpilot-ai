module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    warnOnUnsupportedTypeScriptVersion: false,
  },
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-namespace': 'off',
    'no-console': 'off',
  },
  overrides: [
    {
      files: ['apps/web/**/*.{js,jsx}', 'apps/web/*.{js,jsx}'],
      env: {
        browser: true,
      },
    },
  ],
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    'coverage',
    '*.d.ts',
    'packages/database/prisma',
    'apps/api/data',
  ],
};
