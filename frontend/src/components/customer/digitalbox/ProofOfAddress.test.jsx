import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProofOfAddress from './ProofOfAddress';

const baseBox = {
  boxNumber: 'HBX-0001',
  groundTruthingFeeNgn: 2500,
  isGroundTruthVerified: false,
  hasPendingInspection: false,
  certificate: null
};

function renderCard(overrides = {}) {
  const props = {
    digitalBox: { ...baseBox, ...overrides },
    onRequestGroundTruth: vi.fn(),
    isRequestingGroundTruth: false,
    onOpenCertificate: vi.fn(),
    showToast: vi.fn()
  };
  render(<ProofOfAddress {...props} />);
  return props;
}

describe('Proof of Address certificate action', () => {
  it('asks for doorway verification when nothing has been paid for', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /Request Doorway Verification/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Download NIPOST POA Certificate/ })).toBeNull();
  });

  it('offers a renewal when the address is verified but no certificate is active', () => {
    renderCard({ isGroundTruthVerified: true });
    expect(screen.getByRole('button', { name: /Renew your POA Certificate/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Download NIPOST POA Certificate/ })).toBeNull();
  });

  it('only offers the download once a certificate has been issued', () => {
    const props = renderCard({
      isGroundTruthVerified: true,
      certificate: {
        serial: 'HBX-CERT-0001',
        issuedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2027-01-01T00:00:00.000Z',
        status: 'ACTIVE',
        postcode: 'FC-01-A03-FK-01',
        addressText: 'Wuse 2, Abuja',
        lat: 9.0772,
        lng: 7.499
      }
    });

    const download = screen.getByRole('button', { name: /Download NIPOST POA Certificate/ });
    download.click();
    expect(props.onOpenCertificate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Request Doorway Verification/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Renew your POA Certificate/ })).toBeNull();
  });

  it('shows the serial and a public verification link for an issued certificate', () => {
    renderCard({
      isGroundTruthVerified: true,
      certificate: {
        serial: 'HBX-CERT-0002',
        issuedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2027-01-01T00:00:00.000Z',
        status: 'ACTIVE',
        postcode: 'FC-01-A03-FK-01',
        lat: 9.0772,
        lng: 7.499
      }
    });

    expect(screen.getByText('HBX-CERT-0002')).toBeTruthy();
    expect(screen.getByText(/verification\/certificate\/HBX-CERT-0002/)).toBeTruthy();
  });

  it('labels a pending inspection honestly instead of claiming verification', () => {
    renderCard({ hasPendingInspection: true });
    expect(screen.getByText('Inspection Pending')).toBeTruthy();
    expect(screen.queryByText('Ground-Truth Verified')).toBeNull();
  });
});