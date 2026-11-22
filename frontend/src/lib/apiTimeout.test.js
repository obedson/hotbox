import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from './api';
import { fetchWithHardTimeout } from './apiTimeout';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

describe('fetchWithHardTimeout', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it('returns the response when the request completes', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true });
    const res = await fetchWithHardTimeout('/api/v1/test');
    expect(res.ok).toBe(true);
  });

  it('rejects with a timeout when the request never settles', async () => {
    vi.mocked(apiFetch).mockReturnValue(new Promise(() => {}));
    await expect(fetchWithHardTimeout('/api/v1/test', {}, 50))
      .rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('aborts the in-flight request when it times out', async () => {
    let captured;
    vi.mocked(apiFetch).mockImplementation((_path, opts) => {
      captured = opts && opts.signal;
      return new Promise(() => {});
    });
    await expect(fetchWithHardTimeout('/api/v1/test', {}, 50))
      .rejects.toMatchObject({ name: 'TimeoutError' });
    expect(captured && captured.aborted).toBe(true);
  });
});