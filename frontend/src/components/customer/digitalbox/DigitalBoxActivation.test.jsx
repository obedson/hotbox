import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DigitalBoxActivation from './DigitalBoxActivation';

const baseBox = { annualFeeNgn: 3500, freeTrialDays: 0, certificate: null };

function renderCard(overrides = {}, props = {}) {
  const handlers = {
    wallet: { balance: '5000.00' },
    isActivating: false,
    onActivate: vi.fn(),
    onRequestGroundTruth: vi.fn(),
    isRequestingGroundTruth: false,
    ...props
  };
  render(<DigitalBoxActivation digitalBox={{ ...baseBox, ...overrides }} {...handlers} />);
  return handlers;
}

describe('Digital P.O. Box activation gate', () => {
  it('blocks activation until a Proof of Address certificate exists', () => {
    const handlers = renderCard({ certificate: null });
    const activate = screen.getByRole('button', { name: /Activate for/ });
    expect(activate.disabled).toBe(true);
    activate.click();
    expect(handlers.onActivate).not.toHaveBeenCalled();
    expect(screen.getByText('Required before activation')).toBeTruthy();
  });

  it('activates once a valid certificate is present', () => {
    const handlers = renderCard({ certificate: { serial: 'HBX-CERT-0001', status: 'ACTIVE' } });
    const activate = screen.getByRole('button', { name: /Activate for/ });
    expect(activate.disabled).toBe(false);
    activate.click();
    expect(handlers.onActivate).toHaveBeenCalledTimes(1);
  });

  it('offers the admin-configured free trial with nothing charged today', () => {
    renderCard({ freeTrialDays: 14, certificate: { serial: 'HBX-CERT-0001', status: 'ACTIVE' } });
    expect(screen.getByRole('button', { name: /Start 14-day free trial/ })).toBeTruthy();
    expect(screen.getByText(/No card is charged today/)).toBeTruthy();
  });

  it('shows the annual price separately from the POA service', () => {
    renderCard({ certificate: { serial: 'HBX-CERT-0001', status: 'ACTIVE' } });
    expect(screen.getByText('₦3,500 / year')).toBeTruthy();
    expect(screen.queryByText(/billed separately/i)).toBeNull();
  });
});