import { apiFetch } from '../lib/api';
import React, { useMemo, useState } from 'react';
import {
  AlertCircle, Bike, Building2, CheckCircle2, ChevronLeft, Eye, EyeOff,
  Loader2, Lock, LogIn, Mail, MapPin, Package, Phone, ShieldCheck, User,
  UserPlus
} from 'lucide-react';
import PhoneInput from './PhoneInput';

const ACCOUNT_TYPES = [
  {
    id: 'customer',
    title: 'Individual',
    subtitle: 'Digital P.O. Box & parcel delivery',
    icon: Package,
    fields: []
  },
  {
    id: 'hub_owner',
    title: 'Hub Partner',
    subtitle: 'Host a accredited pickup location',
    icon: MapPin,
    fields: ['businessName', 'postcode', 'neighbourhood', 'capacity']
  },
  {
    id: 'rider',
    title: 'Dispatch Rider',
    subtitle: 'Deliver parcels in your city',
    icon: Bike,
    fields: ['vehicleType', 'plateNumber', 'nin', 'driversLicenseNo', 'homePostcode']
  },
  {
    id: 'enterprise_shipper',
    title: 'Enterprise',
    subtitle: 'Bulk shipping for a business',
    icon: Building2,
    fields: ['businessName', 'cacNumber']
  }
];

const inputClass =
  'w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition';
const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5';

function passwordStrength(password) {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  return { score, label: labels[score] };
}

function Field({ label, icon: Icon, error, children, optional }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />}
        {children}
      </div>
      {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

export default function AuthScreen({ initialView = 'signin', resetToken = '', onAuthenticated }) {
  const [view, setView] = useState(initialView);

  // shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // sign in
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // create account
  const [accountType, setAccountType] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // partner / rider / enterprise extras
  const [businessName, setBusinessName] = useState('');
  const [cacNumber, setCacNumber] = useState('');
  const [postcode, setPostcode] = useState('FC-01-A03-FK-01');
  const [neighbourhood, setNeighbourhood] = useState('Wuse 2, Abuja');
  const [capacity, setCapacity] = useState('50');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [plateNumber, setPlateNumber] = useState('');
  const [nin, setNin] = useState('');
  const [driversLicenseNo, setDriversLicenseNo] = useState('');

  // recovery
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');

  const strength = useMemo(() => passwordStrength(password), [password]);
  const selectedType = ACCOUNT_TYPES.find((t) => t.id === accountType) || ACCOUNT_TYPES[0];

  const switchView = (next) => {
    setView(next);
    setError(null);
    setSuccess(null);
    setFormErrors({});
  };

  const persistSession = (user, token) => {
    localStorage.setItem('hotbox_token', token);
    localStorage.setItem('hotbox_user', JSON.stringify(user));
    onAuthenticated(user, token);
  };

  const handleSignIn = async (e) => {
    e?.preventDefault();
    setError(null);

    const nextErrors = {};
    if (!identifier.trim()) nextErrors.identifier = 'Enter your phone number or email address.';
    if (!password) nextErrors.password = 'Enter your password.';
    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to sign in.');
      persistSession(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setError(null);

    const nextErrors = {};
    if (name.trim().length < 2) nextErrors.name = 'Enter your full legal name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    const phoneDigits = String(phone || '').replace(/\D/g, '');
    if (phoneDigits.length < 10) nextErrors.phone = 'Enter a valid phone number.';
    if (password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';
    if (accountType === 'enterprise_shipper' && businessName.trim().length < 2) {
      nextErrors.businessName = 'Enter your company name.';
    }
    if (accountType === 'rider' && plateNumber.trim().length < 3) {
      nextErrors.plateNumber = 'Enter your vehicle plate number.';
    }
    if (accountType === 'rider') {
      if (!/^\d{11}$/.test(nin.trim())) nextErrors.nin = 'Enter your 11-digit NIN.';
      if (!driversLicenseNo.trim()) nextErrors.driversLicenseNo = "Enter your driver's licence number.";
      if (!postcode.trim()) nextErrors.postcode = 'Enter the postcode where you operate.';
    }
    if (!agree) nextErrors.agree = 'Please accept the terms to continue.';

    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone,
        password,
        role: accountType
      };
      if (businessName.trim()) payload.businessName = businessName.trim();
      if (cacNumber.trim()) payload.cacNumber = cacNumber.trim();
      if (postcode.trim()) payload.postcode = postcode.trim();
      if (neighbourhood.trim()) payload.neighbourhood = neighbourhood.trim();
      if (capacity) payload.capacity = parseInt(capacity, 10);
      if (vehicleType) payload.vehicleType = vehicleType;
      if (plateNumber.trim()) payload.plateNumber = plateNumber.trim();
      if (nin.trim()) payload.nin = nin.trim();
      if (driversLicenseNo.trim()) payload.driversLicenseNo = driversLicenseNo.trim();

      const res = await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to create your account.');
      persistSession(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail.trim())) {
      setFormErrors({ recoveryEmail: 'Enter a valid email address.' });
      return;
    }
    setFormErrors({});
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to send the reset link.');
      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e?.preventDefault();
    setError(null);
    const nextErrors = {};
    if (resetPassword.length < 8) nextErrors.resetPassword = 'Use at least 8 characters.';
    if (resetConfirm !== resetPassword) nextErrors.resetConfirm = 'Passwords do not match.';
    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      return;
    }
    setFormErrors({});
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: resetPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to update your password.');
      setSuccess(data.message);
      setTimeout(() => switchView('signin'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const brandPanel = (
    <aside className="hidden lg:flex lg:w-[44%] xl:w-[42%] bg-[#062419] text-white flex-col justify-between p-10 xl:p-14">
      <div>
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
            <Package className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight leading-none">Hotbox</div>
            <div className="text-[11px] text-emerald-300/80 mt-1">Nigeria Digital P.O. Box & Logistics</div>
          </div>
        </div>

        <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight mt-14">
          One address for your mail, your parcels and your proof of address.
        </h1>
        <p className="text-sm text-emerald-100/70 leading-relaxed mt-4 max-w-md">
          A NIPOST Ground-Truth verified digital anchor that never changes — even when you relocate.
        </p>

        <ul className="mt-10 space-y-4">
          {[
            { icon: Package, text: 'Digital P.O. Box issued instantly' },
            { icon: ShieldCheck, text: 'Bank-grade proof of address certificate' },
            { icon: MapPin, text: 'Dynamic rerouting when you move' },
            { icon: Bike, text: 'Dispatch riders deliver to your anchor' }
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center space-x-3 text-sm text-emerald-50/90">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-emerald-400" />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px] text-emerald-100/50">
        Trusted by hub partners, riders and enterprises across Nigeria.
      </p>
    </aside>
  );

  const alert = error && (
    <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-700 text-xs">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );

  const banner = success && (
    <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2 text-emerald-700 text-xs">
      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{success}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {brandPanel}

      <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center space-x-3 mb-7">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900 tracking-tight leading-none">Hotbox</div>
              <div className="text-[10px] text-slate-500 mt-1">Nigeria Digital P.O. Box & Logistics</div>
            </div>
          </div>

          {view === 'signin' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-7">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-xs text-slate-500 mt-1 mb-6">Sign in to your Hotbox account.</p>

              {alert}

              <form onSubmit={handleSignIn} className="space-y-4">
                <Field label="Phone number or email" icon={User} error={formErrors.identifier}>
                  <input
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="+2348108525262, 08108525262 or you@email.com"
                    className={inputClass}
                  />
                </Field>

                <Field label="Password" icon={Lock} error={formErrors.password}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </Field>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>{loading ? 'Signing in...' : 'Sign in'}</span>
                </button>
              </form>

              <p className="text-xs text-slate-500 text-center mt-5">
                New to Hotbox?{' '}
                <button
                  type="button"
                  onClick={() => switchView('register')}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  Create an account
                </button>
              </p>
            </div>
          )}

          {view === 'register' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-7">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
              <p className="text-xs text-slate-500 mt-1 mb-5">Choose the account that fits how you'll use Hotbox.</p>

              {alert}

              <div className="grid grid-cols-2 gap-2 mb-5">
                {ACCOUNT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isActive = accountType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setAccountType(type.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div className={`text-xs font-bold mt-2 ${isActive ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {type.title}
                      </div>
                      <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{type.subtitle}</div>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <Field label="Full name" icon={User} error={formErrors.name}>
                  <input
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tunde Fashola"
                    className={inputClass}
                  />
                </Field>

                <Field label="Email address" icon={Mail} error={formErrors.email}>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className={inputClass}
                  />
                </Field>

                <Field label="Phone number" icon={Phone} error={formErrors.phone}>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    placeholder="08108525262"
                    required
                  />
                </Field>

                {selectedType.fields.includes('businessName') && (
                  <Field
                    label={accountType === 'enterprise_shipper' ? 'Company name' : 'Business name'}
                    icon={Building2}
                    error={formErrors.businessName}
                  >
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder={accountType === 'enterprise_shipper' ? 'e.g. Konga Ltd' : "e.g. Tunde's Store"}
                      className={inputClass}
                    />
                  </Field>
                )}

                {selectedType.fields.includes('cacNumber') && (
                  <Field label="CAC registration number" icon={Building2} optional error={formErrors.cacNumber}>
                    <input
                      type="text"
                      value={cacNumber}
                      onChange={(e) => setCacNumber(e.target.value)}
                      placeholder="e.g. RC-998877"
                      className={inputClass}
                    />
                  </Field>
                )}

                {selectedType.fields.includes('postcode') && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Postcode" icon={MapPin} error={formErrors.postcode}>
                      <input
                        type="text"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Neighbourhood" icon={MapPin} error={formErrors.neighbourhood}>
                      <input
                        type="text"
                        value={neighbourhood}
                        onChange={(e) => setNeighbourhood(e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}

                {selectedType.fields.includes('capacity') && (
                  <Field label="Storage capacity (bays)" icon={Package} error={formErrors.capacity}>
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}

                {selectedType.fields.includes('vehicleType') && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Vehicle" icon={Bike} error={formErrors.vehicleType}>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className={`${inputClass} pl-3`}
                      >
                        <option value="motorcycle">Motorcycle</option>
                        <option value="van">Van</option>
                        <option value="bicycle">Cargo bicycle</option>
                        <option value="truck">Truck</option>
                      </select>
                    </Field>
                    <Field label="Plate number" icon={Bike} error={formErrors.plateNumber}>
                      <input
                        type="text"
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value)}
                        placeholder="ABJ-452-XY"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}

                {selectedType.fields.includes('nin') && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="NIN" icon={User} error={formErrors.nin}>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        value={nin}
                        onChange={(e) => setNin(e.target.value)}
                        placeholder="11-digit NIN"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Driver's licence no." icon={ShieldCheck} error={formErrors.driversLicenseNo}>
                      <input
                        type="text"
                        value={driversLicenseNo}
                        onChange={(e) => setDriversLicenseNo(e.target.value)}
                        placeholder="e.g. ABJ123456789"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}

                {selectedType.fields.includes('homePostcode') && (
                  <Field label="Home postcode" icon={MapPin} error={formErrors.postcode}>
                    <input
                      type="text"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="Postcode where you are based"
                      className={inputClass}
                    />
                  </Field>
                )}

                <Field label="Password" icon={Lock} error={formErrors.password}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </Field>

                {password && (
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          strength.score <= 2 ? 'bg-rose-500' : strength.score <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 w-16 text-right">
                      {strength.label}
                    </span>
                  </div>
                )}

                <Field label="Confirm password" icon={Lock} error={formErrors.confirmPassword}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </Field>

                <div>
                  <label className="flex items-start space-x-2 text-[11px] text-slate-600 leading-snug cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      I agree to the Hotbox Terms of Service and confirm the address
                      details I provided are accurate.
                    </span>
                  </label>
                  {formErrors.agree && <p className="mt-1 text-[11px] text-rose-600">{formErrors.agree}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{loading ? 'Creating account...' : `Create ${selectedType.title} account`}</span>
                </button>
              </form>

              <p className="text-xs text-slate-500 text-center mt-5">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('signin')}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {view === 'forgot' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-7">
              <button
                type="button"
                onClick={() => switchView('signin')}
                className="flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-4"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </button>

              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Reset your password</h2>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                Enter the email on your account and we'll send you a reset link.
              </p>

              {alert}
              {banner}

              {!success && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <Field label="Email address" icon={Mail} error={formErrors.recoveryEmail}>
                    <input
                      type="email"
                      autoComplete="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="you@email.com"
                      className={inputClass}
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    <span>{loading ? 'Sending...' : 'Send reset link'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {view === 'reset' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-7">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Choose a new password</h2>
              <p className="text-xs text-slate-500 mt-1 mb-6">Your reset link is valid for 30 minutes.</p>

              {alert}
              {banner}

              <form onSubmit={handleReset} className="space-y-4">
                <Field label="New password" icon={Lock} error={formErrors.resetPassword}>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </Field>

                <Field label="Confirm new password" icon={Lock} error={formErrors.resetConfirm}>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((v) => !v)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </Field>

                <button
                  type="submit"
                  disabled={loading || !resetToken}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{loading ? 'Updating...' : 'Update password'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
