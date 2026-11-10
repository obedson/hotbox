const AsyncStorageModule = require('@react-native-async-storage/async-storage');
const { API_BASE } = require('./config');

const TOKEN_KEY = 'hotbox_token';

const storage = AsyncStorageModule && AsyncStorageModule.default
  ? AsyncStorageModule.default
  : AsyncStorageModule;

const getToken = async () => storage.getItem(TOKEN_KEY);
const setToken = async (token) => storage.setItem(TOKEN_KEY, token);
const clearToken = async () => storage.removeItem(TOKEN_KEY);

const apiFetch = async (path, options = {}) => {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
};

module.exports = { apiFetch, getToken, setToken, clearToken, API_BASE };
