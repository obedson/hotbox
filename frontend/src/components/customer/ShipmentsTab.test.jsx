import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('../../lib/api', () => ({
  apiFetch: (...args) => apiFetchMock(...args)
}));

import ShipmentsTab from './ShipmentsTab';

const shared = {
  service_type: 'DOOR_TO_HUB',
  status: 'BOOKED',
  pricing_total_ngn: '2500.00',
  sender_name: 'Ada Sender',
  sender_address_text: 'Wuse 2, Abuja',
  sender_postcode: 'FC-01-A03-FK-01',
  recipient_name: 'Obi Recipient',
  destination_hub_name: 'obedsondeo LTD',
  recipient_postcode: 'FC-01-A03-FK-01'
};

// Shaped exactly as the API returns them: senders get no collection credentials.
const senderRow = {
  ...shared,
  id: 'ship-1',
  tracking_code: 'HBX-FC01A0-9781',
  is_sender: true,
  is_recipient: false
};

const recipientRow = {
  ...shared,
  id: 'ship-2',
  tracking_code: 'HBX-FC01A0-5566',
  is_sender: false,
  is_recipient: true,
  collection_qr_token: 'QR-PASS-ABC123',
  delivery_otp: '222222'
};

function renderTab(rows) {
  return render(
    <ShipmentsTab
      shipments={rows}
      setIsBookingOpen={() => {}}
      setIsClaimModalOpen={() => {}}
      setSelectedShipmentForAction={() => {}}
      handleCancelShipment={() => {}}
      handleRequestReturn={() => {}}
    />
  );
}

describe('ShipmentsTab credential visibility', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    apiFetchMock.mockReset();
  });

  it('hides the recipient collection credentials from the sender', () => {
    renderTab([senderRow]);

    expect(screen.queryByText(/QR Pass/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Delivery OTP/)).not.toBeInTheDocument();
    expect(screen.getByText(/recipient receives the collection code by SMS/)).toBeInTheDocument();
    expect(screen.getByText('Collection')).toBeInTheDocument();
  });

  it('shows the collection credentials to the recipient', () => {
    renderTab([recipientRow]);

    expect(screen.getByText('Collection Authorization')).toBeInTheDocument();
    expect(screen.getByText('QR Pass: QR-PASS-ABC123')).toBeInTheDocument();
    expect(screen.getByText('Delivery OTP:')).toBeInTheDocument();
    expect(screen.getByText('222222')).toBeInTheDocument();
  });

  it('only lets the sender resend the pickup OTP', () => {
    const { unmount } = renderTab([senderRow]);
    expect(screen.getByRole('button', { name: 'Resend Pickup OTP' })).toBeInTheDocument();
    unmount();

    renderTab([recipientRow]);
    expect(screen.queryByRole('button', { name: 'Resend Pickup OTP' })).not.toBeInTheDocument();
  });

  it('only lets the sender cancel a booked parcel', () => {
    const { unmount } = renderTab([senderRow]);
    expect(screen.getByRole('button', { name: 'Cancel Shipment & Refund' })).toBeInTheDocument();
    unmount();

    renderTab([recipientRow]);
    expect(screen.queryByRole('button', { name: 'Cancel Shipment & Refund' })).not.toBeInTheDocument();
  });
});