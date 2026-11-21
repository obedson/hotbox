import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('../lib/api', () => ({
  apiFetch: (...args) => apiFetchMock(...args)
}));

import CustodyScanner from './CustodyScanner';

const SHIPMENT_UUID = 'd0000000-0000-0000-0000-000000000001';
const TRACKING_CODE = 'HBX-FC01A0-9781';
const SHIPMENT_INPUT = /d0000000-0000-0000-0000-000000000001/;
const TRACKING_INPUT = /HBX-FC01A0-9781/;

// Deliberately different tiers from the fallback list so a passing assertion
// proves the picker read the hub's real shelves from the tracking endpoint.
const HUB_BAYS = [
  { bay_code: 'BAY-01', size_tier: 'large', is_occupied: false },
  { bay_code: 'BAY-02', size_tier: 'small', is_occupied: false },
  { bay_code: 'BAY-03', size_tier: 'medium', is_occupied: true }
];

function mockApi() {
  apiFetchMock.mockImplementation((path) => {
    if (
      path === `/api/v1/shipments/track/${SHIPMENT_UUID}` ||
      path === `/api/v1/shipments/track/${TRACKING_CODE}`
    ) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ shipment: { id: SHIPMENT_UUID }, availableBays: HUB_BAYS })
      });
    }
    if (path === '/api/v1/custody/transfer') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ newStatus: 'HUB_INTAKE_COMPLETE', shipment: { id: SHIPMENT_UUID } })
      });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
}

async function renderScannerWith(value, inputMatcher) {
  render(<CustodyScanner activeRole="hub_owner" hubs={[]} onCustodySuccess={() => {}} />);
  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText(inputMatcher), {
      target: { value }
    });
  });
  expect(await screen.findByText('BAY-01 (large)')).toBeInTheDocument();
  return screen.getByRole('combobox');
}

async function renderIntakeScanner() {
  return renderScannerWith(SHIPMENT_UUID, SHIPMENT_INPUT);
}

describe('CustodyScanner storage bay picker', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    apiFetchMock.mockReset();
  });

  it('loads the hub real storage bays instead of hard-coded placeholders', async () => {
    mockApi();
    await renderIntakeScanner();

    expect(apiFetchMock).toHaveBeenCalledWith(`/api/v1/shipments/track/${SHIPMENT_UUID}`);
    expect(screen.getByText('BAY-01 (large)')).toBeInTheDocument();
    expect(screen.getByText('BAY-02 (small)')).toBeInTheDocument();
    expect(screen.getByText('BAY-03 (medium — occupied)')).toBeInTheDocument();
    expect(screen.queryByText(/BAY-A0/)).not.toBeInTheDocument();
  });

  it('auto-selects the first free bay and disables occupied ones', async () => {
    mockApi();
    const select = await renderIntakeScanner();

    expect(select.value).toBe('BAY-01');
    const occupied = Array.from(select.options).find((opt) => opt.value === 'BAY-03');
    expect(occupied.disabled).toBe(true);
  });

  it('submits the selected real bay code for hub intake', async () => {
    mockApi();
    const select = await renderIntakeScanner();

    fireEvent.change(screen.getByPlaceholderText(/419201/), { target: { value: '419201' } });
    fireEvent.change(select, { target: { value: 'BAY-02' } });
    fireEvent.click(screen.getByText('Verify Token & Commit Custody Transfer'));

    await vi.waitFor(() => {
      const call = apiFetchMock.mock.calls.find((entry) => entry[0] === '/api/v1/custody/transfer');
      expect(call).toBeTruthy();
      expect(JSON.parse(call[1].body).bayCode).toBe('BAY-02');
    });
  });

  it('accepts the waybill tracking code and resolves it to the shipment id', async () => {
    mockApi();
    const select = await renderScannerWith(TRACKING_CODE, TRACKING_INPUT);

    expect(screen.getByText('Shipment UUID or Tracking Code')).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith(`/api/v1/shipments/track/${TRACKING_CODE}`);

    fireEvent.change(screen.getByPlaceholderText(/419201/), { target: { value: '419201' } });
    fireEvent.click(screen.getByText('Verify Token & Commit Custody Transfer'));

    await vi.waitFor(() => {
      const call = apiFetchMock.mock.calls.find((entry) => entry[0] === '/api/v1/custody/transfer');
      expect(call).toBeTruthy();
      const body = JSON.parse(call[1].body);
      expect(body.shipmentId).toBe(SHIPMENT_UUID);
      expect(body.bayCode).toBe(select.value);
    });
  });

  it('omits the bay code for handovers that do not assign a shelf', async () => {
    mockApi();
    render(<CustodyScanner activeRole="hub_owner" hubs={[]} onCustodySuccess={() => {}} />);
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(SHIPMENT_INPUT), {
        target: { value: SHIPMENT_UUID }
      });
    });
    fireEvent.click(screen.getByRole('button', { name: /Door Delivery/ }));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/419201/), { target: { value: '419201' } });
    fireEvent.click(screen.getByText('Verify Token & Commit Custody Transfer'));

    await vi.waitFor(() => {
      const call = apiFetchMock.mock.calls.find((entry) => entry[0] === '/api/v1/custody/transfer');
      expect(call).toBeTruthy();
      expect(JSON.parse(call[1].body).bayCode).toBeNull();
    });
  });
});