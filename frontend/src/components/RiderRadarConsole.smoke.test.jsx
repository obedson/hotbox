import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('../lib/api', () => ({
  apiFetch: (...args) => apiFetchMock(...args)
}));

import RiderRadarConsole from './RiderRadarConsole';

afterEach(() => {
  cleanup();
  localStorage.clear();
  apiFetchMock.mockReset();
});

const riderPayload = {
  rider: {
    id: 'rider-1',
    name: 'Emeka Nnamdi',
    phone: '+234 806 112 2336',
    plate_number: 'ABJ-432-QA',
    vehicle_type: 'Bajaj Boxer 150cc',
    rating: 4.95,
    total_deliveries: 7,
    is_active: true,
    is_available: true,
    operational_postcodes: ['FC-01-A03-FK-01', 'FC-01-A02-FK-02'],
    drivers_license_no: 'DL-12345',
    nin: '12345678901'
  },
  walletBalance: 32500
};

const bookedJob = {
  id: 'ship-1',
  tracking_code: 'HBX-FC01A0-4491',
  service_type: 'DOOR_TO_HUB',
  status: 'BOOKED',
  sender_address_text: 'Shop 4, Wuse 2 Shopping Plaza, Abuja',
  sender_postcode: 'FC-01-A03-FK-01',
  recipient_address_text: null,
  recipient_postcode: null,
  destination_hub_name: 'Wuse 2 Express Mart & Hub',
  destination_hub_postcode: 'FC-01-A03-FK-01',
  size: 'Small',
  weight_kg: 1.2,
  potential_earning_ngn: 1500
};

function mockConsole({ rider = true, jobs = [], myJobs = [] } = {}) {
  apiFetchMock.mockImplementation((path) => {
    if (path === '/api/v1/riders/me') {
      return Promise.resolve(
        rider
          ? { ok: true, status: 200, json: async () => riderPayload }
          : { ok: false, status: 404, json: async () => ({ error: 'Rider profile not found for this user.' }) }
      );
    }
    if (path === '/api/v1/riders/radar/jobs') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ jobs, total: jobs.length }) });
    }
    if (path === '/api/v1/riders/me/jobs') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ jobs: myJobs, total: myJobs.length }) });
    }
    if (path.startsWith('/api/v1/riders/jobs/') && path.endsWith('/accept')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ message: 'Job successfully accepted by rider.', shipment: {} }) });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
}

describe('RiderRadarConsole', () => {
  beforeEach(() => {
    localStorage.clear();
    apiFetchMock.mockReset();
  });

  it('renders the rider header and live radar jobs', async () => {
    mockConsole({ jobs: [bookedJob] });
    render(<RiderRadarConsole activeNav="radar" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText(/Emeka Nnamdi/)).toBeInTheDocument();
    expect(screen.getByText(/\(Plate: ABJ-432-QA\)/)).toBeInTheDocument();
    expect(screen.getByText('FC-01-A03-FK-01 \u2194 FC-01-A02-FK-02')).toBeInTheDocument();
    expect(screen.getByText(/7 Done/)).toBeInTheDocument();

    expect(screen.getByText('HBX-FC01A0-4491')).toBeInTheDocument();
    expect(screen.getByText('Door-to-Hub')).toBeInTheDocument();
    expect(screen.getByText(/\u20a61,500/)).toBeInTheDocument();
    expect(screen.getByText('1 Jobs Available')).toBeInTheDocument();
  });

  it('shows an empty state when the account has no rider profile', async () => {
    mockConsole({ rider: false });
    render(<RiderRadarConsole activeNav="radar" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('No rider profile linked to this account')).toBeInTheDocument();
  });

  it('claims a job through the accept endpoint and removes it from the radar', async () => {
    mockConsole({ jobs: [bookedJob] });
    render(<RiderRadarConsole activeNav="radar" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Claim Job' }));

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/v1/riders/jobs/ship-1/accept',
      expect.objectContaining({ method: 'POST' })
    );
    expect(await screen.findByText(/No unclaimed jobs right now/)).toBeInTheDocument();
  });
});