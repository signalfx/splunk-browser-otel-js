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

import { ErrorReport } from './SplunkErrorInstrumentation';
import { INLINE_VERSION } from './version';

interface SplunkRumInlineType {
  popCapturedErrors: () => ErrorReport[];
  shutdown: () => void;
  version: typeof INLINE_VERSION;
}

declare global {
  interface Window {
    __SplunkRumInline?: SplunkRumInlineType;
  }
}

const store: ErrorReport[] = [];
function report(source: ErrorReport['source'], arg: ErrorReport['arg']) {
  store.push({ source, arg });
}

const unhandledRejectionListener = (event: PromiseRejectionEvent) => {
  report('unhandledrejection', event.reason);
};

const errorListener = (event: ErrorEvent) => {
  report('onerror', event);
};

const documentErrorListener = (event: ErrorEvent) => {
  report('eventListener.error', event);
};

export function inlineReportErrors(): void {
  window.addEventListener('unhandledrejection', unhandledRejectionListener);
  window.addEventListener('error', errorListener);
  document.documentElement.addEventListener('error', documentErrorListener, { capture: true });
}

export const SplunkRumInline: SplunkRumInlineType = {
  popCapturedErrors: () => {
    const result = store.slice();
    store.length = 0;
    return result;
  },
  shutdown: () => {
    window.removeEventListener('unhandledrejection', unhandledRejectionListener);
    window.removeEventListener('error', errorListener);
    document.documentElement.removeEventListener('error', documentErrorListener, { capture: true });
  },
  version: INLINE_VERSION,
};
