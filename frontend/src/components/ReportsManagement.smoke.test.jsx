import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import ReportsManagement from './ReportsManagement';

function mockFetch() {
  window.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      summary: {
        gross_revenue_ngn: 0,
        hub_payouts_ngn: 0,
        courier_earnings_ngn: 0,
        platform_margin_ngn: 0,
        overdue_storage_surcharges_ngn: 0,
        total_shipments: 0,
        on_time_delivery_rate_pct: 0,
        hub_capacity_utilization_pct: 0,
        postcode_adoption_rate_pct: 0,
        active_transit_parcels: 0,
        completed_parcels: 0,
        exception_parcels: 0
      },
      delivery_sla_report: {},
      financial_settlement_report: {},
      hub_capacity_report: {},
      postcode_coverage_report: {}
    })
  }));
}

describe('ReportsManagement smoke render', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('renders the reports shell without crashing', () => {
    const { container } = render(<ReportsManagement />);
    expect(container.innerHTML.length).toBeGreaterThan(50);
  });

  it('renders the reports header once data loads', async () => {
    render(<ReportsManagement />);
    expect(await screen.findByText('Reports & Analytics')).toBeInTheDocument();
  });

  it('renders the report tab navigation', async () => {
    render(<ReportsManagement />);
    expect(await screen.findByText('Delivery Speed')).toBeInTheDocument();
  });
});
