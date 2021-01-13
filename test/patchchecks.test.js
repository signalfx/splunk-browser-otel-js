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

import * as assert from 'assert';
import {DocumentLoad} from '@opentelemetry/plugin-document-load';
import {UserInteractionPlugin} from '@opentelemetry/plugin-user-interaction';
import {XMLHttpRequestInstrumentation} from '@opentelemetry/instrumentation-xml-http-request';
import {FetchPlugin} from '@opentelemetry/plugin-fetch';

// These are test-time checks that the methods we're patching at least still exist
// when new upstream versions are pulled.
describe('check patching assumptions', () => {
  it('docload', () => {
    assert.ok(typeof new DocumentLoad()._endSpan === 'function');
    assert.ok(typeof new DocumentLoad()._getEntries === 'function');
  });
  it('userinteraction', () => {
    assert.ok(typeof new UserInteractionPlugin().patch === 'function');
    assert.ok(typeof new UserInteractionPlugin()._allowEventType === 'function');
    assert.ok(typeof new UserInteractionPlugin()._patchHistoryMethod === 'function');
  });
  it('xhr', () => {
    assert.ok(typeof new XMLHttpRequestInstrumentation()._createSpan === 'function');
  });
  it('fetch', () => {
    assert.ok(typeof new FetchPlugin()._addFinalSpanAttributes === 'function');
  });
  // WebTracerProvider/getTracer/startSpan chain is entirely public APIs and well tested already
});
