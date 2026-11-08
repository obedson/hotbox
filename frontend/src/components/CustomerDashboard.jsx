import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Package, MapPin, Search, Plus, CheckCircle2, AlertTriangle,
  ArrowRight, Wallet, Users, Store, Shield, Phone, Mail, Clock,
  FileText, X, Check, RefreshCw, Heart, Trash2, ShieldCheck, HelpCircle,
  User, Save, Calendar, Copy, BadgeCheck, Navigation, Compass, Sparkles,
  ArrowUpDown, CheckCircle, ExternalLink, Crosshair,
  ArrowDownLeft, ArrowUpRight, Lock, Info, CreditCard, Pencil, LifeBuoy
} from 'lucide-react';
import BookingModal from './BookingModal';

// Sleek Tooltip & InfoTooltip components with Touch & Mobile Support
function Tooltip({ children, content, position = 'top' }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => {
        e.stopPropagation();
        setShow(prev => !prev);
      }}
    >
      {children}
      {show && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShow(false);
          }}
          className={`absolute z-50 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-normal rounded-lg shadow-xl border border-slate-700 transition-all cursor-pointer ${
            position === 'bottom'
              ? 'top-full left-1/2 -translate-x-1/2 mt-2 max-w-[260px] whitespace-normal text-center leading-snug'
              : position === 'right'
              ? 'left-full top-1/2 -translate-y-1/2 ml-2 max-w-[240px] whitespace-normal leading-snug'
              : 'bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap'
          }`}
        >
          {content}
          {position === 'bottom' ? (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900"></div>
          ) : position === 'right' ? (
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
          ) : (
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoTooltip({ text, position = 'bottom' }) {
  return (
    <Tooltip content={text} position={position}>
      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer ml-1 inline-block shrink-0" />
    </Tooltip>
  );
}

function formatDistance(km) {
  if (km === undefined || km === null) return '';
  const num = parseFloat(km);
  if (isNaN(num)) return '';
  if (num < 1) {
    const meters = Math.round(num * 1000);
    return `${meters}m away`;
  }
  return `${num.toFixed(2)} km away`;
}

function estimateTime(km) {
  if (km === undefined || km === null) return '';
  const num = parseFloat(km);
  if (isNaN(num)) return '';
  if (num <= 1) {
    const mins = Math.max(1, Math.round(num * 12));
    return `~${mins} min walk`;
  }
  const mins = Math.max(2, Math.round(num * 2.5));
  return `~${mins} min drive`;
}

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

export default function CustomerDashboard({ currentUser, onBookNewShipment, activeNav, setActiveNav }) {
  // Navigation tabs within Customer Portal
  const [activeTab, setActiveTab] = useState('discovery'); // 'discovery' | 'shipments' | 'digital_box' | 'addresses' | 'wallet' | 'claims' | 'profile'

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

  // Proximity Mode & Location State
  const [hubSearchMode, setHubSearchMode] = useState('sender'); // 'sender' (Drop-off near me) | 'recipient' (Collection near recipient)
  const [sortByProximity, setSortByProximity] = useState(true);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map' for mobile layout
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Search input queries (Address or Digital Postcode)
  const [senderQuery, setSenderQuery] = useState('');
  const [recipientQuery, setRecipientQuery] = useState('');

  // Sender Location State (Origin)
  const [senderLocation, setSenderLocation] = useState({
    postcode: '',
    address: '',
    coords: null,
    hasVerifiedPostcode: null,
    noPostcodeWarning: null
  });

  // Recipient Location State (Destination)
  const [recipientLocation, setRecipientLocation] = useState({
    postcode: '',
    address: '',
    coords: null,
    hasVerifiedPostcode: null,
    noPostcodeWarning: null
  });

  // Active Map & Hubs State
  const [postcode, setPostcode] = useState('');
  const [coords, setCoords] = useState({ lat: 9.0772, lng: 7.4990 });
  const [hubs, setHubs] = useState([]);
  const [selectedHub, setSelectedHub] = useState(null);

  const activeLocation = hubSearchMode === 'sender' ? senderLocation : recipientLocation;
  const hasEnteredLocation = Boolean(
    activeLocation.address || 
    activeLocation.postcode || 
    activeLocation.noPostcodeWarning
  );
  const hasMapCoords = Boolean(activeLocation.coords && activeLocation.coords.lat && activeLocation.coords.lng);

  // Booking prefill state
  const [bookingPrefill, setBookingPrefill] = useState(null);

  // Customer Data State
  const [profile, setProfile] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [savedHubs, setSavedHubs] = useState([]);
  const [claims, setClaims] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [testRerouteLoading, setTestRerouteLoading] = useState(false);
  const [testRerouteResult, setTestRerouteResult] = useState(null);

  // Hotbox Digital P.O. Box & Ground-Truthing State
  const [digitalBox, setDigitalBox] = useState(null);
  const [isRenewingBox, setIsRenewingBox] = useState(false);
  const [isRequestingGroundTruth, setIsRequestingGroundTruth] = useState(false);
  const [occupantSearchCode, setOccupantSearchCode] = useState('FC-01-A03-FK-01');
  const [occupantSearchResults, setOccupantSearchResults] = useState(null);
  const [isSearchingOccupants, setIsSearchingOccupants] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);

  // Modals & Action States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
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
  const [verifyModal, setVerifyModal] = useState({
    isOpen: false,
    type: 'email', // 'email' | 'phone'
    destination: '',
    isLoading: false,
    isSent: false,
    previewOtp: null,
    provider: null,
    notice: null
  });
  const [verifyOtp, setVerifyOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedShipmentForAction, setSelectedShipmentForAction] = useState(null);

  // Profile Form Inputs & Save State
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: '',
    postcode: 'FC-01-A03-FK-01'
  });
  const [postcodeDetails, setPostcodeDetails] = useState(null);
  const [isResolvingPostcode, setIsResolvingPostcode] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

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
  const [topupAmount, setTopupAmount] = useState('5000');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('dropboxz_token');
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  };

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [pRes, sRes, cRes, tRes, dRes] = await Promise.all([
        fetch('/api/v1/customer/profile', { headers }),
        fetch('/api/v1/customer/shipments', { headers }),
        fetch('/api/v1/customer/claims', { headers }),
        fetch('/api/v1/customer/tickets', { headers }),
        fetch('/api/v1/customer/digital-box', { headers })
      ]);

      if (dRes && dRes.ok) {
        const dData = await dRes.json();
        setDigitalBox(dData);
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        setProfile(pData.user);
        setWallet(pData.wallet || null);
        setTransactions(pData.transactions || []);
        if (pData.user) {
          const userPostcode = pData.user.postcode || '';
          setProfileForm({
            name: pData.user.name || '',
            phone: pData.user.phone || '',
            email: pData.user.email || '',
            postcode: userPostcode
          });
          if (pData.user.postcode_neighbourhood || pData.user.postcode_state) {
            setPostcodeDetails({
              neighbourhood: pData.user.postcode_neighbourhood,
              lga: pData.user.postcode_lga,
              state: pData.user.postcode_state,
              description: pData.user.postcode_description
            });
          }
        }
        setSavedAddresses(pData.addresses || []);
        setSavedHubs(pData.savedHubs || []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setShipments(sData.shipments || []);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setClaims(cData.claims || []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTickets(tData.tickets || []);
      }
    } catch (err) {
      console.error('Customer fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHubsForLocation = async (targetCoords, targetPostcode) => {
    try {
      const lat = targetCoords?.lat || coords.lat;
      const lng = targetCoords?.lng || coords.lng;
      const pc = targetPostcode || postcode;
      const res = await fetch(`/api/v1/hubs/nearby?lat=${lat}&lng=${lng}&postcode=${encodeURIComponent(pc)}&radius=30`);
      const data = await res.json();
      if (Array.isArray(data.hubs)) {
        let sorted = [...data.hubs];
        if (sortByProximity) {
          sorted.sort((a, b) => (parseFloat(a.distanceKm) || 0) - (parseFloat(b.distanceKm) || 0));
        }
        setHubs(sorted);
        if (sorted.length > 0) setSelectedHub(sorted[0]);
      }
    } catch (err) {
      console.error('Hubs error:', err);
    }
  };

  const fetchHubs = async () => {
    const activeLoc = hubSearchMode === 'sender' ? senderLocation : recipientLocation;
    if (activeLoc.coords && (activeLoc.address || activeLoc.postcode)) {
      await fetchHubsForLocation(activeLoc.coords, activeLoc.postcode);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [currentUser]);

  useEffect(() => {
    const activeLoc = hubSearchMode === 'sender' ? senderLocation : recipientLocation;
    if (activeLoc.coords && (activeLoc.address || activeLoc.postcode)) {
      fetchHubsForLocation(activeLoc.coords, activeLoc.postcode);
    }
  }, [sortByProximity]);

  // Switch between Sender & Recipient Proximity Modes
  const handleSwitchHubMode = (mode) => {
    setHubSearchMode(mode);
    setShowSuggestions(false);
    const loc = mode === 'sender' ? senderLocation : recipientLocation;
    if (loc.coords && (loc.address || loc.postcode)) {
      setCoords(loc.coords);
      setPostcode(loc.postcode);
      fetchHubsForLocation(loc.coords, loc.postcode);
    } else {
      setHubs([]);
      setSelectedHub(null);
    }
  };

  // Live Query Typing & Autocomplete Handler
  const handleQueryChange = async (val, mode) => {
    if (mode === 'sender') {
      setSenderQuery(val);
    } else {
      setRecipientQuery(val);
    }

    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Only fast-resolve if strictly matching valid NIPOST postcode patterns
    const clean = val.toUpperCase().replace(/[^0-9A-Z]/g, '');
    const isLegacyPostcode = /^\d{6}$/.test(clean);
    const isNdapsPostcode = clean.length === 11 && /^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z]{2}\d{2}$/.test(clean);

    if (isLegacyPostcode || isNdapsPostcode) {
      handleResolveAndSearch(val, mode, true);
      return;
    }

    try {
      const res = await fetch(`/api/v1/postcodes/search/autocomplete?q=${encodeURIComponent(val.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    } catch (e) {
      setSuggestions([]);
    }
  };

  // Resolve location from query (either Digital Postcode or Street Address)
  const handleResolveAndSearch = async (queryToResolve, mode = hubSearchMode, isFastPostcode = false) => {
    const raw = (queryToResolve !== undefined ? queryToResolve : (mode === 'sender' ? senderQuery : recipientQuery)).trim();
    if (!raw) return;

    setIsSearchingLocation(true);
    setShowSuggestions(false);
    try {
      const res = await fetch(`/api/v1/postcodes/resolve-location?q=${encodeURIComponent(raw)}`);
      const data = await res.json();

      if (res.ok) {
        const resolvedPostcode = data.ndaps_code || data.postcode || '';
        const resolvedAddress = data.full_address || data.address || raw;
        const newCoords = (data.lat && data.lng) ? { lat: parseFloat(data.lat), lng: parseFloat(data.lng) } : null;

        if (resolvedPostcode) {
          // A valid verified postcode exists
          const locationObj = {
            postcode: resolvedPostcode,
            address: resolvedAddress,
            coords: newCoords || coords,
            hasVerifiedPostcode: true,
            noPostcodeWarning: null
          };

          if (mode === 'sender') {
            setSenderLocation(locationObj);
            if (newCoords) setCoords(newCoords);
            setPostcode(resolvedPostcode);
            fetchHubsForLocation(newCoords || coords, resolvedPostcode);
            showToast('Digital Postcode verified! Full address loaded.');
          } else {
            setRecipientLocation(locationObj);
            if (newCoords) setCoords(newCoords);
            setPostcode(resolvedPostcode);
            fetchHubsForLocation(newCoords || coords, resolvedPostcode);
            showToast('Recipient Digital Postcode verified!');
          }
        } else {
          // Address entered, BUT NO verified postcode attached in database!
          const warningMsg = data.message || 'No verified postcode found for this address, please request for postcode from NIPOST.';
          const locationObj = {
            postcode: '',
            address: resolvedAddress,
            coords: newCoords,
            hasVerifiedPostcode: false,
            noPostcodeWarning: warningMsg
          };

          if (mode === 'sender') {
            setSenderLocation(locationObj);
            if (newCoords) {
              setCoords(newCoords);
              fetchHubsForLocation(newCoords, '');
            } else {
              setHubs([]);
            }
          } else {
            setRecipientLocation(locationObj);
            if (newCoords) {
              setCoords(newCoords);
              fetchHubsForLocation(newCoords, '');
            } else {
              setHubs([]);
            }
          }
          showToast('No verified postcode found for this address, please request for postcode from NIPOST.', 'error');
        }
      } else {
        // Backend error / not found fallback
        const warningMsg = 'No verified postcode found for this address, please request for postcode from NIPOST.';
        const locationObj = {
          postcode: '',
          address: raw,
          coords: null,
          hasVerifiedPostcode: false,
          noPostcodeWarning: warningMsg
        };

        if (mode === 'sender') {
          setSenderLocation(locationObj);
          setHubs([]);
        } else {
          setRecipientLocation(locationObj);
          setHubs([]);
        }
        showToast(warningMsg, 'error');
      }
    } catch (err) {
      if (!isFastPostcode) showToast('Error looking up location', 'error');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Select suggestion from dropdown
  const handleSelectSuggestion = (sug, mode = hubSearchMode) => {
    setShowSuggestions(false);
    const chosenText = sug.description || sug.neighbourhood || sug.postcode;
    if (mode === 'sender') {
      setSenderQuery(chosenText);
    } else {
      setRecipientQuery(chosenText);
    }

    if (sug.lat && sug.lng) {
      const newCoords = { lat: parseFloat(sug.lat), lng: parseFloat(sug.lng) };
      const resolvedAddress = sug.description || `${sug.neighbourhood}, ${sug.state}`;
      const resolvedPostcode = sug.postcode || '';

      const locationObj = {
        postcode: resolvedPostcode,
        address: resolvedAddress,
        coords: newCoords,
        hasVerifiedPostcode: Boolean(resolvedPostcode),
        noPostcodeWarning: resolvedPostcode ? null : 'No verified postcode found for this address, please request for postcode from NIPOST.'
      };

      if (mode === 'sender') {
        setSenderLocation(locationObj);
        setCoords(newCoords);
        setPostcode(resolvedPostcode);
        fetchHubsForLocation(newCoords, resolvedPostcode);
        showToast(resolvedPostcode ? `Origin set: ${resolvedAddress}` : 'No verified postcode found for this address.');
      } else {
        setRecipientLocation(locationObj);
        setCoords(newCoords);
        setPostcode(resolvedPostcode);
        fetchHubsForLocation(newCoords, resolvedPostcode);
        showToast(resolvedPostcode ? `Recipient destination set: ${resolvedAddress}` : 'No verified postcode found for this address.');
      }
    } else {
      handleResolveAndSearch(sug.postcode || chosenText, mode);
    }
  };

  // Quick Location & Address Selector (from PostgreSQL saved addresses or active hub corridors)
  const handleSelectQuickLocation = (loc, mode = hubSearchMode) => {
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lng);
    const newCoords = { lat, lng };
    const addrText = loc.street_address || loc.address || loc.address_text || loc.contact_name || '';
    const postCode = loc.postcode || '';

    const locationObj = {
      postcode: postCode,
      address: addrText,
      coords: newCoords,
      hasVerifiedPostcode: Boolean(postCode),
      noPostcodeWarning: postCode ? null : 'No verified postcode found for this address, please request for postcode from NIPOST.'
    };

    if (mode === 'sender') {
      setSenderLocation(locationObj);
      setSenderQuery(postCode || addrText);
      setCoords(newCoords);
      setPostcode(postCode);
      fetchHubsForLocation(newCoords, postCode);
      showToast(`Origin set: ${loc.contact_name || addrText}`);
    } else {
      setRecipientLocation(locationObj);
      setRecipientQuery(postCode || addrText);
      setCoords(newCoords);
      setPostcode(postCode);
      fetchHubsForLocation(newCoords, postCode);
      showToast(`Recipient destination set: ${loc.contact_name || addrText}`);
    }
  };

  // Book Parcel via chosen hub
  const handleBookWithHub = (hub) => {
    const isRecipient = hubSearchMode === 'recipient';
    setBookingPrefill({
      sender: {
        name: profile?.name || currentUser?.name || '',
        phone: profile?.phone || currentUser?.phone || '',
        postcode: senderLocation.postcode,
        address: senderLocation.address
      },
      recipient: {
        postcode: recipientLocation.postcode,
        address: recipientLocation.address,
        hubId: isRecipient ? hub.id : (hubs[0]?.id || hub.id)
      }
    });
    setIsBookingOpen(true);
  };

  // Toggle Save Hub
  const handleToggleSaveHub = async (hub) => {
    try {
      const res = await fetch(`/api/v1/customer/saved-hubs/${hub.id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ label: hub.business_name })
      });
      const data = await res.json();
      showToast(data.message);
      fetchCustomerData();
    } catch (err) {
      showToast('Failed to save hub', 'error');
    }
  };

  // Auto-resolve neighborhood & state when user enters NIPOST Postcode for a new address
  const handleAddressPostcodeChange = async (val) => {
    const code = val.toUpperCase().replace(/[^0-9A-Z\-\s]/g, '').slice(0, 15);
    setNewAddress(prev => ({ ...prev, postcode: code }));

    const clean = code.replace(/[\s\-]/g, '');
    if (clean.length === 6 || clean.length === 11) {
      setIsResolvingAddressPostcode(true);
      try {
        const res = await fetch(`/api/v1/postcodes/lookup?code=${encodeURIComponent(code)}&level=1`);
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
          const fallbackRes = await fetch(`/api/v1/postcodes/${encodeURIComponent(code)}`);
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
      const res = await fetch('/api/v1/customer/addresses', {
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
      const res = await fetch(`/api/v1/customer/addresses/${id}`, {
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
      const res = await fetch(`/api/v1/customer/shipments/${shipmentId}/cancel`, {
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
      const res = await fetch(`/api/v1/customer/shipments/${shipmentId}/return`, {
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
      const res = await fetch('/api/v1/customer/claims', {
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
      const res = await fetch(`/api/v1/customer/claims/${editingClaim.id}`, {
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
      const res = await fetch(`/api/v1/customer/claims/${claimId}/cancel`, {
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
      const res = await fetch('/api/v1/customer/tickets', {
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
  const handleRequestOtp = async (type) => {
    try {
      setVerifyModal(prev => ({ ...prev, isLoading: true }));
      const res = await fetch('/api/v1/customer/request-otp', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (res.ok) {
        setVerifyModal(prev => ({
          ...prev,
          isLoading: false,
          isSent: true,
          destination: data.destination,
          previewOtp: data.otpPreview || null,
          provider: data.provider || 'Gateway',
          notice: data.notice || null
        }));
        if (data.otpPreview) {
          setVerifyOtp(data.otpPreview);
        }
        showToast(data.message);
      } else {
        setVerifyModal(prev => ({ ...prev, isLoading: false }));
        showToast(data.error || 'Failed to dispatch OTP', 'error');
      }
    } catch (err) {
      setVerifyModal(prev => ({ ...prev, isLoading: false }));
      showToast('Error requesting OTP: ' + err.message, 'error');
    }
  };

  const handleOpenVerifyModal = (type) => {
    const destination = type === 'phone'
      ? (profile?.phone || currentUser?.phone || '+2348012345678')
      : (profile?.email || currentUser?.email || 'customer@hotboxng.com');

    setVerifyOtp('');
    setVerifyModal({
      isOpen: true,
      type,
      destination,
      isLoading: true,
      isSent: false,
      previewOtp: null,
      provider: null,
      notice: null
    });
    handleRequestOtp(type);
  };

  // Confirm OTP Verification
  const handleConfirmVerify = async () => {
    if (!verifyOtp || verifyOtp.trim().length !== 6) {
      showToast('Please enter a valid 6-digit OTP code', 'error');
      return;
    }
    try {
      setIsVerifying(true);
      const res = await fetch('/api/v1/customer/verify-contact', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type: verifyModal.type, otp: verifyOtp.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        setVerifyModal(prev => ({ ...prev, isOpen: false }));
        if (data.user) {
          setProfile(data.user);
        }
        fetchCustomerData();
      } else {
        showToast(data.error || 'Verification failed', 'error');
      }
    } catch (err) {
      showToast('Error confirming OTP', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset verification for testing
  const handleResetVerification = async (type = 'all') => {
    try {
      const res = await fetch('/api/v1/customer/reset-verification', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Verification status reset for testing`);
        if (data.user) setProfile(data.user);
        fetchCustomerData();
      }
    } catch (err) {
      showToast('Failed to reset verification', 'error');
    }
  };

  // Toggle Notification preferences (In-App, Email, SMS, WhatsApp)
  const handleToggleNotification = async (channel, enabled) => {
    const currentPrefs = profile?.notification_preferences || { inapp: true, email: true, sms: false, whatsapp: false };
    const updated = { ...currentPrefs, [channel]: enabled };
    setProfile(prev => ({ ...prev, notification_preferences: updated }));
    try {
      const res = await fetch('/api/v1/customer/notification-preferences', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const costStr = (channel === 'inapp' || channel === 'email') ? 'Free (₦0.00)' : channel === 'sms' ? '₦20.00/SMS' : '₦35.00/WhatsApp';
        showToast(`${channel.toUpperCase()} alerts ${enabled ? 'activated' : 'deactivated'} [${costStr}]`);
      }
    } catch (err) {
      showToast('Failed to update preferences', 'error');
    }
  };

  // Trigger Test Dual-Party Reroute Alert Simulation
  const handleTestRerouteAlert = async () => {
    setTestRerouteLoading(true);
    setTestRerouteResult(null);
    try {
      const res = await fetch('/api/v1/customer/test-reroute-alert', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          oldPostcode: 'LA-01-A01-AA-01',
          newPostcode: profile?.postcode || 'FC-01-A03-FK-01'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTestRerouteResult(data);
        showToast('Dual-party reroute alert dispatched successfully!');
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to dispatch test reroute alert', 'error');
      }
    } catch (err) {
      showToast('Network error dispatching test alert', 'error');
    } finally {
      setTestRerouteLoading(false);
    }
  };

  // Renew Digital P.O. Box (NIPOST Annual Subscription)
  const handleRenewDigitalBox = async () => {
    setIsRenewingBox(true);
    try {
      const res = await fetch('/api/v1/customer/renew-digital-box', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Digital P.O. Box renewed successfully!');
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to renew Digital P.O. Box', 'error');
      }
    } catch (err) {
      showToast('Network error during renewal', 'error');
    } finally {
      setIsRenewingBox(false);
    }
  };

  // Request NIPOST Ground-Truthing Physical Inspection
  const handleRequestGroundTruth = async () => {
    setIsRequestingGroundTruth(true);
    try {
      const res = await fetch('/api/v1/customer/request-ground-truthing', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Ground-Truthing physical inspection ordered!');
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to request ground-truthing', 'error');
      }
    } catch (err) {
      showToast('Network error requesting ground-truthing', 'error');
    } finally {
      setIsRequestingGroundTruth(false);
    }
  };

  // Search Building Occupants / Mail Postcode
  const handleSearchOccupants = async (e) => {
    if (e) e.preventDefault();
    if (!occupantSearchCode || !occupantSearchCode.trim()) return;
    setIsSearchingOccupants(true);
    try {
      const res = await fetch(`/api/v1/operations/postcode-occupants?postcode=${encodeURIComponent(occupantSearchCode.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setOccupantSearchResults(data);
      } else {
        showToast(data.error || 'Occupant search failed', 'error');
      }
    } catch (err) {
      showToast('Network error searching occupants', 'error');
    } finally {
      setIsSearchingOccupants(false);
    }
  };

  // Toggle Browser Location Privacy Consent
  const handleToggleLocationPrivacy = async (enabled) => {
    const currentPrivacy = profile?.privacy_settings || { shareLocation: false, allowAnalytics: true };
    if (enabled) {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
      }
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const liveLat = position.coords.latitude;
          const liveLng = position.coords.longitude;
          setCoords({ lat: liveLat, lng: liveLng });
          const updatedPrivacy = { ...currentPrivacy, shareLocation: true, coords: { lat: liveLat, lng: liveLng } };
          setProfile(prev => ({ ...prev, privacy_settings: updatedPrivacy }));
          setGeoLoading(false);
          try {
            await fetch('/api/v1/customer/profile', {
              method: 'PUT',
              headers: getAuthHeaders(),
              body: JSON.stringify({ privacy_settings: updatedPrivacy })
            });
            showToast(`GPS captured (${liveLat.toFixed(4)}, ${liveLng.toFixed(4)})! Hubs re-ranked.`);
          } catch (err) {
            console.error(err);
          }
        },
        async (err) => {
          setGeoLoading(false);
          console.warn('Geolocation error:', err.message);
          showToast(`Browser GPS prompt: ${err.message}. Please allow location access.`, 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      const updatedPrivacy = { ...currentPrivacy, shareLocation: false };
      setProfile(prev => ({ ...prev, privacy_settings: updatedPrivacy }));
      setCoords({ lat: 9.0772, lng: 7.4990 }); // Default Abuja
      try {
        await fetch('/api/v1/customer/profile', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ privacy_settings: updatedPrivacy })
        });
        showToast('Location privacy enabled. Using standard hub coordinates.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Postcode Change & Live Resolver for Relocation (NIPOST NDAPS Standard: docs.postcode.gov.ng)
  const handlePostcodeChange = async (val) => {
    // Tolerant of letters, digits, hyphens, and spaces up to 15 characters
    const code = val.toUpperCase().replace(/[^0-9A-Z\-\s]/g, '').slice(0, 15);
    setProfileForm(prev => ({ ...prev, postcode: code }));

    const clean = code.replace(/[\s\-]/g, '');
    // Resolve when valid 6-digit legacy or 11-digit NDAPS format is typed
    if (clean.length === 6 || clean.length === 11) {
      setIsResolvingPostcode(true);
      try {
        const res = await fetch(`/api/v1/postcodes/lookup?code=${encodeURIComponent(code)}&level=1`);
        if (res.ok) {
          const json = await res.json();
          const d = json.data;
          setPostcodeDetails({
            postcode: d.postcode,
            display: d.display,
            compact: d.compact,
            state: d.administrative_address?.state_name,
            lga: d.administrative_address?.lga_name,
            neighbourhood: d.administrative_address?.locality_name,
            zone: d.administrative_address?.zone,
            description: d.recent_house_address?.recent,
            legacy_postcode: d.legacy_postcode,
            lat: d.coordinates?.lat,
            lng: d.coordinates?.lng,
            segments: d.segments
          });
        } else {
          const fallbackRes = await fetch(`/api/v1/postcodes/${encodeURIComponent(code)}`);
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            setPostcodeDetails(data);
          } else {
            setPostcodeDetails(null);
          }
        }
      } catch (err) {
        setPostcodeDetails(null);
      } finally {
        setIsResolvingPostcode(false);
      }
    } else if (clean.length < 6) {
      setPostcodeDetails(null);
    }
  };

  const handleSelectQuickRelocation = async (code) => {
    setProfileForm(prev => ({ ...prev, postcode: code }));
    setIsResolvingPostcode(true);
    try {
      const res = await fetch(`/api/v1/postcodes/lookup?code=${encodeURIComponent(code)}&level=1`);
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        setPostcodeDetails({
          postcode: d.postcode,
          display: d.display,
          compact: d.compact,
          state: d.administrative_address?.state_name,
          lga: d.administrative_address?.lga_name,
          neighbourhood: d.administrative_address?.locality_name,
          zone: d.administrative_address?.zone,
          description: d.recent_house_address?.recent,
          legacy_postcode: d.legacy_postcode,
          lat: d.coordinates?.lat,
          lng: d.coordinates?.lng,
          segments: d.segments
        });
      }
    } catch (e) {
    } finally {
      setIsResolvingPostcode(false);
    }
  };

  // Save Legal Profile Details & Relocation
  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    if (!profileForm.name.trim()) {
      showToast('Legal name is required', 'error');
      return;
    }
    const cleanPostcode = (profileForm.postcode || 'FC-01-A03-FK-01').trim();
    try {
      setIsSavingProfile(true);
      const res = await fetch('/api/v1/customer/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim(),
          email: profileForm.email.trim(),
          postcode: cleanPostcode
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Legal profile & relocation details updated!');
        if (data.user) {
          setProfile(data.user);
          if (cleanPostcode) {
            setPostcode(cleanPostcode);
            // Re-center map & fetch nearby hubs if user relocated
            try {
              const pcRes = await fetch(`/api/v1/postcodes/${encodeURIComponent(cleanPostcode)}`);
              if (pcRes.ok) {
                const pcData = await pcRes.json();
                if (pcData.lat && pcData.lng) {
                  setCoords({ lat: parseFloat(pcData.lat), lng: parseFloat(pcData.lng) });
                }
              }
            } catch (err) {}
          }
          try {
            const stored = JSON.parse(localStorage.getItem('dropboxz_user') || '{}');
            localStorage.setItem('dropboxz_user', JSON.stringify({
              ...stored,
              name: data.user.name,
              phone: data.user.phone,
              email: data.user.email,
              postcode: data.user.postcode
            }));
          } catch (e) {}
        }
        fetchCustomerData();
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showToast('Error saving profile changes', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard?.writeText(id);
    setCopiedId(true);
    showToast('Customer Account ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Wallet Top-up
  const handleWalletTopup = async () => {
    const amt = parseFloat(topupAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid top-up amount', 'error');
      return;
    }
    try {
      setIsToppingUp(true);
      const res = await fetch('/api/v1/customer/wallet/topup', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount: amt })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Wallet credited with ₦${amt.toLocaleString('en-NG')}`);
        fetchCustomerData();
      } else {
        showToast(data.error || 'Topup failed', 'error');
      }
    } catch (err) {
      showToast('Topup failed: ' + err.message, 'error');
    } finally {
      setIsToppingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* TAB 1: SEND & FIND HUBS (DISCOVERY) */}
      {activeTab === 'discovery' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Action Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#062419] text-white p-4 sm:p-6 rounded-2xl shadow-sm border border-emerald-900/80">
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 inline-flex items-center gap-1.5 shadow-xs max-w-full truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">POWERED BY THE NEW NIPOST DIGITAL POSTCODE (NDAPS)</span>
              </span>
              <h1 className="text-lg sm:text-xl font-black mt-2 tracking-tight">Send &amp; Collect Parcels in Your Neighborhood</h1>
              <p className="text-xs text-emerald-200/80 mt-1 max-w-xl leading-relaxed">
                Drop off parcels at accredited local shops or hubs or schedule door-to-hub dispatch with single-use OTP handovers.
              </p>
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Book Parcel Dispatch</span>
            </button>
          </div>

          {/* Mobile View Toggle Bar (Only visible on mobile/tablet screens < lg) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/90 rounded-xl border border-slate-300 lg:hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileView === 'list'
                  ? 'bg-[#062419] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>Accredited Hubs{hasEnteredLocation ? ` (${hubs.length})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileView('map')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileView === 'map'
                  ? 'bg-[#062419] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Map &amp; Coverage{hasEnteredLocation ? ` (${hubs.length})` : ''}</span>
            </button>
          </div>

          {/* Unified Hub Search & Interactive Geofence Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Panel: Clean Unified Hub Discovery Column */}
            <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} lg:flex lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex-col h-[560px] sm:h-[620px] lg:h-[660px] overflow-hidden`}>
              {/* Top Compact Controls Header */}
              <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200/80 space-y-2.5 sm:space-y-3 shrink-0">
                {/* Row 1: Segmented Mode Switcher & Sort Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/60 shadow-2xs w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleSwitchHubMode('sender')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        hubSearchMode === 'sender'
                          ? 'bg-[#062419] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Origin Drop-off</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchHubMode('recipient')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        hubSearchMode === 'recipient'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Recipient Drop-off</span>
                    </button>
                  </div>

                  {/* Mode explanation & Sort Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 sm:hidden">Mode:</span>
                      <InfoTooltip
                        text={
                          hubSearchMode === 'sender'
                            ? 'Sender Mode: Ranks accredited partner hubs closest to your pickup/drop-off point.'
                            : 'Recipient Mode: Ranks accredited partner collection hubs closest to your recipient destination.'
                        }
                        position="bottom"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextSort = !sortByProximity;
                        setSortByProximity(nextSort);
                        const sorted = [...hubs];
                        if (nextSort) {
                          sorted.sort((a, b) => (parseFloat(a.distanceKm) || 0) - (parseFloat(b.distanceKm) || 0));
                        } else {
                          sorted.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
                        }
                        setHubs(sorted);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 shadow-2xs transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      <span>{sortByProximity ? 'Closest' : 'Top Rated'}</span>
                      <InfoTooltip text="Toggle sorting by straight-line distance or verified user rating." />
                    </button>
                  </div>
                </div>

                {/* Row 2: Search Input Bar */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={hubSearchMode === 'sender' ? senderQuery : recipientQuery}
                      onChange={e => handleQueryChange(e.target.value, hubSearchMode)}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleResolveAndSearch(hubSearchMode === 'sender' ? senderQuery : recipientQuery, hubSearchMode);
                        }
                      }}
                      placeholder={
                        hubSearchMode === 'sender'
                          ? 'Search origin address or NDAPS...'
                          : 'Search recipient delivery address or NDAPS...'
                      }
                      className="w-full pl-9 pr-20 sm:pr-24 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none shadow-2xs transition"
                    />
                    {(((hubSearchMode === 'sender' ? senderQuery : recipientQuery) || '') || hasEnteredLocation) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (hubSearchMode === 'sender') {
                            setSenderQuery('');
                            setSenderLocation({ postcode: '', address: '', coords: null, hasVerifiedPostcode: null, noPostcodeWarning: null });
                          } else {
                            setRecipientQuery('');
                            setRecipientLocation({ postcode: '', address: '', coords: null, hasVerifiedPostcode: null, noPostcodeWarning: null });
                          }
                          setHubs([]);
                          setSelectedHub(null);
                          setShowSuggestions(false);
                        }}
                        className="absolute right-14 sm:right-16 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isSearchingLocation}
                      onClick={() => handleResolveAndSearch(hubSearchMode === 'sender' ? senderQuery : recipientQuery, hubSearchMode)}
                      className="absolute right-1 px-2.5 sm:px-3 py-1.5 bg-[#062419] hover:bg-[#0a3323] text-white rounded-lg text-[11px] font-bold shadow-2xs transition flex items-center gap-1 disabled:opacity-60 cursor-pointer"
                    >
                      {isSearchingLocation ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                      ) : (
                        <Search className="w-3 h-3 text-emerald-400" />
                      )}
                      <span>Find</span>
                    </button>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                      {suggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion(sug, hubSearchMode)}
                          className="w-full text-left p-2.5 hover:bg-emerald-50/60 transition flex items-start gap-2 cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-slate-900">{sug.description || sug.neighbourhood}</div>
                            <div className="text-[10px] text-emerald-700 font-mono">
                              Postcode: {sug.postcode} • {sug.state}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 3: Quick Address & Hub Corridor Carousel (Single-line horizontal shortcut bar) */}
                {((savedAddresses && savedAddresses.length > 0) || hubs.length > 0) && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
                    <span className="font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5">
                      <span>Quick:</span>
                    </span>

                    {/* Real Saved Addresses from PostgreSQL */}
                    {savedAddresses.map(addr => {
                      const isSelected =
                        (hubSearchMode === 'sender' ? senderLocation.postcode : recipientLocation.postcode) === addr.postcode;
                      const icon =
                        addr.address_type === 'residential' ? '🏠' : addr.address_type === 'business' ? '🏢' : '📦';
                      const displayLabel = addr.contact_name || addr.neighbourhood || addr.street_address.split(',')[0];

                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectQuickLocation(addr, hubSearchMode)}
                          className={`px-2.5 py-1 rounded-lg border font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                          }`}
                          title={`${addr.street_address} (${addr.postcode})`}
                        >
                          <span>{icon}</span>
                          <span className="max-w-[120px] sm:max-w-[140px] truncate">{displayLabel}</span>
                          <span className="font-mono text-[9px] opacity-75">{addr.postcode?.slice(0, 8)}...</span>
                        </button>
                      );
                    })}

                    {/* Active Partner Hub Corridors from Database */}
                    {hubs.slice(0, 4).map(h => {
                      const isSelected =
                        (hubSearchMode === 'sender' ? senderLocation.postcode : recipientLocation.postcode) === h.postcode;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() =>
                            handleSelectQuickLocation(
                              {
                                street_address: h.address_text,
                                postcode: h.postcode,
                                lat: h.lat,
                                lng: h.lng,
                                contact_name: h.neighbourhood || h.business_name
                              },
                              hubSearchMode
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg border font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                          }`}
                        >
                          <span>📍</span>
                          <span className="max-w-[100px] sm:max-w-[120px] truncate">{h.neighbourhood || h.business_name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Active Location Status & Verified Address Display (Labeled 3) */}
                {hasEnteredLocation && (
                  <div className="pt-0.5">
                    {activeLocation.postcode ? (
                      /* VALID POSTCODE ENTERED: Full address clearly displayed without truncation */
                      <div className="p-3 bg-emerald-50/90 border border-emerald-200/90 rounded-xl space-y-2 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              {hubSearchMode === 'sender' ? 'Origin Drop-off' : 'Recipient Drop-off'}
                            </span>
                            <span className="font-mono font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 text-[11px] shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{activeLocation.postcode}</span>
                            </span>
                          </div>

                          {/* "Official NIPOST" is hidden when address is verified; "Verified Address" badge is shown */}
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 ml-auto shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Verified Address</span>
                          </span>
                        </div>

                        {/* Full Address attached to valid postcode (clearly displayed, no truncation) */}
                        <div className="pt-0.5">
                          <div className="text-[10px] font-bold text-emerald-900/70 uppercase tracking-wider mb-0.5">
                            Full Verified Address:
                          </div>
                          <div className="text-xs font-bold text-slate-900 leading-relaxed break-words bg-white/80 p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                            {activeLocation.address || 'Full address verified on NIPOST NDAPS registry'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ADDRESS ENTERED WITH NO POSTCODE FOUND IN DATABASE (No Verified Address) */
                      <div className="p-3 bg-amber-50/95 border border-amber-300/90 rounded-xl space-y-2 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                                {hubSearchMode === 'sender' ? 'Origin Address' : 'Recipient Address'}
                              </span>
                              <div className="flex items-center gap-2 ml-auto">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 border border-amber-300">
                                  No Verified Address
                                </span>
                                <a
                                  href="https://postcode.gov.ng/find"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition shrink-0 group"
                                >
                                  <span>Official NIPOST</span>
                                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                </a>
                              </div>
                            </div>

                            {activeLocation.address && (
                              <div className="text-xs font-semibold text-slate-800 break-words bg-white/80 p-2 rounded-lg border border-amber-200/70">
                                &ldquo;{activeLocation.address}&rdquo;
                              </div>
                            )}

                            <p className="text-xs font-bold text-amber-900 leading-snug">
                              No verified postcode found for this address, please request for postcode from NIPOST.
                            </p>

                            <div className="pt-1">
                              <a
                                href="https://postcode.gov.ng/find"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold transition shadow-xs cursor-pointer"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Verify Address on Official NIPOST</span>
                                <ExternalLink className="w-3 h-3 ml-0.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Section: Empty Prompt State or Accredited Hubs List */}
              {!hasEnteredLocation ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-slate-50/50">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5 shadow-2xs border border-emerald-100/80">
                    <MapPin className="w-7 h-7 text-emerald-600 animate-pulse" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
                    {hubSearchMode === 'sender' ? 'Enter Origin Address or Postcode' : 'Enter Recipient Delivery Address'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-5">
                    {hubSearchMode === 'sender'
                      ? 'Enter your street address or NIPOST Digital Postcode above to locate accredited drop-off hubs and view real-time bay capacity.'
                      : 'Enter your recipient delivery address or NIPOST Digital Postcode to locate collection hubs near your recipient.'}
                  </p>

                  {savedAddresses && savedAddresses.length > 0 && (
                    <div className="w-full max-w-xs pt-3.5 border-t border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Or pick from saved addresses:
                      </span>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {savedAddresses.map(addr => {
                          const icon = addr.address_type === 'residential' ? '🏠' : addr.address_type === 'business' ? '🏢' : '📦';
                          const displayLabel = addr.contact_name || addr.neighbourhood || addr.street_address.split(',')[0];
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => handleSelectQuickLocation(addr, hubSearchMode)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/60 text-slate-700 text-[11px] font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer group"
                            >
                              <span>{icon}</span>
                              <span className="max-w-[120px] truncate">{displayLabel}</span>
                              <span className="font-mono text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                                {addr.postcode?.slice(0, 8)}...
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/40">
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-600">
                    <span className="flex items-center gap-1">
                      <span>Accredited Partner Hubs ({hubs.length})</span>
                      <InfoTooltip text="Vetted commercial drop-off and collection shops or hubs accredited for secure physical custody, verified bays, and insurance." />
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ● 30km Active Geofence
                    </span>
                  </div>

                  {hubs.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                    No accredited hubs found within 30km. Try selecting another area or entering a postcode.
                  </div>
                ) : (
                  hubs.map((h, idx) => {
                    const isSelected = selectedHub?.id === h.id;
                    const isSaved = savedHubs.some(sh => sh.id === h.id);
                    const distStr = formatDistance(h.distanceKm);
                    const timeStr = estimateTime(h.distanceKm);
                    const availableSlots = Math.max(0, (h.capacity || 50) - (h.current_load || 0));
                    const capacityPct = Math.min(100, Math.round(((h.current_load || 0) / (h.capacity || 50)) * 100));

                    return (
                      <div
                        key={h.id}
                        onClick={() => {
                          setSelectedHub(h);
                          setCoords({ lat: parseFloat(h.lat), lng: parseFloat(h.lng) });
                        }}
                        className={`p-3.5 rounded-xl border transition cursor-pointer relative bg-white shadow-2xs ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Hub Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                #{idx + 1}
                              </span>
                              <h3 className="font-bold text-slate-900 text-xs truncate">{h.business_name}</h3>
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                <Check className="w-2.5 h-2.5 stroke-[3]" /> Verified Hub
                                <InfoTooltip text="Accredited by NIPOST with audited custody protocols, CCTV, and physical inspection." />
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-1">{h.address_text}</p>
                            <div className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5">
                              Postcode: {h.postcode} • {h.neighbourhood || 'Abuja Municipal'}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {distStr && (
                              <div className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                                📍 {distStr}
                              </div>
                            )}
                            {timeStr && (
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">{timeStr}</div>
                            )}
                          </div>
                        </div>

                        {/* Capacity Meter & Rating Row */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1">
                                <span>Bays Available:</span>
                                <InfoTooltip text="Live physical storage bays currently open for incoming parcel intake." />
                              </span>
                              <strong className="text-slate-900 font-bold">{availableSlots} / {h.capacity || 50}</strong>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  capacityPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(10, 100 - capacityPct)}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2.5">
                            <span className="text-amber-700 font-bold flex items-center gap-0.5">
                              ⭐ {h.rating || '4.90'}
                              <span className="text-slate-400 font-normal">({h.total_ratings || 24})</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-500" title="Secure CCTV & Insured">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <InfoTooltip text="Security Features: 24/7 CCTV surveillance, fire extinguisher, locked vault, insured custody." />
                            </span>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSaveHub(h);
                              }}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isSaved
                                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                              }`}
                              title={isSaved ? 'Remove from saved hubs' : 'Save preferred hub'}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500' : ''}`} />
                            </button>

                            {/* View on Map Button (Mobile/Tablet only) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHub(h);
                                setCoords({ lat: parseFloat(h.lat), lng: parseFloat(h.lng) });
                                setMobileView('map');
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition lg:hidden cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                              title="View this hub on map"
                            >
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">Map</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookWithHub(h);
                            }}
                            className="px-3.5 py-1.5 bg-[#062419] hover:bg-[#0a3323] text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 group cursor-pointer"
                          >
                            <span>{hubSearchMode === 'sender' ? 'Drop-off Here' : 'Deliver to Hub'}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

            {/* Right Panel: Leaflet Geofence Map */}
            <div className={`${mobileView === 'map' ? 'block' : 'hidden'} lg:block lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden h-[560px] sm:h-[620px] lg:h-[660px] relative`}>
              {/* Mobile Back to List Button */}
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-md flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition lg:hidden cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>View Hub List</span>
              </button>

              {/* Floating Geofence & Filter Status Pill */}
              <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-md flex items-center gap-1.5 sm:gap-2">
                <span className={`w-2 h-2 rounded-full ${hasMapCoords ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-[10px] sm:text-xs font-bold text-slate-800">
                  {hasMapCoords && hubs.length > 0
                    ? `Live Geofence • 30km (${hubs.length} Hubs)`
                    : hasEnteredLocation && !activeLocation.postcode
                    ? 'Address Awaiting NDAPS Postcode'
                    : hasEnteredLocation
                    ? 'Location Verified'
                    : 'Awaiting Address Input'}
                </span>
                <InfoTooltip text="Interactive geographic mapping of accredited NIPOST partner hubs with real-time custody availability." />
              </div>

              <MapContainer center={[coords.lat, coords.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                  attribution="&copy; <a href='https://www.esri.com/'>Esri</a> &mdash; StreetMap"
                  maxZoom={19}
                />
                <MapRecenter lat={coords.lat} lng={coords.lng} />
                {hasMapCoords && hubs.map(h => (
                  <Marker
                    key={h.id}
                    position={[parseFloat(h.lat), parseFloat(h.lng)]}
                    eventHandlers={{
                      click: () => {
                        setSelectedHub(h);
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-xs p-1 space-y-1.5 max-w-[220px]">
                        <div className="flex items-center gap-1">
                          <strong className="block font-bold text-slate-900 truncate">{h.business_name}</strong>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">✓ Verified</span>
                        </div>
                        <span className="text-slate-600 text-[11px] block">{h.address_text}</span>
                        <div className="text-emerald-700 font-mono font-bold text-[10px]">
                          Postcode: {h.postcode} • {formatDistance(h.distanceKm)}
                        </div>
                        <div className="text-slate-500 text-[10px] flex items-center justify-between">
                          <span>Available Bays: <strong className="text-slate-800">{Math.max(0, (h.capacity || 50) - (h.current_load || 0))}</strong></span>
                          <span className="text-amber-700 font-bold">⭐ {h.rating || '4.90'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBookWithHub(h)}
                          className="mt-1.5 w-full py-1.5 bg-[#062419] hover:bg-[#0a3323] text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Select &amp; Book Dispatch</span>
                          <ArrowRight className="w-3 h-3 text-emerald-400" />
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {hasMapCoords && activeLocation.coords && (
                  <Marker
                    position={[parseFloat(activeLocation.coords.lat), parseFloat(activeLocation.coords.lng)]}
                    icon={L.divIcon({
                      className: 'custom-user-marker',
                      html: `<div style="background-color: #062419; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35);">📍</div>`,
                      iconSize: [30, 30],
                      iconAnchor: [15, 30]
                    })}
                  >
                    <Popup>
                      <div className="text-xs p-1 space-y-1">
                        <strong className="block font-bold text-slate-900">
                          {hubSearchMode === 'sender' ? 'Your Origin Address' : 'Recipient Delivery Address'}
                        </strong>
                        <div className="text-slate-600 text-[11px]">{activeLocation.address || activeLocation.postcode}</div>
                        {activeLocation.postcode && (
                          <div className="text-emerald-700 font-mono text-[10px] font-bold">NDAPS: {activeLocation.postcode}</div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>

              {/* Floating Mobile Bottom Sheet for Selected Hub */}
              {selectedHub && (
                <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-xl lg:hidden animate-fadeIn">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900 text-xs truncate">{selectedHub.business_name}</h4>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold shrink-0">✓ Verified</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{selectedHub.address_text}</p>
                      <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-2">
                        <span>📍 {formatDistance(selectedHub.distanceKm)}</span>
                        <span>•</span>
                        <span>Bays: <strong className="text-slate-900">{Math.max(0, (selectedHub.capacity || 50) - (selectedHub.current_load || 0))} open</strong></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookWithHub(selectedHub)}
                      className="px-3.5 py-2 bg-[#062419] hover:bg-[#0a3323] text-white font-bold rounded-xl text-xs shrink-0 shadow-md flex items-center gap-1 cursor-pointer"
                    >
                      <span>Book</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY SHIPMENTS & MANAGEMENT */}
      {activeTab === 'shipments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Eligible Shipments</h2>
              <p className="text-xs text-slate-500">Manage dispatch, track live statuses, or request cancellations & returns.</p>
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book New Parcel</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {shipments.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No active or historical shipments found. Click "Book New Parcel" to create one.
              </div>
            ) : (
              shipments.map((s) => (
                <div key={s.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm font-bold text-slate-900">{s.tracking_code}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      Fee: ₦{parseFloat(s.pricing_total_ngn).toLocaleString('en-NG')} (Paid via Wallet)
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sender Origin</span>
                      <div className="font-semibold text-slate-800">{s.sender_name}</div>
                      <div className="text-slate-500">{s.sender_address_text} ({s.sender_postcode})</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination</span>
                      <div className="font-semibold text-slate-800">{s.recipient_name}</div>
                      <div className="text-slate-500">{s.destination_hub_name || s.recipient_address_text} ({s.recipient_postcode})</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Collection Authorization</span>
                      <div className="font-mono text-emerald-700 font-bold">QR Pass: {s.collection_qr_token}</div>
                      <div className="text-slate-500">Delivery OTP: <strong>{s.delivery_otp}</strong></div>
                    </div>
                  </div>

                  {/* Action Buttons: Cancel, Return, Dispute */}
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
                    {s.status === 'BOOKED' && (
                      <button
                        onClick={() => handleCancelShipment(s.id)}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition"
                      >
                        Cancel Shipment & Refund
                      </button>
                    )}

                    {['STORED_IN_BAY', 'RECEIVED_AT_HUB'].includes(s.status) && (
                      <button
                        onClick={() => handleRequestReturn(s.id)}
                        className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition"
                      >
                        Request Return to Origin
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedShipmentForAction(s);
                        setIsClaimModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                    >
                      File Insurance / Damage Claim
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: DIGITAL P.O. BOX & PROOF OF ADDRESS (HOTBOX NIPOST INTEGRATION) */}
      {activeTab === 'digital_box' && (
        <div className="space-y-6">
          {/* Main Hero Card: Digital P.O. Box & Proof of Address Anchor */}
          <div className="bg-gradient-to-br from-[#041a12] via-[#062419] to-[#0a3526] text-white p-6 rounded-3xl border border-emerald-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>NIPOST NDAPS Digital Post Office Box</span>
                  </span>
                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-400 text-slate-950 font-mono shadow-xs">
                    {digitalBox?.subscriptionStatus || 'ACTIVE'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Your Digital Postal Anchor & Ground-Truth Address
                </h1>

                <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                  Replacing the traditional physical P.O. Box with a verified digital anchor. Enjoy guaranteed mail delivery, dynamic parcel rerouting upon relocation, and bank-grade NIPOST doorway proof of address.
                </p>
              </div>

              {/* Digital P.O. Box Pass Badge */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center min-w-[260px] shadow-lg">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Digital P.O. Box Number
                </span>
                <span className="text-xl font-mono font-black text-white my-1 tracking-wider">
                  {digitalBox?.boxNumber || 'HBX-PBOX-FC01A03-0005'}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(digitalBox?.boxNumber || 'HBX-PBOX-FC01A03-0005');
                      showToast('Digital P.O. Box ID copied!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/30 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Box ID
                  </button>
                  <button
                    onClick={() => setIsCertificateModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold border border-white/30 flex items-center gap-1 transition cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    Certificate
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-800/60 relative z-10">
              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-emerald-300 font-medium">NDAPS Postcode</p>
                <p className="text-sm font-mono font-black text-white mt-0.5">
                  {digitalBox?.activePostcode || profile?.postcode || 'FC-01-A03-FK-01'}
                </p>
              </div>

              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-emerald-300 font-medium">Certification Level</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-xs font-bold text-white truncate">
                    {digitalBox?.isGroundTruthVerified ? 'Ground-Truth Certified' : 'Hierarchy Verified'}
                  </p>
                </div>
              </div>

              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-emerald-300 font-medium">Annual Subscription</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {digitalBox?.daysRemaining || 365} Days Remaining
                </p>
              </div>

              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-emerald-300 font-medium">Relocation Rerouting</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Active (Free ₦0)
                </span>
              </div>
            </div>
          </div>

          {/* Address Verification & Mailbox Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1: Official Proof of Address (Doorstep Verification) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Official NIPOST Certification
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Proof of Address Dossier
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Doorway ground-truth verification certified by NIPOST. Includes cryptographic QR code accepted by banks, embassies, and regulatory KYC.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Inspection Fee:</span>
                    <span className="font-bold text-slate-900">₦2,500.00 (One-time)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Status:</span>
                    <span className={`font-bold ${digitalBox?.isGroundTruthVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {digitalBox?.proofOfAddressStatus || 'Verified by NIPOST (Ground-Truth Certified)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">District / LGA:</span>
                    <span className="font-semibold text-slate-700">
                      {digitalBox?.hierarchy?.district || 'Wuse 2'}, {digitalBox?.hierarchy?.lga || 'Abuja Municipal'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setIsCertificateModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download NIPOST Certificate (PDF)</span>
                </button>
                <button
                  onClick={handleRequestGroundTruth}
                  disabled={isRequestingGroundTruth}
                  className="w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isRequestingGroundTruth ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      <span>Dispatching Inspector...</span>
                    </>
                  ) : (
                    <>
                      <Crosshair className="w-3.5 h-3.5 text-slate-500" />
                      <span>{digitalBox?.isGroundTruthVerified ? 'Re-Verify Doorway (₦2,500)' : 'Request Doorway Verification (₦2,500)'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Digital Mailbox Subscription */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Annual Mailbox Plan
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Digital P.O. Box Subscription
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your active digital postal anchor. Ensures ongoing legal address certification, secure custody at partner hubs, and dynamic parcel rerouting.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Annual Subscription:</span>
                    <span className="font-bold text-slate-900">₦3,500.00 / Year</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Subscription Status:</span>
                    <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                      {digitalBox?.subscriptionStatus || 'ACTIVE'} ({digitalBox?.daysRemaining || 365} Days Remaining)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Wallet Balance:</span>
                    <span className="font-bold text-slate-900">
                      ₦{parseFloat(wallet?.balance_ngn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleRenewDigitalBox}
                  disabled={isRenewingBox}
                  className="w-full py-2.5 px-4 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isRenewingBox ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extending 365 Days...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Renew Subscription (₦3,500 / Yr)</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Debited directly from your prepaid logistics wallet.
                </p>
              </div>
            </div>

            {/* Card 3: Relocation & Automatic Forwarding */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Auto-Rerouting Active
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Mail & Parcel Forwarding
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    When you change address, couriers searching your previous postcode instantly resolve your active location, preventing lost parcels and return loops.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Auto-Reroute Fee:</span>
                    <span className="font-bold text-emerald-700">₦0.00 (100% Free)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">In-Flight Protection:</span>
                    <span className="font-bold text-slate-900">Live Auto-Update</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Recorded Moves:</span>
                    <span className="font-semibold text-slate-700">
                      {(digitalBox?.relocations || []).length} Address Update(s)
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    const el = document.getElementById('occupancy-directory-card');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Inspect Building Directory</span>
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Preview how couriers verify your building occupants and forwarding.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Relocation & Instant Mail Forwarding Ledger */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                  <span>Address Relocation & Automatic Mail Forwarding Ledger</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Any mail, bank statements, or parcels addressed to previous postcodes automatically route to your active address without loss.
                </p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 shrink-0">
                Guaranteed Delivery Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Relocation Date</th>
                    <th className="py-2.5 px-3">Previous Postcode & Address</th>
                    <th className="py-2.5 px-3">New Destination Postcode & Address</th>
                    <th className="py-2.5 px-3">Registered Phone</th>
                    <th className="py-2.5 px-3 text-right">Forwarding Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(digitalBox?.relocations && digitalBox.relocations.length > 0) ? (
                    digitalBox.relocations.map((rel, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                          {new Date(rel.changedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-slate-900 block">{rel.oldPostcode}</span>
                          <span className="text-[11px] text-slate-500">{rel.oldAddress || 'Previous Residence'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-emerald-700 block">{rel.newPostcode}</span>
                          <span className="text-[11px] text-slate-500">{rel.newAddress || 'Current Residence'}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-mono">
                          {rel.phone || profile?.phone || '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Auto-Forwarding Active (₦0)
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        No historical relocations recorded yet. When you update your address in profile, your forwarding trail will be automatically indexed here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Dual-Party Reroute Alert Preferences & Testing Engine */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>Automated Dual-Party Reroute Notification Engine</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  When a parcel or letter is rerouted due to address relocation, both the sender (e.g. bank) and recipient receive an instant alert confirming the mail is redirected safely.
                </p>
              </div>
              <button
                onClick={handleTestRerouteAlert}
                disabled={testRerouteLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
              >
                {testRerouteLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching Dual-Party Test...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simulate Dual-Party Reroute Alert</span>
                  </>
                )}
              </button>
            </div>

            {/* Notification Channel Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* In-App Alerts */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">In-App Notification</span>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Free (₦0.00)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Instant notification banner in your Hotbox customer portal inbox.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold">Status: Always Active</span>
                  <input
                    type="checkbox"
                    checked={profile?.notification_preferences?.inapp !== false}
                    onChange={(e) => handleToggleNotification('inapp', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Email Alerts */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Email Alerts</span>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Free (₦0.00)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    HTML notification letter to registered citizen and sender email.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold">Status: Always Active</span>
                  <input
                    type="checkbox"
                    checked={profile?.notification_preferences?.email !== false}
                    onChange={(e) => handleToggleNotification('email', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* SMS Alerts */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">SMS Notice</span>
                    <span className="text-[10px] font-black uppercase text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                      ₦20.00 / SMS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Direct telecom SMS dispatched via Twilio to verified mobile numbers.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold">User Configurable</span>
                  <input
                    type="checkbox"
                    checked={Boolean(profile?.notification_preferences?.sms)}
                    onChange={(e) => handleToggleNotification('sms', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* WhatsApp Alerts */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">WhatsApp Notice</span>
                    <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      ₦35.00 / WhatsApp
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Rich messaging alerts dispatched via Meta WhatsApp Business Cloud.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold">User Configurable</span>
                  <input
                    type="checkbox"
                    checked={Boolean(profile?.notification_preferences?.whatsapp)}
                    onChange={(e) => handleToggleNotification('whatsapp', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Test Simulation Results Card */}
            {testRerouteResult && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Live Dual-Party Reroute Simulation Completed</span>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800">
                    Total Alert Fees Debited: ₦{parseFloat(testRerouteResult.results?.totalFeeDebitedNgn || 0).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1">
                    <p className="font-bold text-slate-900">Recipient Dispatches (Citizen):</p>
                    <p className="text-slate-600 text-[11px]">In-App: <span className="font-semibold text-emerald-700">{testRerouteResult.results?.recipient?.inapp ? 'Delivered (Free)' : 'Skipped'}</span></p>
                    <p className="text-slate-600 text-[11px]">Email: <span className="font-semibold text-emerald-700">{testRerouteResult.results?.recipient?.email ? 'Delivered (Free)' : 'Skipped'}</span></p>
                    <p className="text-slate-600 text-[11px]">SMS: <span className="font-semibold text-slate-800">{testRerouteResult.results?.recipient?.sms ? 'Dispatched (₦20.00)' : 'Deactivated'}</span></p>
                    <p className="text-slate-600 text-[11px]">WhatsApp: <span className="font-semibold text-slate-800">{testRerouteResult.results?.recipient?.whatsapp ? 'Dispatched (₦35.00)' : 'Deactivated'}</span></p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1">
                    <p className="font-bold text-slate-900">Sender Dispatches (e.g. Bank / Merchant):</p>
                    <p className="text-slate-600 text-[11px]">In-App: <span className="font-semibold text-emerald-700">{testRerouteResult.results?.sender?.inapp ? 'Delivered (Free)' : 'Skipped'}</span></p>
                    <p className="text-slate-600 text-[11px]">Email: <span className="font-semibold text-emerald-700">{testRerouteResult.results?.sender?.email ? 'Delivered (Free)' : 'Skipped'}</span></p>
                    <p className="text-slate-600 text-[11px]">SMS: <span className="font-semibold text-slate-800">{testRerouteResult.results?.sender?.sms ? 'Dispatched (₦20.00)' : 'Deactivated'}</span></p>
                    <p className="text-slate-600 text-[11px]">WhatsApp: <span className="font-semibold text-slate-800">{testRerouteResult.results?.sender?.whatsapp ? 'Dispatched (₦35.00)' : 'Deactivated'}</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Courier Mail Postcode Search & Building Occupancy Directory (Pillar 3) */}
          <div id="occupancy-directory-card" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-600" />
                  <span>Courier Postcode Search & Building Occupancy Directory</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  How couriers, postal inspectors, and delivery personnel query a postcode written on mail to resolve active building residents and auto-forwarding rules.
                </p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                NDAPS Directory Engine
              </span>
            </div>

            <form onSubmit={handleSearchOccupants} className="flex gap-2 max-w-xl">
              <input
                type="text"
                value={occupantSearchCode}
                onChange={(e) => setOccupantSearchCode(e.target.value.toUpperCase())}
                placeholder="Enter NDAPS Postcode e.g. FC-01-A03-FK-01"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none bg-slate-50"
              />
              <button
                type="submit"
                disabled={isSearchingOccupants}
                className="px-5 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
              >
                {isSearchingOccupants ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search Occupants</span>
              </button>
            </form>

            {occupantSearchResults && (
              <div className="space-y-4 pt-2 animate-fadeIn">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      NDAPS Verified Premise
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-1">
                      {occupantSearchResults.building?.address || 'Plot 112 Aminu Kano Crescent, Wuse 2, Abuja'}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Postcode: {occupantSearchResults.postcode} · {occupantSearchResults.building?.district}, {occupantSearchResults.building?.state}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block">
                      {occupantSearchResults.occupants?.length || 0} Registered Resident(s)
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Forwarding Engine Active
                    </span>
                  </div>
                </div>

                {/* Occupants List */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Building Residents & Forwarding Directives
                  </h5>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {occupantSearchResults.occupants && occupantSearchResults.occupants.length > 0 ? (
                      occupantSearchResults.occupants.map((occ, i) => (
                        <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{occ.name}</span>
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {occ.digitalBoxNumber}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Phone: <span className="font-mono text-slate-700">{occ.phone}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {occ.residentialStatus === 'RELOCATED' ? (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                  <ArrowRight className="w-3 h-3" />
                                  Relocated to: {occ.forwardingPostcode}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Moved: {new Date(occ.relocationDate).toLocaleDateString()} · Instant Forwarding Active
                                </p>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" />
                                Active Resident (Verified)
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No residents indexed for this postcode query.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SAVED ADDRESSES & PREFERRED HUBS */}
      {activeTab === 'addresses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Saved Addresses Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Saved Addresses</h3>
                <p className="text-xs text-slate-500">Verified pickup & delivery locations</p>
              </div>
              <button
                onClick={() => setIsAddAddressOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
              >
                + Add Address
              </button>
            </div>

            <div className="space-y-3">
              {savedAddresses.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">No saved addresses yet.</div>
              ) : (
                savedAddresses.map((addr) => (
                  <div key={addr.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{addr.street_address}</span>
                        {addr.is_default && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold rounded">Default</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Postcode: {addr.postcode} • {addr.area_neighbourhood}, {addr.state}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preferred Neighborhood Hubs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Preferred Neighborhood Hubs</h3>
            <p className="text-xs text-slate-500">Quick pickup points bookmarked for 1-click routing</p>

            <div className="space-y-3">
              {savedHubs.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No preferred hubs saved. Tap the heart icon on any hub in the discovery map to bookmark it.
                </div>
              ) : (
                savedHubs.map((hub) => (
                  <div key={hub.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{hub.business_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{hub.address_text}</div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Postcode: {hub.postcode}</div>
                    </div>
                    <button
                      onClick={() => handleToggleSaveHub(hub)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WALLET & PAYMENTS */}
      {activeTab === 'wallet' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          {/* Main Balance & Top-up Card */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 bg-[#062419] text-white rounded-2xl shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Customer Wallet Balance</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Closed-Loop Prepaid Credit
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight">
                ₦{wallet ? Number(wallet.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00'}
              </div>
              <p className="text-xs text-emerald-200/80">
                Accounting Ledger Balance: ₦{wallet?.ledgerBalance !== undefined ? Number(wallet.ledgerBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : (wallet ? Number(wallet.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00')} NGN • Escrow Protected
              </p>
            </div>

            <div className="space-y-3 lg:max-w-xs w-full">
              <div className="text-[11px] font-semibold text-emerald-200">Prepaid Top-Up (Card / Bank Transfer):</div>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₦</span>
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-800 text-white font-mono text-xs border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  onClick={handleWalletTopup}
                  disabled={isToppingUp}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition shadow-md whitespace-nowrap flex items-center space-x-1.5"
                >
                  {isToppingUp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Crediting...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Top Up</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center space-x-1.5 text-[10px]">
                <span className="text-emerald-300/70 text-[9px] uppercase font-bold">Quick:</span>
                {[2000, 5000, 10000, 20000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopupAmount(preset.toString())}
                    className={`px-2 py-1 rounded-lg border font-mono transition ${
                      topupAmount === preset.toString()
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    +{preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Regulatory & Fund Protection Policy Notice */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-amber-950 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-lg bg-amber-200/70 text-amber-900">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Closed-Loop Prepaid Credit & Fund Protection Policy (CBN Regulatory Notice)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-amber-900/90">
              <div className="p-3 bg-white/70 rounded-xl border border-amber-200/60 space-y-1">
                <div className="font-bold flex items-center space-x-1 text-slate-900">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Non-Withdrawable & Non-Transferable</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Funds deposited into your wallet are <strong>prepaid logistics service credits</strong> usable exclusively to pay for parcel dispatches, storage, and courier services on Hotbox. In compliance with CBN stored-value regulations, wallet balances <strong>cannot be transferred to another user</strong> or withdrawn to arbitrary bank accounts.
                </p>
              </div>

              <div className="p-3 bg-white/70 rounded-xl border border-amber-200/60 space-y-1">
                <div className="font-bold flex items-center space-x-1 text-slate-900">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Dispute Resolution & Source Reversals</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  In the event of an order cancellation or approved dispute resolution, eligible monetary refunds are <strong>returned strictly to the same source bank account or debit card details</strong> that originally paid the funds. Unsettled courier fees are escrow-safeguarded by licensed payment processors (Paystack/Flutterwave).
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Recent Payment Ledger */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Recent Payment Ledger ({transactions.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Immutable double-entry transaction trail with balance auditing.
                </p>
              </div>
              <button
                onClick={fetchCustomerData}
                className="flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-emerald-700 transition px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <Wallet className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700">No Transactions Recorded Yet</div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Fund your prepaid wallet or book your first parcel delivery to see live real-time ledger records appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isCredit = tx.transaction_type === 'WALLET_TOPUP' || tx.transaction_type === 'DISPUTE_REFUND' || tx.transaction_type === 'HUB_COMMISSION' || tx.transaction_type === 'RIDER_PAYOUT';
                  const isRefund = tx.transaction_type === 'DISPUTE_REFUND';
                  const amountNum = parseFloat(tx.amount_ngn || 0);

                  let title = 'Logistics Payment';
                  if (tx.transaction_type === 'WALLET_TOPUP') {
                    title = 'Prepaid Logistics Credit Top-up (Bank/Card)';
                  } else if (tx.transaction_type === 'BOOKING_PAYMENT') {
                    title = tx.tracking_code ? `Shipment Dispatch Booking (${tx.tracking_code})` : 'Shipment Dispatch Booking';
                  } else if (tx.transaction_type === 'DISPUTE_REFUND') {
                    title = tx.tracking_code ? `Dispute Resolution / Cancellation Refund (${tx.tracking_code})` : 'Dispute Resolution / Cancellation Refund';
                  } else if (tx.transaction_type === 'HUB_COMMISSION') {
                    title = 'Hub Host Partner Commission Credit';
                  } else if (tx.transaction_type === 'RIDER_PAYOUT') {
                    title = 'Rider Delivery Payout Credit';
                  }

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                            isRefund
                              ? 'bg-blue-100 text-blue-700'
                              : isCredit
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isRefund ? (
                            <RefreshCw className="w-4 h-4" />
                          ) : isCredit ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center space-x-2">
                            <span>{title}</span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                tx.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : tx.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center gap-x-2">
                            <span>Ref: {tx.reference || tx.id.slice(0, 16)}</span>
                            <span>•</span>
                            <span>Gateway: {tx.payment_gateway || 'WALLET'}</span>
                            {tx.created_at && (
                              <>
                                <span>•</span>
                                <span>
                                  {new Date(tx.created_at).toLocaleString('en-NG', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <div
                          className={`text-sm font-black font-mono ${
                            isCredit ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {isCredit ? '+' : '-'}₦{amountNum.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </div>
                        {tx.balance_after_ngn !== undefined && tx.balance_after_ngn !== null && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Bal: ₦{Number(tx.balance_after_ngn).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CLAIMS & SUPPORT TICKETS */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Insurance Claims & Support Tickets</h2>
              <p className="text-xs text-slate-500">File damage or loss claims and track resolution status.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsClaimModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
              >
                + File Claim
              </button>
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#062419] hover:bg-[#0a3323] text-white text-xs font-bold transition"
              >
                + New Support Ticket
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Claims Column */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Active Claims ({claims.length})</h3>
                <span className="text-[10px] text-slate-400">Resolution SLA: 24-48h</span>
              </div>

              {claims.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1">
                  <Shield className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-700">No active claims submitted</div>
                  <p className="text-[11px] text-slate-400">File a claim if your parcel was delayed, damaged, or lost.</p>
                </div>
              ) : (
                claims.map(c => {
                  const isSubmitted = c.status === 'SUBMITTED';
                  const isCancelled = c.status === 'CANCELLED';
                  const isApproved = c.status === 'APPROVED' || c.status === 'SETTLED';
                  const isRejected = c.status === 'REJECTED';

                  return (
                    <div key={c.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{c.claim_type.replace(/_/g, ' ')}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isApproved ? 'bg-emerald-100 text-emerald-800' :
                          isSubmitted ? 'bg-amber-100 text-amber-800' :
                          isCancelled ? 'bg-slate-200 text-slate-700' :
                          isRejected ? 'bg-rose-100 text-rose-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {c.status}
                        </span>
                      </div>

                      <p className="text-slate-600 leading-relaxed">{c.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                        <div>
                          <div className="text-[11px] font-mono font-bold text-slate-900">
                            Claim: ₦{parseFloat(c.claim_amount_ngn || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </div>
                          {c.tracking_code && (
                            <div className="text-[10px] text-slate-400 font-mono">Shipment: {c.tracking_code}</div>
                          )}
                        </div>

                        {/* Update or Cancel Provision (for SUBMITTED claims) */}
                        {isSubmitted && (
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditClaim(c)}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center space-x-1 transition shadow-2xs"
                              title="Update claim description or amount"
                            >
                              <Pencil className="w-3 h-3 text-slate-600" />
                              <span>Update</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelClaim(c.id)}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center space-x-1 transition shadow-2xs"
                              title="Cancel this claim submission"
                            >
                              <X className="w-3 h-3 text-rose-600" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Support Tickets Column */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Support Tickets ({tickets.length})</h3>
                <span className="text-[10px] text-slate-400">Response SLA: 2-4h</span>
              </div>

              {tickets.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-1">
                  <LifeBuoy className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-700">No open support tickets</div>
                  <p className="text-[11px] text-slate-400">Click '+ New Support Ticket' above if you need help with your deliveries.</p>
                </div>
              ) : (
                tickets.map(t => (
                  <div key={t.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{t.subject}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{t.message}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-200/70">
                      <span>Category: {t.category ? t.category.replace(/_/g, ' ') : 'General Enquiry'}</span>
                      <span className="font-bold uppercase text-slate-500">{t.priority || 'MEDIUM'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PROFILE, CONTACT VERIFICATION & PREFERENCES */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Account Profile Summary Header Banner */}
          <div className="bg-gradient-to-r from-[#062419] via-[#093827] to-[#0d4a34] rounded-2xl p-6 text-white shadow-sm border border-emerald-900/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center text-emerald-300 font-extrabold text-2xl shadow-inner">
                  {(profile?.name || currentUser?.name || 'Customer').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      {profile?.name || currentUser?.name || 'Customer'}
                    </h2>
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      <span>Verified Customer</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200 text-[10px] uppercase font-bold tracking-wider border border-emerald-700/50">
                      {profile?.status || 'active'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-emerald-200/80 mt-1.5 font-medium">
                    <span className="flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{profile?.email || currentUser?.email || 'customer@hotboxng.com'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{profile?.phone || currentUser?.phone || 'Not provided'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verified Postcode: <strong className="text-white font-mono">{profile?.postcode || profileForm.postcode}</strong> {profile?.postcode_neighbourhood ? `(${profile.postcode_neighbourhood})` : ''}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Summary Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/20 p-3 rounded-xl border border-emerald-500/20">
                <div className="px-3 py-1.5 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Shipments</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{shipments?.length || 0}</div>
                </div>
                <div className="px-3 py-1.5 text-center border-l border-emerald-500/20">
                  <div className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Addresses</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{savedAddresses?.length || 0}</div>
                </div>
                <div className="px-3 py-1.5 text-center border-l border-emerald-500/20">
                  <div className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Saved Hubs</div>
                  <div className="text-base font-extrabold text-white mt-0.5">{savedHubs?.length || 0}</div>
                </div>
                <div className="px-3 py-1.5 text-center border-l border-emerald-500/20">
                  <div className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Wallet</div>
                  <div className="text-base font-extrabold text-emerald-300 mt-0.5">
                    ₦{Number(wallet?.balance ?? profile?.wallet_balance ?? currentUser?.wallet_balance ?? 15000).toLocaleString('en-NG', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Profile & Contact Details Form */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
              <div className="border-b pb-3 border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-[#062419]" />
                    <h3 className="text-sm font-bold text-slate-900">Profile & Contact Details</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Your verified profile and contact information</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Sync
                </span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Full Legal Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Johnson Doe"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium text-slate-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Used for parcel custody handovers and claims verification.</p>
                </div>

                {/* Primary Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Primary Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+234..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-slate-800"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Used for delivery pickup codes, courier handovers, and parcel OTPs.</p>
                </div>

                {/* Primary Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Primary Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="customer@example.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Receives official waybills, digital receipts, and tracking updates.</p>
                </div>

                {/* Verified Postcode with Auto-Populated Address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Verified Postcode</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {isResolvingPostcode ? (
                      <span className="text-[10px] text-emerald-600 flex items-center space-x-1 font-medium">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Verifying postcode...</span>
                      </span>
                    ) : postcodeDetails ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ {postcodeDetails.neighbourhood || postcodeDetails.locality || postcodeDetails.description}, {postcodeDetails.state}
                      </span>
                    ) : (profile?.postcode_neighbourhood ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ {profile.postcode_neighbourhood}, {profile.postcode_state || 'Abuja'}
                      </span>
                    ) : null)}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={profileForm.postcode}
                      onChange={(e) => handlePostcodeChange(e.target.value)}
                      placeholder="e.g. FC-01-A03-FK-01"
                      className="w-full pl-9 pr-20 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono font-bold text-slate-900 tracking-wider uppercase"
                    />
                    <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => handlePostcodeChange(profileForm.postcode)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter your digital postcode to auto-populate your registered address and re-rank Hotbox hubs closer to you.
                  </p>
                </div>

                {/* Account Specifications */}
                <div className="pt-2">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Account Specifications</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">System Role</span>
                        <span className="font-bold text-slate-800 capitalize">{profile?.role || currentUser?.role || 'Customer'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Account Status</span>
                        <span className="font-bold text-emerald-700 uppercase">{profile?.status || 'Active'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Verified Postcode</span>
                        <span className="font-bold font-mono text-emerald-800">{profile?.postcode || profileForm.postcode || 'FC-01-A03-FK-01'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Registered District</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {profile?.postcode_neighbourhood || postcodeDetails?.neighbourhood || 'Wuse 2'}, {profile?.postcode_state || postcodeDetails?.state || 'Abuja (FCT)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Phone Verification</span>
                        <span className={`font-bold ${profile?.is_phone_verified ? 'text-emerald-700' : 'text-amber-600'}`}>
                          {profile?.is_phone_verified ? '✓ Verified' : '⚠ Unverified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Email Verification</span>
                        <span className={`font-bold ${profile?.is_email_verified ? 'text-emerald-700' : 'text-amber-600'}`}>
                          {profile?.is_email_verified ? '✓ Verified' : '⚠ Unverified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-4 py-2.5 rounded-xl bg-[#062419] hover:bg-[#0b3827] text-white font-bold text-xs transition shadow-sm flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Contact Verification & Preferences (Stacked) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Identity & Contact Verification Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="border-b pb-3 border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Contact & Identity Verification</h3>
                  <p className="text-[11px] text-slate-500">Manage your phone and email verification status</p>
                </div>

                <div className="space-y-3 text-xs">
                  {/* PHONE VERIFICATION */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{profile?.phone || currentUser?.phone || '+2349063085415'}</div>
                        <div className="text-[10px] text-slate-500">Primary Contact & Delivery OTPs</div>
                      </div>
                    </div>
                    <div>
                      {profile?.is_phone_verified ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenVerifyModal('phone')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition shadow-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <Shield className="w-3 h-3" />
                          <span>Verify Phone (OTP)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* EMAIL VERIFICATION */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{profile?.email || currentUser?.email || 'customer@hotboxng.com'}</div>
                        <div className="text-[10px] text-slate-500">Official Notifications & Invoices</div>
                      </div>
                    </div>
                    <div>
                      {profile?.is_email_verified ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenVerifyModal('email')}
                          className="px-3 py-1.5 rounded-xl bg-[#062419] hover:bg-[#0b3827] text-white font-bold text-[11px] transition shadow-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <Shield className="w-3 h-3" />
                          <span>Verify Email (OTP)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Secure Verification Active</span>
                  </div>
                  <p className="text-[10px] text-emerald-800 leading-relaxed">
                    Secure 6-digit one-time passcodes with 10-minute expiry protect all parcel releases and account updates.
                  </p>
                </div>
              </div>

              {/* Notification Preferences & Channel Pricing */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Digital P.O. Box Notification Channels</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Dual-Party Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Choose which channels receive parcel reroute, relocation forwarding, and custody notices.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Wallet Balance</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">₦{(wallet?.balance ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* IN-APP NOTIFICATIONS (FREE) */}
                  <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">In-App Notifications</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                          Free (₦0.00)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Instant notification feed in your customer console & top navigation bar bell icon.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={Boolean(profile?.notification_preferences?.inapp ?? true)}
                        onChange={(e) => handleToggleNotification('inapp', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* EMAIL ALERTS (FREE) */}
                  <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Email Dossiers</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-extrabold uppercase tracking-wide">
                          Free (₦0.00)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Detailed HTML proof of reroute & delivery sent to <strong className="text-slate-800">{profile?.email || 'your email'}</strong>.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={Boolean(profile?.notification_preferences?.email ?? true)}
                        onChange={(e) => handleToggleNotification('email', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* SMS ALERTS (PAID: ₦20) */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">SMS Direct Alerts</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-bold">
                          ₦20.00 / SMS
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        High-priority GSM SMS alerts dispatched to <strong className="text-slate-800">{profile?.phone || 'your phone'}</strong> via Termii/Twilio.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={Boolean(profile?.notification_preferences?.sms ?? false)}
                        onChange={(e) => handleToggleNotification('sms', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* WHATSAPP NOTIFICATIONS (PAID: ₦35) */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">WhatsApp Dispatch Cards</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md text-[10px] font-bold">
                          ₦35.00 / WhatsApp
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        WhatsApp interactive cards with live parcel reroute confirmation and OTP collection keys.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={Boolean(profile?.notification_preferences?.whatsapp ?? false)}
                        onChange={(e) => handleToggleNotification('whatsapp', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>

                {/* DUAL-PARTY AUTOMATED REROUTE DEMO & ACTION */}
                <div className="p-4 bg-gradient-to-br from-slate-900 to-[#062419] rounded-2xl text-white space-y-3 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono font-bold uppercase">
                          Hotbox Guaranteed Forwarding
                        </span>
                        <span className="text-[10px] text-slate-300">Dual-Party Protocol</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">Automated Dual-Party Reroute Alerts</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed max-w-xl">
                        When mail or parcels are rerouted due to address relocation, <strong>both the sender (e.g. bank, e-commerce) and you (the recipient)</strong> receive instant notices confirming the mail was redirected safely.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={testRerouteLoading}
                      onClick={handleTestRerouteAlert}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      {testRerouteLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching Alert...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Test Reroute Notification</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Interactive Test Simulation Result */}
                  {testRerouteResult && (
                    <div className="mt-3 p-3.5 bg-white/10 rounded-xl border border-white/15 text-xs space-y-2 backdrop-blur-sm animate-fadeIn">
                      <div className="flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          {testRerouteResult.message}
                        </span>
                        <span className="font-mono text-white/90">
                          Tracking: {testRerouteResult.dispatchResult?.trackingCode}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        {/* Recipient breakdown */}
                        <div className="p-2.5 rounded-lg bg-black/20 border border-white/10 space-y-1">
                          <div className="font-bold text-emerald-300 flex items-center justify-between">
                            <span>Recipient (You)</span>
                            <span className="font-mono text-[10px] text-slate-300">Fee: ₦{testRerouteResult.dispatchResult?.recipient?.totalFeeNgn?.toFixed(2) ?? '0.00'}</span>
                          </div>
                          <div className="text-[10px] text-slate-300 space-y-0.5">
                            <div>• In-App: <strong className="text-emerald-400">Delivered (Free ₦0.00)</strong></div>
                            <div>• Email: <strong className="text-emerald-400">Delivered (Free ₦0.00)</strong></div>
                            <div>• SMS: <span className={testRerouteResult.dispatchResult?.recipient?.channels?.sms?.status === 'DELIVERED' ? 'text-amber-300 font-bold' : 'text-slate-400'}>{testRerouteResult.dispatchResult?.recipient?.channels?.sms?.status || 'Opted-Out'} (₦20.00)</span></div>
                            <div>• WhatsApp: <span className={testRerouteResult.dispatchResult?.recipient?.channels?.whatsapp?.status === 'DELIVERED' ? 'text-emerald-300 font-bold' : 'text-slate-400'}>{testRerouteResult.dispatchResult?.recipient?.channels?.whatsapp?.status || 'Opted-Out'} (₦35.00)</span></div>
                          </div>
                        </div>

                        {/* Sender breakdown */}
                        <div className="p-2.5 rounded-lg bg-black/20 border border-white/10 space-y-1">
                          <div className="font-bold text-sky-300 flex items-center justify-between">
                            <span>Sender (Bank / Institution)</span>
                            <span className="font-mono text-[10px] text-slate-300">Fee: ₦{testRerouteResult.dispatchResult?.sender?.totalFeeNgn?.toFixed(2) ?? '0.00'}</span>
                          </div>
                          <div className="text-[10px] text-slate-300 space-y-0.5">
                            <div>• In-App: <strong className="text-emerald-400">Delivered (Free ₦0.00)</strong></div>
                            <div>• Email: <strong className="text-emerald-400">Delivered (Free ₦0.00)</strong></div>
                            <div>• SMS: <span className={testRerouteResult.dispatchResult?.sender?.channels?.sms?.status === 'DELIVERED' ? 'text-amber-300 font-bold' : 'text-slate-400'}>{testRerouteResult.dispatchResult?.sender?.channels?.sms?.status || 'Opted-Out'} (₦20.00)</span></div>
                            <div>• WhatsApp: <span className={testRerouteResult.dispatchResult?.sender?.channels?.whatsapp?.status === 'DELIVERED' ? 'text-emerald-300 font-bold' : 'text-slate-400'}>{testRerouteResult.dispatchResult?.sender?.channels?.whatsapp?.status || 'Opted-Out'} (₦35.00)</span></div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between border-t border-white/10">
                        <span>New Wallet Balance: <strong className="text-white font-mono">₦{(testRerouteResult.walletBalance ?? 0).toFixed(2)}</strong></span>
                        <span className="text-emerald-400">Redirected from LA-01-A01-AA-01 ➔ {profile?.postcode || 'FC-01-A03-FK-01'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* LOCATION PRIVACY */}
                <div className="border-t pt-3 border-slate-100 flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition text-xs">
                  <div className="pr-4">
                    <span className="font-bold text-slate-800 block">Location-Based Hub Matching</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Share device location to automatically find and recommend the nearest accredited hubs
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={geoLoading}
                      checked={Boolean(profile?.privacy_settings?.shareLocation ?? false)}
                      onChange={(e) => handleToggleLocationPrivacy(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                {geoLoading && (
                  <div className="flex items-center space-x-2 text-[11px] text-emerald-700 animate-pulse px-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Requesting browser GPS permission and calculating nearest hubs...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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

      {/* MODAL: Add Address */}
      {isAddAddressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Save New Address</h3>
              <button onClick={() => setIsAddAddressOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newAddress.streetAddress}
                  onChange={e => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                  placeholder="e.g. Plot 112 Aminu Kano Crescent"
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold block">NIPOST Postcode</label>
                    {isResolvingAddressPostcode && (
                      <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin" />
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={newAddress.postcode}
                    onChange={e => handleAddressPostcodeChange(e.target.value)}
                    placeholder="e.g. FC-01-A03-FK-01"
                    className="w-full border rounded-lg p-2 font-mono uppercase"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold block">Neighborhood / Area</label>
                    <span className="text-[10px] text-emerald-600 font-semibold">Auto-detected</span>
                  </div>
                  <input
                    type="text"
                    value={newAddress.areaNeighbourhood}
                    onChange={e => setNewAddress({ ...newAddress, areaNeighbourhood: e.target.value })}
                    placeholder="Auto-detected from postcode"
                    className="w-full border rounded-lg p-2 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-emerald-600 text-white font-bold rounded-xl mt-2">
                Save Address
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: File Claim */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">File Insurance / Parcel Claim</h3>
                  <p className="text-[11px] text-slate-500">Submit a claim for damaged, lost, or delayed parcels</p>
                </div>
              </div>
              <button onClick={() => setIsClaimModalOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleSubmitClaim} className="space-y-3 text-xs">
              {shipments && shipments.length > 0 && (
                <div>
                  <label className="font-bold block mb-1">Related Shipment</label>
                  <select
                    value={selectedShipmentForAction?.id || shipments[0]?.id || ''}
                    onChange={e => setSelectedShipmentForAction(shipments.find(s => s.id === e.target.value))}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    {shipments.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.tracking_code} (To: {s.recipient_name} • ₦{parseFloat(s.pricing_total_ngn || 0).toLocaleString('en-NG')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="font-bold block mb-1">Claim Type</label>
                <select
                  value={newClaim.claimType}
                  onChange={e => setNewClaim({ ...newClaim, claimType: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-white"
                >
                  <option value="DAMAGED_PARCEL">Damaged Parcel</option>
                  <option value="LOST_PARCEL">Lost Parcel</option>
                  <option value="DELAYED_DELIVERY">Delayed Delivery</option>
                  <option value="WRONG_HANDOVER">Wrong Handover</option>
                  <option value="EXCESS_HOLDING_FEE">Excess Holding Fee</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Claim Amount (₦)</label>
                <input
                  type="number"
                  required
                  value={newClaim.claimAmountNgn}
                  onChange={e => setNewClaim({ ...newClaim, claimAmountNgn: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Incident Description</label>
                <textarea
                  required
                  rows="3"
                  value={newClaim.description}
                  onChange={e => setNewClaim({ ...newClaim, description: e.target.value })}
                  placeholder="Describe damage, delay circumstances, or custody issue..."
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-xs">
                  Submit Claim for Support Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Claim */}
      {isEditClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Update Claim Submission</h3>
                  <p className="text-[11px] text-slate-500">Modify claim amount or description before review</p>
                </div>
              </div>
              <button onClick={() => setIsEditClaimModalOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleUpdateClaim} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Claim Type</label>
                <select
                  value={editingClaim.claimType}
                  onChange={e => setEditingClaim({ ...editingClaim, claimType: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-white"
                >
                  <option value="DAMAGED_PARCEL">Damaged Parcel</option>
                  <option value="LOST_PARCEL">Lost Parcel</option>
                  <option value="DELAYED_DELIVERY">Delayed Delivery</option>
                  <option value="WRONG_HANDOVER">Wrong Handover</option>
                  <option value="EXCESS_HOLDING_FEE">Excess Holding Fee</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Claim Amount (₦)</label>
                <input
                  type="number"
                  required
                  value={editingClaim.claimAmountNgn}
                  onChange={e => setEditingClaim({ ...editingClaim, claimAmountNgn: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Incident Description</label>
                <textarea
                  required
                  rows="3"
                  value={editingClaim.description}
                  onChange={e => setEditingClaim({ ...editingClaim, description: e.target.value })}
                  placeholder="Describe damage, condition, or custody dispute..."
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditClaimModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs">
                  Save Claim Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Support Ticket */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">New Support Ticket</h3>
                  <p className="text-[11px] text-slate-500">Customer care team typically responds within 2-4 hours</p>
                </div>
              </div>
              <button onClick={() => setIsTicketModalOpen(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Issue Category</label>
                  <select
                    value={newTicket.category}
                    onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    <option value="GENERAL_ENQUIRY">General Enquiry</option>
                    <option value="DELIVERY_DELAY">Delivery Delay</option>
                    <option value="BILLING_ISSUE">Billing & Wallet</option>
                    <option value="DAMAGED_PARCEL">Damaged Parcel</option>
                    <option value="HUB_PICKUP_ISSUE">Hub Pickup Issue</option>
                    <option value="TECHNICAL_SUPPORT">Technical Support</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {shipments && shipments.length > 0 && (
                <div>
                  <label className="font-bold block mb-1">Related Shipment (Optional)</label>
                  <select
                    value={newTicket.shipmentId || ''}
                    onChange={e => setNewTicket({ ...newTicket, shipmentId: e.target.value || null })}
                    className="w-full border rounded-lg p-2 bg-white"
                  >
                    <option value="">None / General Inquiry</option>
                    {shipments.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.tracking_code} ({s.recipient_name} • {s.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={newTicket.subject}
                  onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="e.g. Enquiry regarding parcel dispatch delay"
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Detailed Message</label>
                <textarea
                  required
                  rows="4"
                  value={newTicket.message}
                  onChange={e => setNewTicket({ ...newTicket, message: e.target.value })}
                  placeholder="Describe your issue or question in detail..."
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#062419] hover:bg-[#0b3827] text-white font-bold text-xs shadow-xs"
                >
                  Submit Support Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Official NIPOST Proof of Address Certificate */}
      {isCertificateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Official NIPOST Proof-of-Address Certificate
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hotbox NDAPS Ground-Truth Verification Network (hotbox.com.ng)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCertificateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Printable Certificate Document Frame */}
            <div id="printable-nipost-certificate" className="border-4 border-double border-emerald-900/30 rounded-2xl p-6 bg-gradient-to-b from-white via-emerald-50/20 to-emerald-100/30 space-y-5 text-center relative overflow-hidden shadow-inner">
              <div className="flex items-center justify-between border-b border-emerald-900/20 pb-3">
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-950">Federal Republic of Nigeria</p>
                  <p className="text-[11px] font-black text-emerald-800">Nigerian Postal Service (NIPOST)</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-black text-[10px] flex items-center justify-center">
                  NG
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-950">Hotbox Network</p>
                  <p className="text-[11px] font-black text-emerald-800">hotbox.com.ng</p>
                </div>
              </div>

              <div className="py-2 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                  Certificate of Ground-Truth Address Verification
                </span>
                <h2 className="text-xl font-serif font-black text-slate-950 pt-2">
                  Official Proof of Address Dossier
                </h2>
                <p className="text-[11px] text-slate-600 max-w-md mx-auto">
                  This document certifies that the doorway and identity of the individual named below have been physically inspected and verified under the National Digital Address & Postcode System (NDAPS).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left bg-white/90 p-4 rounded-xl border border-emerald-900/20 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Registered Citizen</span>
                  <p className="font-bold text-slate-900">{profile?.name || currentUser?.name || 'Citizen'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Digital P.O. Box Anchor</span>
                  <p className="font-mono font-bold text-emerald-800">{digitalBox?.boxNumber || 'HBX-PBOX-FC01A03-0005'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">NDAPS Digital Postcode</span>
                  <p className="font-mono font-bold text-slate-900">{digitalBox?.activePostcode || 'FC-01-A03-FK-01'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Doorway GPS Check</span>
                  <p className="font-mono font-bold text-emerald-700">&lt; 15m Geofenced Verified</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Physical Verified Address</span>
                  <p className="font-medium text-slate-900">{profile?.postcode_description || senderLocation.address}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">District / LGA</span>
                  <p className="font-medium text-slate-800">{digitalBox?.hierarchy?.district || 'Wuse 2'}, {digitalBox?.hierarchy?.lga || 'Abuja Municipal'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">State / Jurisdiction</span>
                  <p className="font-medium text-slate-800">{digitalBox?.hierarchy?.state || 'Federal Capital Territory'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-900/20 text-[10px] text-slate-500">
                <div className="text-left">
                  <p className="font-mono font-bold text-slate-800">Certificate No: HBX-CERT-{(profile?.id || '0000').slice(0, 8).toUpperCase()}</p>
                  <p>Issued: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified by NIPOST
                  </span>
                  <p className="text-[9px] text-slate-400">Valid for Banks, KYC & Visas</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCertificateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Contact Verification OTP */}
      {verifyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  {verifyModal.type === 'phone' ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Verify {verifyModal.type === 'phone' ? 'Phone Number' : 'Email Address'}
                  </h3>
                  <p className="text-[11px] text-slate-500">{verifyModal.destination}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provider & Dispatch Banner */}
            {verifyModal.isLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-600 space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Generating secure 6-digit cryptographic code...</span>
              </div>
            ) : verifyModal.isSent ? (
              <div className="space-y-4">
                {verifyModal.previewOtp ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Verification Code
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono">10m expiry</span>
                    </div>
                    <p className="text-xs text-emerald-900 font-medium">
                      One-Time Passcode (OTP):
                    </p>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-300">
                      <span className="font-mono text-xl font-black text-emerald-700 tracking-widest">
                        {verifyModal.previewOtp}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVerifyOtp(verifyModal.previewOtp)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Autofill Code
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-700 leading-tight">
                      {verifyModal.notice || 'Enter this 6-digit code below to confirm your contact details.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>A verification code has been dispatched to {verifyModal.destination}.</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verifyOtp}
                    onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full border border-slate-300 text-center font-mono font-black text-2xl tracking-[0.4em] rounded-xl py-2.5 focus:border-emerald-600 focus:outline-none bg-slate-50"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    disabled={isVerifying || verifyOtp.trim().length !== 6}
                    onClick={handleConfirmVerify}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm & Verify {verifyModal.type === 'phone' ? 'Phone' : 'Email'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestOtp(verifyModal.type)}
                    className="px-3 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
                  >
                    Resend
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-600">
                  Ready to send a 6-digit confirmation code to <span className="font-bold text-slate-900">{verifyModal.destination}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => handleRequestOtp(verifyModal.type)}
                  className="w-full py-2.5 bg-[#062419] hover:bg-[#0b3827] text-white font-bold text-xs rounded-xl transition"
                >
                  Send Verification Code Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Booking Modal */}
      {(() => {
        const modalSender = bookingPrefill?.sender || {
          name: profile?.name || currentUser?.name || 'Kolawole Adeleke',
          phone: profile?.phone || currentUser?.phone || '+2348037778899',
          postcode: senderLocation.postcode || 'FC-01-A03-FK-01',
          address: senderLocation.address || ''
        };
        const modalRecipient = bookingPrefill?.recipient || {
          name: 'Ngozi Eze',
          phone: '+2348029988112',
          email: 'ngozi@eze.ng',
          postcode: recipientLocation.postcode || 'FC-01-A02-FK-02',
          address: recipientLocation.address || '',
          hubId: selectedHub?.id || (hubs && hubs.length > 0 ? hubs[0].id : '')
        };
        return (
          <BookingModal
            isOpen={isBookingOpen}
            onClose={() => {
              setIsBookingOpen(false);
              setBookingPrefill(null);
            }}
            hubs={hubs}
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
