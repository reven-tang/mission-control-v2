import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      '@typescript-eslint/explicit-function-return-type': 'off', // Allow inference
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-interface': 'off',
      '@next/next/no-img-element': 'off', // We use img for images
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', '*.md'],
  }
);
