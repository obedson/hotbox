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

  it('invokes onSignOut when the sign out action is clicked', () => {
    const onSignOut = vi.fn();
    render(
      <RbacGuard
        portalId="operations"
        currentUser={{ role: 'customer', name: 'Test User' }}
        onSignOut={onSignOut}
      />
    );

    fireEvent.click(screen.getByText('Sign out'));

    expect(onSignOut).toHaveBeenCalledTimes(1);
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

    fireEvent.click(screen.getByText('Go to my dashboard'));

    expect(onReturnToAllowed).toHaveBeenCalledTimes(1);
  });
});
