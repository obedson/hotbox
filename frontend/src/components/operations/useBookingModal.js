import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { fundWalletWithCard } from '../../lib/walletFunding';
import { getPaystackConfig } from '../../lib/paystack';

export default function useBookingModal({ isOpen, hubs, currentUser, prefilledSender, prefilledRecipient, onBookSuccess }) {

  // Multi-step booking wizard (1: Origin, 2: Destination, 3: Package, 4: Review)
  const [step, setStep] = useState(1);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Service Type: 'DOOR_TO_HUB' (Default) | 'HUB_TO_HUB'
  const [serviceType, setServiceType] = useState('DOOR_TO_HUB');
  
  // Sender Details
  const defaultSenderName = prefilledSender?.name || currentUser?.name || '';
  const defaultSenderPhone = prefilledSender?.phone || currentUser?.phone || '';
  const defaultSenderPostcode = prefilledSender?.postcode || currentUser?.postcode || '';
  const defaultSenderAddress = prefilledSender?.address || '';

  const [senderName, setSenderName] = useState(defaultSenderName);
  const [senderPhone, setSenderPhone] = useState(defaultSenderPhone);
  const [senderPostcode, setSenderPostcode] = useState(defaultSenderPostcode);
  const [senderAddress, setSenderAddress] = useState(defaultSenderAddress);
  const [isResolvingSender, setIsResolvingSender] = useState(false);
  const [senderNoPostcodeWarning, setSenderNoPostcodeWarning] = useState(null);

  // Recipient Details
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPostcode, setRecipientPostcode] = useState(prefilledRecipient?.postcode || '');
  const [recipientAddress, setRecipientAddress] = useState(prefilledRecipient?.address || '');
  const [isResolvingRecipient, setIsResolvingRecipient] = useState(false);
  const [recipientNoPostcodeWarning, setRecipientNoPostcodeWarning] = useState(null);
  const [recipientNoPostcodeMode, setRecipientNoPostcodeMode] = useState(false);

  // Hubs State
  const [availableHubs, setAvailableHubs] = useState(hubs);
  const [destinationHubId, setDestinationHubId] = useState(prefilledRecipient?.hubId || hubs[0]?.id || '');
  
  // Package specifications
  const [size, setSize] = useState('medium');
  const [packageDescription, setPackageDescription] = useState('Verified merchandise & documents');
  const [declaredValue, setDeclaredValue] = useState('25000');
  const [isFragile, setIsFragile] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookedResult, setBookedResult] = useState(null);

  const priceMap = { small: 1200, medium: 1600, large: 2400 };

  // Prepaid wallet balance, used to show the review step whether card checkout
  // will be needed to cover the dispatch fee.
  const [walletBalance, setWalletBalance] = useState(null);

  // Debounce, abort & tracking refs
  const senderTimerRef = useRef(null);
  const recipientTimerRef = useRef(null);
  const senderAbortRef = useRef(null);
  const recipientAbortRef = useRef(null);
  const wasOpenRef = useRef(false);
  const lastResolvedSenderRef = useRef('');
  const lastResolvedRecipientRef = useRef('');

  // Sync hubs when the dashboard hub list changes
  useEffect(() => {
    if (hubs && hubs.length > 0) {
      setAvailableHubs(hubs);
      if (!destinationHubId) {
        setDestinationHubId(hubs[0]?.id);
      }
    }
  }, [hubs]);

  // Canonical Authoritative Sender Postcode & Location Resolver
  const resolveSenderCode = async (rawInput, force = false) => {
    const raw = (rawInput || '').trim();
    if (!raw) {
      setIsResolvingSender(false);
      setSenderNoPostcodeWarning(null);
      return;
    }

    const clean = raw.toUpperCase().replace(/[\s\-]/g, '');
    const isLegacy = /^\d{6}$/.test(clean);
    const isNdaps = clean.length === 11 && /^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z]{2}\d{2}$/.test(clean);

    // If it's not a postcode format, it could be a street address (require min 3 chars)
    if (!isLegacy && !isNdaps && raw.length < 3) {
      setIsResolvingSender(false);
      return;
    }

    if (!force && clean === lastResolvedSenderRef.current && senderAddress) {
      setIsResolvingSender(false);
      return;
    }

    if (senderAbortRef.current) senderAbortRef.current.abort();
    const abortCtrl = new AbortController();
    senderAbortRef.current = abortCtrl;

    setIsResolvingSender(true);
    setSenderNoPostcodeWarning(null);
    try {
      const res = await apiFetch(`/api/v1/postcodes/resolve-location?q=${encodeURIComponent(raw)}`, {
        signal: abortCtrl.signal
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hasVerifiedPostcode) {
          const resolvedAddr = data.full_address || data.address || data.description;
          if (resolvedAddr) {
            setSenderAddress(resolvedAddr);
          }
          const resolvedCode = data.ndaps_code || data.postcode;
          if (resolvedCode) {
            setSenderPostcode(resolvedCode);
          }
          lastResolvedSenderRef.current = (resolvedCode || clean).replace(/[\s\-]/g, '');
          setSenderNoPostcodeWarning(null);
        } else {
          // Address entered, but NO verified postcode found in registry
          setSenderNoPostcodeWarning(data.message || 'No verified postcode found for this address, please request for postcode from NIPOST.');
        }
      } else {
        setSenderNoPostcodeWarning('No verified postcode found for this address, please request for postcode from NIPOST.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Sender location lookup notice:', err.message);
      }
    } finally {
      if (senderAbortRef.current === abortCtrl) {
        setIsResolvingSender(false);
      }
    }
  };

  const handleSenderPostcodeChange = (val) => {
    const code = val.toUpperCase().replace(/[^0-9A-Z\-\s]/g, '').slice(0, 15);
    setSenderPostcode(code);
    setSenderNoPostcodeWarning(null);

    if (senderTimerRef.current) clearTimeout(senderTimerRef.current);

    const clean = code.replace(/[\s\-]/g, '');
    const isLegacy = /^\d{6}$/.test(clean);
    const isNdaps = clean.length === 11 && /^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z]{2}\d{2}$/.test(clean);

    if (isLegacy || isNdaps) {
      setIsResolvingSender(true);
      senderTimerRef.current = setTimeout(() => {
        resolveSenderCode(code, true);
      }, 300);
    } else {
      setIsResolvingSender(false);
    }
  };

  // Canonical Authoritative Recipient Postcode & Location Resolver
  const resolveRecipientCode = async (rawInput, force = false) => {
    const raw = (rawInput || '').trim();
    if (!raw) {
      setIsResolvingRecipient(false);
      setRecipientNoPostcodeWarning(null);
      return;
    }

    const clean = raw.toUpperCase().replace(/[\s\-]/g, '');
    const isLegacy = /^\d{6}$/.test(clean);
    const isNdaps = clean.length === 11 && /^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z]{2}\d{2}$/.test(clean);

    if (!isLegacy && !isNdaps && raw.length < 3) {
      setIsResolvingRecipient(false);
      return;
    }

    if (!force && clean === lastResolvedRecipientRef.current && recipientAddress) {
      setIsResolvingRecipient(false);
      return;
    }

    if (recipientAbortRef.current) recipientAbortRef.current.abort();
    const abortCtrl = new AbortController();
    recipientAbortRef.current = abortCtrl;

    setIsResolvingRecipient(true);
    setRecipientNoPostcodeWarning(null);
    try {
      const res = await apiFetch(`/api/v1/postcodes/resolve-location?q=${encodeURIComponent(raw)}`, {
        signal: abortCtrl.signal
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hasVerifiedPostcode) {
          const resolvedAddr = data.full_address || data.address || data.description;
          if (resolvedAddr) {
            setRecipientAddress(resolvedAddr);
          }
          const resolvedCode = data.ndaps_code || data.postcode;
          if (resolvedCode) {
            setRecipientPostcode(resolvedCode);
          }
          lastResolvedRecipientRef.current = (resolvedCode || clean).replace(/[\s\-]/g, '');
          setRecipientNoPostcodeWarning(null);

          if (data.lat && data.lng) {
            const hubsRes = await apiFetch(`/api/v1/hubs/nearby?lat=${data.lat}&lng=${data.lng}&radius=30`);
            if (hubsRes.ok) {
              const hubsData = await hubsRes.json();
              if (hubsData.hubs && hubsData.hubs.length > 0) {
                setAvailableHubs(hubsData.hubs);
                setDestinationHubId(hubsData.hubs[0].id);
              }
            }
          }
        } else {
          setRecipientNoPostcodeWarning(data.message || 'No verified postcode found for this address, please request for postcode from NIPOST.');
        }
      } else {
        setRecipientNoPostcodeWarning('No verified postcode found for this address, please request for postcode from NIPOST.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Recipient location lookup notice:', err.message);
      }
    } finally {
      if (recipientAbortRef.current === abortCtrl) {
        setIsResolvingRecipient(false);
      }
    }
  };

  const handleRecipientPostcodeChange = (val) => {
    const code = val.toUpperCase().replace(/[^0-9A-Z\-\s]/g, '').slice(0, 15);
    setRecipientPostcode(code);
    setRecipientNoPostcodeWarning(null);

    if (recipientTimerRef.current) clearTimeout(recipientTimerRef.current);

    const clean = code.replace(/[\s\-]/g, '');
    const isLegacy = /^\d{6}$/.test(clean);
    const isNdaps = clean.length === 11 && /^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z]{2}\d{2}$/.test(clean);

    if (isLegacy || isNdaps) {
      setIsResolvingRecipient(true);
      recipientTimerRef.current = setTimeout(() => {
        resolveRecipientCode(code, true);
      }, 300);
    } else {
      setIsResolvingRecipient(false);
    }
  };

  // Synchronize modal state ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // 1. Sender Data
      const sName = prefilledSender?.name || currentUser?.name || '';
      const sPhone = prefilledSender?.phone || currentUser?.phone || '';
      const sPostcode = prefilledSender?.postcode || currentUser?.postcode || '';
      const sAddress = prefilledSender?.address || '';

      setSenderName(sName);
      setSenderPhone(sPhone);
      setSenderPostcode(sPostcode);
      setSenderAddress(sAddress);
      setIsResolvingSender(false);
      setSenderNoPostcodeWarning(null);
      lastResolvedSenderRef.current = sAddress ? sPostcode.replace(/[\s\-]/g, '') : '';

      // Auto-resolve pickup address if postcode is provided but address is blank
      if (sPostcode && !sAddress) {
        resolveSenderCode(sPostcode, true);
      }

      // 2. Recipient Data
      const rName = prefilledRecipient?.name || '';
      const rPhone = prefilledRecipient?.phone || '';
      const rEmail = prefilledRecipient?.email || '';
      const rPostcode = prefilledRecipient?.postcode || '';
      const rAddress = prefilledRecipient?.address || '';
      const rHubId = prefilledRecipient?.hubId || (hubs && hubs.length > 0 ? hubs[0].id : '');

      setRecipientName(rName);
      setRecipientPhone(rPhone);
      setRecipientEmail(rEmail);
      setRecipientPostcode(rPostcode);
      setRecipientAddress(rAddress);
      if (rHubId) setDestinationHubId(rHubId);
      setIsResolvingRecipient(false);
      setRecipientNoPostcodeWarning(null);
      lastResolvedRecipientRef.current = rAddress ? rPostcode.replace(/[\s\-]/g, '') : '';

      // Auto-resolve recipient address if postcode is provided but address is blank
      if (rPostcode && !rAddress) {
        resolveRecipientCode(rPostcode, true);
      }

      // 3. Reset workflow steps & feedback
      setStep(1);
      setError(null);
      setBookedResult(null);
      setLoading(false);
    }

    // Load the customer wallet so the review step can flag a shortfall.
    setWalletBalance(null);
    if (currentUser?.role === 'customer') {
      apiFetch('/api/v1/wallets/me')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setWalletBalance(Number(data?.wallet?.balance || 0)))
        .catch(() => {});
    }

    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Cleanup timers & abort controllers on unmount
  useEffect(() => {
    return () => {
      if (senderTimerRef.current) clearTimeout(senderTimerRef.current);
      if (recipientTimerRef.current) clearTimeout(recipientTimerRef.current);
      if (senderAbortRef.current) senderAbortRef.current.abort();
      if (recipientAbortRef.current) recipientAbortRef.current.abort();
    };
  }, []);

  // Handle recipient choosing a common neighbourhood when they don't have a digital postcode
  const handleSelectRecipientArea = async (area) => {
    setRecipientPostcode(area.postcode);
    setRecipientAddress(area.address);
    setIsResolvingRecipient(true);
    try {
      const hubsRes = await apiFetch(`/api/v1/hubs/nearby?lat=${area.lat}&lng=${area.lng}&radius=30`);
      if (hubsRes.ok) {
        const hubsData = await hubsRes.json();
        if (hubsData.hubs && hubsData.hubs.length > 0) {
          setAvailableHubs(hubsData.hubs);
          setDestinationHubId(hubsData.hubs[0].id);
        }
      }
    } catch (e) {
    } finally {
      setIsResolvingRecipient(false);
    }
  };

  // Step validation
  const canProceedStep1 = senderName.trim() && senderPhone.trim() && senderPostcode.trim() && senderAddress.trim();
  const canProceedStep2 = recipientName.trim() && recipientPhone.trim() && recipientPostcode.trim() && destinationHubId;
  const canProceedStep3 = size && packageDescription.trim();

  const handleBooking = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('hotbox_token');
    const headers = token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };

    try {
      // Customers settle the dispatch fee from their prepaid wallet. When the
      // wallet is short, open the Paystack checkout for the difference first.
      if (currentUser?.role === 'customer') {
        let dispatchFee = Number(priceMap[size] || 0);
        const quoteRes = await apiFetch(`/api/v1/shipments/quote?size=${encodeURIComponent(size)}`, { headers });
        if (quoteRes.ok) {
          const quote = await quoteRes.json();
          if (quote && Number(quote.priceNgn) > 0) dispatchFee = Number(quote.priceNgn);
        }

        if (dispatchFee > 0) {
          const walletRes = await apiFetch('/api/v1/wallets/me', { headers });
          if (walletRes.ok) {
            const walletData = await walletRes.json();
            const balance = Number(walletData?.wallet?.balance || 0);
            if (balance < dispatchFee) {
              const config = await getPaystackConfig();
              if (config.enabled) {
                await fundWalletWithCard({
                  amountNgn: dispatchFee - balance,
                  email: currentUser?.email || '',
                  metadata: { reason: 'booking', size }
                });
              }
            }
          }
        }
      }

      const res = await apiFetch('/api/v1/shipments/book', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serviceType,
          senderName: senderName.trim(),
          senderPhone: senderPhone.trim(),
          senderPostcode: senderPostcode.trim(),
          senderAddressText: senderAddress.trim(),
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          recipientEmail: recipientEmail.trim(),
          recipientPostcode: recipientPostcode.trim(),
          recipientAddressText: recipientAddress.trim(),
          destinationHubId,
          size,
          packageDescription: `${packageDescription.trim()}${isFragile ? ' [FRAGILE]' : ''}`,
          declaredValueNgn: parseFloat(declaredValue) || 0
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');

      setBookedResult(data);
      if (onBookSuccess) onBookSuccess(data.shipment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedHubObj = availableHubs.find(h => h.id === destinationHubId) || availableHubs[0];

  const handleCopy = (text, type) => {
    navigator.clipboard?.writeText(text);
    if (type === 'otp') {
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    } else {
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    }
  };


  return {
    availableHubs,
    bookedResult,
    canProceedStep1,
    canProceedStep2,
    canProceedStep3,
    copiedOtp,
    copiedTracking,
    declaredValue,
    defaultSenderAddress,
    defaultSenderName,
    defaultSenderPhone,
    defaultSenderPostcode,
    destinationHubId,
    error,
    handleBooking,
    handleCopy,
    handleRecipientPostcodeChange,
    handleSelectRecipientArea,
    handleSenderPostcodeChange,
    isFragile,
    isResolvingRecipient,
    isResolvingSender,
    lastResolvedRecipientRef,
    lastResolvedSenderRef,
    loading,
    packageDescription,
    priceMap,
    recipientAbortRef,
    recipientAddress,
    recipientEmail,
    recipientName,
    recipientNoPostcodeMode,
    recipientNoPostcodeWarning,
    recipientPhone,
    recipientPostcode,
    recipientTimerRef,
    resolveRecipientCode,
    resolveSenderCode,
    selectedHubObj,
    senderAbortRef,
    senderAddress,
    senderName,
    senderNoPostcodeWarning,
    senderPhone,
    senderPostcode,
    senderTimerRef,
    serviceType,
    setAvailableHubs,
    setBookedResult,
    setCopiedOtp,
    setCopiedTracking,
    setDeclaredValue,
    setDestinationHubId,
    setError,
    setIsFragile,
    setIsResolvingRecipient,
    setIsResolvingSender,
    setLoading,
    setPackageDescription,
    setRecipientAddress,
    setRecipientEmail,
    setRecipientName,
    setRecipientNoPostcodeMode,
    setRecipientNoPostcodeWarning,
    setRecipientPhone,
    setRecipientPostcode,
    setSenderAddress,
    setSenderName,
    setSenderNoPostcodeWarning,
    setSenderPhone,
    setSenderPostcode,
    setServiceType,
    setSize,
    setStep,
    size,
    step,
    wasOpenRef,
    walletBalance,
  };
}
