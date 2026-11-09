import { apiFetch } from '../../lib/api';
import { useState } from 'react';
import {
  BadgeCheck, Calendar, CheckCircle2, Mail, MapPin, Phone, RefreshCw,
  Save, Shield, ShieldCheck, Sparkles, User, Wallet
} from 'lucide-react';
import VerifyContactModal from './VerifyContactModal';

export default function ProfileTab({
  settings, currentUser, profile, setProfile, showToast, getAuthHeaders,
  fetchCustomerData, claims, shipments, wallet, savedAddresses, savedHubs, hubs
}) {
  const {
    profileForm, setProfileForm, postcodeDetails, isResolvingPostcode,
    isSavingProfile, geoLoading, testRerouteLoading, testRerouteResult,
    handlePostcodeChange, handleSelectQuickRelocation, handleSaveProfile,
    handleToggleNotification, handleTestRerouteAlert, handleToggleLocationPrivacy
  } = settings;

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

  const handleRequestOtp = async (type) => {
    try {
      setVerifyModal(prev => ({ ...prev, isLoading: true }));
      const res = await apiFetch('/api/v1/customer/request-otp', {
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
      const res = await apiFetch('/api/v1/customer/verify-contact', {
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
      const res = await apiFetch('/api/v1/customer/reset-verification', {
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

  return (
    <>
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
      <VerifyContactModal
        verifyModal={verifyModal}
        setVerifyModal={setVerifyModal}
        verifyOtp={verifyOtp}
        setVerifyOtp={setVerifyOtp}
        isVerifying={isVerifying}
        handleRequestOtp={handleRequestOtp}
        handleConfirmVerify={handleConfirmVerify}
      />
    </>
  );
}
