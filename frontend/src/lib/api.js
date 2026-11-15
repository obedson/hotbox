// Central API client. Resolves the configurable API base URL and attaches the
// stored auth token to every API request so individual components do not need
// to know about authentication.
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export const getAuthToken = () => localStorage.getItem('hotbox_token');

export const getAuthHeaders = (extra = {}) => {
  const token = localStorage.getItem('hotbox_token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const resolveApiUrl = (path) => {
  if (typeof path === 'string' && path.startsWith('/') && API_BASE) {
    return `${API_BASE}${path}`;
  }
  return path;
};

export const isApiRequest = (url) => {
  if (typeof url !== 'string') return false;
  if (url.startsWith('/api')) return true;
  return API_BASE !== '' && url.startsWith(`${API_BASE}/api`);
};

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register'];

// Surface an expired or missing token to the app shell so it can reopen the
// sign-in modal instead of letting protected calls fail with a bare error.
const notifyIfUnauthorized = (response, url) => {
  if (!response || response.status !== 401) return;
  const target = String(url || '');
  if (AUTH_ENDPOINTS.some((endpoint) => target.includes(endpoint))) return;
  try {
    window.dispatchEvent(new CustomEvent('hotbox:unauthorized'));
  } catch (e) {}
};

// Explicit shared client. Components should import and call this instead of
// using the global fetch directly.
export async function apiFetch(path, options = {}) {
  return window.fetch(resolveApiUrl(path), options);
}

// Backward-compatible global wrapper: resolves the API base and attaches the
// bearer token to relative and absolute API requests.
const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  const resolvedUrl = resolveApiUrl(url);
  const token = localStorage.getItem('hotbox_token');

  if (token && isApiRequest(resolvedUrl)) {
    options.headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };
  }

  const response = await originalFetch(resolvedUrl, options);
  notifyIfUnauthorized(response, resolvedUrl);
  return response;
};

export default apiFetch;
