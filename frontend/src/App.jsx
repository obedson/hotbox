import { apiFetch } from './lib/api';
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Package, MapPin, ShieldCheck, QrCode, Search,
  Plus, CheckCircle2, AlertTriangle, ArrowRight, Wallet, Users, Store, Bike
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import DashboardOverview from './components/DashboardOverview';
import OperationsTower from './components/OperationsTower';
import VerificationQueue from './components/VerificationQueue';
import EnterprisePortal from './components/EnterprisePortal';
import CustodyScanner from './components/CustodyScanner';
import CustomerDashboard from './components/CustomerDashboard';
import ShipmentTracker from './components/ShipmentTracker';
import BookingModal from './components/BookingModal';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import RbacGuard from './components/RbacGuard';
import ShipmentDossierModal from './components/ShipmentDossierModal';
import ShipmentManagement from './components/ShipmentManagement';
import RiderManagement from './components/RiderManagement';
import HubManagement from './components/HubManagement';
import PostcodeManagement from './components/PostcodeManagement';
import ExceptionManagement from './components/ExceptionManagement';
import ReportsManagement from './components/ReportsManagement';
import AuditLogManagement from './components/AuditLogManagement';
import SettingsManagement from './components/SettingsManagement';
import HubStationConsole from './components/HubStationConsole';
import RiderRadarConsole from './components/RiderRadarConsole';

const DEFAULT_PORTAL_NAVS = {
  operations: 'overview',
  enterprise: 'dashboard',
  customer: 'nearby_hubs',
  hub_owner: 'hub_overview',
  rider: 'radar'
};

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 13);
    }
  }, [lat, lng, map]);
  return null;
}

export default function App() {
  // Master Surface Selection: 'operations' | 'enterprise' | 'customer' | 'hub_owner' | 'rider'
  const [activePortal, setActivePortal] = useState(() => {
    try {
      const urlPortal = new URLSearchParams(window.location.search).get('portal');
      if (urlPortal && ['operations', 'enterprise', 'customer', 'hub_owner', 'rider'].includes(urlPortal)) return urlPortal;
      const saved = localStorage.getItem('dropboxz_active_portal');
      if (saved && ['operations', 'enterprise', 'customer', 'hub_owner', 'rider'].includes(saved)) return saved;
    } catch (e) {}
    return 'customer';
  });
  const [activeNav, setActiveNav] = useState(() => {
    try {
      const urlNav = new URLSearchParams(window.location.search).get('nav');
      if (urlNav) return urlNav;
      const urlPortal = new URLSearchParams(window.location.search).get('portal');
      const p = urlPortal || localStorage.getItem('dropboxz_active_portal') || 'customer';
      return DEFAULT_PORTAL_NAVS[p] || 'nearby_hubs';
    } catch (e) {}
    return 'nearby_hubs';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dossierTrackingCode, setDossierTrackingCode] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const handleGlobalSearch = (query) => {
    if (!query) return;
    setDossierTrackingCode(query.trim());
    setIsDossierOpen(true);
  };

  const handlePortalChange = (portalId) => {
    setActivePortal(portalId);
    setActiveNav(DEFAULT_PORTAL_NAVS[portalId] || 'overview');
    try {
      localStorage.setItem('dropboxz_active_portal', portalId);
    } catch (e) {}
  };

  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('dropboxz_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      id: 'a0000000-0000-0000-0000-000000000005',
      name: 'Kolawole Adeleke',
      phone: '+2348061122335',
      role: 'ops_admin'
    };
  });

  const [walletBalance, setWalletBalance] = useState(1240500.00);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Customer Map & Hub Data
  const [postcode, setPostcode] = useState('FC-01-A03-FK-01');
  const [coords, setCoords] = useState({ lat: 9.0772, lng: 7.4990 });
  const [hubs, setHubs] = useState([]);
  const [selectedHub, setSelectedHub] = useState(null);

  // Rider Radar Jobs
  const [radarJobs, setRadarJobs] = useState([]);

  const fetchHubs = async () => {
    try {
      const res = await apiFetch(`/api/v1/hubs/nearby?lat=${coords.lat}&lng=${coords.lng}&postcode=${postcode}&radius=20`);
      const data = await res.json();
      if (Array.isArray(data.hubs)) {
        setHubs(data.hubs);
        if (data.hubs.length > 0 && !selectedHub) {
          setSelectedHub(data.hubs[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load hubs:', err);
    }
  };

  const fetchRiderData = async () => {
    try {
      const jobsRes = await apiFetch('/api/v1/riders/radar/jobs', {
        headers: {}
      });
      const jobsData = await jobsRes.json();
      setRadarJobs(jobsData.jobs || []);
    } catch (err) {
      console.error('Rider data error:', err);
    }
  };

  useEffect(() => {
    fetchHubs();
    if (activePortal === 'rider') fetchRiderData();
  }, [coords, activePortal]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    showToast(`Signed in as ${user.name} (${user.role})`);
    if (['ops_admin', 'super_admin'].includes(user.role)) {
      setActivePortal('operations');
    } else if (user.role === 'compliance_officer') {
      setActivePortal('operations');
      setActiveNav('verification');
    } else if (user.role === 'enterprise_shipper') {
      setActivePortal('enterprise');
    } else if (['hub_owner', 'hub_staff'].includes(user.role)) {
      setActivePortal('hub_owner');
    } else if (user.role === 'rider') {
      setActivePortal('rider');
    } else {
      setActivePortal('customer');
    }
  };

  const handleRegisterSuccess = (user, token) => {
    setCurrentUser(user);
    showToast(`Account registered for ${user.name}`);
    if (user.role === 'hub_owner') setActivePortal('hub_owner');
    else if (user.role === 'rider') setActivePortal('rider');
    else if (user.role === 'enterprise_shipper') setActivePortal('enterprise');
    else setActivePortal('customer');
  };

  const handleLogout = () => {
    localStorage.removeItem('dropboxz_token');
    localStorage.removeItem('dropboxz_user');
    setCurrentUser(null);
    showToast('Signed out successfully.');
  };

  // RBAC Permission Check
  const isAuthorized = (portal) => {
    if (!currentUser) return false;
    const role = currentUser.role;
    if (role === 'super_admin' || role === 'admin') return true;

    switch (portal) {
      case 'customer':
        return true;
      case 'operations':
        return ['ops_admin', 'compliance_officer', 'super_admin'].includes(role);
      case 'enterprise':
        return ['enterprise_shipper', 'courier_company', 'ops_admin', 'super_admin'].includes(role);
      case 'hub_owner':
        return ['hub_owner', 'hub_staff', 'ops_admin', 'super_admin'].includes(role);
      case 'rider':
        return ['rider', 'courier_company', 'ops_admin', 'super_admin'].includes(role);
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans antialiased">
      {/* 1. Sleek Left Sidebar (as in 10-operations-dashboard.jpg) */}
      <Sidebar
        activePortal={activePortal}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header App Bar */}
        <TopHeader
          activeNav={activeNav}
          activePortal={activePortal}
          setActivePortal={handlePortalChange}
          currentUser={currentUser}
          walletBalance={walletBalance}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenRegister={() => setIsRegisterOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleGlobalSearch}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        {/* Dynamic Main Body Area */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6 overflow-x-hidden min-w-0">
          {/* RBAC Access Denied Interceptor */}
          {!isAuthorized(activePortal) ? (
            <RbacGuard
              portalId={activePortal}
              currentUser={currentUser}
              onSwitchDemoAccount={(demoAcc) => {
                setCurrentUser({
                  id: 'a0000000-0000-0000-0000-000000000005',
                  name: demoAcc.name,
                  phone: demoAcc.phone,
                  role: demoAcc.role
                });
                showToast(`Switched session to ${demoAcc.name}`);
              }}
              onReturnToAllowed={() => setActivePortal('customer')}
            />
          ) : (
            <>
              {/* SURFACE 1: OPERATIONS CONSOLE (1:1 with 10-operations-dashboard.jpg) */}
              {activePortal === 'operations' && (
                <>
                  {activeNav === 'overview' && (
                    <DashboardOverview
                      onViewAllShipments={() => setActiveNav('shipments')}
                      onReviewVerification={() => setActiveNav('verification')}
                      onSelectShipment={handleGlobalSearch}
                    />
                  )}

                  {activeNav === 'shipments' && (
                    <ShipmentManagement
                      onSelectShipment={handleGlobalSearch}
                      onNewShipment={() => setIsBookingOpen(true)}
                    />
                  )}

                  {activeNav === 'verification' && (
                    <VerificationQueue />
                  )}

                  {activeNav === 'riders' && (
                    <RiderManagement
                      onSelectShipment={handleGlobalSearch}
                    />
                  )}

                  {activeNav === 'hubs' && (
                    <HubManagement
                      onSelectShipment={handleGlobalSearch}
                    />
                  )}

                  {activeNav === 'postcodes' && (
                    <PostcodeManagement
                      onSelectShipment={handleGlobalSearch}
                    />
                  )}

                  {activeNav === 'exceptions' && (
                    <ExceptionManagement
                      onSelectShipment={handleGlobalSearch}
                    />
                  )}

                  {activeNav === 'reports' && (
                    <ReportsManagement
                      onSelectShipment={handleGlobalSearch}
                    />
                  )}

                  {activeNav === 'audit' && (
                    <AuditLogManagement
                      onSelectShipment={handleGlobalSearch}
                    />
                  )}

                  {activeNav === 'settings' && (
                    <SettingsManagement />
                  )}
                </>
              )}

              {/* SURFACE 2: ENTERPRISE B2B PORTAL (1:1 with 05-enterprise-portal-board.jpg) */}
              {activePortal === 'enterprise' && (
                <EnterprisePortal
                  activeNav={activeNav}
                  setActiveNav={setActiveNav}
                />
              )}

              {/* SURFACE 3: CUSTOMER PORTAL (Comprehensive 11 Customer Features) */}
              {activePortal === 'customer' && (
                <CustomerDashboard
                  currentUser={currentUser}
                  onBookNewShipment={() => setIsBookingOpen(true)}
                  activeNav={activeNav}
                  setActiveNav={setActiveNav}
                />
              )}

              {/* SURFACE 4: HUB STATION HOST CONSOLE (1:1 with 03-hub-mobile-board.jpg & 09-hub-intake.jpg) */}
              {activePortal === 'hub_owner' && (
                <HubStationConsole
                  activeNav={activeNav}
                  setActiveNav={setActiveNav}
                  hubs={hubs}
                  showToast={showToast}
                />
              )}

              {/* SURFACE 5: RIDER RADAR CONSOLE (1:1 with 02-rider-mobile-board.jpg) */}
              {activePortal === 'rider' && (
                <RiderRadarConsole
                  activeNav={activeNav}
                  setActiveNav={setActiveNav}
                  hubs={hubs}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Alert Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
          toast.type === 'error'
            ? 'bg-rose-900 text-white border-rose-700'
            : 'bg-[#062419] text-white border-emerald-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Booking Modal */}
      {activePortal !== 'customer' && (
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          hubs={hubs}
          currentUser={currentUser}
          onBookSuccess={newShipment => {
            showToast(`Booked shipment ${newShipment.tracking_code}!`);
            fetchHubs();
          }}
        />
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />

      {/* Register Modal */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegisterSuccess={handleRegisterSuccess}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />

      {/* Operations Chain-of-Custody Dossier Modal */}
      <ShipmentDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        trackingCode={dossierTrackingCode}
        onActionSuccess={() => {
          showToast('Operational action logged to immutable custody ledger.');
        }}
      />
    </div>
  );
}
