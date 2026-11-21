import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';

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
    vehicle_type: 'motorcycle',
    rating: 4.95,
    total_deliveries: 7,
    status: 'verified',
    is_active: true,
    is_available: true,
    operational_postcodes: ['FC-01-A03-FK-01', 'FC-01-A02-FK-02'],
    drivers_license_no: 'DL-12345',
    nin: '12345678901'
  },
  walletBalance: 32500
};

const kycPayload = {
  profile: {
    nin: '12345678901',
    driversLicenseNo: 'DL-12345',
    vehicleType: 'motorcycle',
    plateNumber: 'ABJ-432-QA',
    operationalPostcodes: ['FC-01-A03-FK-01', 'FC-01-A02-FK-02'],
    postcode: 'FC-01-A03-FK-01',
    phone: '+2348061122336',
    registrationFeeNgn: 0,
    registrationFeePaid: false,
    status: 'verified'
  },
  records: [
    { id: 'rec-1', document_type: 'NIN', status: 'APPROVED' },
    { id: 'rec-2', document_type: 'DRIVERS_LICENSE', status: 'PENDING' }
  ]
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

function mockConsole({ rider = true, jobs = [], myJobs = [], kyc = kycPayload } = {}) {
  apiFetchMock.mockImplementation((path) => {
    if (path === '/api/v1/riders/me') {
      return Promise.resolve(
        rider
          ? { ok: true, status: 200, json: async () => (typeof rider === 'object' ? { ...riderPayload, rider } : riderPayload) }
          : { ok: false, status: 404, json: async () => ({ error: 'Rider profile not found for this user.' }) }
      );
    }
    if (path === '/api/v1/riders/verification') {
      return Promise.resolve({ ok: true, status: 200, json: async () => kyc });
    }
    if (path === '/api/v1/riders/profile') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ rider: riderPayload.rider }) });
    }
    if (path === '/api/v1/riders/verification/documents') {
      return Promise.resolve({ ok: true, status: 201, json: async () => ({ record: { id: 'rec-3', status: 'PENDING' } }) });
    }
    if (path === '/api/v1/riders/registration-fee/pay') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Rider registration fee paid.', reference: 'RIDER-REG-1', newBalance: 30000, registrationFeePaid: true })
      });
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

  it('blocks dispatch for a rider still pending verification', async () => {
    const pendingPayload = {
      ...riderPayload,
      rider: { ...riderPayload.rider, status: 'pending', is_active: true }
    };
    apiFetchMock.mockImplementation((path) => {
      if (path === '/api/v1/riders/me') {
        return Promise.resolve({ ok: true, status: 200, json: async () => pendingPayload });
      }
      if (path === '/api/v1/riders/verification') {
        return Promise.resolve({ ok: true, status: 200, json: async () => kycPayload });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    render(<RiderRadarConsole activeNav="radar" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('Rider verification pending')).toBeInTheDocument();
    expect(screen.getByText('Verification Pending')).toBeInTheDocument();
    expect(screen.queryByText('1 Jobs Available')).not.toBeInTheDocument();
    expect(screen.queryByText('HBX-FC01A0-4491')).not.toBeInTheDocument();
    // Dispatch data is never requested for an unverified rider.
    expect(apiFetchMock).not.toHaveBeenCalledWith('/api/v1/riders/radar/jobs');
    expect(apiFetchMock).not.toHaveBeenCalledWith('/api/v1/riders/me/jobs');
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

  it('loads Track B details and lets a rider save regulatory details', async () => {
    mockConsole({});
    render(<RiderRadarConsole activeNav="profile" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('Rider Credentials & Track B Accreditation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345678901')).toBeInTheDocument();
    expect(screen.getByText('NIN Identity Check')).toBeInTheDocument();
    expect(screen.getByText("Driver's Licence Number")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('12345678901'), { target: { value: '99998888777' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Details' }));

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/v1/riders/profile',
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(await screen.findByText(/regulatory details have been saved/)).toBeInTheDocument();
  });

  it('shows the KYC form to a rider still pending verification', async () => {
    const pendingKyc = {
      profile: {
        ...kycPayload.profile,
        status: 'pending',
        nin: null,
        driversLicenseNo: null,
        plateNumber: 'ABJ-000-XX'
      },
      records: []
    };
    mockConsole({ kyc: pendingKyc });
    apiFetchMock.mockImplementation((path) => {
      if (path === '/api/v1/riders/me') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ...riderPayload, rider: { ...riderPayload.rider, status: 'pending' } })
        });
      }
      if (path === '/api/v1/riders/verification') {
        return Promise.resolve({ ok: true, status: 200, json: async () => pendingKyc });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    render(<RiderRadarConsole activeNav="profile" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('Rider Credentials & Track B Accreditation')).toBeInTheDocument();
    expect(screen.getByText('Clearance Pending')).toBeInTheDocument();
    expect(screen.getByText('NIN Slip')).toBeInTheDocument();
    expect(screen.getByText("Driver's Licence")).toBeInTheDocument();
    expect(screen.getByText('Courier Licence')).toBeInTheDocument();
    expect(screen.getByText('Proof of Address')).toBeInTheDocument();
  });

  it('collects the administrator-set registration fee from the wallet', async () => {
    let paid = false;
    const feeKyc = {
      ...kycPayload,
      profile: { ...kycPayload.profile, registrationFeeNgn: 2500, registrationFeePaid: false }
    };
    apiFetchMock.mockImplementation((path) => {
      if (path === '/api/v1/riders/me') {
        return Promise.resolve({ ok: true, status: 200, json: async () => riderPayload });
      }
      if (path === '/api/v1/riders/verification') {
        const payload = { ...feeKyc, profile: { ...feeKyc.profile, registrationFeePaid: paid } };
        return Promise.resolve({ ok: true, status: 200, json: async () => payload });
      }
      if (path === '/api/v1/riders/registration-fee/pay') {
        paid = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ message: 'Rider registration fee paid.', reference: 'RIDER-REG-1', newBalance: 30000, registrationFeePaid: true })
        });
      }
      if (path === '/api/v1/riders/radar/jobs') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ jobs: [], total: 0 }) });
      }
      if (path === '/api/v1/riders/me/jobs') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ jobs: [], total: 0 }) });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    render(<RiderRadarConsole activeNav="profile" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText(/Rider registration fee:/)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pay from wallet' }));
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/v1/riders/registration-fee/pay',
      expect.objectContaining({ method: 'POST' })
    );
    expect(await screen.findByText(/Registration fee paid/)).toBeInTheDocument();
    expect(screen.queryByText(/Rider registration fee:/)).not.toBeInTheDocument();
  });

  it('submits an identity document for operations review', async () => {
    mockConsole({});
    const { container } = render(
      <RiderRadarConsole activeNav="profile" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />
    );

    await screen.findByText('Identity Documents');

    const uploadInputs = container.querySelectorAll('input[type="file"]');
    expect(uploadInputs).toHaveLength(5);

    await act(async () => {
      fireEvent.change(uploadInputs[0], {
        target: { files: [new File(['nin-bytes'], 'nin.png', { type: 'image/png' })] }
      });
    });

    await vi.waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        '/api/v1/riders/verification/documents',
        expect.objectContaining({ method: 'POST' })
      );
    });

    await vi.waitFor(() => {
      const verificationCalls = apiFetchMock.mock.calls.filter(
        (call) => call[0] === '/api/v1/riders/verification'
      );
      expect(verificationCalls.length).toBeGreaterThan(1);
    });

    const [, options] = apiFetchMock.mock.calls.find(
      (call) => call[0] === '/api/v1/riders/verification/documents'
    );
    const body = JSON.parse(options.body);
    expect(body.documentType).toBe('NIN');
    expect(body.documentUrl).toMatch(/^data:image\/png;base64,/);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('derives checklist badges from Operations review state, not field presence', async () => {
    mockConsole({ kyc: kycPayload });
    render(<RiderRadarConsole activeNav="profile" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('Accreditation Checklist')).toBeInTheDocument();
    // Driver's licence is saved and submitted but still awaiting Operations review.
    expect(screen.getByText('Under review')).toBeInTheDocument();
    // NIN has an approved verification record.
    expect(screen.getByText('Verified')).toBeInTheDocument();
    // Saved-only details are labelled as provided, never as verified.
    expect(screen.getAllByText('Provided').length).toBe(3);
  });

  it('does not mark vehicle roadworthiness as provided without a plate and certificate', async () => {
    mockConsole({
      rider: { ...riderPayload.rider, plate_number: 'ABJ-000-XX', status: 'pending' },
      kyc: {
        ...kycPayload,
        profile: { ...kycPayload.profile, plateNumber: '' },
        records: [{ id: 'rec-1', document_type: 'NIN', status: 'APPROVED' }]
      }
    });
    render(<RiderRadarConsole activeNav="profile" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('Accreditation Checklist')).toBeInTheDocument();
    const row = screen.getByText('Vehicle Roadworthiness').closest('div');
    expect(within(row).getByText('Pending')).toBeInTheDocument();
  });

  it('renders dispatch tools for a verified rider on the postcode lookup tab', async () => {
    mockConsole();
    render(<RiderRadarConsole activeNav="lookup" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('Postcode & Digital P.O. Box Lookup')).toBeInTheDocument();
    expect(screen.queryByText('Postcode Lookup is locked until verification')).not.toBeInTheDocument();
  });

  it('renders dispatch tools for a verified rider on the earnings tab', async () => {
    mockConsole();
    render(<RiderRadarConsole activeNav="earnings" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('Available for Instant Payout')).toBeInTheDocument();
  });

  it('locks dispatch tools for a pending rider instead of rendering a blank tab', async () => {
    mockConsole({ rider: { ...riderPayload.rider, status: 'pending' } });
    render(<RiderRadarConsole activeNav="lookup" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('Postcode Lookup is locked until verification')).toBeInTheDocument();
    expect(screen.queryByText('Postcode & Digital P.O. Box Lookup')).not.toBeInTheDocument();
  });

  it('locks the earnings tab for a pending rider instead of rendering a blank tab', async () => {
    mockConsole({ rider: { ...riderPayload.rider, status: 'pending' } });
    render(<RiderRadarConsole activeNav="earnings" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('Earnings & Wallet is locked until verification')).toBeInTheDocument();
    expect(screen.queryByText('Available for Instant Payout')).not.toBeInTheDocument();
  });

  it('shows the real handover state of an active delivery', async () => {
    mockConsole({
      myJobs: [
        { ...bookedJob, id: 'ship-1', status: 'RIDER_ASSIGNED', tracking_code: 'HBX-FC01A0-4491' },
        { ...bookedJob, id: 'ship-2', status: 'IN_TRANSIT_TO_HUB', tracking_code: 'HBX-FC01A0-5555' }
      ]
    });
    render(<RiderRadarConsole activeNav="active_route" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('Assigned')).toBeInTheDocument();
    expect(screen.getByText('In transit to hub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick up parcel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hand over to hub' })).toBeInTheDocument();
    expect(screen.queryByText('IN PROGRESS')).not.toBeInTheDocument();
  });

  it('drops a parcel from the active run once it is handed to the hub', async () => {
    mockConsole({
      myJobs: [{ ...bookedJob, id: 'ship-3', status: 'STORED_IN_BAY', tracking_code: 'HBX-FC01A0-6666' }]
    });
    render(<RiderRadarConsole activeNav="active_route" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText(/No active run right now/)).toBeInTheDocument();
    expect(screen.queryByText('HBX-FC01A0-6666')).not.toBeInTheDocument();
  });

  it('archives a handed-over parcel in trip history', async () => {
    mockConsole({
      myJobs: [{ ...bookedJob, id: 'ship-3', status: 'STORED_IN_BAY', tracking_code: 'HBX-FC01A0-6666' }]
    });
    render(<RiderRadarConsole activeNav="history" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    expect(await screen.findByText('HBX-FC01A0-6666')).toBeInTheDocument();
  });

  it('refetches the active route after a successful claim', async () => {
    mockConsole({ jobs: [bookedJob], myJobs: [{ ...bookedJob, status: 'RIDER_ASSIGNED' }] });
    render(<RiderRadarConsole activeNav="radar" setActiveNav={() => {}} hubs={[]} showToast={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Claim Job' }));

    await vi.waitFor(() => {
      const mineCalls = apiFetchMock.mock.calls.filter((call) => call[0] === '/api/v1/riders/me/jobs');
      expect(mineCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
