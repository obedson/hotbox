import React, { useState } from 'react';
import {
  UserPlus, Package, MapPin, Bike, Building2, CheckCircle2,
  AlertCircle, ChevronDown, Lock, Phone, User, Mail, X
} from 'lucide-react';

const ROLES = [
  {
    id: 'customer',
    title: 'Individual Customer',
    subtitle: 'Send, track & collect parcels',
    icon: Package,
    color: 'emerald'
  },
  {
    id: 'hub_owner',
    title: 'Hub Host Partner',
    subtitle: 'Monetize commercial space & bays',
    icon: MapPin,
    color: 'emerald'
  },
  {
    id: 'rider',
    title: 'Dispatch Rider',
    subtitle: 'Doorstep & hub parcel deliveries',
    icon: Bike,
    color: 'indigo'
  },
  {
    id: 'enterprise_shipper',
    title: 'Enterprise Shipper',
    subtitle: 'B2B bulk shipping & automated APIs',
    icon: Building2,
    color: 'cyan'
  }
];

export default function RegisterModal({ isOpen, onClose, onRegisterSuccess, onSwitchToLogin }) {
  const [role, setRole] = useState('customer');

  // Base Credentials
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+234');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Role-Specific Fields
  const [businessName, setBusinessName] = useState('');
  const [postcode, setPostcode] = useState('FC-01-A03-FK-01');
  const [neighbourhood, setNeighbourhood] = useState('Wuse 2, Abuja');
  const [capacity, setCapacity] = useState('50');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [plateNumber, setPlateNumber] = useState('');
  const [cacNumber, setCacNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim() || !phone.trim() || phone.length < 11) {
      setError('Please provide your full legal name and a valid Nigerian phone number.');
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password,
        role,
        businessName: businessName.trim() || undefined,
        postcode: postcode.trim() || undefined,
        neighbourhood: neighbourhood.trim() || undefined,
        capacity: capacity ? parseInt(capacity) : undefined,
        vehicleType: vehicleType || undefined,
        plateNumber: plateNumber.trim() || undefined,
        cacNumber: cacNumber.trim() || undefined
      };

      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      localStorage.setItem('dropboxz_token', data.token);
      localStorage.setItem('dropboxz_user', JSON.stringify(data.user));

      onRegisterSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleMeta = ROLES.find(r => r.id === role) || ROLES[0];
  const Icon = selectedRoleMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Create Hotbox Account</h2>
              <p className="text-xs text-slate-400">National Digital P.O. Box & Logistics • hotbox.com.ng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 🎯 CLEAN ROLE SELECTOR DROPDOWN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              I am registering as:
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 pointer-events-none text-emerald-400">
                <Icon className="w-4 h-4" />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-800/90 border border-emerald-500/40 rounded-xl pl-9 pr-9 py-2 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer transition"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white py-1">
                    {r.title} — {r.subtitle}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Basic User Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Legal Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aminu Abubakar"
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Phone (+234)
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2348012345678"
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aminu@domain.ng"
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC ROLE-SPECIFIC FIELDS */}
          {role === 'hub_owner' && (
            <div className="p-3 bg-slate-850 rounded-xl border border-emerald-900/40 bg-slate-800/40 space-y-2.5 animate-fadeIn">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Hub Outlet Information</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business / Shop Name (e.g. Banex Mart Hub)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  required
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="NIPOST Digital Postcode (e.g. FC-01-A03-FK-01)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={neighbourhood}
                  onChange={(e) => setNeighbourhood(e.target.value)}
                  placeholder="Street / Neighborhood (Wuse 2, Abuja)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Bays Capacity (e.g. 50)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {role === 'rider' && (
            <div className="p-3 bg-slate-850 rounded-xl border border-indigo-900/40 bg-slate-800/40 space-y-2.5 animate-fadeIn">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                <Bike className="w-3.5 h-3.5" />
                <span>Rider Vehicle Credentials</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="motorcycle">Motorcycle</option>
                  <option value="van">Delivery Van</option>
                  <option value="bicycle">Cargo Bicycle</option>
                </select>
                <input
                  type="text"
                  required
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="Plate No. (e.g. ABJ-452-XY)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {role === 'enterprise_shipper' && (
            <div className="p-3 bg-slate-850 rounded-xl border border-cyan-900/40 bg-slate-800/40 space-y-2.5 animate-fadeIn">
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Corporate Registration Details</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Company Name (e.g. Konga Ltd)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <input
                  type="text"
                  required
                  value={cacNumber}
                  onChange={(e) => setCacNumber(e.target.value)}
                  placeholder="CAC Reg No. (e.g. RC-998877)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Registering Account...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Create {selectedRoleMeta.title} Account</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Already registered on Hotbox?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-emerald-400 font-bold hover:underline"
            >
              Sign In Instead
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
