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

import { ReadableSpan, SpanProcessor } from '@opentelemetry/tracing';
import SplunkRum from '../src/index';

export class SpanCapturer implements SpanProcessor {
  public readonly spans: ReadableSpan[] = [];
  forceFlush(): Promise<void> { return Promise.resolve(); }
  onStart(): void {}
  shutdown(): Promise<void> { return Promise.resolve(); }
  onEnd(span: ReadableSpan): void {
    this.spans.push(span);
  }
  clear(): void {
    this.spans.length = 0;
  }
}

export function initWithDefaultConfig(capturer: SpanCapturer, additionalOptions = {}): void {
  SplunkRum._internalInit(Object.assign({}, additionalOptions, {
    beaconUrl: 'http://127.0.0.1:8888/v1/trace',
    allowInsecureBeacon: true,
    app: 'my-app',
    environment: 'my-env',
    globalAttributes: { customerType: 'GOLD' },
    bufferTimeout: 0,
    rumAuth: undefined,
  }));
  SplunkRum.provider.addSpanProcessor(capturer);
}

export function deinit(): void {
  SplunkRum.deinit();
}

export const recurAndThrow = function recurAndThrow(i: number): void {
  if (i === 0) {
    throw new Error('bad thing');
  }
  recurAndThrow(i - 1);
};
