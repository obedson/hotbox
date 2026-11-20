import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Package, Users, Store, MapPin, AlertTriangle,
  ShieldCheck, BarChart2, FileText, Settings, LogOut, Key, Webhook,
  Receipt, LifeBuoy, Building2, PlusCircle, Navigation, Wallet,
  HelpCircle, User, QrCode, KeyRound, Boxes, Clock, TrendingUp,
  Compass, Bike, CheckCircle2, BookOpen, X, Search, Link2, ClipboardList, UserCog, Crosshair
} from 'lucide-react';

import { allowedOperationsNavForRole } from '../lib/portals';

const PORTAL_CONFIG = {
  operations: {
    title: 'Operations Console',
    tagline: 'Hotbox • Network Ops',
    badgeText: 'Ops Admin',
    brandIcon: ShieldCheck,
    accentColor: 'text-emerald-400',
    brandIconBg: 'bg-emerald-500 text-[#062419]',
    activeNavBg: 'bg-[#0f4430] text-white shadow-sm font-bold',
    hoverNavBg: 'text-slate-300 hover:text-white hover:bg-[#0a3323]',
    iconActiveColor: 'text-emerald-400',
    navGroupAfter: 'overview',
    navItems: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, tooltip: 'Nationwide performance & live network metrics' },
      { id: 'shipments', label: 'Shipments', icon: Package, tooltip: 'Verified nationwide parcel volume ledger' },
      { id: 'riders', label: 'Riders', icon: Users, tooltip: 'Accredited courier fleet & corridor assignments' },
      { id: 'hubs', label: 'Partner Hubs', icon: Store, tooltip: 'Community merchant collection & storage hubs' },
      { id: 'postcodes', label: 'Service Areas', icon: MapPin, tooltip: 'Operational delivery zones, corridors & hub coverage' },
      { id: 'exceptions', label: 'Delivery Issues', icon: AlertTriangle, badge: '18', badgeType: 'danger', tooltip: 'Delayed parcels, overdue pickups & claims' },
      { id: 'reports', label: 'Reports', icon: BarChart2, tooltip: 'Network intelligence & financial settlements' },
      { id: 'audit', label: 'Audit Log', icon: FileText, tooltip: 'Immutable custody transfers & administrative logs' },
      { id: 'settings', label: 'Settings', icon: Settings, tooltip: 'Delivery rates, commission splits & SLA rules' },
      { id: 'team', label: 'Team & Access', icon: UserCog, tooltip: 'Provision staff accounts, roles and temporary passwords' },
    ],
    navGroups: [
      {
        id: 'applications',
        label: 'Applications',
        icon: ClipboardList,
        tooltip: 'Accreditation, verification & linking applications',
        items: [
          { id: 'hub_applications', label: 'Hub Applications', icon: Store, tooltip: 'Hub accreditation applications, inspections & decisions' },
          { id: 'rider_applications', label: 'Rider Applications', icon: Bike, tooltip: 'Rider KYC applications, clearance & dispatch decisions' },
          { id: 'ground_truth', label: 'Postcode Validations', icon: Crosshair, tooltip: 'Postcode ground-truth doorway inspections and field reports' },
          { id: 'legacy_links', label: 'Legacy Box Links', icon: Link2, badge: 'NIPOST', badgeType: 'info', tooltip: 'Verify old P.O. Box numbers against NIPOST archives' },
          { id: 'verification', label: 'Document Review', icon: ShieldCheck, tooltip: 'Address proofs, regulatory documents & inspection evidence' }
        ]
      }
    ]
  },
  enterprise: {
    title: 'Enterprise Shipper',
    tagline: 'Hotbox • B2B Gateway',
    badgeText: 'Merchant B2B',
    brandIcon: Building2,
    accentColor: 'text-indigo-400',
    brandIconBg: 'bg-indigo-500 text-white',
    activeNavBg: 'bg-indigo-950/90 text-white shadow-sm font-bold border border-indigo-700/60',
    hoverNavBg: 'text-slate-300 hover:text-white hover:bg-indigo-950/40',
    iconActiveColor: 'text-indigo-400',
    navItems: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tooltip: 'Fulfillment metrics & spend overview' },
      { id: 'kyc_verify', label: 'KYC Address Verify', icon: ShieldCheck, badge: 'NIPOST', badgeType: 'info', tooltip: 'Real-time NIPOST Proof of Address verification for banks & fintechs' },
      { id: 'shipments', label: 'Shipments & Manifests', icon: Package, badge: 'Active', badgeType: 'info', tooltip: 'Single & batch parcel bookings and manifests' },
      { id: 'address_book', label: 'Address Book', icon: BookOpen, tooltip: 'Saved recipient addresses with NDAPS postcodes' },
      { id: 'api_keys', label: 'API Credentials', icon: Key, tooltip: 'Live and Sandbox API keys & rate limits' },
      { id: 'webhooks', label: 'Webhooks', icon: Webhook, tooltip: 'Real-time event endpoints & payload logs' },
      { id: 'billing', label: 'Billing & Invoices', icon: Receipt, tooltip: 'Corporate invoices, statement & credit limit' },
      { id: 'claims', label: 'Claims & Support', icon: LifeBuoy, tooltip: 'Damage/loss ticket submission & resolutions' },
      { id: 'settings', label: 'Company Settings', icon: Building2, tooltip: 'Fulfillment branches, pickup hubs & staff seats' },
    ]
  },
  customer: {
    title: 'Customer Portal',
    tagline: 'Hotbox • Personal (hotbox.com.ng)',
    badgeText: 'Customer',
    brandIcon: Package,
    accentColor: 'text-emerald-400',
    brandIconBg: 'bg-emerald-500 text-[#062419]',
    activeNavBg: 'bg-[#0f4430] text-white shadow-sm font-bold',
    hoverNavBg: 'text-slate-300 hover:text-white hover:bg-[#0a3323]',
    iconActiveColor: 'text-emerald-400',
    navItems: [
      { id: 'book', label: 'Send Parcel', icon: PlusCircle, badge: 'New', badgeType: 'info', tooltip: 'Book a parcel delivery in 4 simple steps' },
      { id: 'digital_box', label: 'Digital P.O. Box', icon: ShieldCheck, badge: 'NIPOST', badgeType: 'info', tooltip: 'NIPOST Proof of Address, Ground-Truthing & Annual Box Renewal' },
      { id: 'tracking', label: 'Track Shipments', icon: Package, badge: 'Live', badgeType: 'info', tooltip: 'Track active parcels & view Collection Codes' },
      { id: 'nearby_hubs', label: 'Nearby Hubs', icon: Store, tooltip: 'Find local drop-off & collection hubs on the map' },
      { id: 'addresses', label: 'Saved Addresses', icon: Navigation, tooltip: 'Your home & office NDAPS digital postcodes' },
      { id: 'wallet', label: 'My Wallet', icon: Wallet, tooltip: 'Prepaid delivery balance, refunds & receipts' },
      { id: 'claims', label: 'Claims & Help', icon: HelpCircle, tooltip: 'Report missing or damaged items' },
      { id: 'profile', label: 'Profile & Postcode', icon: User, tooltip: 'Account settings & verified address details' },
    ]
  },
  hub_owner: {
    title: 'Hub Station',
    tagline: 'Hotbox • Community Host',
    badgeText: 'Hub Host',
    brandIcon: Store,
    accentColor: 'text-teal-400',
    brandIconBg: 'bg-teal-500 text-white',
    activeNavBg: 'bg-teal-950/90 text-white shadow-sm font-bold border border-teal-700/60',
    hoverNavBg: 'text-slate-300 hover:text-white hover:bg-teal-950/40',
    iconActiveColor: 'text-teal-400',
    navItems: [
      { id: 'hub_overview', label: 'Hub Overview', icon: Store, tooltip: 'Daily parcel volume & bay capacity overview' },
      { id: 'hub_application', label: 'Accreditation', icon: FileText, tooltip: 'Hub accreditation application, inspection & status' },
      { id: 'parcel_intake', label: 'Parcel Intake', icon: QrCode, badge: 'Scan', badgeType: 'info', tooltip: 'Scan incoming parcels from dispatch riders' },
      { id: 'collection', label: 'Customer Collection', icon: KeyRound, tooltip: 'Verify 6-digit Collection Codes & hand over parcels' },
      { id: 'storage_bays', label: 'Storage Bays', icon: Boxes, tooltip: 'View occupied and available storage compartments' },
      { id: 'overdue', label: 'Overdue Parcels', icon: Clock, badge: '3 Days', badgeType: 'warning', tooltip: 'Parcels awaiting collection past 3 days & late fees' },
      { id: 'earnings', label: 'Earnings & Payouts', icon: TrendingUp, tooltip: 'Drop-off & release commissions and bank payouts' },
      { id: 'hub_profile', label: 'Hub Profile & Staff', icon: Users, tooltip: 'Operating hours, bay capacity & staff credentials' },
    ]
  },
  rider: {
    title: 'Rider Radar',
    tagline: 'Hotbox • Dispatch Courier',
    badgeText: 'Courier',
    brandIcon: Bike,
    accentColor: 'text-blue-400',
    brandIconBg: 'bg-blue-500 text-white',
    activeNavBg: 'bg-blue-950/90 text-white shadow-sm font-bold border border-blue-700/60',
    hoverNavBg: 'text-slate-300 hover:text-white hover:bg-blue-950/40',
    iconActiveColor: 'text-blue-400',
    navItems: [
      { id: 'radar', label: 'Job Radar', icon: Compass, badge: 'Live', badgeType: 'info', tooltip: 'Available pickup and delivery jobs in your corridor' },
      { id: 'lookup', label: 'Postcode Lookup', icon: Search, tooltip: 'Resolve a postcode or digital P.O. Box to a delivery address' },
      { id: 'active_route', label: 'Active Deliveries', icon: Bike, badge: 'Route', badgeType: 'warning', tooltip: 'Current delivery manifest & route directions' },
      { id: 'scanner', label: 'Custody Scanner', icon: QrCode, tooltip: 'Pickup verification & doorstep proof-of-delivery' },
      { id: 'history', label: 'Trip History', icon: CheckCircle2, tooltip: 'Completed deliveries & customer ratings' },
      { id: 'earnings', label: 'Earnings & Wallet', icon: Wallet, tooltip: 'Delivery pay per drop & instant withdrawals' },
      { id: 'profile', label: 'Verification & Profile', icon: ShieldCheck, tooltip: 'Apply for rider verification - NIN, licence, postcode' },
    ]
  }
};

export default function Sidebar({
  activePortal = 'operations',
  activeNav,
  setActiveNav,
  currentUser,
  onLogout,
  isMobileOpen = false,
  onCloseMobile
}) {
  const currentPortalMeta = PORTAL_CONFIG[activePortal] || PORTAL_CONFIG.operations;
  const allowedNav = allowedOperationsNavForRole(currentUser?.role);
  const filterNavItems = (items) => (
    allowedNav && activePortal === 'operations'
      ? items.filter((item) => allowedNav.includes(item.id))
      : items
  );
  const navItems = filterNavItems(currentPortalMeta.navItems);
  const navGroups = (currentPortalMeta.navGroups || [])
    .map((group) => ({ ...group, items: filterNavItems(group.items) }))
    .filter((group) => group.items.length > 0);
  const groupAfter = currentPortalMeta.navGroupAfter;
  const BrandIcon = currentPortalMeta.brandIcon;

  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroup = (groupId) => setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

  // Keep the group containing the active screen expanded so the current
  // application queue is always visible in the sidebar.
  useEffect(() => {
    const groups = PORTAL_CONFIG[activePortal]?.navGroups || [];
    const activeGroup = groups.find((group) => group.items.some((item) => item.id === activeNav));
    if (!activeGroup) return;
    setCollapsedGroups((prev) => {
      if (!prev[activeGroup.id]) return prev;
      const next = { ...prev };
      delete next[activeGroup.id];
      return next;
    });
  }, [activeNav, activePortal]);

  const renderNavItem = (item, isMobile) => {
    const Icon = item.icon;
    const isActive = activeNav === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveNav(item.id);
          if (isMobile && onCloseMobile) onCloseMobile();
        }}
        title={item.tooltip}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          isActive
            ? currentPortalMeta.activeNavBg
            : currentPortalMeta.hoverNavBg
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? currentPortalMeta.iconActiveColor : 'text-slate-400'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ml-1.5 ${
            item.badgeType === 'danger'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : item.badgeType === 'warning'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#062419] text-slate-200 select-none">
      {/* Clean Brand Header */}
      <div className="px-5 py-4 border-b border-[#0d3b2b]/70 mb-2 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl ${currentPortalMeta.brandIconBg} flex items-center justify-center shadow-md ring-1 ring-white/10 shrink-0`}>
            <BrandIcon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-white font-sans">Hotbox</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 tracking-wider">NG</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                activePortal === 'enterprise' ? 'bg-indigo-400' :
                activePortal === 'customer' ? 'bg-emerald-400' :
                activePortal === 'rider' ? 'bg-blue-400' :
                activePortal === 'hub_owner' ? 'bg-teal-400' : 'bg-emerald-400'
              }`} />
              <span className="text-xs font-medium text-slate-300 truncate">
                {currentPortalMeta.title}
              </span>
            </div>
          </div>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#0a3323] transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {(() => {
          const entries = [];
          let inserted = false;
          navItems.forEach((item) => {
            entries.push({ type: 'item', item });
            if (groupAfter === item.id) {
              navGroups.forEach((group) => entries.push({ type: 'group', group }));
              inserted = true;
            }
          });
          if (!inserted) {
            navGroups.forEach((group) => entries.push({ type: 'group', group }));
          }

          return entries.map((entry) => {
            if (entry.type === 'group') {
              const group = entry.group;
              const GroupIcon = group.icon;
              const expanded = collapsedGroups[group.id] !== true;
              return (
                <div key={group.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    title={group.tooltip}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${currentPortalMeta.hoverNavBg}`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <GroupIcon className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="truncate">{group.label}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                  </button>
                  {expanded && (
                    <div className="ml-3 pl-3 border-l border-[#0d3b2b] space-y-1">
                      {group.items.map((item) => renderNavItem(item, isMobile))}
                    </div>
                  )}
                </div>
              );
            }
            return renderNavItem(entry.item, isMobile);
          });
        })()}
      </nav>

      {/* User / Sign Out Footer */}
      <div className="p-4 border-t border-[#0d3b2b] bg-[#041a12]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-emerald-400 font-mono capitalize truncate">
                {currentUser.role ? currentUser.role.replace(/_/g, ' ') : activePortal}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              onLogout();
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#0a3323] rounded-lg transition shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#062419] text-slate-200 flex-col h-screen sticky top-0 shrink-0 border-r border-[#0d3b2b] select-none">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile Drawer & Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-50">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
