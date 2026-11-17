import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import HubStationConsole from './HubStationConsole';

function mockFetch() {
  window.fetch = vi.fn(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/hubs/mine')) {
      return {
        ok: true,
        json: async () => ({
          hub: {
            id: 'h1',
            business_name: 'Test Community Hub',
            postcode: 'FC-01-A03-FK-01',
            address_text: 'Wuse 2, Abuja',
            current_load: 3,
            capacity: 25,
            owner_name: 'Hub Owner'
          },
          bays: [],
          stats: { open_bays: 0 },
          parcels: [],
          staff: []
        })
      };
    }
    return { ok: true, json: async () => ({}) };
  });
}

describe('HubStationConsole capacity settings', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('renders the capacity editor on the profile tab', async () => {
    render(
      <HubStationConsole
        activeNav="hub_profile"
        setActiveNav={() => {}}
        hubs={[]}
        showToast={() => {}}
      />
    );
    await waitFor(() => expect(screen.getByText(/Storage Capacity/i)).toBeInTheDocument());
    expect(screen.getByText(/Current load: 3 parcels/i)).toBeInTheDocument();
  });
});