import React from 'react';
import { Package, ShieldCheck, MapPin, Wallet, Bell, RefreshCw, UserCheck, LogIn, UserPlus, LogOut, ChevronDown } from 'lucide-react';

export default function Navbar({
  activeRole,
  setActiveRole,
  currentUser,
  walletBalance,
  onRefresh,
  onOpenLogin,
  onOpenRegister,
  onLogout
}) {
  const roles = [
    { id: 'customer', label: 'Customer Portal', icon: Package, badge: 'Booking & Tracking' },
    { id: 'hub_owner', label: 'Hub Host App', icon: MapPin, badge: 'Intake & Bays' },
    { id: 'rider', label: 'Rider Radar', icon: UserCheck, badge: 'Dispatch & Drops' },
    { id: 'operations', label: 'Ops Control Tower', icon: ShieldCheck, badge: 'Nationwide Monitor' },
    { id: 'compliance', label: 'Compliance & KYC', icon: ShieldCheck, badge: '3-Track Review' },
    { id: 'enterprise', label: 'Enterprise Portal', icon: Package, badge: 'B2B & Webhooks' }
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & National Postcode Badge */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-white">HOTBOX</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">hotboxng.com</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Digital P.O. Box Network & Postcode-Powered Logistics
              </p>
            </div>
          </div>

          {/* Role Switcher & Status Controls */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              {roles.map(r => {
                const Icon = r.icon;
                const isActive = activeRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRole(r.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile / Tablet Role Select */}
            <div className="lg:hidden">
              <select
                value={activeRole}
                onChange={e => setActiveRole(e.target.value)}
                className="bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Wallet Balance Widget */}
            <div className="hidden sm:flex items-center space-x-2 bg-emerald-950/80 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <div className="text-right">
                <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Wallet</div>
                <div className="text-xs font-bold text-white">
                  ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* User Auth Controls */}
            {currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-white flex items-center space-x-1 justify-end">
                    <span>{currentUser.name}</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    {currentUser.role}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition border border-slate-800 hover:border-rose-900/40"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <button
                  onClick={onOpenLogin}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center space-x-1.5 border border-slate-700"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={onOpenRegister}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}

            {/* Refresh Action */}
            <button
              onClick={onRefresh}
              title="Refresh Data"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
