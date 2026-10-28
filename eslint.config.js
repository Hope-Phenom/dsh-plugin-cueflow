import globals from 'globals'

export default [
  {
    ignores: [
      'node_modules/**',
      'lib/client.js',
      'lib/client.js.map',
      '.ui-dist/**',
      '.screenshots/**',
      'test-results/**',
      'playwright-report/**',
      '.transfer/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-dupe-keys': 'error',
      'no-redeclare': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(h|Fragment|_).*' }],
    },
  },
]


