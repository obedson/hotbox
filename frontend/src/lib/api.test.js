import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('auth token helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('reads the stored token', async () => {
    localStorage.setItem('dropboxz_token', 'token-123');
    const api = await import('./api');
    expect(api.getAuthToken()).toBe('token-123');
  });

  it('returns null when no token is stored', async () => {
    const api = await import('./api');
    expect(api.getAuthToken()).toBeNull();
  });

  it('merges extra headers with the bearer token', async () => {
    localStorage.setItem('dropboxz_token', 'token-123');
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
    localStorage.setItem('dropboxz_token', 'token-123');

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
    localStorage.setItem('dropboxz_token', 'token-123');

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
});
