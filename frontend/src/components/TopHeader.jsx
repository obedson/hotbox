import { apiFetch } from '../lib/api';
import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Bell, ChevronDown, Check, Package, Store,
  Bike, Building2, ShieldCheck, Wallet, LogIn, UserPlus, Clock, CheckCheck, Menu
} from 'lucide-react';

const PORTALS = [
  { id: 'operations', label: 'Operations', icon: ShieldCheck, color: 'bg-amber-500 text-slate-950 font-bold' },
  { id: 'enterprise', label: 'Enterprise B2B', icon: Building2, color: 'bg-indigo-600 text-white font-semibold' },
  { id: 'customer', label: 'Customer Portal', icon: Package, color: 'bg-emerald-600 text-white font-semibold' },
  { id: 'hub_owner', label: 'Hub Station', icon: Store, color: 'bg-teal-600 text-white font-semibold' },
  { id: 'rider', label: 'Rider Radar', icon: Bike, color: 'bg-blue-600 text-white font-semibold' }
];

export default function TopHeader({
  activeNav,
  activePortal,
  setActivePortal,
  currentUser,
  walletBalance,
  onOpenLogin,
  onOpenRegister,
  searchQuery,
  setSearchQuery,
  onSearch,
  onToggleMobileSidebar
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('hotbox_token');
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : {}

      const res = await apiFetch('/api/v1/notifications', { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.warn('Notifications fetch error:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('hotbox_token');
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : {}

      await apiFetch('/api/v1/notifications/mark-all-read', { method: 'PUT', headers });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  const currentPortalMeta = PORTALS.find(p => p.id === activePortal) || PORTALS[0];

  const portalBreadcrumbLabels = {
    operations: 'Operations Console',
    enterprise: 'Enterprise Shipper',
    customer: 'Customer Portal',
    hub_owner: 'Hub Station',
    rider: 'Rider Radar'
  };

  const breadcrumbNav = {
    // Operations
    overview: 'Overview',
    shipments: 'Shipment Management',
    riders: 'Fleet & Riders',
    hubs: 'Community Partner Hubs',
    postcodes: 'Service Areas & Coverage',
    exceptions: 'Delivery Issues & Claims',
    verification: 'Partner Verification Desk',
    reports: 'Reports & Analytics',
    audit: 'Immutable Custody Audit Log',
    settings: 'Platform Settings',
    // Enterprise
    dashboard: 'Fulfillment Dashboard',
    kyc_verify: 'KYC Address Verification API',
    address_book: 'Enterprise Address Book',
    api_keys: 'API Credentials',
    webhooks: 'Real-Time Webhooks',
    billing: 'Billing & Invoices',
    // Customer
    book: 'Send a Parcel',
    digital_box: 'Digital P.O. Box & Proof of Address',
    tracking: 'Track Shipments',
    nearby_hubs: 'Nearby Hubs',
    addresses: 'Saved Addresses',
    wallet: 'My Wallet',
    claims: activePortal === 'enterprise' ? 'Claims & Support' : 'Claims & Help',
    profile: 'Profile & Postcode',
    // Hub Station
    hub_overview: 'Hub Station Overview',
    parcel_intake: 'Parcel Intake Scanner',
    collection: 'Customer Collection Desk',
    storage_bays: 'Storage Bay Matrix',
    overdue: 'Overdue Parcels Ledger',
    earnings: 'Earnings & Payouts',
    hub_profile: 'Hub Profile & Settings',
    // Rider Radar
    radar: 'Corridor Job Radar',
    active_route: 'Active Route Manifest',
    scanner: 'Custody Handover Scanner',
    history: 'Delivery Trip History'
  }[activeNav] || 'Overview';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile Menu Toggle + Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition md:hidden cursor-pointer shrink-0"
          title="Open Navigation"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-slate-800" />
        </button>
        <div className="flex items-center space-x-1.5 truncate">
          <span className="font-semibold text-slate-500 hidden sm:inline">{portalBreadcrumbLabels[activePortal] || activePortal}</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="font-bold text-slate-900 truncate">{breadcrumbNav}</span>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden sm:block flex-1 max-w-md mx-3 lg:mx-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery && searchQuery.trim() && onSearch) {
              onSearch(searchQuery.trim());
            }
          }}
          className="relative"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shipment ID (e.g. HBX-900241-4295), hub, rider..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-16 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-2.5 py-1 rounded-lg bg-[#062419] hover:bg-[#0b3827] text-white text-[10px] font-bold transition shadow-2xs cursor-pointer flex items-center space-x-1"
            title="Search Shipment Dossier"
          >
            <span>Track</span>
          </button>
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        {/* Date Display */}
        <span className="text-xs text-slate-500 hidden md:block font-medium">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="Customer & System Notifications"
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center absolute -top-0.5 -right-0.5 ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-fadeIn">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.is_read;
                    const typeColor = {
                      SHIPMENT_UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
                      OTP_ALERT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      KYC_APPROVAL: 'bg-purple-50 text-purple-700 border-purple-200',
                      SYSTEM_NOTICE: 'bg-amber-50 text-amber-700 border-amber-200'
                    }[n.type] || 'bg-slate-50 text-slate-700 border-slate-200';

                    return (
                      <div
                        key={n.id}
                        className={`p-3.5 hover:bg-slate-50/80 transition flex items-start space-x-3 ${
                          isUnread ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-100/60 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                          {n.type === 'SHIPMENT_UPDATE' && <Package className="w-3.5 h-3.5 text-blue-600" />}
                          {n.type === 'KYC_APPROVAL' && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                          {n.type === 'SYSTEM_NOTICE' && <Building2 className="w-3.5 h-3.5 text-amber-600" />}
                          {(!['SHIPMENT_UPDATE', 'KYC_APPROVAL', 'SYSTEM_NOTICE'].includes(n.type)) && (
                            <Bell className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                            <span className="text-[9px] text-slate-400 shrink-0 font-medium flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${typeColor}`}>
                              {n.type.replace(/_/g, ' ')}
                            </span>
                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clean Portal Switcher Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs transition shadow-sm ${currentPortalMeta.color}`}
          >
            <currentPortalMeta.icon className="w-3.5 h-3.5" />
            <span>{currentPortalMeta.label}</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fadeIn">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                Switch Portal Surface
              </div>
              {PORTALS.map((p) => {
                const Icon = p.icon;
                const isSelected = p.id === activePortal;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePortal(p.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span>{p.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Auth CTA if unauthenticated */}
        {!currentUser && (
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <button
              onClick={onOpenLogin}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition flex items-center space-x-1"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={onOpenRegister}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition flex items-center space-x-1 shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
