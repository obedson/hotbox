import { apiFetch } from './api';

// A slow or blocked lookup must never leave a spinner running forever, so
// location requests get a hard timeout in addition to any caller abort signal.
export const RESOLVE_TIMEOUT_MS = 8000;

export function fetchWithHardTimeout(path, { signal, ...options } = {}, timeoutMs = RESOLVE_TIMEOUT_MS) {
  // Own controller so the caller's signal is never mutated; a caller abort is
  // forwarded to it and a timeout aborts it to cancel the in-flight request.
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new DOMException('The request timed out. Please try again.', 'TimeoutError'));
    }, timeoutMs);
  });

  return Promise.race([
    apiFetch(path, { ...options, signal: controller.signal }),
    timeout
  ]).finally(() => {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  });
}