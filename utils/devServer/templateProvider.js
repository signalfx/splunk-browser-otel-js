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

const path = require('path');
const fs = require('fs');

const { render } = require('ejs');

const INJECT_TEMPLATE = `<script src="<%= file -%>" crossorigin="anonymous"></script>
  <script>
    <%if (noInit) { %>
      window.SplunkRumOptions = <%- options -%>;
    <% } else { %>
      window.SplunkRum && window.SplunkRum.init(<%- options -%>);
    <% } %>

    var _testing = false;
    var _onTestingDone = null;
    Object.defineProperty(window, 'testing', {
      get: function() {
        return _testing;
      },
      set: function(value) {
        _testing = value;
        setTimeout(function () {
          if (_onTestingDone) {
            _flushData(_onTestingDone);
            _onTestingDone = null;
          }
        }, 0);
      }
    });
    function _flushData(done) {
      if (!window.SplunkRum) {
        done(null);
      }

      var len = SplunkRum._processor._finishedSpans.length;
      var lastId = null;
      if (len > 0) {
        lastId = SplunkRum._processor._finishedSpans[len - 1].spanContext.spanId;
      }

      SplunkRum._processor.forceFlush().then(function () {
        done(lastId);
      }, function () {
        done(null);
      });
    }
    function waitForTestToFinish(done) {
      if (document.readyState !== 'complete') {
        window.addEventListener('load', function () {
          waitForTestToFinish(done);
        });
      }

      if (_testing) {
        _onTestingDone = done;
        return;
      }

      _flushData(done);
    }
  </script>
`;

exports.registerTemplateProvider = ({ app, addHeaders, enableHttps }) => {
  app.use(function(req, res, next) {
    const filepath = path.resolve(__dirname, '..', '..', 'integration-tests', 'tests', req.path.substring(1));
    if (fs.existsSync(filepath)) {
      const beaconUrl = new URL(`${enableHttps ? 'https' : 'http'}://${req.headers.host}/api/v2/spans`);
      if (req.query.beaconPort) {
        beaconUrl.port = req.query.beaconPort;
      }

      let defaultFile = '/dist/artifacts/splunk-otel-web.js';
      const browser = req.header('User-Agent');
      if (browser && browser.includes('Trident')) {
        defaultFile = '/dist/artifacts/splunk-otel-web-legacy.js';
      }

      addHeaders(res);
      return res.render(filepath, {
        httpPort: app.get('httpPort'),
        renderAgent(userOpts = {}, noInit = false, file = defaultFile, cdnVersion = null) {
          const options = {
            beaconUrl: beaconUrl.toString(),
            app: 'splunk-otel-js-dummy-app',
            debug: true,
            bufferTimeout: require('../../integration-tests/utils/globals').GLOBAL_TEST_BUFFER_TIMEOUT,
            ...userOpts
          };

          if (req.query.disableInstrumentation) {
            if (!options.instrumentations) {
              options.instrumentations = {};
            }

            req.query.disableInstrumentation.split(',').forEach(instrumentation => {
              options.instrumentations[instrumentation] = false;
            });
          }

          if (cdnVersion) {
            file = `https://cdn.signalfx.com/o11y-gdi-rum/${cdnVersion}/splunk-otel-web.js`;
          }

          return render(INJECT_TEMPLATE, {
            file,
            noInit,
            options: JSON.stringify(options)
          });
        },
        renderInlineAgent() {
          const snippetPath = path.resolve(__dirname, '..', '..', 'dist', 'artifacts', 'splunk-otel-web-inline.js');
          const script = fs.readFileSync(snippetPath);
          return `<script>${script.toString('utf-8')}</script>`;
        },
      });
    }
    return next();
  });
};
