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
const specUtils = require('../spec-utils');

module.exports = {
  afterEach : function(browser) {
    browser.globals.clearReceivedSpans();  
  },
  'span created for fetch includes all properties': async function(browser) {
    await browser.url(`${browser.globals.baseUrl}fetch/fetch.ejs`);

    const fetchSpan = await browser.globals.findSpan(span => span.tags['http.url'] === '/some-data');
    await browser.assert.ok(!!fetchSpan, 'Fetch span found.');
    await browser.assert.strictEqual(fetchSpan.tags['component'], 'fetch');
    await browser.assert.strictEqual(fetchSpan.tags['http.status_code'], '200');
    await browser.assert.strictEqual(fetchSpan.tags['http.status_text'], 'OK');
    await browser.assert.strictEqual(fetchSpan.tags['http.method'], 'GET');
    await browser.assert.strictEqual(fetchSpan.tags['http.url'], '/some-data');
    if (browser.options.desiredCapabilities.browserName.toLowerCase() !==  'safari') {
      await browser.assert.strictEqual(fetchSpan.tags['http.response_content_length'], '49');
    }
    await browser.assert.ok(fetchSpan.tags['link.traceId']);
    await browser.assert.ok(fetchSpan.tags['link.spanId']);
    await specUtils.timesMakeSense(browser, fetchSpan.annotations, 'domainLookupStart', 'domainLookupEnd');
    await specUtils.timesMakeSense(browser, fetchSpan.annotations, 'connectStart', 'connectEnd');
    await specUtils.timesMakeSense(browser, fetchSpan.annotations, 'secureConnectionStart', 'connectEnd');
    await specUtils.timesMakeSense(browser, fetchSpan.annotations, 'requestStart', 'responseStart');
    await specUtils.timesMakeSense(browser, fetchSpan.annotations, 'responseStart', 'responseEnd');
    await specUtils.timesMakeSense(browser, fetchSpan.annotations, 'fetchStart', 'responseEnd');
  },
  'fetch request can be ignored': async function(browser) {
    await browser.url(`${browser.globals.baseUrl}fetch/fetch-ignored.ejs`);
    
    await browser.globals.findSpan(span => span.name === 'guard-span');

    await browser.assert.not.ok(browser.globals.receivedSpans.find(span => span.tags['http.url'] === '/some-data'));
    await browser.assert.not.ok(browser.globals.receivedSpans.find(span => span.tags['http.url'] === '/no-server-timings'));
  }
};
