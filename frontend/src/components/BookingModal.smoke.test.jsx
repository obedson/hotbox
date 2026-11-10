import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import BookingModal from './BookingModal';

describe('BookingModal smoke render', () => {
  beforeEach(() => {
    localStorage.clear();
    window.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  });

  it('renders nothing when closed', () => {
    const { container } = render(<BookingModal isOpen={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the booking wizard when open', () => {
    render(<BookingModal isOpen={true} onClose={() => {}} hubs={[]} currentUser={null} />);
    expect(screen.getByText('Send a Parcel')).toBeInTheDocument();
    expect(screen.getByText(/Service Type & Origin/i)).toBeInTheDocument();
  });

  it('renders the step progress labels', () => {
    render(<BookingModal isOpen={true} onClose={() => {}} hubs={[]} currentUser={null} />);
    expect(screen.getByText('Origin')).toBeInTheDocument();
    expect(screen.getByText('Destination')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });
});
