import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import PostcodeManagement from './PostcodeManagement';

function mockFetch() {
  window.fetch = vi.fn(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/catchment')) {
      return {
        ok: true,
        json: async () => ({
          postcode: {
            postcode: 'FC-01-A05-FK-05',
            state: 'FCT',
            lga: 'Abuja',
            neighbourhood: 'Wuse',
            district: 'Wuse District'
          },
          segments: { state: 'FC', lga: '01', district: 'A05', area: 'FK', unit: '05' },
          nearby_hubs: [],
          assigned_riders: []
        })
      };
    }
    return { ok: true, json: async () => ({ postcodes: [], counts: {}, states: [] }) };
  });
}

describe('PostcodeManagement smoke render', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('renders the postcode directory shell without crashing', () => {
    const { container } = render(<PostcodeManagement />);
    expect(container.innerHTML.length).toBeGreaterThan(50);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders the postcode validation resolver', () => {
    render(<PostcodeManagement />);
    expect(screen.getByText(/Validate Postcode/i)).toBeInTheDocument();
  });
});
