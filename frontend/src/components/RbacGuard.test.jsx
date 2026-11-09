import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import RbacGuard from './RbacGuard';

afterEach(cleanup);

describe('RbacGuard', () => {
  it('renders the operations portal denial message and required roles', () => {
    render(
      <RbacGuard
        portalId="operations"
        currentUser={{ role: 'customer', name: 'Test User' }}
      />
    );

    expect(screen.getByText('Access Denied for Operations Control Tower')).toBeInTheDocument();
    expect(screen.getByText('ops_admin')).toBeInTheDocument();
    expect(screen.getByText('super_admin')).toBeInTheDocument();
  });

  it('falls back to Restricted Portal for unknown portal ids', () => {
    render(
      <RbacGuard
        portalId="mystery-portal"
        currentUser={{ role: 'customer', name: 'Test User' }}
      />
    );

    expect(screen.getByText('Access Denied for Restricted Portal')).toBeInTheDocument();
  });

  it('shows the anonymous session when no current user is provided', () => {
    render(<RbacGuard portalId="compliance" />);

    expect(screen.getByText('Unauthenticated User')).toBeInTheDocument();
    expect(screen.getByText('Role: anonymous')).toBeInTheDocument();
  });

  it('invokes onSwitchDemoAccount with the demo account when clicked', () => {
    const onSwitchDemoAccount = vi.fn();
    render(
      <RbacGuard
        portalId="operations"
        currentUser={{ role: 'customer', name: 'Test User' }}
        onSwitchDemoAccount={onSwitchDemoAccount}
      />
    );

    fireEvent.click(screen.getByText(/Log In as Kolawole Adeleke/));

    expect(onSwitchDemoAccount).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'ops_admin', name: 'Kolawole Adeleke' })
    );
  });

  it('invokes onReturnToAllowed when the return button is clicked', () => {
    const onReturnToAllowed = vi.fn();
    render(
      <RbacGuard
        portalId="operations"
        currentUser={{ role: 'customer', name: 'Test User' }}
        onReturnToAllowed={onReturnToAllowed}
      />
    );

    fireEvent.click(screen.getByText('Return to Customer Dashboard'));

    expect(onReturnToAllowed).toHaveBeenCalledTimes(1);
  });
});
