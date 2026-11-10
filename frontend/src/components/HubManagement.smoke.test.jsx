import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import HubManagement from './HubManagement';

function mockFetch() {
  window.fetch = vi.fn(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/details')) {
      return { ok: true, json: async () => ({ hub: {}, bays: [] }) };
    }
    return { ok: true, json: async () => ({ hubs: [], counts: {}, states: [] }) };
  });
}

describe('HubManagement smoke render', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('renders the partner hub desk without crashing', () => {
    const { container } = render(<HubManagement onSelectShipment={() => {}} />);
    expect(container.innerHTML.length).toBeGreaterThan(50);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders the hub directory header', () => {
    render(<HubManagement onSelectShipment={() => {}} />);
    expect(screen.getByText(/Partner Hub Desk/i)).toBeInTheDocument();
  });
});
