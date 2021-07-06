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

import * as shimmer from 'shimmer';
import { getElementXPath } from '@opentelemetry/web';
import { limitLen } from './utils';
import { diag, SpanAttributes } from '@opentelemetry/api';
import { hrTime } from '@opentelemetry/core';
import { InstrumentationBase, InstrumentationConfig } from '@opentelemetry/instrumentation';
import { INLINE_VERSION } from './version';

// FIXME take timestamps from events?

const STACK_LIMIT = 4096;
const MESSAGE_LIMIT = 1024;

function useful(s) {
  return s && s.trim() !== '' && !s.startsWith('[object') && s !== 'error';
}

function getAttributesFromStack(err: Error): SpanAttributes {
  if (err && err.stack && useful(err.stack)) {
    return {
      'error.stack': limitLen(err.stack.toString(), STACK_LIMIT),
    };
  }

  return {};
}

export interface ErrorReport {
  source: string;
  arg: string | Event | ErrorEvent | Array<any>;
}

export const ERROR_INSTRUMENTATION_NAME = 'errors';
export const ERROR_INSTRUMENTATION_VERSION = '1';

export class SplunkErrorInstrumentation extends InstrumentationBase {
  private readonly _consoleErrorHandler = (original: Console['error']) => {
    return (...args: any[]) => {
      this.report('console.error', args);
      return original.apply(this, args);
    };
  };

  private readonly _unhandledRejectionListener = (event: PromiseRejectionEvent) => {
    this.report('unhandledrejection', event.reason);
  };

  private readonly _errorListener = (event: ErrorEvent) => {
    this.report('onerror', event);
  };

  private readonly _documentErrorListener = (event: ErrorEvent) => {
    this.report('eventListener.error', event);
  };

  constructor(config: InstrumentationConfig) {
    super(ERROR_INSTRUMENTATION_NAME, ERROR_INSTRUMENTATION_VERSION, config);
  }

  init(): void {}

  enable(): void {
    if (window.__SplunkRumInline?.version) {
      if (window.__SplunkRumInline.version !== INLINE_VERSION) {
        diag.error(`Inline version is ${window.__SplunkRumInline.version}, but main script expects ${INLINE_VERSION}. This may result in faulty behaviour.`);
      }
    }

    window.__SplunkRumInline?.shutdown();
    setTimeout(() => {
      window.__SplunkRumInline?.popCapturedErrors().forEach(report => {
        this.report(report.source, report.arg, {
          inlineErrorReporter: true,
        });
      });
    }, 0);

    shimmer.wrap(console, 'error', this._consoleErrorHandler);
    window.addEventListener('unhandledrejection', this._unhandledRejectionListener);
    window.addEventListener('error', this._errorListener);
    document.documentElement.addEventListener('error', this._documentErrorListener, { capture: true });
  }

  disable(): void {
    shimmer.unwrap(console, 'error');
    window.removeEventListener('unhandledrejection', this._unhandledRejectionListener);
    window.removeEventListener('error', this._errorListener);
    document.documentElement.removeEventListener('error', this._documentErrorListener, { capture: true });
  }

  protected getAttributesFromError(err: Error): SpanAttributes | undefined {
    const msg = err.message || err.toString();
    if (!useful(msg) && !err.stack) {
      return undefined;
    }

    return {
      component: 'error',
      error: true,
      'error.object': useful(err.name) ? err.name : (err.constructor.name || 'Error'),
      'error.message': limitLen(msg, MESSAGE_LIMIT),
      ...getAttributesFromStack(err),
    };
  }

  protected getAttributesFromString(message: string, firstError?: Error): SpanAttributes | undefined {
    if (!useful(message)) {
      return undefined;
    }

    return {
      component: 'error',
      error: true,
      'error.object': 'String',
      'error.message': limitLen(message, MESSAGE_LIMIT),
      ...(firstError ? this.getAttributesFromError(firstError) : {}),
    };
  }

  protected reportErrorEvent(source: string, ev: ErrorEvent, extraAttributes: SpanAttributes = {}): void {
    if (ev.error) {
      this.report(source, ev.error, extraAttributes);
    } else if (ev.message) {
      this.report(source, ev.message, extraAttributes);
    }
  }

  protected getAttributesFromEvent(ev: Event): SpanAttributes | undefined {
    // FIXME consider other sources of global 'error' DOM callback - what else can be captured here?
    if (!ev.target && !useful(ev.type)) {
      return undefined;
    }

    return {
      component: 'error',
      error: true,
      'error.type': ev.type,
      target_element: (ev.target as any).tagName,
      target_xpath: getElementXPath(ev.target, true),
      target_src: (ev.target as any).src,
    };
  }

  protected getAttributesFromArg(arg: ErrorReport['arg']): SpanAttributes | undefined {
    if (arg instanceof Error) {
      return this.getAttributesFromError(arg);
    } else if (arg instanceof Event) {
      return this.getAttributesFromEvent(arg);
    } else if (typeof arg === 'string') {
      return this.getAttributesFromString(arg);
    } else if (arg instanceof Array) {
      // if any arguments are Errors then add the stack trace even though the message is handled differently
      const firstError = arg.find(x => x instanceof Error);
      return this.getAttributesFromString(arg.map(x => x.toString()).join(' '), firstError);
    } else {
      return this.getAttributesFromString((arg as any).toString()); // FIXME or JSON.stringify?
    }
  }

  public report(source: ErrorReport['source'], arg: ErrorReport['arg'], extraAttributes: SpanAttributes = {}): void {
    if (Array.isArray(arg) && arg.length === 0) {
      return;
    }
    if (arg instanceof Array && arg.length === 1) {
      arg = arg[0];
    }

    if (arg instanceof ErrorEvent) {
      this.reportErrorEvent(source, arg, extraAttributes);
      return;
    }

    const attributes =  this.getAttributesFromArg(arg);
    if (attributes) {
      const now = hrTime();
      const span = this.tracer.startSpan(source, { startTime: now });
      span.setAttributes(attributes);
      span.setAttributes(extraAttributes);
      span.end(now);
    }
  }
}
