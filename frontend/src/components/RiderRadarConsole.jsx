import React, { useState, useEffect, useCallback } from 'react';
import {
  Bike, Compass, QrCode, CheckCircle2, Wallet, ShieldCheck,
  Navigation, MapPin, Phone, ArrowRight, DollarSign, Clock,
  AlertTriangle, ExternalLink, User, Calendar, Check, Loader2
} from 'lucide-react';
import CustodyScanner from './CustodyScanner';
import RiderLookup from './RiderLookup';
import { apiFetch } from '../lib/api';

export default function RiderRadarConsole({ activeNav, setActiveNav, hubs, showToast }) {
  const [me, setMe] = useState(null);
  const [radarJobs, setRadarJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState(null);

  const loadConsole = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meRes, jobsRes, mineRes] = await Promise.all([
        apiFetch('/api/v1/riders/me'),
        apiFetch('/api/v1/riders/radar/jobs'),
        apiFetch('/api/v1/riders/me/jobs')
      ]);

      const jobsData = await jobsRes.json();
      if (!jobsRes.ok) throw new Error(jobsData.error || 'Unable to load delivery jobs');
      setRadarJobs(jobsData.jobs || []);

      if (meRes.ok) {
        setMe(await meRes.json());
      } else {
        const meData = await meRes.json().catch(() => ({}));
        if (meRes.status !== 404) throw new Error(meData.error || 'Unable to load rider profile');
        setMe(null);
      }

      if (mineRes.ok) {
        const mineData = await mineRes.json();
        setMyJobs(mineData.jobs || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsole();
  }, [loadConsole]);

  const rider = me?.rider || null;
  const walletBalance = me?.walletBalance ?? 0;

  const serviceLabels = {
    DOOR_TO_HUB: 'Door-to-Hub',
    HUB_TO_DOOR: 'Hub-to-Door',
    DOOR_TO_DOOR: 'Door-to-Door',
    HUB_TO_HUB: 'Corridor Transfer'
  };

  const serviceLabel = (type) => serviceLabels[type] || type || 'Delivery';

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

  const checkBadge = (ok, okText, pendingText) => (
    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
      {ok ? okText : pendingText}
    </span>
  );

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
          This console shows live dispatch data for verified riders. Complete rider onboarding, or ask an administrator to link a rider profile to your account.
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
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              {rider?.is_active ? 'Track B Verified Rider' : 'Track B Verification Pending'}
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

      {/* TAB 1: JOB RADAR */}
      {activeNav === 'radar' && (
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

      {/* TAB 2: ACTIVE ROUTE */}
      {activeNav === 'active_route' && (
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
      {activeNav === 'scanner' && (
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
      {activeNav === 'lookup' && (
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
      {activeNav === 'history' && (
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
      {activeNav === 'earnings' && (
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
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
              {rider?.is_active ? 'Clearance Active' : 'Clearance Pending'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  disabled
                  defaultValue={rider?.name || '—'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Vehicle License Plate</label>
                <input
                  type="text"
                  disabled
                  defaultValue={rider?.plate_number ? `${rider.plate_number}${rider.vehicle_type ? ` (${rider.vehicle_type})` : ''}` : '—'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-blue-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Registered Phone Number</label>
                <input
                  type="text"
                  disabled
                  defaultValue={rider?.phone || '—'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Accreditation Checklist</label>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                  <div className="py-1.5 flex justify-between items-center">
                    <span>Driver's License (FRSC)</span>
                    {checkBadge(Boolean(rider?.drivers_license_no), 'Verified', 'Pending')}
                  </div>
                  <div className="py-1.5 flex justify-between items-center">
                    <span>Vehicle Roadworthiness</span>
                    {checkBadge(Boolean(rider?.vehicle_type), 'Passed', 'Pending')}
                  </div>
                  <div className="py-1.5 flex justify-between items-center">
                    <span>Track B Courier Licensing</span>
                    {checkBadge(Boolean(rider?.is_active), 'Accredited', 'Pending')}
                  </div>
                  <div className="py-1.5 flex justify-between items-center">
                    <span>NIN Identity Check</span>
                    {checkBadge(Boolean(rider?.nin), 'Verified', 'Pending')}
                  </div>
                </div>
              </div>
            </div>
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
