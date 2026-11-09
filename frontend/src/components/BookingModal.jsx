import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Package, ShieldCheck, MapPin, CheckCircle, ArrowRight, ArrowLeft,
  RefreshCw, Store, Sparkles, Building2, ExternalLink, Truck, Shield,
  Copy, Check, Clock, QrCode, Printer, Phone, Mail, User, Info, AlertCircle,
  CheckCircle2, Box
} from 'lucide-react';

const RECIPIENT_COMMON_AREAS = [
  { label: 'Wuse 2, Abuja (FCT)', postcode: 'FC-01-A03-FK-01', address: 'Plot 112 Aminu Kano Crescent, Wuse 2, Abuja', lat: 9.0765, lng: 7.4985 },
  { label: 'Jabi District, Abuja (FCT)', postcode: 'FC-01-A02-FK-02', address: 'Suite B12, Jabi Lake Mall, Jabi, Abuja', lat: 9.0820, lng: 7.4410 },
  { label: 'Garki Area 1, Abuja (FCT)', postcode: 'FC-01-A01-FK-03', address: 'Block 3, Area 1 Shopping Complex, Garki, Abuja', lat: 9.0650, lng: 7.4820 },
  { label: 'Central Business District, Abuja (FCT)', postcode: 'FC-01-A04-FK-04', address: 'Churchgate Towers, Central Business District, Abuja', lat: 9.0579, lng: 7.4951 },
  { label: 'Maitama District, Abuja (FCT)', postcode: 'FC-01-A05-FK-05', address: '5 Amazon Street, Maitama, Abuja', lat: 9.0882, lng: 7.4934 },
  { label: 'Victoria Island, Lagos', postcode: 'LA-01-A01-AA-01', address: 'Adeola Odeku Street, Victoria Island, Lagos', lat: 6.4541, lng: 3.4247 },
  { label: 'Ikeja / Allen Ave, Lagos', postcode: 'LA-02-A02-BB-02', address: 'Allen Avenue, Ikeja, Lagos', lat: 6.5244, lng: 3.3792 },
  { label: 'Lekki Phase 1, Lagos', postcode: 'LA-01-A03-CC-03', address: 'Admiralty Way, Lekki Phase 1, Lagos', lat: 6.4474, lng: 3.4731 },
  { label: 'Old GRA, Port Harcourt', postcode: 'RV-01-A01-DD-01', address: 'Forces Avenue, Old GRA, Port Harcourt', lat: 4.8156, lng: 7.0128 },
  { label: 'Nassarawa GRA, Kano', postcode: 'KN-01-A01-EE-01', address: 'Bompai Road, Nassarawa GRA, Kano', lat: 12.0022, lng: 8.5920 },
  { label: 'Bodija Estate, Ibadan', postcode: 'OY-01-A01-FF-01', address: 'Bodija Estate, Ibadan North, Oyo', lat: 7.4246, lng: 3.9056 }
];

export default function BookingModal({
  isOpen,
  onClose,
  hubs = [],
  currentUser = null,
  prefilledSender = null,
  prefilledRecipient = null,
  onBookSuccess
}) {
  if (!isOpen) return null;

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

  // Debounce, abort & tracking refs
  const senderTimerRef = useRef(null);
  const recipientTimerRef = useRef(null);
  const senderAbortRef = useRef(null);
  const recipientAbortRef = useRef(null);
  const wasOpenRef = useRef(false);
  const lastResolvedSenderRef = useRef('');
  const lastResolvedRecipientRef = useRef('');

  // Sync hubs if passed down
  useEffect(() => {
    if (hubs && hubs.length > 0) {
      setAvailableHubs(hubs);
      if (!destinationHubId) {
        setDestinationHubId(prefilledRecipient?.hubId || hubs[0]?.id);
      }
    }
  }, [hubs, prefilledRecipient]);

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

    const token = localStorage.getItem('hotbox_token') || localStorage.getItem('dropboxz_token');
    const headers = token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };

    try {
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-fadeIn">
        
        {/* Header Bar */}
        <div className="bg-[#062419] text-white p-5 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white">Send a Parcel</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700/60">
                    Hotbox Express
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Postcode Verified pickup & secure custody delivery network
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-200/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar (Only visible while booking) */}
          {!bookedResult && (
            <div className="grid grid-cols-4 gap-2 mt-6 pt-5 border-t border-emerald-800/60 text-xs">
              {[
                { num: 1, label: 'Origin' },
                { num: 2, label: 'Destination' },
                { num: 3, label: 'Package' },
                { num: 4, label: 'Confirm' }
              ].map(s => {
                const isActive = step === s.num;
                const isPassed = step > s.num;
                return (
                  <div key={s.num} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition ${
                      isPassed
                        ? 'bg-emerald-400 text-slate-950 font-bold'
                        : isActive
                        ? 'bg-white text-emerald-950 ring-2 ring-emerald-400 font-bold'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}>
                      {isPassed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                    </div>
                    <span className={`text-[11px] font-bold hidden sm:inline truncate ${
                      isActive ? 'text-white' : isPassed ? 'text-emerald-300' : 'text-emerald-600'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================
              SUCCESS SCREEN: OFFICIAL COURIER WAYBILL & OTP PASS
              ======================================================== */}
          {bookedResult ? (
            <div className="space-y-6 text-center animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Ready for Courier Pickup
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Parcel Dispatch Booked Successfully!
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Registered in the Hotbox Postcode Verified Network. Give your 6-digit Pickup OTP to the dispatch rider when handing over your parcel.
                </p>
              </div>

              {/* Courier Waybill Receipt Frame */}
              <div id="printable-courier-waybill" className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-5 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Waybill Tracking Code</span>
                    <span className="font-mono font-black text-lg text-slate-900 tracking-wider">
                      {bookedResult.shipment?.tracking_code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(bookedResult.shipment?.tracking_code, 'tracking')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTracking ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Handover OTP Showcase */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                      Sender Pickup OTP (Give to Rider)
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-2xl font-black text-emerald-700 tracking-widest">
                        {bookedResult.pickupOtp}
                      </span>
                      <button
                        onClick={() => handleCopy(bookedResult.pickupOtp, 'otp')}
                        className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        {copiedOtp ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-600 leading-tight">
                      Confirms physical package handover from your doorway.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider block">
                      Recipient Collection Hub
                    </span>
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {selectedHubObj?.business_name || 'Accredited Hub Station'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {selectedHubObj?.address_text || recipientAddress}
                    </p>
                    <p className="text-[10px] text-blue-700 font-mono font-semibold">
                      Postcode: {selectedHubObj?.postcode || recipientPostcode}
                    </p>
                  </div>
                </div>

                {/* Route Corridor Info */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Origin (Sender)</span>
                    <p className="font-medium text-slate-900 truncate">{senderName} ({senderPostcode})</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Destination (Receiver)</span>
                    <p className="font-medium text-slate-900 truncate">{recipientName} ({recipientPostcode})</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Print Waybill Slip</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-[#062419] hover:bg-[#0b3827] text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Return to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* ========================================================
                  STEP 1: ORIGIN & SENDER DETAILS
                  ======================================================== */}
              {step === 1 && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">1. Service Type & Origin (Sender)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Where is the courier picking up this parcel?</p>
                  </div>

                  {/* Service Tier Switcher */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setServiceType('DOOR_TO_HUB')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative ${
                        serviceType === 'DOOR_TO_HUB'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/30 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-emerald-600" />
                          <span>Door-to-Hub Express</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        A dispatch courier comes directly to your doorway to verify and collect the parcel.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setServiceType('HUB_TO_HUB')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative ${
                        serviceType === 'HUB_TO_HUB'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/30 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-emerald-600" />
                          <span>Hub-to-Hub Drop-Off</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          Drop at Shop / Hub / Post office
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        Drop off the parcel at your nearest community hub station at your convenience.
                      </p>
                    </button>
                  </div>

                  {/* Sender Contact Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Sender Full Name</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={senderName}
                          onChange={e => setSenderName(e.target.value)}
                          placeholder="Enter sender full name"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Sender Phone Number</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={senderPhone}
                          onChange={e => setSenderPhone(e.target.value)}
                          placeholder="Enter sender phone number"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sender Postcode & Address */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sender Digital Postcode</span>
                      </label>
                      <a
                        href="https://postcode.gov.ng/find"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 underline"
                      >
                        <span>No postcode? Get your postcode from NIPOST</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={15}
                        value={senderPostcode}
                        onChange={e => handleSenderPostcodeChange(e.target.value)}
                        onBlur={() => {
                          if (senderPostcode && !senderAddress) {
                            resolveSenderCode(senderPostcode, true);
                          }
                        }}
                        placeholder="e.g. FC-01-A03-FK-01"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 uppercase tracking-wider"
                      />
                      {isResolvingSender && (
                        <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Resolving...</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-xs text-slate-700">
                          Pickup Address (Auto-Populated from hotbox verified postcode)
                        </label>
                        {senderAddress && !senderNoPostcodeWarning && (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verified Postcode Address</span>
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={senderAddress}
                        onChange={e => {
                          setSenderAddress(e.target.value);
                          setSenderNoPostcodeWarning(null);
                        }}
                        onBlur={() => {
                          if (senderAddress && !senderPostcode) {
                            resolveSenderCode(senderAddress, true);
                          }
                        }}
                        placeholder={isResolvingSender ? "Resolving address from NDAPS..." : "Enter pickup address or verify postcode above"}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 ${
                          senderNoPostcodeWarning ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                        }`}
                      />
                      {senderNoPostcodeWarning && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-start gap-2 animate-fadeIn">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold">{senderNoPostcodeWarning}</p>
                            <a
                              href="https://postcode.gov.ng/find"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-900 underline mt-1 text-[10px]"
                            >
                              <span>Request or verify postcode on official NIPOST portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={!canProceedStep1}
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Continue to Destination</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================
                  STEP 2: RECIPIENT & DESTINATION
                  ======================================================== */}
              {step === 2 && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">2. Recipient & Destination Hub</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Who is receiving this parcel, and which hub will store it?</p>
                  </div>

                  {/* Recipient Contact Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Recipient Name</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={recipientName}
                          onChange={e => setRecipientName(e.target.value)}
                          placeholder="Enter recipient full name"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Recipient Phone</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={recipientPhone}
                          onChange={e => setRecipientPhone(e.target.value)}
                          placeholder="Enter recipient phone number"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Recipient Email (Optional)</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={e => setRecipientEmail(e.target.value)}
                          placeholder="ngozi@eze.ng"
                          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recipient Postcode vs Quick Area */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Recipient Digital Postcode</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setRecipientNoPostcodeMode(!recipientNoPostcodeMode)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                      >
                        {recipientNoPostcodeMode ? 'Enter Digital Postcode' : 'Recipient has no postcode? Pick area'}
                      </button>
                    </div>

                    {recipientNoPostcodeMode ? (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <p className="text-[11px] text-slate-600 font-medium">Select recipient's city or neighborhood:</p>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {RECIPIENT_COMMON_AREAS.map((area) => (
                            <button
                              key={area.postcode}
                              type="button"
                              onClick={() => handleSelectRecipientArea(area)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                recipientPostcode === area.postcode
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {area.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={recipientPostcode}
                          onChange={e => handleRecipientPostcodeChange(e.target.value)}
                          onBlur={() => {
                            if (recipientPostcode && !recipientAddress) {
                              resolveRecipientCode(recipientPostcode, true);
                            }
                          }}
                          placeholder="e.g. FC-01-A02-FK-02"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 uppercase tracking-wider"
                        />
                        {isResolvingRecipient && (
                          <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Auto-ranking hubs...</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-xs text-slate-700">
                          Recipient Destination Address
                        </label>
                        {recipientAddress && !recipientNoPostcodeWarning && (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verified Postcode Address</span>
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={recipientAddress}
                        onChange={e => {
                          setRecipientAddress(e.target.value);
                          setRecipientNoPostcodeWarning(null);
                        }}
                        onBlur={() => {
                          if (recipientAddress && !recipientPostcode) {
                            resolveRecipientCode(recipientAddress, true);
                          }
                        }}
                        placeholder={isResolvingRecipient ? "Resolving address from NDAPS..." : "Enter delivery address or select area above"}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 ${
                          recipientNoPostcodeWarning ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                        }`}
                      />
                      {recipientNoPostcodeWarning && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-start gap-2 animate-fadeIn">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold">{recipientNoPostcodeWarning}</p>
                            <a
                              href="https://postcode.gov.ng/find"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-900 underline mt-1 text-[10px]"
                            >
                              <span>Request or verify postcode on official NIPOST portal</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Destination Collection Hub */}
                  <div>
                    <label className="font-bold text-xs text-slate-700 block mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Recipient Collection Hub (Ranked by Proximity)</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Closest Hub Auto-Selected</span>
                    </label>
                    <select
                      value={destinationHubId}
                      onChange={e => setDestinationHubId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      required
                    >
                      {availableHubs.map(h => {
                        const distStr = h.distanceKm !== undefined ? ` • ${h.distanceKm} km away` : '';
                        return (
                          <option key={h.id} value={h.id}>
                            {h.business_name} ({h.neighbourhood || h.postcode}){distStr} — ⭐ {h.rating} ({h.capacity - h.current_load} bays free)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canProceedStep2}
                      onClick={() => setStep(3)}
                      className="px-6 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Continue to Package</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================
                  STEP 3: PACKAGE DETAILS & VALUE PROTECTION
                  ======================================================== */}
              {step === 3 && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">3. Package Specifications & Protection</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Select parcel size and packaging specifications.</p>
                  </div>

                  {/* Size Preset Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'small', label: 'Small Pouch', weight: 'Up to 1 kg', desc: 'Documents, flyers, phones, cards', price: '₦1,200' },
                      { id: 'medium', label: 'Standard Box', weight: '1 kg – 5 kg', desc: 'Shoebox, apparel, electronics', price: '₦1,600' },
                      { id: 'large', label: 'Heavy Carton', weight: '5 kg – 15 kg', desc: 'Bulk goods, hampers, appliances', price: '₦2,400' }
                    ].map(sz => {
                      const isSelected = size === sz.id;
                      return (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() => setSize(sz.id)}
                          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900">{sz.label}</span>
                              <Box className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">{sz.weight}</span>
                            <p className="text-[11px] text-slate-500 mt-2 leading-tight">{sz.desc}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">Flat Rate:</span>
                            <span className="text-sm font-black text-emerald-700">{sz.price}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Package Description */}
                  <div>
                    <label className="font-bold text-xs text-slate-700 block mb-1">Package Contents Description</label>
                    <input
                      type="text"
                      required
                      value={packageDescription}
                      onChange={e => setPackageDescription(e.target.value)}
                      placeholder="e.g. Legal documents & bank credentials"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>

                  {/* Declared Value & Protection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-xs text-slate-700 block mb-1">Declared Item Value (₦)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={declaredValue}
                        onChange={e => setDeclaredValue(e.target.value)}
                        placeholder="25000"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 self-end">
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">Fragile Item Tag</span>
                        <span className="text-[10px] text-slate-500">Requires gentle handling</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isFragile}
                        onChange={e => setIsFragile(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Insurance Banner */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-emerald-950 block">
                        Complimentary Hotbox Cargo Protection (Free ₦0.00)
                      </span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Your parcel is insured up to ₦50,000 against loss, theft, or damage with instant automated claim payouts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canProceedStep3}
                      onClick={() => setStep(4)}
                      className="px-6 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Review & Confirm</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================
                  STEP 4: REVIEW & CONFIRM
                  ======================================================== */}
              {step === 4 && (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">4. Review & Confirm Booking</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Verify route corridor and delivery charge before dispatch.</p>
                  </div>

                  {/* Corridor Summary Card */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                      <span className="font-bold text-slate-700">Dispatch Corridor</span>
                      <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {serviceType === 'DOOR_TO_HUB' ? 'Doorstep Pickup' : 'Hub Drop-Off'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Origin</span>
                        <p className="font-bold text-slate-900">{senderName}</p>
                        <p className="text-slate-600 text-[11px] truncate">{senderAddress}</p>
                        <span className="font-mono text-[10px] font-bold text-emerald-700">{senderPostcode}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Destination Hub</span>
                        <p className="font-bold text-slate-900">{selectedHubObj?.business_name}</p>
                        <p className="text-slate-600 text-[11px] truncate">{selectedHubObj?.address_text}</p>
                        <span className="font-mono text-[10px] font-bold text-emerald-700">{selectedHubObj?.postcode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Calculation */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Delivery Fee ({size.toUpperCase()} package):</span>
                      <span className="font-bold text-slate-900">₦{priceMap[size].toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Hotbox Cargo Protection:</span>
                      <span className="font-bold text-emerald-700">₦0.00 (Free)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Dual-Party In-App/Email Alerts:</span>
                      <span className="font-bold text-emerald-700">₦0.00 (Free)</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">Total Delivery Amount:</span>
                      <span className="text-lg font-black text-emerald-800">
                        ₦{priceMap[size].toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleBooking}
                      className="px-6 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Confirming Dispatch...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm & Book Dispatch</span>
                          <Check className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
