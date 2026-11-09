import { useState, useEffect } from 'react';

export function useDiscovery({ currentUser, profile, showToast, getAuthHeaders, fetchCustomerData, setBookingPrefill, setIsBookingOpen }) {
  const [hubSearchMode, setHubSearchMode] = useState('sender'); // 'sender' (Drop-off near me) | 'recipient' (Collection near recipient)
  const [sortByProximity, setSortByProximity] = useState(true);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map' for mobile layout
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [senderQuery, setSenderQuery] = useState('');
  const [recipientQuery, setRecipientQuery] = useState('');
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


  return {
    hubSearchMode, setHubSearchMode, sortByProximity, setSortByProximity,
    mobileView, setMobileView, isSearchingLocation, suggestions,
    showSuggestions, setShowSuggestions, senderQuery, setSenderQuery,
    recipientQuery, setRecipientQuery, senderLocation, setSenderLocation,
    recipientLocation, setRecipientLocation, postcode, setPostcode,
    coords, setCoords, hubs, setHubs, selectedHub, setSelectedHub,
    activeLocation, hasEnteredLocation, hasMapCoords, fetchHubs,
    handleSwitchHubMode, handleQueryChange, handleResolveAndSearch,
    handleSelectSuggestion, handleSelectQuickLocation, handleBookWithHub,
    handleToggleSaveHub
  };
}
