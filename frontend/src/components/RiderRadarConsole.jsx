import React, { useState, useEffect, useCallback } from 'react';
import {
  Bike, Compass, QrCode, CheckCircle2, Wallet, ShieldCheck,
  Navigation, MapPin, Phone, ArrowRight, DollarSign, Clock,
  AlertTriangle, ExternalLink, User, Calendar, Check, Loader2, Lock
} from 'lucide-react';
import CustodyScanner from './CustodyScanner';
import RiderLookup from './RiderLookup';
import { apiFetch } from '../lib/api';
import { ensureWalletFunds } from '../lib/walletFunding';
import PhoneInput from './PhoneInput';

export default function RiderRadarConsole({ activeNav, setActiveNav, hubs, showToast }) {
  const [me, setMe] = useState(null);
  const [radarJobs, setRadarJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [kycForm, setKycForm] = useState({
    nin: '',
    driversLicenseNo: '',
    vehicleType: 'motorcycle',
    plateNumber: '',
    postcode: '',
    phone: '',
    operationalPostcodes: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [kycMessage, setKycMessage] = useState(null);
  const [registrationFee, setRegistrationFee] = useState({ amountNgn: 0, paid: false });
  const [payingFee, setPayingFee] = useState(false);

  const loadVerification = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/riders/verification');
      if (!res.ok) return;
      const data = await res.json();
      setKyc(data);
      setKycForm({
        nin: data.profile?.nin || '',
        driversLicenseNo: data.profile?.driversLicenseNo === 'DL-PENDING' ? '' : (data.profile?.driversLicenseNo || ''),
        vehicleType: data.profile?.vehicleType || 'motorcycle',
        plateNumber: data.profile?.plateNumber || '',
        postcode: data.profile?.postcode || '',
        phone: data.profile?.phone || '',
        operationalPostcodes: (data.profile?.operationalPostcodes || []).join(', ')
      });
      setRegistrationFee({
        amountNgn: Number(data.profile?.registrationFeeNgn) || 0,
        paid: Boolean(data.profile?.registrationFeePaid)
      });
    } catch (err) {
      // A Track B load failure must never blank the whole console.
    }
  }, []);

  const loadConsole = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meRes = await apiFetch('/api/v1/riders/me');
      let riderStatus = null;
      if (meRes.ok) {
        const meData = await meRes.json();
        setMe(meData);
        riderStatus = meData?.rider?.status || null;
      } else {
        const meData = await meRes.json().catch(() => ({}));
        if (meRes.status !== 404) throw new Error(meData.error || 'Unable to load rider profile');
        setMe(null);
      }

      // Track B details load on every visit, including while the rider is still
      // pending, so the KYC form can be completed before clearance is granted.
      await loadVerification();

      // Dispatch data is blocked at the API for an unverified rider, so only ask
      // for it once the account is cleared. That keeps this console on its
      // verification screen instead of failing to load.
      if (riderStatus === 'verified') {
        const [jobsRes, mineRes] = await Promise.all([
          apiFetch('/api/v1/riders/radar/jobs'),
          apiFetch('/api/v1/riders/me/jobs')
        ]);

        const jobsData = await jobsRes.json();
        if (!jobsRes.ok) throw new Error(jobsData.error || 'Unable to load delivery jobs');
        setRadarJobs(jobsData.jobs || []);

        if (mineRes.ok) {
          const mineData = await mineRes.json();
          setMyJobs(mineData.jobs || []);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadVerification]);

  useEffect(() => {
    loadConsole();
  }, [loadConsole]);

  const rider = me?.rider || null;
  const walletBalance = me?.walletBalance ?? 0;

  // Clearance is driven by the regulatory verification status, never by the
  // legacy `is_active` flag (which is true from the moment of signup).
  const riderStatus = rider?.status || 'unknown';
  const isVerified = riderStatus === 'verified';
  const statusBadge = isVerified
    ? { label: 'Track B Verified Rider', className: 'bg-blue-950 text-blue-300 border-blue-800' }
    : riderStatus === 'suspended'
      ? { label: 'Suspended', className: 'bg-rose-950 text-rose-300 border-rose-800' }
      : { label: 'Verification Pending', className: 'bg-amber-950 text-amber-300 border-amber-800' };

  // Unverified riders may open any tab, but dispatch tooling stays locked
  // until Operations grants Track B clearance.
  const renderLockedTool = (title) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
        <Lock className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">{title} is locked until verification</h3>
      <p className="text-xs text-slate-500 max-w-md mx-auto">
        Dispatch tools are released once Operations approves your Track B rider verification.
        Complete your accreditation to unlock this workspace.
      </p>
      <button
        type="button"
        onClick={() => setActiveNav('profile')}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
      >
        Go to Rider Credentials
      </button>
    </div>
  );

  const serviceLabels = {
    DOOR_TO_HUB: 'Door-to-Hub',
    HUB_TO_DOOR: 'Hub-to-Door',
    DOOR_TO_DOOR: 'Door-to-Door',
    HUB_TO_HUB: 'Corridor Transfer'
  };

  const serviceLabel = (type) => serviceLabels[type] || type || 'Delivery';

  const TRACK_B_DOCUMENTS = [
    { type: 'NIN', label: 'NIN Slip', hint: '11-digit national identity number' },
    { type: 'DRIVERS_LICENSE', label: "Driver's Licence", hint: 'FRSC licence card' },
    { type: 'VEHICLE_ROADWORTHINESS', label: 'Roadworthiness Certificate', hint: 'Certificate of roadworthiness for your vehicle' },
    { type: 'COURIER_LICENCE', label: 'Courier Licence', hint: 'State dispatch permit' },
    { type: 'PROOF_OF_ADDRESS', label: 'Proof of Address', hint: 'Utility bill or bank statement' }
  ];

  const availableJobs = radarJobs
    .filter(job => job.status === 'BOOKED')
    .map(job => ({
      id: job.id,
      trackingCode: job.tracking_code,
      serviceType: serviceLabel(job.service_type),
      size: job.size || '',
      weight: job.weight_kg ? `${job.weight_kg} kg` : '',
      pickupAddress: job.sender_address_text || job.origin_hub_name || 'Pickup point',
      pickupPostcode: job.sender_postcode || job.origin_hub_postcode || '\u2014',
      dropoffAddress: job.recipient_address_text || job.destination_hub_name || 'Destination',
      dropoffPostcode: job.recipient_postcode || job.destination_hub_postcode || '\u2014',
      payout: Number(job.potential_earning_ngn || 0)
    }));

  const activeJobs = myJobs.filter(job => !['COLLECTED_AT_HUB', 'DELIVERED_TO_RECIPIENT'].includes(job.status));

  const activeRouteStops = activeJobs.map((job, idx) => ({
    stopNumber: idx + 1,
    type: job.service_type === 'HUB_TO_DOOR' ? 'DOOR_DELIVERY' : job.service_type === 'DOOR_TO_HUB' ? 'CLAIMED_PICKUP' : 'HUB_HANDOFF',
    title: `${serviceLabel(job.service_type)} \u2022 ${job.tracking_code}`,
    address: job.recipient_address_text || job.destination_hub_name || job.sender_address_text || 'Address on waybill',
    postcode: job.recipient_postcode || job.destination_hub_postcode || job.sender_postcode || '\u2014',
    contact: job.recipient_phone || job.sender_phone || 'Contact on waybill',
    status: 'IN_PROGRESS',
    trackingCode: job.tracking_code
  }));

  const completedJobs = myJobs
    .filter(job => ['COLLECTED_AT_HUB', 'DELIVERED_TO_RECIPIENT'].includes(job.status))
    .map(job => ({
      id: job.id,
      time: job.delivered_at || job.collected_at || job.updated_at,
      code: job.tracking_code,
      corridor: `${job.sender_postcode || '\u2014'} \u2794 ${job.recipient_postcode || job.destination_hub_postcode || '\u2014'}`,
      service: serviceLabel(job.service_type),
      pay: Number(job.potential_earning_ngn || 0)
    }));

  const pendingEscrow = activeJobs.reduce((sum, job) => sum + Number(job.potential_earning_ngn || 0), 0);

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  const formatMoney = (amount) =>
    '\u20a6' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDateTime = (value) => {
    if (!value) return '\u2014';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '\u2014';
    return date.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const verificationRecords = kyc?.records || [];
  const recordFor = (documentType) =>
    verificationRecords.find((record) => record.document_type === documentType);

  const clearanceBadge = (state, label) => {
    const styles = {
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-rose-100 text-rose-700',
      review: 'bg-amber-100 text-amber-800',
      provided: 'bg-sky-100 text-sky-800',
      pending: 'bg-slate-100 text-slate-500'
    };
    return (
      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${styles[state]}`}>
        {label}
      </span>
    );
  };

  // A badge is driven by the Operations review outcome, never by the mere
  // presence of a value in the profile. "Provided" means saved, not cleared.
  const clearanceFor = (item) => {
    const record = item.documentType ? recordFor(item.documentType) : null;
    if (record) {
      if (record.status === 'APPROVED') return clearanceBadge('approved', item.approvedLabel);
      if (record.status === 'REJECTED') return clearanceBadge('rejected', 'Rejected');
      return clearanceBadge('review', 'Under review');
    }
    if (item.paid) return clearanceBadge('approved', item.approvedLabel);
    if (item.clearWhenVerified && isVerified) return clearanceBadge('approved', item.approvedLabel);
    if (item.provided) return clearanceBadge('provided', item.providedLabel || 'Provided');
    return clearanceBadge('pending', item.pendingLabel || 'Pending');
  };

  const accreditationItems = [
    {
      key: 'drivers_license',
      label: "Driver's License (FRSC)",
      documentType: 'DRIVERS_LICENSE',
      approvedLabel: 'Verified',
      providedLabel: 'Provided',
      provided: Boolean(rider?.drivers_license_no) && rider.drivers_license_no !== 'DL-PENDING'
    },
    {
      key: 'vehicle',
      label: 'Vehicle Roadworthiness',
      documentType: 'VEHICLE_ROADWORTHINESS',
      approvedLabel: 'Passed',
      providedLabel: 'Provided',
      provided: Boolean(rider?.plate_number) && rider.plate_number !== 'ABJ-000-XX'
    },
    {
      key: 'courier_licence',
      label: 'Track B Courier Licensing',
      documentType: 'COURIER_LICENCE',
      approvedLabel: 'Accredited',
      providedLabel: 'Provided',
      provided: false,
      clearWhenVerified: true
    },
    {
      key: 'nin',
      label: 'NIN Identity Check',
      documentType: 'NIN',
      approvedLabel: 'Verified',
      providedLabel: 'Provided',
      provided: Boolean(rider?.nin)
    },
    {
      key: 'postcode',
      label: 'Home Postcode',
      approvedLabel: 'Verified',
      providedLabel: 'Provided',
      provided: Boolean(kyc?.profile?.postcode)
    },
    {
      key: 'phone',
      label: 'Phone Number',
      approvedLabel: 'Verified',
      providedLabel: 'Provided',
      provided: Boolean(kyc?.profile?.phone)
    }
  ];

  if (registrationFee.amountNgn > 0) {
    accreditationItems.push({
      key: 'registration_fee',
      label: 'Registration Fee',
      approvedLabel: 'Paid',
      pendingLabel: 'Pending',
      provided: false,
      paid: registrationFee.paid
    });
  }

  const handleClaimJob = async (job) => {
    setClaimingId(job.id);
    try {
      const res = await apiFetch(`/api/v1/riders/jobs/${job.id}/accept`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to claim this job');
      setRadarJobs(prev => prev.filter(j => j.id !== job.id));
      if (showToast) showToast(`Claimed job ${job.trackingCode}. Added to your active route.`);
      const mineRes = await apiFetch('/api/v1/riders/me/jobs');
      if (mineRes.ok) {
        const mineData = await mineRes.json();
        setMyJobs(mineData.jobs || []);
      }
    } catch (err) {
      if (showToast) showToast(err.message);
    } finally {
      setClaimingId(null);
    }
  };

  const saveProfile = async (e) => {
    e?.preventDefault();
    setSavingProfile(true);
    setKycMessage(null);
    try {
      if (!/^\d{11}$/.test(kycForm.nin.trim())) throw new Error('Enter your 11-digit NIN.');
      if (!kycForm.driversLicenseNo.trim()) throw new Error("Enter your driver's licence number.");
      if (!kycForm.plateNumber.trim()) throw new Error('Enter your vehicle license plate.');
      if (!kycForm.postcode.trim()) throw new Error('Enter your home postcode.');
      if (!kycForm.phone.trim()) throw new Error('Enter your phone number.');

      const res = await apiFetch('/api/v1/riders/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nin: kycForm.nin,
          driversLicenseNo: kycForm.driversLicenseNo,
          vehicleType: kycForm.vehicleType,
          plateNumber: kycForm.plateNumber,
          postcode: kycForm.postcode,
          phone: kycForm.phone,
          operationalPostcodes: kycForm.operationalPostcodes
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save your details.');
      setKycMessage({ type: 'success', text: 'Your regulatory details have been saved.' });
      if (showToast) showToast('Rider details saved.');
      await loadVerification();
    } catch (err) {
      setKycMessage({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const payRegistrationFee = async () => {
    setPayingFee(true);
    setKycMessage(null);
    try {
      await ensureWalletFunds({
        requiredAmount: registrationFee.amountNgn,
        email: rider?.email,
        balance: walletBalance,
        onBalanceRefreshed: async () => {
          const meRes = await apiFetch('/api/v1/riders/me');
          if (meRes.ok) setMe(await meRes.json());
        }
      });
      const res = await apiFetch('/api/v1/riders/registration-fee/pay', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not pay the rider registration fee.');
      setRegistrationFee({ amountNgn: registrationFee.amountNgn, paid: true });
      setKycMessage({ type: 'success', text: 'Registration fee paid. Operations can now clear you for dispatch.' });
      if (showToast) showToast('Rider registration fee paid.');
      await loadVerification();
    } catch (err) {
      setKycMessage({ type: 'error', text: err.message });
    } finally {
      setPayingFee(false);
    }
  };

  const submitDocument = async (documentType, file) => {
    setUploadingDoc(documentType);
    setKycMessage(null);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read that file.'));
        reader.readAsDataURL(file);
      });
      const documentNumber = documentType === 'NIN'
        ? kycForm.nin.trim()
        : documentType === 'DRIVERS_LICENSE'
          ? kycForm.driversLicenseNo.trim()
          : documentType === 'VEHICLE_ROADWORTHINESS'
            ? kycForm.plateNumber.trim()
            : undefined;
      const res = await apiFetch('/api/v1/riders/verification/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType, documentNumber, documentUrl: dataUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit that document.');
      if (showToast) showToast(`${documentType.replace(/_/g, ' ')} submitted for review.`);
      await loadVerification();
    } catch (err) {
      setKycMessage({ type: 'error', text: err.message });
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleWithdrawal = (e) => {
    e.preventDefault();
    setPayoutLoading(true);
    setTimeout(() => {
      setPayoutLoading(false);
      setIsPayoutModalOpen(false);
      if (showToast) showToast('Withdrawal request of \u20a6' + Number(payoutAmount).toLocaleString() + ' submitted for processing!');
    }, 900);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
          <Bike className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-slate-900">No rider profile linked to this account</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          This console belongs to a Dispatch Rider account. Register a rider account to apply for verification.
        </p>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Rider Header Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              {rider?.is_available ? 'Available for Dispatch' : 'Offline'}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black mt-1.5">{rider ? `${rider.name}${rider.plate_number ? ` (Plate: ${rider.plate_number})` : ''}` : 'Rider Console'}</h1>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <Navigation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{rider?.operational_postcodes?.length ? rider.operational_postcodes.join(' ↔ ') : 'Corridor assignment pending'}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="bg-slate-800 p-2.5 sm:p-3 rounded-xl border border-slate-700 text-left sm:text-right min-w-[110px]" title="Average customer rating">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold">Rating</div>
            <div className="text-base sm:text-lg font-black text-amber-400">⭐ {rider?.rating ? Number(rider.rating).toFixed(2) + ' / 5' : 'New'}</div>
          </div>
          <div className="bg-slate-800 p-2.5 sm:p-3 rounded-xl border border-slate-700 text-left sm:text-right min-w-[110px]" title="Completed deliveries">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold">Total Drops</div>
            <div className="text-base sm:text-lg font-black text-emerald-400">{rider?.total_deliveries ?? 0} Done</div>
          </div>
        </div>
      </div>

      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Rider verification pending
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your account has been created, but Hotbox cannot grant dispatch access until your
            regulatory verification is approved. Operations reviews every rider before the first
            delivery, and you will be notified by email once your account is cleared.
          </p>
          <p className="text-[11px] text-amber-700">
            Current status: <span className="font-bold uppercase">{riderStatus}</span>
          </p>
        </div>
      )}

      {/* TAB 1: JOB RADAR */}
      {isVerified && activeNav === 'radar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Corridor Dispatch Radar</h3>
              <p className="text-xs text-slate-500">Live on-demand pickup and transfer jobs available in your corridor</p>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold w-fit">
              {availableJobs.length} Jobs Available
            </span>
          </div>

          <div className="space-y-3">
            {availableJobs.map(job => (
              <div key={job.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-900">{job.trackingCode}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {job.serviceType}
                    </span>
                    {job.size && <span className="text-xs text-slate-500">• {job.size}{job.weight ? ` • ${job.weight}` : ''}</span>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Pickup Point</span>
                      <span className="font-semibold text-slate-800">{job.pickupAddress}</span>
                      <span className="font-mono text-[10px] text-blue-600 block">{job.pickupPostcode}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Destination</span>
                      <span className="font-semibold text-slate-800">{job.dropoffAddress}</span>
                      <span className="font-mono text-[10px] text-emerald-600 block">{job.dropoffPostcode}</span>
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Rider Payout</div>
                    <div className="text-lg font-black text-slate-900">₦{job.payout.toLocaleString()}</div>
                  </div>
                  <button
                    onClick={() => handleClaimJob(job)}
                    disabled={claimingId === job.id}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {claimingId === job.id ? 'Claiming...' : 'Claim Job'}
                  </button>
                </div>
              </div>
            ))}

            {availableJobs.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No unclaimed jobs right now in your active corridor. New jobs will appear automatically on the radar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unverified riders land on Job Radar by default. The radar is empty
         until clearance is granted, so surface the application instead. */}
      {!isVerified && activeNav === 'radar' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Apply for rider verification</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Submit your NIN, driver's licence, home postcode and phone, then upload the supporting
            documents. Operations reviews every application before dispatch access is granted.
          </p>
          <button
            type="button"
            onClick={() => setActiveNav('profile')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            Start verification application
          </button>
        </div>
      )}

      {/* TAB 2: ACTIVE ROUTE */}
      {!isVerified && activeNav === 'active_route' && renderLockedTool('Active Deliveries')}

      {isVerified && activeNav === 'active_route' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Current Trip Manifest & Sequence</h3>
              <p className="text-xs text-slate-500">Ordered pickup and handover stops for your active run</p>
            </div>
            <button
              onClick={() => setActiveNav('scanner')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Open Scanner</span>
            </button>
          </div>

          <div className="space-y-4">
            {activeRouteStops.map(stop => (
              <div
                key={stop.stopNumber}
                className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                  stop.status === 'COMPLETED'
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : stop.status === 'IN_PROGRESS'
                    ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    stop.status === 'COMPLETED'
                      ? 'bg-emerald-600 text-white'
                      : stop.status === 'IN_PROGRESS'
                      ? 'bg-blue-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {stop.status === 'COMPLETED' ? <Check className="w-4 h-4" /> : stop.stopNumber}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{stop.title}</span>
                      <span className="font-mono text-[10px] text-slate-500">({stop.trackingCode})</span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                        stop.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : stop.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {stop.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">{stop.address}</div>
                    <div className="text-[11px] font-mono text-slate-400">{stop.postcode} • Contact: {stop.contact}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      if (showToast) showToast(`Calling ${stop.contact}`);
                    }}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600"
                    title="Call Contact"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>

                  {stop.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => setActiveNav('scanner')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Complete Handover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {activeRouteStops.length === 0 && (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs">
              No active run right now. Claim a job from the radar to start a route.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTODY SCANNER */}
      {!isVerified && activeNav === 'scanner' && renderLockedTool('Custody Scanner')}

      {isVerified && activeNav === 'scanner' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-blue-700" />
              <span><strong>Custody Handover:</strong> Scan sender package at pickup or confirm recipient OTP for doorstep delivery proof.</span>
            </div>
            <span className="font-bold text-[11px] bg-blue-200 px-2 py-0.5 rounded text-blue-900">
              GPS Geolocation Active
            </span>
          </div>

          <CustodyScanner
            activeRole="rider"
            hubs={hubs}
            onCustodySuccess={() => {
              if (showToast) showToast('Rider custody transfer committed to immutable ledger!');
            }}
          />
        </div>
      )}

      {/* TAB 4: POSTCODE & DIGITAL P.O. BOX LOOKUP */}
      {!isVerified && activeNav === 'lookup' && renderLockedTool('Postcode Lookup')}

      {isVerified && activeNav === 'lookup' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Postcode & Digital P.O. Box Lookup</h3>
              <p className="text-xs text-slate-500">Resolve any postcode or digital P.O. Box number to a delivery or rerouting address</p>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold w-fit">
              Address Resolution Tool
            </span>
          </div>

          <RiderLookup showToast={showToast} />
        </div>
      )}

      {/* TAB 5: DELIVERY TRIP HISTORY */}
      {!isVerified && activeNav === 'history' && renderLockedTool('Trip History')}

      {isVerified && activeNav === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Completed Delivery Trips Archive</h3>
            <span className="text-xs text-slate-500 font-semibold">{rider?.total_deliveries ?? completedJobs.length} Lifetime Runs Completed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Tracking Code</th>
                  <th className="py-2.5 px-3">Route Corridor</th>
                  <th className="py-2.5 px-3">Service Type</th>
                  <th className="py-2.5 px-3">Earned Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedJobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No completed delivery trips yet.</td>
                  </tr>
                )}
                {completedJobs.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 text-slate-500">{formatDateTime(row.time)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{row.code}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{row.corridor}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {row.service}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">₦{row.pay.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: EARNINGS & WALLET */}
      {!isVerified && activeNav === 'earnings' && renderLockedTool('Earnings & Wallet')}

      {isVerified && activeNav === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold">Available for Instant Payout</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{formatMoney(walletBalance)}</div>
              <button
                onClick={() => setIsPayoutModalOpen(true)}
                className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Request Withdrawal
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold">Pending Delivery Escrow</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{formatMoney(pendingEscrow)}</div>
              <div className="text-[11px] text-slate-500 mt-3">Releases upon recipient OTP confirmation</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-semibold">Completed Drops</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{rider?.total_deliveries ?? 0}</div>
              <div className="text-[11px] text-slate-500 mt-3">Verified deliveries completed on the platform</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: RIDER CREDENTIALS */}
      {activeNav === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rider Credentials & Track B Accreditation</h3>
              <p className="text-xs text-slate-500">Government driver ID, vehicle documentation, and operational clearance</p>
            </div>
            <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${isVerified ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
              {isVerified ? 'Clearance Active' : riderStatus === 'suspended' ? 'Clearance Suspended' : 'Clearance Pending'}
            </span>
          </div>

          {kycMessage && (
            <div className={`text-xs rounded-xl px-3 py-2 border ${kycMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              {kycMessage.text}
            </div>
          )}

          {registrationFee.amountNgn > 0 && !registrationFee.paid && (
            <div className="flex items-center justify-between gap-3 flex-wrap border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-900">
                  Rider registration fee: {formatMoney(registrationFee.amountNgn)}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Payable from your Hotbox wallet. Operations cannot clear you for dispatch until this is settled.
                </p>
              </div>
              <button
                type="button"
                onClick={payRegistrationFee}
                disabled={payingFee}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {payingFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                {payingFee ? 'Processing...' : walletBalance >= registrationFee.amountNgn ? 'Pay from wallet' : 'Fund & pay'}
              </button>
            </div>
          )}

          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    disabled
                    defaultValue={rider?.name || '\u2014'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number <span className="text-rose-500">*</span></label>
                  <PhoneInput
                    value={kycForm.phone}
                    onChange={(value) => setKycForm((prev) => ({ ...prev, phone: value }))}
                    placeholder="08108525262"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NIN <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={kycForm.nin}
                    onChange={(e) => setKycForm((prev) => ({ ...prev, nin: e.target.value }))}
                    placeholder="11-digit national identity number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Driver's Licence Number <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={kycForm.driversLicenseNo}
                    onChange={(e) => setKycForm((prev) => ({ ...prev, driversLicenseNo: e.target.value }))}
                    placeholder="FRSC licence number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle Type</label>
                  <select
                    value={kycForm.vehicleType}
                    onChange={(e) => setKycForm((prev) => ({ ...prev, vehicleType: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="motorcycle">Motorcycle</option>
                    <option value="van">Van</option>
                    <option value="bicycle">Cargo bicycle</option>
                    <option value="truck">Truck</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle License Plate <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={kycForm.plateNumber}
                    onChange={(e) => setKycForm((prev) => ({ ...prev, plateNumber: e.target.value }))}
                    placeholder="ABJ-452-XY"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono font-bold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Home Postcode <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={kycForm.postcode}
                    onChange={(e) => setKycForm((prev) => ({ ...prev, postcode: e.target.value }))}
                    placeholder="FC-01-A03-FK-01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Operational Postcodes</label>
                  <input
                    type="text"
                    value={kycForm.operationalPostcodes}
                    onChange={(e) => setKycForm((prev) => ({ ...prev, operationalPostcodes: e.target.value }))}
                    placeholder="FC-01-A03-FK-01, FC-01-A02-FK-02"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Separate each corridor postcode with a comma.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-slate-500">Saved to your Track B regulatory record and reviewed by Operations.</p>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {savingProfile ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900">Accreditation Checklist</h4>
              {isVerified
                ? clearanceBadge('approved', 'Cleared for dispatch')
                : clearanceBadge('review', 'Operations review required')}
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1 text-xs">
              {accreditationItems.map((item) => (
                <div key={item.key} className="py-1.5 flex justify-between items-center gap-2">
                  <span className="min-w-0">{item.label}</span>
                  {clearanceFor(item)}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              "Provided" means the details are saved to your record. Operations must still review and approve them before dispatch clearance.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Identity Documents</h4>
              <p className="text-[11px] text-slate-500">Upload a clear JPEG, PNG, WebP or PDF (maximum 2 MB). Operations reviews each document before clearance.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TRACK_B_DOCUMENTS.map((doc) => (
                <label
                  key={doc.type}
                  className="flex items-center justify-between gap-3 border border-dashed border-slate-300 rounded-xl px-3 py-2.5 hover:border-blue-400 hover:bg-blue-50/40 transition cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 truncate">{doc.label}</span>
                    <span className="block text-[10px] text-slate-400 truncate">{doc.hint}</span>
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    disabled={uploadingDoc === doc.type}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) submitDocument(doc.type, file);
                      e.target.value = '';
                    }}
                  />
                  <span className="shrink-0 text-[10px] font-bold text-blue-700">
                    {uploadingDoc === doc.type ? 'Uploading...' : 'Upload'}
                  </span>
                </label>
              ))}
            </div>

            {kyc?.records?.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {kyc.records.map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs bg-white">
                    <span className="font-semibold text-slate-700">{record.document_type?.replace(/_/g, ' ')}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${record.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : record.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <h3 className="text-base font-bold text-slate-900">Courier Pay Withdrawal Request</h3>
            <p className="text-xs text-slate-500">
              Withdrawal requests are reviewed and paid to your verified bank account via NIP.
            </p>

            <form onSubmit={handleWithdrawal} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Destination Bank Account</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800">Verified Bank Account</div>
                  <div className="font-mono text-slate-500">Paid via NIP to your registered account</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount to Transfer (₦)</label>
                <input
                  type="number"
                  max={walletBalance}
                  min="1000"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Maximum available: {formatMoney(walletBalance)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payoutLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {payoutLoading ? 'Processing...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
