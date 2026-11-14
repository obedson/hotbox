import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import BookingModal from './BookingModal';
import { useCustomerData } from './customer/useCustomerData';
import { useDiscovery } from './customer/useDiscovery';
import { useProfileSettings } from './customer/useProfileSettings';
import DiscoveryTab from './customer/DiscoveryTab';
import ShipmentsTab from './customer/ShipmentsTab';
import DigitalBoxTab from './customer/DigitalBoxTab';
import AddressesTab from './customer/AddressesTab';
import WalletTab from './customer/WalletTab';
import ClaimsTab from './customer/ClaimsTab';
import ProfileTab from './customer/ProfileTab';
import AddressModal from './customer/AddressModal';
import ClaimModal from './customer/ClaimModal';
import EditClaimModal from './customer/EditClaimModal';
import TicketModal from './customer/TicketModal';

export default function CustomerDashboard({ currentUser, onBookNewShipment, activeNav, setActiveNav }) {
  // Navigation tabs within Customer Portal
  const [activeTab, setActiveTab] = useState('discovery'); // 'discovery' | 'shipments' | 'digital_box' | 'addresses' | 'wallet' | 'claims' | 'profile'

  // Booking prefill state
  const [bookingPrefill, setBookingPrefill] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Floating toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const {
    profile, setProfile, shipments, savedAddresses, savedHubs, claims, tickets,
    wallet, transactions, digitalBox, getAuthHeaders, fetchCustomerData
  } = useCustomerData(currentUser);

  const discovery = useDiscovery({
    currentUser,
    profile,
    showToast,
    getAuthHeaders,
    fetchCustomerData,
    setBookingPrefill,
    setIsBookingOpen
  });

  const profileSettings = useProfileSettings({
    currentUser,
    profile,
    setProfile,
    showToast,
    getAuthHeaders,
    fetchCustomerData,
    coords: discovery.coords,
    setCoords: discovery.setCoords,
    postcode: discovery.postcode,
    setPostcode: discovery.setPostcode
  });

  // Sync activeNav with activeTab
  useEffect(() => {
    if (!activeNav) return;
    if (activeNav === 'book') {
      setIsBookingOpen(true);
    } else if (activeNav === 'tracking') {
      setActiveTab('shipments');
    } else if (activeNav === 'nearby_hubs') {
      setActiveTab('discovery');
    } else if (activeNav === 'digital_box') {
      setActiveTab('digital_box');
    } else if (['discovery', 'shipments', 'digital_box', 'addresses', 'wallet', 'claims', 'profile'].includes(activeNav)) {
      setActiveTab(activeNav);
    }
  }, [activeNav]);

  const [isSearchingOccupants, setIsSearchingOccupants] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  // Modals & Action States
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isEditClaimModalOpen, setIsEditClaimModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState({
    id: '',
    claimType: 'DAMAGED_PARCEL',
    claimAmountNgn: 5000.00,
    description: ''
  });
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedShipmentForAction, setSelectedShipmentForAction] = useState(null);
  // Form Inputs
  const [newAddress, setNewAddress] = useState({
    streetAddress: '',
    postcode: '',
    areaNeighbourhood: '',
    landmark: '',
    isDefault: false
  });
  const [isResolvingAddressPostcode, setIsResolvingAddressPostcode] = useState(false);
  const [newClaim, setNewClaim] = useState({
    claimType: 'DAMAGED_PARCEL',
    description: '',
    claimAmountNgn: 5000.00
  });
  const [newTicket, setNewTicket] = useState({
    category: 'GENERAL_ENQUIRY',
    subject: '',
    message: '',
    priority: 'MEDIUM',
    shipmentId: ''
  });

  const handleAddressPostcodeChange = async (val) => {
    const code = val.toUpperCase().replace(/[^0-9A-Z\-\s]/g, '').slice(0, 15);
    setNewAddress(prev => ({ ...prev, postcode: code }));

    const clean = code.replace(/[\s\-]/g, '');
    if (clean.length === 6 || clean.length === 11) {
      setIsResolvingAddressPostcode(true);
      try {
        const res = await apiFetch(`/api/v1/postcodes/lookup?code=${encodeURIComponent(code)}&level=1`);
        if (res.ok) {
          const json = await res.json();
          const d = json.data;
          const detectedLocality = d.administrative_address?.locality_name || d.recent_house_address?.locality || d.administrative_address?.lga_name || '';
          if (detectedLocality) {
            setNewAddress(prev => ({
              ...prev,
              areaNeighbourhood: detectedLocality,
              state: d.administrative_address?.state_name,
              lga: d.administrative_address?.lga_name
            }));
          }
        } else {
          const fallbackRes = await apiFetch(`/api/v1/postcodes/${encodeURIComponent(code)}`);
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            const locality = data.neighbourhood || data.lga || data.state || '';
            if (locality) {
              setNewAddress(prev => ({
                ...prev,
                areaNeighbourhood: locality,
                state: data.state,
                lga: data.lga
              }));
            }
          }
        }
      } catch (err) {
      } finally {
        setIsResolvingAddressPostcode(false);
      }
    }
  };

  // Add Saved Address
  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/v1/customer/addresses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newAddress)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Address saved successfully!');
        setIsAddAddressOpen(false);
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to save address', 'error');
      }
    } catch (err) {
      showToast('Error saving address', 'error');
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id) => {
    try {
      const res = await apiFetch(`/api/v1/customer/addresses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast('Address removed');
        fetchCustomerData();
      }
    } catch (err) {
      showToast('Error removing address', 'error');
    }
  };

  // Cancel Shipment
  const handleCancelShipment = async (shipmentId) => {
    try {
      const res = await apiFetch(`/api/v1/customer/shipments/${shipmentId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: 'Cancelled by customer in portal' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        fetchCustomerData();
      } else {
        showToast(data.error || 'Cannot cancel shipment', 'error');
      }
    } catch (err) {
      showToast('Error cancelling shipment', 'error');
    }
  };

  // Request Return
  const handleRequestReturn = async (shipmentId) => {
    try {
      const res = await apiFetch(`/api/v1/customer/shipments/${shipmentId}/return`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: 'Customer requested return to origin hub' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        fetchCustomerData();
      } else {
        showToast(data.error || 'Cannot return shipment', 'error');
      }
    } catch (err) {
      showToast('Error requesting return', 'error');
    }
  };

  // Submit Claim
  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/v1/customer/claims', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          shipmentId: selectedShipmentForAction?.id || shipments[0]?.id,
          ...newClaim
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Claim submitted for support review!');
        setIsClaimModalOpen(false);
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to submit claim', 'error');
      }
    } catch (err) {
      showToast('Error submitting claim', 'error');
    }
  };

  // Open Edit Claim Modal
  const handleOpenEditClaim = (claim) => {
    setEditingClaim({
      id: claim.id,
      claimType: claim.claim_type,
      claimAmountNgn: parseFloat(claim.claim_amount_ngn),
      description: claim.description
    });
    setIsEditClaimModalOpen(true);
  };

  // Submit Claim Update
  const handleUpdateClaim = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/v1/customer/claims/${editingClaim.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editingClaim)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Claim updated successfully!');
        setIsEditClaimModalOpen(false);
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to update claim', 'error');
      }
    } catch (err) {
      showToast('Error updating claim', 'error');
    }
  };

  // Cancel Claim Submission
  const handleCancelClaim = async (claimId) => {
    if (!window.confirm('Are you sure you want to cancel this claim submission?')) return;
    try {
      const res = await apiFetch(`/api/v1/customer/claims/${claimId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Claim submission cancelled');
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to cancel claim', 'error');
      }
    } catch (err) {
      showToast('Error cancelling claim', 'error');
    }
  };

  // Submit Ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/v1/customer/tickets', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newTicket)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Support ticket opened!');
        setIsTicketModalOpen(false);
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to submit ticket', 'error');
      }
    } catch (err) {
      showToast('Error submitting ticket', 'error');
    }
  };

  // Request OTP for Phone or Email
  return (
    <div className="space-y-6">
      {activeTab === 'discovery' && (
        <DiscoveryTab
          discovery={discovery}
          savedAddresses={savedAddresses}
          savedHubs={savedHubs}
          setIsBookingOpen={setIsBookingOpen}
        />
      )}

      {activeTab === 'shipments' && (
        <ShipmentsTab
          shipments={shipments}
          setIsBookingOpen={setIsBookingOpen}
          setIsClaimModalOpen={setIsClaimModalOpen}
          setSelectedShipmentForAction={setSelectedShipmentForAction}
          handleCancelShipment={handleCancelShipment}
          handleRequestReturn={handleRequestReturn}
        />
      )}

      {activeTab === 'digital_box' && (
        <DigitalBoxTab
          digitalBox={digitalBox}
          getAuthHeaders={getAuthHeaders}
          fetchCustomerData={fetchCustomerData}
          profile={profile}
          wallet={wallet}
          currentUser={currentUser}
          senderLocation={discovery.senderLocation}
          showToast={showToast}
          handleTestRerouteAlert={profileSettings.handleTestRerouteAlert}
          handleToggleNotification={profileSettings.handleToggleNotification}
          testRerouteLoading={profileSettings.testRerouteLoading}
          testRerouteResult={profileSettings.testRerouteResult}
          isCertificateModalOpen={isCertificateModalOpen}
          setIsCertificateModalOpen={setIsCertificateModalOpen}
        />
      )}

      {activeTab === 'addresses' && (
        <AddressesTab
          savedAddresses={savedAddresses}
          savedHubs={savedHubs}
          handleDeleteAddress={handleDeleteAddress}
          handleToggleSaveHub={discovery.handleToggleSaveHub}
          setIsAddAddressOpen={setIsAddAddressOpen}
        />
      )}

      {activeTab === 'wallet' && (
        <WalletTab
          wallet={wallet}
          transactions={transactions}
          fetchCustomerData={fetchCustomerData}
          showToast={showToast}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {activeTab === 'claims' && (
        <ClaimsTab
          claims={claims}
          tickets={tickets}
          setIsClaimModalOpen={setIsClaimModalOpen}
          setIsTicketModalOpen={setIsTicketModalOpen}
          handleCancelClaim={handleCancelClaim}
          handleOpenEditClaim={handleOpenEditClaim}
        />
      )}

      {activeTab === 'profile' && (
        <ProfileTab
          settings={profileSettings}
          currentUser={currentUser}
          profile={profile}
          setProfile={setProfile}
          showToast={showToast}
          getAuthHeaders={getAuthHeaders}
          fetchCustomerData={fetchCustomerData}
          claims={claims}
          shipments={shipments}
          wallet={wallet}
          savedAddresses={savedAddresses}
          savedHubs={savedHubs}
          hubs={discovery.hubs}
        />
      )}

      {/* Floating Alert Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-rose-900 text-white border-rose-700' : 'bg-[#062419] text-white border-emerald-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      <AddressModal
        isOpen={isAddAddressOpen}
        newAddress={newAddress}
        setNewAddress={setNewAddress}
        isResolvingAddressPostcode={isResolvingAddressPostcode}
        handleAddressPostcodeChange={handleAddressPostcodeChange}
        handleAddAddress={handleAddAddress}
        setIsAddAddressOpen={setIsAddAddressOpen}
      />

      <ClaimModal
        isOpen={isClaimModalOpen}
        newClaim={newClaim}
        setNewClaim={setNewClaim}
        selectedShipmentForAction={selectedShipmentForAction}
        setSelectedShipmentForAction={setSelectedShipmentForAction}
        shipments={shipments}
        setIsClaimModalOpen={setIsClaimModalOpen}
        handleSubmitClaim={handleSubmitClaim}
      />

      <EditClaimModal
        isOpen={isEditClaimModalOpen}
        editingClaim={editingClaim}
        setEditingClaim={setEditingClaim}
        setIsEditClaimModalOpen={setIsEditClaimModalOpen}
        handleUpdateClaim={handleUpdateClaim}
      />

      <TicketModal
        isOpen={isTicketModalOpen}
        newTicket={newTicket}
        setNewTicket={setNewTicket}
        shipments={shipments}
        setIsTicketModalOpen={setIsTicketModalOpen}
        handleSubmitTicket={handleSubmitTicket}
      />

      {/* MODAL: Booking Modal */}
      {(() => {
        const modalSender = bookingPrefill?.sender || {
          name: profile?.name || currentUser?.name || 'Kolawole Adeleke',
          phone: profile?.phone || currentUser?.phone || '+2348037778899',
          postcode: discovery.senderLocation.postcode || 'FC-01-A03-FK-01',
          address: discovery.senderLocation.address || ''
        };
        const modalRecipient = bookingPrefill?.recipient || {
          name: 'Ngozi Eze',
          phone: '+2348029988112',
          email: 'ngozi@eze.ng',
          postcode: discovery.recipientLocation.postcode || 'FC-01-A02-FK-02',
          address: discovery.recipientLocation.address || '',
          hubId: discovery.selectedHub?.id || (discovery.hubs && discovery.hubs.length > 0 ? discovery.hubs[0].id : '')
        };
        return (
          <BookingModal
            isOpen={isBookingOpen}
            onClose={() => {
              setIsBookingOpen(false);
              setBookingPrefill(null);
            }}
            hubs={discovery.hubs}
            currentUser={currentUser}
            prefilledSender={modalSender}
            prefilledRecipient={modalRecipient}
            onBookSuccess={newShipment => {
              showToast(`Booked shipment ${newShipment.tracking_code}!`);
              fetchCustomerData();
            }}
          />
        );
      })()}
    </div>
  );
}
