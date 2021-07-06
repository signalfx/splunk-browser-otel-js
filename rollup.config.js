/* eslint-disable header/header */

import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import { babel } from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';

const {
  babelPlugin,
  nodeResolvePlugin,
  replacePlugin,
} = require('./rollup.shared');

export default [
  {
    input: 'src/indexBrowser.ts',
    output: {
      file: 'dist/artifacts/splunk-otel-web.js',
      format: 'iife',
      name: 'SplunkRum',
      sourcemap: true,
    },
    plugins: [
      json(),
      replacePlugin,
      nodeResolvePlugin,
      commonjs({
        include: /node_modules/,
        sourceMap: true,
        transformMixedEsModules: true,
      }),
      typescript({ tsconfig: './tsconfig.base.json' }),
      babelPlugin,
      terser({ output: { comments: false } }),
    ],
    context: 'window',
  },
  {
    input: 'src/indexBrowser.ts',
    output: {
      file: 'dist/artifacts/splunk-otel-web-legacy.js',
      format: 'iife',
      name: 'SplunkRum',
      sourcemap: true,
    },
    plugins: [
      json(),
      replacePlugin,
      nodeResolvePlugin,
      commonjs({
        include: /node_modules/,
        sourceMap: true,
        transformMixedEsModules: true,
      }),
      typescript({ tsconfig: './tsconfig.base.json' }),
      babel({
        babelHelpers: 'runtime',
        envName: 'legacy',
        extensions: ['.js', '.es6', '.es', 'mjs', '.ts'],
        exclude: [
          /node_modules\/core-js/
        ]
      }),
      terser({
        ecma: 5,
        output: {
          comments: false
        }
      }),
    ],
    context: 'window',
  },
  {
    input: 'src/inlineErrorReporterBrowser.ts',
    output: {
      file: 'dist/artifacts/splunk-otel-web-inline.js',
      format: 'iife',
      sourcemap: true,
    },
    plugins: [
      json(),
      replacePlugin,
      nodeResolvePlugin,
      commonjs({
        include: /node_modules/,
        sourceMap: true,
      }),
      typescript({ tsconfig: './tsconfig.base.json' }),
      babelPlugin,
      terser({ output: { comments: false } }),
    ],
  },
];
