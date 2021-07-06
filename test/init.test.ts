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
import SplunkRum from '../src/index';
import { context, trace } from '@opentelemetry/api';
import * as tracing from '@opentelemetry/tracing';
import { deinit, initWithDefaultConfig, SpanCapturer } from './utils';
import sinon from 'sinon';
import { expect } from 'chai';

function doesBeaconUrlEndWith(suffix) {
  const sps = (SplunkRum.provider.getActiveSpanProcessor() as any)._spanProcessors;
  // TODO: refactor to make beaconUrl field private
  const beaconUrl = sps[0]._exporter.beaconUrl;
  assert.ok(beaconUrl.endsWith(suffix), `Checking beaconUrl if (${beaconUrl}) ends with ${suffix}`);
}

describe('test init', () => {
  const capturer = new SpanCapturer();

  describe('not specifying beaconUrl', () => {
    it('should not be inited', () => {
      try {
        SplunkRum.init({ beaconUrl: undefined, app: 'app', rumAuth: undefined });
        assert.ok(false, 'Initializer finished.'); // should not get here
      } catch (expected) {
        assert.ok(SplunkRum.inited === false, 'SplunkRum should not be inited.');
      }
    });
  });
  describe('should enforce secure beacon url', () => {
    it('should not be inited with http', () => {
      try {
        SplunkRum.init({ beaconUrl: 'http://127.0.0.1:8888/insecure', app: 'app', rumAuth: undefined });
        assert.ok(false);
      } catch(e) {
        assert.ok(SplunkRum.inited === false);
      }
    });
    it('should init with https', () => {
      const path = '/secure';
      SplunkRum.init({ beaconUrl: `https://127.0.0.1:8888/${path}`, app: 'app', rumAuth: undefined });
      assert.ok(SplunkRum.inited);
      doesBeaconUrlEndWith(path);
      SplunkRum.deinit();
    });
    it('can be forced via allowInsecureBeacon option', () => {
      const path = '/insecure';
      SplunkRum.init({
        beaconUrl: `http://127.0.0.1:8888/${path}`,
        allowInsecureBeacon: true,
        app: 'app',
        rumAuth: undefined,
      });
      assert.ok(SplunkRum.inited);
      doesBeaconUrlEndWith(path);
      SplunkRum.deinit();
    });
  });
  describe('successful', () => {
    it('should have been inited properly with doc load spans', (done) => {
      SplunkRum.init({
        beaconUrl: 'https://127.0.0.1:9999/foo',
        app: 'my-app',
        environment: 'my-env',
        globalAttributes: { customerType: 'GOLD' },
        instrumentations:{
          websocket: true
        },
        rumAuth: undefined,
      });
      assert.ok(SplunkRum.inited);
      SplunkRum.provider.addSpanProcessor(capturer);
      setTimeout(()=> {
        assert.ok(capturer.spans.length >= 3);
        const docLoadTraceId = capturer.spans.find(span => span.name === 'documentLoad')?.spanContext().traceId;

        capturer.spans.filter(span => span.attributes['component'] === 'document-load').forEach(span => {
          assert.strictEqual(span.spanContext().traceId, docLoadTraceId);
        });

        const documentFetchSpan = capturer.spans.find(span => span.name === 'documentFetch');
        assert.ok(documentFetchSpan, 'documentFetch span presence.');
        if (!navigator.userAgent.includes('Firefox')) {
          assert.strictEqual(documentFetchSpan.attributes['link.spanId'], '0000000000000002');
        }

        const documentLoadSpan = capturer.spans.find(span => span.name === 'documentLoad');
        assert.ok(documentLoadSpan, 'documentLoad span presence.');
        assert.ok(/^[0-9]+x[0-9]+$/.test(documentLoadSpan.attributes['screen.xy'] as string));

        const resourceFetchSpan = capturer.spans.find(span => span.name === 'resourceFetch');
        assert.ok(resourceFetchSpan, 'resourceFetch span presence.');

        SplunkRum.deinit();
        done();
      }, 1000);
    });
  });
  describe('double-init has no effect', () => {
    it('should have been inited only once', () => {
      SplunkRum.init({ beaconUrl: 'https://127.0.0.1:8888/foo', app: 'app', rumAuth: undefined });
      SplunkRum.init({ beaconUrl: 'https://127.0.0.1:8888/bar', app: 'app', rumAuth: undefined });
      doesBeaconUrlEndWith('/foo');
      SplunkRum.deinit();
    });
  });
  describe('exporter option', () => {
    it ('allows setting factory', (done) => {
      const exportMock = sinon.fake();
      const onAttributesSerializingMock = sinon.fake();
      SplunkRum._internalInit({
        beaconUrl: 'https://domain1',
        allowInsecureBeacon: true,
        app: 'my-app',
        environment: 'my-env',
        globalAttributes: { customerType: 'GOLD' },
        bufferTimeout: 0,
        exporter: {
          onAttributesSerializing: onAttributesSerializingMock,
          _factory: (options) => {
            expect(options.onAttributesSerializing).to.eq(onAttributesSerializingMock);
            return {
              'export': exportMock,
              shutdown: () => Promise.resolve(),
            };
          },
        },
        rumAuth: undefined,
      });
      SplunkRum.provider.getTracer('test').startSpan('testSpan').end();
      setTimeout(() => {
        expect(exportMock.called).to.eq(true);
        done();
      });
    });
  });
});

describe('creating spans is possible', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  // FIXME figure out ways to validate zipkin 'export', sendBeacon, etc. etc.
  it('should have extra fields added', () => {
    const tracer = SplunkRum.provider.getTracer('test');
    const span = tracer.startSpan('testSpan');
    context.with(trace.setSpan(context.active(), span), () => {
      assert.deepStrictEqual(trace.getSpan(context.active()), span);
    });
    span.end();

    const exposedSpan = span as tracing.Span;
    assert.ok(exposedSpan.attributes['splunk.rumSessionId'], 'Checking splunk.rumSessionId');
    assert.ok(exposedSpan.attributes['splunk.rumVersion'], 'Checking splunk.rumVersion');
    assert.ok(exposedSpan.attributes['location.href'], 'Checking location.href');
    assert.ok(exposedSpan.attributes['splunk.scriptInstance'], 'Checking splunk.scriptInstance');
    assert.strictEqual(exposedSpan.attributes['app'], 'my-app');
    assert.strictEqual(exposedSpan.attributes['environment'], 'my-env');
    assert.strictEqual(exposedSpan.attributes.customerType, 'GOLD');
  });
});

describe('setGlobalAttributes', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it('should have extra fields added', () => {
    const tracer = SplunkRum.provider.getTracer('test');
    SplunkRum.setGlobalAttributes({ newKey: 'newVal' });
    const span = tracer.startSpan('testSpan');
    span.end();

    const exposedSpan = span as tracing.Span;
    assert.strictEqual(exposedSpan.attributes.newKey, 'newVal');
    assert.strictEqual(exposedSpan.attributes.customerType, 'GOLD');
  });
});

// Doesn't actually test the xhr additions we've made (with Server-Timing), but just that
// we didn't mess up the basic flow/behavior of the plugin
describe('test xhr', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it('should capture an xhr span', (done) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', location.href);
    xhr.addEventListener('loadend', () => {
      setTimeout(() => {
        const span = capturer.spans[capturer.spans.length-1];
        assert.strictEqual(span.name, 'HTTP GET');
        assert.strictEqual(span.attributes.component, 'xml-http-request');
        assert.ok(span.attributes['http.response_content_length'] > 0);
        assert.strictEqual(span.attributes['link.spanId'], '0000000000000002');
        assert.strictEqual(span.attributes['http.url'], location.href);
        done();
      }, 3000);
    });
    capturer.clear();
    xhr.send();
  });
});

// See above comment on xhr test
describe('test fetch', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it('should capture a fetch span', (done) => {
    window.fetch(location.href).then(() => {
      setTimeout(() => {
        const fetchSpan = capturer.spans.find(span => span.attributes.component === 'fetch');
        assert.ok(fetchSpan, 'Check if fetch span is present.');
        assert.strictEqual(fetchSpan.name, 'HTTP GET');

        // note: temporarily disabled because of instabilities in OTel's code
        // assert.ok(fetchSpan.attributes['http.response_content_length'] > 0, 'Checking response_content_length.');

        assert.strictEqual(fetchSpan.attributes['link.spanId'], '0000000000000002');
        assert.strictEqual(fetchSpan.attributes['http.url'], location.href);
        done();
      }, 3000);
    });
  });
});

function reportError() {
  throw new Error('You can\'t fight in here; this is the war room!');
}

function callChain() {
  reportError();
}

describe('test error', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it('should capture an error span', (done) => {
    const origOnError = window.onerror;
    window.onerror = function() {
      // nop to prevent failing the test
    };
    capturer.clear();
    // cause the error
    setTimeout(() => {
      callChain();
    }, 10);
    // and later look for it
    setTimeout(() => {
      window.onerror = origOnError; // restore proper error handling
      const span = capturer.spans[capturer.spans.length - 1];
      assert.strictEqual(span.attributes.component, 'error');
      assert.strictEqual(span.name, 'onerror');
      expect(span.attributes['error.stack']).to.match(/callChain/);
      expect(span.attributes['error.stack']).to.match(/reportError/);
      expect(span.attributes['error.message']).to.match(/war room/);
      done();
    }, 100);
  });
});

function throwBacon() {
  throw new Error('bacon');
}
describe('test unhandled promise rejection', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it ('should report a span', (done) => {
    Promise.resolve('ok').then(() => {
      throwBacon();
    });
    setTimeout(() => {
      const errorSpan = capturer.spans.find(span => span.attributes.component === 'error');
      expect(errorSpan).to.exist;
      expect(errorSpan.attributes.error).to.be.true;
      expect(errorSpan.attributes['error.stack']).to.match(/throwBacon/);
      expect(errorSpan.attributes['error.message']).to.match(/bacon/);
      done();
    }, 100);
  });
});

describe('test console.error', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it ('should report a span', (done) => {
    console.error('has', 'some', 'args');
    setTimeout(() => {
      const errorSpan = capturer.spans.find(span => span.attributes.component === 'error');
      assert.ok(errorSpan);
      assert.strictEqual(errorSpan.attributes['error.message'], 'has some args');
      done();
    }, 100);
  });
});

describe('test unloaded img', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it('should report a span', (done) => {
    capturer.clear();

    const img = document.createElement('img');
    img.src = location.href + '/IAlwaysWantToUseVeryVerboseDescriptionsWhenIHaveToEnsureSomethingDoesNotExist.jpg';
    document.body.appendChild(img);
    setTimeout(() => {
      const span = capturer.spans.find(s => s.attributes.component === 'error');
      expect(span).to.exist;
      assert.strictEqual(span.name, 'eventListener.error');
      assert.ok((span.attributes.target_src as string).endsWith('DoesNotExist.jpg'));

      done();
    }, 100);
  });
});

describe('test manual report', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it('should not report useless items', () => {
    capturer.clear();
    SplunkRum.error('');
    SplunkRum.error();
    SplunkRum.error([]);
    SplunkRum.error({});
    assert.strictEqual(capturer.spans.length, 0);
  });
});

describe('test route change', () => {
  let capturer = undefined;
  beforeEach(() => {
    capturer = new SpanCapturer();
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it('should report a span', () => {
    const oldUrl = location.href;
    capturer.clear();
    history.pushState({}, 'title', '/thisIsAChange#WithAHash');
    const span = capturer.spans.find( s => s.attributes.component === 'user-interaction');
    assert.ok(span, 'Check if user-interaction span is present.');
    assert.strictEqual(span.name, 'routeChange');
    assert.ok(span.attributes['location.href'].includes('/thisIsAChange#WithAHash'));
    assert.strictEqual(oldUrl, span.attributes['prev.href']);
    history.pushState({}, 'title', '/');
  });
  it('should capture location.hash changes', (done) => {
    const oldUrl = location.href;
    location.hash = '#hashChange';
    setTimeout(()=>{
      const span = capturer.spans.find(s => s.attributes.component === 'user-interaction');
      assert.ok(span, 'Check if user-interaction span is present.');
      assert.strictEqual(span.name, 'routeChange');
      assert.ok(span.attributes['location.href'].includes('#hashChange'));
      assert.strictEqual(oldUrl, span.attributes['prev.href']);
      history.pushState({}, 'title', '/');
      done();
    }, 0);
  });
});

describe('can remove wrapped event listeners', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it('does not break behavior', () => {
    let called = false;
    const listener = function() {
      called = true;
    };
    document.body.addEventListener('testy', listener);
    document.body.dispatchEvent(new Event('testy'));
    assert.strictEqual(called, true);
    called = false;
    document.body.removeEventListener('testy', listener);
    document.body.dispatchEvent(new Event('testy'));
    assert.strictEqual(called, false);
  });
});

describe('can produce click events', () => {
  const capturer = new SpanCapturer();
  beforeEach(() => {
    initWithDefaultConfig(capturer);
  });
  afterEach(() => {
    deinit();
  });

  it('creates a span for them', () => {
    capturer.clear();
    document.body.addEventListener('dblclick', function() { /* nop */});
    document.body.dispatchEvent(new Event('dblclick'));
    assert.strictEqual(capturer.spans.length, 1);
    assert.strictEqual(capturer.spans[0].name, 'dblclick');
    assert.strictEqual(capturer.spans[0].attributes.component, 'user-interaction');
  });
});
