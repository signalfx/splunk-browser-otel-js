/*
Copyright 2021 Splunk Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

module.exports = {
  'plugins': [
    'header',
  ],
  'env': {
    'es2015': true,
    'commonjs': true,
  },
  parser: '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 2020,
    'sourceType': 'module'
  },
  extends: [
    'eslint:recommended',
  ],
  rules: {
    // regular rules calibration
    'array-callback-return': 'error',
    'block-scoped-var': 'error',
    'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
    'consistent-return': 'error',
    'curly': 'error',
    'eqeqeq': 'error',
    'indent': ['error', 2],
    'no-alert':'error',
    'no-constructor-return': 'error',
    'no-duplicate-imports': 'error',
    'no-eval': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-extra-label': 'error',
    'no-implicit-globals': 'error',
    'no-implied-eval': 'error',
    'no-mixed-operators': 'error',
    'no-octal-escape': 'error',
    'no-return-assign': 'error',
    'no-script-url': 'error',
    'no-self-compare': 'error',
    'no-shadow': 'error',
    'no-tabs': 'error',
    'no-template-curly-in-string': 'error',
    'no-throw-literal': 'error',
    'no-unneeded-ternary': 'error',
    'no-unreachable-loop': 'error',
    'no-unused-expressions': 'error',
    'no-use-before-define': 'error',
    'no-useless-backreference':'error',
    'no-useless-call': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-concat': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': 'error',
    'no-useless-return': 'error',
    'no-var': 'error',
    'object-curly-spacing': ['error', 'always'],
    'prefer-const': 'error',
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'strict': ['error', 'safe'],
    'wrap-iife': 'error',
    'yoda': 'error',

    'header/header': [2, 'block', [
      '',
      { 'pattern': 'Copyright 20\\d{2} Splunk Inc.', 'template': `Copyright ${new Date().getFullYear()} Splunk Inc.` },
      '',
      'Licensed under the Apache License, Version 2.0 (the "License");',
      'you may not use this file except in compliance with the License.',
      'You may obtain a copy of the License at',
      '',
      'http://www.apache.org/licenses/LICENSE-2.0',
      '',
      'Unless required by applicable law or agreed to in writing, software',
      'distributed under the License is distributed on an "AS IS" BASIS,',
      'WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.',
      'See the License for the specific language governing permissions and',
      'limitations under the License.',
      '',
    ], 2],
  },
  'overrides': [
    {
      files: ['src/**/*.ts', 'test/**/*.ts'],
      env: {
        'browser': true,
      },
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        'no-shadow': 'off', // TS has its dedicated rule, the JS one breaks
        'no-unused-expressions': 'off',
        '@typescript-eslint/brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
        '@typescript-eslint/explicit-function-return-type': 'off', // to be discussed
        '@typescript-eslint/no-unused-vars': 'error',

        // temporarily disabled rules, as we transition to Typescript
        '@typescript-eslint/no-empty-function': 'warn',
        '@typescript-eslint/no-this-alias': 'warn',
        '@typescript-eslint/explicit-module-boundary-types': ['error', {
          allowArgumentsExplicitlyTypedAsAny: true, // temporarily till code is completely migrated
        }],
      }
    },
    {
      'files': [
        'integration-tests/**/*.js',
        'utils/**/*.js',
        'karma.conf.js'
      ],
      'env': {
        'node': true,
        'browser': true,
      },
    },
    {
      'files': ['test/**/*.ts'],
      'env': {
        'node': true,
        mocha: true,
      },
    },
    {
      'files': ['examples/**/*.js'],
      rules: {
        'header/header': 'off',
      },
    },
  ]
};
