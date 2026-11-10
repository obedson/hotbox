import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import ExceptionManagement from './ExceptionManagement';

function mockFetch() {
  window.fetch = vi.fn(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/details')) {
      return { ok: true, json: async () => ({ exception: {}, timeline: [] }) };
    }
    return { ok: true, json: async () => ({ exceptions: [], counts: {}, riders: [] }) };
  });
}

describe('ExceptionManagement smoke render', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('renders the delivery issues desk without crashing', () => {
    const { container } = render(<ExceptionManagement />);
    expect(container.innerHTML.length).toBeGreaterThan(50);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders the page header', () => {
    render(<ExceptionManagement />);
    expect(screen.getAllByText(/Delivery Issues/i).length).toBeGreaterThan(0);
  });
});
