/*
Copyright 2020 Splunk Inc.

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

const json = require('@rollup/plugin-json');
const istanbulrollup = require('rollup-plugin-istanbul');
const rollupPolyfills = require('rollup-plugin-node-polyfills');
const typescript = require('@rollup/plugin-typescript');

const {
  nodeResolvePlugin, commonjsPlugin, replacePlugin,
} = require('./rollup.shared');

process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function (config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'websocket-server'],
    client: {
      mocha: {
        timeout: 6000
      },
      useIframe: false,
      runInParent: true,
    },
    websocketServer: {
      port: 8979,
      beforeStart: (server) => {
        server.on('request', (request) => {
          const cx = request.accept(request.requestedProtocols ? request.requestedProtocols[0] : null, request.origin);
          cx.on('message', function(msg) {
            // allow client to terminate the connection from the server to expand unit testing possibilities
            if(msg.utf8Data === 'close') {
              console.log('closing ws connection');
              cx.close();
            }
            cx.sendUTF('Response');
          });
        });
      },
    },

    // These custom headers allow us to test the Server-Timing trace linkage code
    customHeaders: [{
      match: '.*',
      name: 'Server-Timing',
      value: 'traceparent;desc="00-00000000000000000000000000000001-0000000000000002-01"'
    }, {
      match: '.*',
      name: 'Access-Control-Expose-Headers',
      value: 'Server-Timing'
    }],

    // list of files / patterns to load in the browser
    files: [
      'test/index.ts',
    ],

    // list of files / patterns to exclude
    exclude: [],

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    browsers: [],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: 1,

    rollupPreprocessor: {
      plugins: [
        json(),
        replacePlugin,
        nodeResolvePlugin,
        commonjsPlugin,
        typescript({ tsconfig: './tsconfig.test.json' }),
        rollupPolyfills(),
        istanbulrollup({
          exclude: [
            /node_modules/,
            'karma.conf.js',
            'rollup.shared.js',
            'dist/**',
          ],
        }),
      ],
      input: 'test/index.ts',
      output: {
        file: 'bundle.js',
        format: 'iife',
        sourcemap: true,
      },
      context: 'window',
    },
    coverageIstanbulReporter: {
      reports: ['json'],
      dir: '.nyc_output',
      combineBrowserReports: true,
      fixWebpackSourcePaths: true,
      thresholds: {
        emitWarning: false,
        global: {
          statements: 90,
        },
      },
    },

    reporters: ['progress', 'spec', 'coverage-istanbul'],
    preprocessors: { 'test/index.ts': ['rollup'] },
  });
};
