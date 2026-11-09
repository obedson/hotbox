import { apiFetch } from '../lib/api';
import React, { useState } from 'react';
import {
  LogIn, Phone, Lock, Eye, EyeOff, UserCheck, AlertCircle,
  ChevronDown, X, Package, MapPin, Bike, ShieldCheck, Building2, User
} from 'lucide-react';

const DEMO_PROFILES = [
  {
    role: 'customer',
    title: 'Individual Customer',
    name: 'Tariq Bello',
    phone: '+2348012345678',
    password: 'Password123!',
    icon: Package
  },
  {
    role: 'hub_owner',
    title: 'Hub Host Partner',
    name: 'Mallam Ibrahim',
    phone: '+2348031112223',
    password: 'Password123!',
    icon: MapPin
  },
  {
    role: 'rider',
    title: 'Dispatch Rider',
    name: 'Emeka Nnamdi',
    phone: '+2348051122334',
    password: 'Password123!',
    icon: Bike
  },
  {
    role: 'ops_admin',
    title: 'Operations Admin',
    name: 'Kolawole Adeleke',
    phone: '+2348061122335',
    password: 'Password123!',
    icon: ShieldCheck
  },
  {
    role: 'compliance_officer',
    title: 'Compliance Officer',
    name: 'Zainab Aliyu',
    phone: '+2348079988776',
    password: 'Password123!',
    icon: ShieldCheck
  },
  {
    role: 'enterprise_shipper',
    title: 'Enterprise Shipper',
    name: 'Konga Express Operations',
    phone: '+2348098877665',
    password: 'Password123!',
    icon: Building2
  }
];

export default function LoginModal({ isOpen, onClose, onLoginSuccess, onSwitchToRegister }) {
  const [selectedRole, setSelectedRole] = useState('customer');
  const [identifier, setIdentifier] = useState('+2348012345678');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleRoleChange = (e) => {
    const roleId = e.target.value;
    setSelectedRole(roleId);
    const profile = DEMO_PROFILES.find(p => p.role === roleId);
    if (profile) {
      setIdentifier(profile.phone);
      setPassword(profile.password);
    }
    setError(null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check credentials.');
      }

      localStorage.setItem('dropboxz_token', data.token);
      localStorage.setItem('dropboxz_user', JSON.stringify(data.user));

      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentProfile = DEMO_PROFILES.find(p => p.role === selectedRole) || DEMO_PROFILES[0];
  const Icon = currentProfile.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <LogIn className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Sign In to Hotbox</h2>
              <p className="text-xs text-slate-400">Digital P.O. Box & Logistics • hotbox.com.ng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 🎯 CLEAN ROLE SELECTOR DROPDOWN */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Account Role:
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">1-Click Auto-Fill</span>
            </div>
            <div className="relative">
              <div className="absolute left-3 top-2.5 pointer-events-none text-emerald-400">
                <Icon className="w-4 h-4" />
              </div>
              <select
                value={selectedRole}
                onChange={handleRoleChange}
                className="w-full bg-slate-800/90 border border-emerald-500/40 rounded-xl pl-9 pr-9 py-2 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer transition"
              >
                {DEMO_PROFILES.map((p) => (
                  <option key={p.role} value={p.role} className="bg-slate-900 text-white py-1">
                    {p.title} — {p.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number or Email
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+2348012345678 or name@domain.ng"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In as {currentProfile.title}</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Don't have an account yet?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-emerald-400 font-bold hover:underline"
            >
              Register New Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
