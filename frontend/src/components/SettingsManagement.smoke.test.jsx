import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import SettingsManagement from './SettingsManagement';

function mockFetch() {
  window.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      settings: {
        pricing_matrix: {
          description: 'Delivery Rates',
          value: {
            base_small_ngn: 1500,
            base_medium_ngn: 2500,
            base_large_ngn: 4000,
            extra_kg_rate_ngn: 300,
            insurance_rate_pct: 1.5,
            rate_version: 'v1',
            multipliers: { HUB_TO_HUB: 1.0, DOOR_TO_HUB: 1.25, HUB_TO_DOOR: 1.35, DOOR_TO_DOOR: 1.55 }
          }
        },
        partner_commissions: {
          description: 'Partner Payouts',
          value: {
            platform_commission_pct: 20,
            hub_intake_fee_ngn: 100,
            hub_release_fee_ngn: 150,
            courier_pickup_ngn: 500,
            courier_delivery_ngn: 800,
            hub_storage_share_pct: 30
          }
        },
        hub_storage_policy: {
          description: 'Storage Fees',
          value: {
            free_storage_days: 3,
            daily_overdue_fee_ngn: 200,
            max_storage_days_before_rts: 7,
            reminder_window_hours: 24,
            auto_rts_enabled: true
          }
        },
        sla_benchmarks: {
          description: 'Delivery Targets',
          value: {
            courier_pickup_sla_mins: 30,
            collection_otp_validity_hours: 24,
            stalled_shipment_alert_hours: 48
          }
        }
      },
      audit_history: []
    })
  }));
}

describe('SettingsManagement smoke render', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('renders the settings shell without crashing', () => {
    const { container } = render(<SettingsManagement />);
    expect(container.innerHTML.length).toBeGreaterThan(50);
  });

  it('renders the settings header once data loads', async () => {
    render(<SettingsManagement />);
    expect(await screen.findByText('Delivery Rates')).toBeInTheDocument();
  });

  it('renders the settings tab navigation', async () => {
    render(<SettingsManagement />);
    expect(await screen.findByRole('button', { name: 'Delivery Rates' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partner Payouts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hub Storage & Fees' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delivery Targets & Rules' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Audit History/ })).toBeInTheDocument();
  });
});
