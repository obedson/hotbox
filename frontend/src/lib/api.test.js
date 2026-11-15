import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('auth token helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('reads the stored token', async () => {
    localStorage.setItem('hotbox_token', 'token-123');
    const api = await import('./api');
    expect(api.getAuthToken()).toBe('token-123');
  });

  it('returns null when no token is stored', async () => {
    const api = await import('./api');
    expect(api.getAuthToken()).toBeNull();
  });

  it('merges extra headers with the bearer token', async () => {
    localStorage.setItem('hotbox_token', 'token-123');
    const api = await import('./api');
    expect(api.getAuthHeaders({ 'Content-Type': 'application/json' })).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-123'
    });
  });

  it('omits the Authorization header when no token is stored', async () => {
    const api = await import('./api');
    expect(api.getAuthHeaders({ Accept: 'application/json' })).toEqual({
      Accept: 'application/json'
    });
  });
});

describe('window.fetch auth wrapper', () => {
  const realFetch = window.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    window.fetch = realFetch;
  });

  it('attaches the bearer token to relative /api requests', async () => {
    const mockFetch = vi.fn(async () => ({}));
    window.fetch = mockFetch;
    localStorage.setItem('hotbox_token', 'token-123');

    await import('./api');
    await window.fetch('/api/parcels');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/parcels');
    expect(options.headers).toEqual({ Authorization: 'Bearer token-123' });
  });

  it('does not attach the token to non-API requests', async () => {
    const mockFetch = vi.fn(async () => ({}));
    window.fetch = mockFetch;
    localStorage.setItem('hotbox_token', 'token-123');

    await import('./api');
    await window.fetch('https://example.com/api/parcels');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers || {}).not.toHaveProperty('Authorization');
  });

  it('does not attach the token when none is stored', async () => {
    const mockFetch = vi.fn(async () => ({}));
    window.fetch = mockFetch;

    await import('./api');
    await window.fetch('/api/parcels');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers || {}).not.toHaveProperty('Authorization');
  });

  it('emits a global event when a protected request is rejected as unauthenticated', async () => {
    const mockFetch = vi.fn(async () => ({ status: 401, ok: false }));
    window.fetch = mockFetch;
    const listener = vi.fn();
    window.addEventListener('hotbox:unauthorized', listener);

    await import('./api');
    await window.fetch('/api/customer/digital-box');

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('hotbox:unauthorized', listener);
  });

  it('stays silent on 401 responses from the auth endpoints themselves', async () => {
    const mockFetch = vi.fn(async () => ({ status: 401, ok: false }));
    window.fetch = mockFetch;
    const listener = vi.fn();
    window.addEventListener('hotbox:unauthorized', listener);

    await import('./api');
    await window.fetch('/api/v1/auth/login');

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('hotbox:unauthorized', listener);
  });
});

describe('apiFetch shared client', () => {
  const realFetch = window.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    delete import.meta.env.VITE_API_BASE;
  });

  afterEach(() => {
    window.fetch = realFetch;
    delete import.meta.env.VITE_API_BASE;
  });

  it('resolves the configured VITE_API_BASE for relative API paths', async () => {
    const mockFetch = vi.fn(async () => ({}));
    window.fetch = mockFetch;
    import.meta.env.VITE_API_BASE = 'https://api.example.com';
    const api = await import('./api');

    await api.apiFetch('/api/parcels');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/parcels');
  });

  it('leaves absolute URLs untouched', async () => {
    const mockFetch = vi.fn(async () => ({}));
    window.fetch = mockFetch;
    import.meta.env.VITE_API_BASE = 'https://api.example.com';
    const api = await import('./api');

    await api.apiFetch('https://other.example.com/api/parcels');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://other.example.com/api/parcels');
  });

  it('attaches the bearer token to base-resolved requests', async () => {
    const mockFetch = vi.fn(async () => ({}));
    window.fetch = mockFetch;
    import.meta.env.VITE_API_BASE = 'https://api.example.com';
    localStorage.setItem('hotbox_token', 'token-123');
    await import('./api');

    await window.fetch('/api/parcels');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/parcels');
    expect(options.headers).toEqual({ Authorization: 'Bearer token-123' });
  });

  it('does not attach the token to non-API requests', async () => {
    const mockFetch = vi.fn(async () => ({}));
    window.fetch = mockFetch;
    import.meta.env.VITE_API_BASE = 'https://api.example.com';
    localStorage.setItem('hotbox_token', 'token-123');
    await import('./api');

    await window.fetch('https://other.example.com/parcels');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://other.example.com/parcels');
    expect(options.headers || {}).not.toHaveProperty('Authorization');
  });
});
