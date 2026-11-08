// Central API helper. Attaches the stored auth token to every same-origin API
// request so individual components do not need to know about authentication.
const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  const token = localStorage.getItem('dropboxz_token');
  const isRelativeApiRequest = typeof url === 'string' && url.startsWith('/api');

  if (token && isRelativeApiRequest) {
    options.headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };
  }

  return originalFetch(url, options);
};

export const getAuthToken = () => localStorage.getItem('dropboxz_token');

export const getAuthHeaders = (extra = {}) => {
  const token = localStorage.getItem('dropboxz_token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};
