import { apiFetch } from './lib/api';
import {
  capturePaymentReturn,
  readPaymentReturn,
  clearPaymentReturn,
  runPaymentResume
} from './lib/hostedCheckout';
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Package, MapPin, ShieldCheck, QrCode, Search,
  Plus, CheckCircle2, AlertTriangle, ArrowRight, Wallet, Users, Store, Bike, Loader2
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
import AuthScreen from './components/AuthScreen';
import RbacGuard from './components/RbacGuard';
import { isRoleAuthorizedForPortal, allowedOperationsNavForRole } from './lib/portals';
import ShipmentDossierModal from './components/ShipmentDossierModal';
import ShipmentManagement from './components/ShipmentManagement';
import RiderManagement from './components/RiderManagement';
import HubManagement from './components/HubManagement';
import HubApplicationsPanel from './components/operations/HubApplicationsPanel';
import RiderApplicationsPanel from './components/operations/RiderApplicationsPanel';
import TeamPanel from './components/operations/TeamPanel';
import GroundTruthQueue from './components/operations/GroundTruthQueue';
import PostcodeManagement from './components/PostcodeManagement';
import ExceptionManagement from './components/ExceptionManagement';
import ReportsManagement from './components/ReportsManagement';
import AuditLogManagement from './components/AuditLogManagement';
import LegacyBoxLinkManagement from './components/LegacyBoxLinkManagement';
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
      const saved = localStorage.getItem('hotbox_active_portal');
      if (saved && ['operations', 'enterprise', 'customer', 'hub_owner', 'rider'].includes(saved)) return saved;
    } catch (e) {}
    return 'customer';
  });
  const [activeNav, setActiveNav] = useState(() => {
    try {
      const urlNav = new URLSearchParams(window.location.search).get('nav');
      if (urlNav) return urlNav;
      const urlPortal = new URLSearchParams(window.location.search).get('portal');
      const p = urlPortal || localStorage.getItem('hotbox_active_portal') || 'customer';
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
      localStorage.setItem('hotbox_active_portal', portalId);
    } catch (e) {}
  };

  // Authentication State
  // The stored user is only a placeholder until the API confirms the token is
  // still valid, so a stale session can never render protected screens.
  const [currentUser, setCurrentUser] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(() => {
    try {
      return Boolean(localStorage.getItem('hotbox_token'));
    } catch (e) {
      return false;
    }
  });
  const isRestoringRef = useRef(true);
  const paymentReturnHandledRef = useRef(false);

  const [resetToken] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('reset') || '';
    } catch (e) {
      return '';
    }
  });

  const [walletBalance, setWalletBalance] = useState(1240500.00);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
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

  // Restricted operations roles land on the first screen they are allowed to
  // see, on both fresh sign-in and stored-session restore.
  useEffect(() => {
    const allowedNav = allowedOperationsNavForRole(currentUser?.role);
    if (!allowedNav || activePortal !== 'operations') return;
    if (!allowedNav.includes(activeNav)) {
      setActiveNav(allowedNav[0]);
    }
  }, [currentUser, activePortal, activeNav]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Confirm the stored session on first load. A rejected token clears local
  // storage and drops the visitor onto the sign-in screen.
  useEffect(() => {
    const token = localStorage.getItem('hotbox_token');
    if (!token) {
      isRestoringRef.current = false;
      setIsRestoringSession(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/api/v1/auth/me');
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        } else {
          localStorage.removeItem('hotbox_token');
          localStorage.removeItem('hotbox_user');
        }
      } catch (err) {
        // Network failure: keep the stored session and let the next request retry.
      } finally {
        if (!cancelled) {
          isRestoringRef.current = false;
          setIsRestoringSession(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // A payment return lands on the app URL. Capture it before anything rewrites
  // the query string so the wallet can be credited after the session resolves.
  useEffect(() => {
    capturePaymentReturn();
  }, []);

  // Once the customer is signed in, credit the wallet for the returned payment
  // and resume whatever they were doing when the checkout redirected them.
  useEffect(() => {
    if (!currentUser || paymentReturnHandledRef.current) return;
    const pending = readPaymentReturn();
    if (!pending) return;
    paymentReturnHandledRef.current = true;
    clearPaymentReturn();

    (async () => {
      if (pending.status !== 'success') {
        showToast('Payment was not completed. Your wallet has not been charged.', 'error');
        return;
      }

      try {
        const res = await apiFetch('/api/v1/wallets/topup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gatewayReference: pending.reference })
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok && res.status !== 409) {
          showToast(data.error || 'Your payment could not be confirmed. Please contact support.', 'error');
          return;
        }

        showToast('Payment confirmed. Your wallet has been credited.');
        window.dispatchEvent(new CustomEvent('hotbox:wallet:credited', { detail: data }));

        await runPaymentResume({
          onResult: (result) => {
            if (result.kind === 'booking') {
              if (result.ok) showToast(`Booked shipment ${result.data?.shipment?.tracking_code}!`);
              else showToast(result.data?.error || result.error || 'Could not complete your booking. Please try again.', 'error');
            } else if (result.kind === 'renewDigitalBox') {
              if (result.ok) showToast(result.data?.message || 'Digital P.O. Box renewed successfully!');
              else showToast(result.data?.error || result.error || 'Could not renew your Digital P.O. Box.', 'error');
            } else if (result.kind === 'requestGroundTruth') {
              if (result.ok) showToast(result.data?.message || 'Doorway verification ordered.');
              else showToast(result.data?.error || result.error || 'Could not request doorway verification.', 'error');
            } else if (result.kind === 'riderRegistrationFee') {
              if (result.ok) showToast('Rider registration fee paid. Operations can now clear you for dispatch.');
              else showToast(result.data?.error || result.error || 'Could not pay the rider registration fee.', 'error');
            }
          }
        });
      } catch (err) {
        showToast('Your payment could not be confirmed. Please contact support.', 'error');
      }
    })();
  }, [currentUser]);

  // A protected API call rejected the stored token: clear the session and let
  // the auth screen take over instead of failing silently.
  useEffect(() => {
    const handleUnauthorized = () => {
      if (isRestoringRef.current) return;
      localStorage.removeItem('hotbox_token');
      localStorage.removeItem('hotbox_user');
      setCurrentUser(null);
      showToast('Your session has expired. Please sign in again.', 'error');
    };
    window.addEventListener('hotbox:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('hotbox:unauthorized', handleUnauthorized);
  }, []);

  const handleAuthenticated = (user) => {
    setCurrentUser(user);
    const portal = user.portal || 'customer';
    setActivePortal(portal);
    setActiveNav(DEFAULT_PORTAL_NAVS[portal] || 'overview');
    if (user.role === 'compliance_officer') setActiveNav('verification');
    if (portal !== 'customer') {
      try {
        localStorage.setItem('hotbox_active_portal', portal);
      } catch (e) {}
    }
    showToast(`Welcome back, ${user.name.split(' ')[0]}`);
    try {
      window.history.replaceState({}, '', window.location.pathname);
    } catch (e) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('hotbox_token');
    localStorage.removeItem('hotbox_user');
    setCurrentUser(null);
    setActivePortal('customer');
    setActiveNav(DEFAULT_PORTAL_NAVS.customer);
    showToast('Signed out successfully.');
  };

  // RBAC Permission Check
  const isAuthorized = (portal) => isRoleAuthorizedForPortal(currentUser?.role, portal);

  // Session restore in progress: keep the screen calm instead of flashing the
  // sign-in page for a frame before the token check resolves.
  if (isRestoringSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Signed out: a dedicated full-screen authentication experience.
  if (!currentUser) {
    return (
      <AuthScreen
        initialView={resetToken ? 'reset' : 'signin'}
        resetToken={resetToken}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

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
              onReturnToAllowed={() => {
                setActivePortal(currentUser.portal || 'customer');
                setActiveNav(DEFAULT_PORTAL_NAVS[currentUser.portal || 'customer'] || 'nearby_hubs');
              }}
              onSignOut={handleLogout}
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

                  {activeNav === 'legacy_links' && (
                    <LegacyBoxLinkManagement currentUser={currentUser} />
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

                  {activeNav === 'hub_applications' && (
                    <HubApplicationsPanel />
                  )}
                  {activeNav === 'rider_applications' && (
                    <RiderApplicationsPanel currentUser={currentUser} showToast={showToast} />
                  )}
                  {activeNav === 'team' && (
                    <TeamPanel currentUser={currentUser} showToast={showToast} />
                  )}
                  {activeNav === 'ground_truth' && (
                    <GroundTruthQueue currentUser={currentUser} showToast={showToast} />
                  )}

                  {activeNav === 'postcodes' && (
                    <PostcodeManagement />
                  )}

                  {activeNav === 'exceptions' && (
                    <ExceptionManagement />
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
