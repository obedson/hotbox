import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
  useMap: () => ({ setView: () => {} }),
}));

import CustomerDashboard from './CustomerDashboard';

function renderAt(activeNav) {
  return render(
    <CustomerDashboard
      currentUser={{ id: 'cust-1', name: 'Test Customer', role: 'customer', postcode: 'FC-01-A03-FK-01' }}
      activeNav={activeNav}
      setActiveNav={() => {}}
    />
  );
}

describe('CustomerDashboard smoke render', () => {
  beforeEach(() => {
    localStorage.clear();
    window.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  });

  it.each(['discovery', 'shipments', 'digital_box', 'addresses', 'wallet', 'claims', 'profile'])(
    'renders the %s tab without crashing',
    (tab) => {
      const { container } = renderAt(tab);
      expect(container.innerHTML.length).toBeGreaterThan(50);
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    }
  );
});
