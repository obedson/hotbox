import { apiFetch } from './api';

// A slow or blocked lookup must never leave a spinner running forever, so
// location requests get a hard timeout in addition to any caller abort signal.
export const RESOLVE_TIMEOUT_MS = 8000;

export function fetchWithHardTimeout(path, { signal, ...options } = {}, timeoutMs = RESOLVE_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (signal) signal.abort();
      reject(new DOMException('The request timed out. Please try again.', 'TimeoutError'));
    }, timeoutMs);
  });

  return Promise.race([
    apiFetch(path, { ...options, signal }),
    timeout
  ]).finally(() => clearTimeout(timer));
}