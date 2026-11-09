import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, ArrowRight, ArrowUpDown, Check, CheckCircle2, Crosshair,
  ExternalLink, Heart, MapPin, Plus, RefreshCw, Save, Search, ShieldCheck, Store, X
} from 'lucide-react';
import { InfoTooltip, MapRecenter, formatDistance, estimateTime } from './ui';

export default function DiscoveryTab({ discovery, savedAddresses, savedHubs, setIsBookingOpen }) {
  const {
    hubSearchMode, setHubSearchMode, sortByProximity, setSortByProximity,
    mobileView, setMobileView, isSearchingLocation, suggestions, showSuggestions,
    setShowSuggestions, senderQuery, setSenderQuery, recipientQuery, setRecipientQuery,
    senderLocation, setSenderLocation, recipientLocation, setRecipientLocation,
    postcode, setPostcode, coords, setCoords, hubs, setHubs, selectedHub, setSelectedHub,
    activeLocation, hasEnteredLocation, hasMapCoords,
    handleSwitchHubMode, handleQueryChange, handleResolveAndSearch,
    handleSelectQuickLocation, handleSelectSuggestion, handleBookWithHub, handleToggleSaveHub
  } = discovery;

  return (
        <div className="space-y-4 sm:space-y-5">
          {/* Action Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#062419] text-white p-4 sm:p-6 rounded-2xl shadow-sm border border-emerald-900/80">
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 inline-flex items-center gap-1.5 shadow-xs max-w-full truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">POWERED BY THE NEW NIPOST DIGITAL POSTCODE (NDAPS)</span>
              </span>
              <h1 className="text-lg sm:text-xl font-black mt-2 tracking-tight">Send &amp; Collect Parcels in Your Neighborhood</h1>
              <p className="text-xs text-emerald-200/80 mt-1 max-w-xl leading-relaxed">
                Drop off parcels at accredited local shops or hubs or schedule door-to-hub dispatch with single-use OTP handovers.
              </p>
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Book Parcel Dispatch</span>
            </button>
          </div>

          {/* Mobile View Toggle Bar (Only visible on mobile/tablet screens < lg) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/90 rounded-xl border border-slate-300 lg:hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileView === 'list'
                  ? 'bg-[#062419] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>Accredited Hubs{hasEnteredLocation ? ` (${hubs.length})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileView('map')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileView === 'map'
                  ? 'bg-[#062419] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Map &amp; Coverage{hasEnteredLocation ? ` (${hubs.length})` : ''}</span>
            </button>
          </div>

          {/* Unified Hub Search & Interactive Geofence Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Panel: Clean Unified Hub Discovery Column */}
            <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} lg:flex lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex-col h-[560px] sm:h-[620px] lg:h-[660px] overflow-hidden`}>
              {/* Top Compact Controls Header */}
              <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200/80 space-y-2.5 sm:space-y-3 shrink-0">
                {/* Row 1: Segmented Mode Switcher & Sort Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/60 shadow-2xs w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleSwitchHubMode('sender')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        hubSearchMode === 'sender'
                          ? 'bg-[#062419] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Origin Drop-off</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchHubMode('recipient')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        hubSearchMode === 'recipient'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Recipient Drop-off</span>
                    </button>
                  </div>

                  {/* Mode explanation & Sort Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 sm:hidden">Mode:</span>
                      <InfoTooltip
                        text={
                          hubSearchMode === 'sender'
                            ? 'Sender Mode: Ranks accredited partner hubs closest to your pickup/drop-off point.'
                            : 'Recipient Mode: Ranks accredited partner collection hubs closest to your recipient destination.'
                        }
                        position="bottom"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextSort = !sortByProximity;
                        setSortByProximity(nextSort);
                        const sorted = [...hubs];
                        if (nextSort) {
                          sorted.sort((a, b) => (parseFloat(a.distanceKm) || 0) - (parseFloat(b.distanceKm) || 0));
                        } else {
                          sorted.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
                        }
                        setHubs(sorted);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 shadow-2xs transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      <span>{sortByProximity ? 'Closest' : 'Top Rated'}</span>
                      <InfoTooltip text="Toggle sorting by straight-line distance or verified user rating." />
                    </button>
                  </div>
                </div>

                {/* Row 2: Search Input Bar */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={hubSearchMode === 'sender' ? senderQuery : recipientQuery}
                      onChange={e => handleQueryChange(e.target.value, hubSearchMode)}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleResolveAndSearch(hubSearchMode === 'sender' ? senderQuery : recipientQuery, hubSearchMode);
                        }
                      }}
                      placeholder={
                        hubSearchMode === 'sender'
                          ? 'Search origin address or NDAPS...'
                          : 'Search recipient delivery address or NDAPS...'
                      }
                      className="w-full pl-9 pr-20 sm:pr-24 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none shadow-2xs transition"
                    />
                    {(((hubSearchMode === 'sender' ? senderQuery : recipientQuery) || '') || hasEnteredLocation) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (hubSearchMode === 'sender') {
                            setSenderQuery('');
                            setSenderLocation({ postcode: '', address: '', coords: null, hasVerifiedPostcode: null, noPostcodeWarning: null });
                          } else {
                            setRecipientQuery('');
                            setRecipientLocation({ postcode: '', address: '', coords: null, hasVerifiedPostcode: null, noPostcodeWarning: null });
                          }
                          setHubs([]);
                          setSelectedHub(null);
                          setShowSuggestions(false);
                        }}
                        className="absolute right-14 sm:right-16 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isSearchingLocation}
                      onClick={() => handleResolveAndSearch(hubSearchMode === 'sender' ? senderQuery : recipientQuery, hubSearchMode)}
                      className="absolute right-1 px-2.5 sm:px-3 py-1.5 bg-[#062419] hover:bg-[#0a3323] text-white rounded-lg text-[11px] font-bold shadow-2xs transition flex items-center gap-1 disabled:opacity-60 cursor-pointer"
                    >
                      {isSearchingLocation ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                      ) : (
                        <Search className="w-3 h-3 text-emerald-400" />
                      )}
                      <span>Find</span>
                    </button>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                      {suggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion(sug, hubSearchMode)}
                          className="w-full text-left p-2.5 hover:bg-emerald-50/60 transition flex items-start gap-2 cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-slate-900">{sug.description || sug.neighbourhood}</div>
                            <div className="text-[10px] text-emerald-700 font-mono">
                              Postcode: {sug.postcode} • {sug.state}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 3: Quick Address & Hub Corridor Carousel (Single-line horizontal shortcut bar) */}
                {((savedAddresses && savedAddresses.length > 0) || hubs.length > 0) && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
                    <span className="font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5">
                      <span>Quick:</span>
                    </span>

                    {/* Real Saved Addresses from PostgreSQL */}
                    {savedAddresses.map(addr => {
                      const isSelected =
                        (hubSearchMode === 'sender' ? senderLocation.postcode : recipientLocation.postcode) === addr.postcode;
                      const icon =
                        addr.address_type === 'residential' ? '🏠' : addr.address_type === 'business' ? '🏢' : '📦';
                      const displayLabel = addr.contact_name || addr.neighbourhood || addr.street_address.split(',')[0];

                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectQuickLocation(addr, hubSearchMode)}
                          className={`px-2.5 py-1 rounded-lg border font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                          }`}
                          title={`${addr.street_address} (${addr.postcode})`}
                        >
                          <span>{icon}</span>
                          <span className="max-w-[120px] sm:max-w-[140px] truncate">{displayLabel}</span>
                          <span className="font-mono text-[9px] opacity-75">{addr.postcode?.slice(0, 8)}...</span>
                        </button>
                      );
                    })}

                    {/* Active Partner Hub Corridors from Database */}
                    {hubs.slice(0, 4).map(h => {
                      const isSelected =
                        (hubSearchMode === 'sender' ? senderLocation.postcode : recipientLocation.postcode) === h.postcode;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() =>
                            handleSelectQuickLocation(
                              {
                                street_address: h.address_text,
                                postcode: h.postcode,
                                lat: h.lat,
                                lng: h.lng,
                                contact_name: h.neighbourhood || h.business_name
                              },
                              hubSearchMode
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg border font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                          }`}
                        >
                          <span>📍</span>
                          <span className="max-w-[100px] sm:max-w-[120px] truncate">{h.neighbourhood || h.business_name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Active Location Status & Verified Address Display (Labeled 3) */}
                {hasEnteredLocation && (
                  <div className="pt-0.5">
                    {activeLocation.postcode ? (
                      /* VALID POSTCODE ENTERED: Full address clearly displayed without truncation */
                      <div className="p-3 bg-emerald-50/90 border border-emerald-200/90 rounded-xl space-y-2 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              {hubSearchMode === 'sender' ? 'Origin Drop-off' : 'Recipient Drop-off'}
                            </span>
                            <span className="font-mono font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 text-[11px] shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{activeLocation.postcode}</span>
                            </span>
                          </div>

                          {/* "Official NIPOST" is hidden when address is verified; "Verified Address" badge is shown */}
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 ml-auto shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Verified Address</span>
                          </span>
                        </div>

                        {/* Full Address attached to valid postcode (clearly displayed, no truncation) */}
                        <div className="pt-0.5">
                          <div className="text-[10px] font-bold text-emerald-900/70 uppercase tracking-wider mb-0.5">
                            Full Verified Address:
                          </div>
                          <div className="text-xs font-bold text-slate-900 leading-relaxed break-words bg-white/80 p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                            {activeLocation.address || 'Full address verified on NIPOST NDAPS registry'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ADDRESS ENTERED WITH NO POSTCODE FOUND IN DATABASE (No Verified Address) */
                      <div className="p-3 bg-amber-50/95 border border-amber-300/90 rounded-xl space-y-2 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                                {hubSearchMode === 'sender' ? 'Origin Address' : 'Recipient Address'}
                              </span>
                              <div className="flex items-center gap-2 ml-auto">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 border border-amber-300">
                                  No Verified Address
                                </span>
                                <a
                                  href="https://postcode.gov.ng/find"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition shrink-0 group"
                                >
                                  <span>Official NIPOST</span>
                                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                </a>
                              </div>
                            </div>

                            {activeLocation.address && (
                              <div className="text-xs font-semibold text-slate-800 break-words bg-white/80 p-2 rounded-lg border border-amber-200/70">
                                &ldquo;{activeLocation.address}&rdquo;
                              </div>
                            )}

                            <p className="text-xs font-bold text-amber-900 leading-snug">
                              No verified postcode found for this address, please request for postcode from NIPOST.
                            </p>

                            <div className="pt-1">
                              <a
                                href="https://postcode.gov.ng/find"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold transition shadow-xs cursor-pointer"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Verify Address on Official NIPOST</span>
                                <ExternalLink className="w-3 h-3 ml-0.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Section: Empty Prompt State or Accredited Hubs List */}
              {!hasEnteredLocation ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-slate-50/50">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5 shadow-2xs border border-emerald-100/80">
                    <MapPin className="w-7 h-7 text-emerald-600 animate-pulse" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
                    {hubSearchMode === 'sender' ? 'Enter Origin Address or Postcode' : 'Enter Recipient Delivery Address'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-5">
                    {hubSearchMode === 'sender'
                      ? 'Enter your street address or NIPOST Digital Postcode above to locate accredited drop-off hubs and view real-time bay capacity.'
                      : 'Enter your recipient delivery address or NIPOST Digital Postcode to locate collection hubs near your recipient.'}
                  </p>

                  {savedAddresses && savedAddresses.length > 0 && (
                    <div className="w-full max-w-xs pt-3.5 border-t border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Or pick from saved addresses:
                      </span>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {savedAddresses.map(addr => {
                          const icon = addr.address_type === 'residential' ? '🏠' : addr.address_type === 'business' ? '🏢' : '📦';
                          const displayLabel = addr.contact_name || addr.neighbourhood || addr.street_address.split(',')[0];
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => handleSelectQuickLocation(addr, hubSearchMode)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/60 text-slate-700 text-[11px] font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer group"
                            >
                              <span>{icon}</span>
                              <span className="max-w-[120px] truncate">{displayLabel}</span>
                              <span className="font-mono text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                                {addr.postcode?.slice(0, 8)}...
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/40">
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-600">
                    <span className="flex items-center gap-1">
                      <span>Accredited Partner Hubs ({hubs.length})</span>
                      <InfoTooltip text="Vetted commercial drop-off and collection shops or hubs accredited for secure physical custody, verified bays, and insurance." />
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ● 30km Active Geofence
                    </span>
                  </div>

                  {hubs.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                    No accredited hubs found within 30km. Try selecting another area or entering a postcode.
                  </div>
                ) : (
                  hubs.map((h, idx) => {
                    const isSelected = selectedHub?.id === h.id;
                    const isSaved = savedHubs.some(sh => sh.id === h.id);
                    const distStr = formatDistance(h.distanceKm);
                    const timeStr = estimateTime(h.distanceKm);
                    const availableSlots = Math.max(0, (h.capacity || 50) - (h.current_load || 0));
                    const capacityPct = Math.min(100, Math.round(((h.current_load || 0) / (h.capacity || 50)) * 100));

                    return (
                      <div
                        key={h.id}
                        onClick={() => {
                          setSelectedHub(h);
                          setCoords({ lat: parseFloat(h.lat), lng: parseFloat(h.lng) });
                        }}
                        className={`p-3.5 rounded-xl border transition cursor-pointer relative bg-white shadow-2xs ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Hub Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                #{idx + 1}
                              </span>
                              <h3 className="font-bold text-slate-900 text-xs truncate">{h.business_name}</h3>
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                <Check className="w-2.5 h-2.5 stroke-[3]" /> Verified Hub
                                <InfoTooltip text="Accredited by NIPOST with audited custody protocols, CCTV, and physical inspection." />
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-1">{h.address_text}</p>
                            <div className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5">
                              Postcode: {h.postcode} • {h.neighbourhood || 'Abuja Municipal'}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {distStr && (
                              <div className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                                📍 {distStr}
                              </div>
                            )}
                            {timeStr && (
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">{timeStr}</div>
                            )}
                          </div>
                        </div>

                        {/* Capacity Meter & Rating Row */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1">
                                <span>Bays Available:</span>
                                <InfoTooltip text="Live physical storage bays currently open for incoming parcel intake." />
                              </span>
                              <strong className="text-slate-900 font-bold">{availableSlots} / {h.capacity || 50}</strong>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  capacityPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(10, 100 - capacityPct)}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2.5">
                            <span className="text-amber-700 font-bold flex items-center gap-0.5">
                              ⭐ {h.rating || '4.90'}
                              <span className="text-slate-400 font-normal">({h.total_ratings || 24})</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-500" title="Secure CCTV & Insured">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <InfoTooltip text="Security Features: 24/7 CCTV surveillance, fire extinguisher, locked vault, insured custody." />
                            </span>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSaveHub(h);
                              }}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isSaved
                                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                              }`}
                              title={isSaved ? 'Remove from saved hubs' : 'Save preferred hub'}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500' : ''}`} />
                            </button>

                            {/* View on Map Button (Mobile/Tablet only) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHub(h);
                                setCoords({ lat: parseFloat(h.lat), lng: parseFloat(h.lng) });
                                setMobileView('map');
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition lg:hidden cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                              title="View this hub on map"
                            >
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">Map</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookWithHub(h);
                            }}
                            className="px-3.5 py-1.5 bg-[#062419] hover:bg-[#0a3323] text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 group cursor-pointer"
                          >
                            <span>{hubSearchMode === 'sender' ? 'Drop-off Here' : 'Deliver to Hub'}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

            {/* Right Panel: Leaflet Geofence Map */}
            <div className={`${mobileView === 'map' ? 'block' : 'hidden'} lg:block lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden h-[560px] sm:h-[620px] lg:h-[660px] relative`}>
              {/* Mobile Back to List Button */}
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-md flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition lg:hidden cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>View Hub List</span>
              </button>

              {/* Floating Geofence & Filter Status Pill */}
              <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-md flex items-center gap-1.5 sm:gap-2">
                <span className={`w-2 h-2 rounded-full ${hasMapCoords ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-[10px] sm:text-xs font-bold text-slate-800">
                  {hasMapCoords && hubs.length > 0
                    ? `Live Geofence • 30km (${hubs.length} Hubs)`
                    : hasEnteredLocation && !activeLocation.postcode
                    ? 'Address Awaiting NDAPS Postcode'
                    : hasEnteredLocation
                    ? 'Location Verified'
                    : 'Awaiting Address Input'}
                </span>
                <InfoTooltip text="Interactive geographic mapping of accredited NIPOST partner hubs with real-time custody availability." />
              </div>

              <MapContainer center={[coords.lat, coords.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                  attribution="&copy; <a href='https://www.esri.com/'>Esri</a> &mdash; StreetMap"
                  maxZoom={19}
                />
                <MapRecenter lat={coords.lat} lng={coords.lng} />
                {hasMapCoords && hubs.map(h => (
                  <Marker
                    key={h.id}
                    position={[parseFloat(h.lat), parseFloat(h.lng)]}
                    eventHandlers={{
                      click: () => {
                        setSelectedHub(h);
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-xs p-1 space-y-1.5 max-w-[220px]">
                        <div className="flex items-center gap-1">
                          <strong className="block font-bold text-slate-900 truncate">{h.business_name}</strong>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">✓ Verified</span>
                        </div>
                        <span className="text-slate-600 text-[11px] block">{h.address_text}</span>
                        <div className="text-emerald-700 font-mono font-bold text-[10px]">
                          Postcode: {h.postcode} • {formatDistance(h.distanceKm)}
                        </div>
                        <div className="text-slate-500 text-[10px] flex items-center justify-between">
                          <span>Available Bays: <strong className="text-slate-800">{Math.max(0, (h.capacity || 50) - (h.current_load || 0))}</strong></span>
                          <span className="text-amber-700 font-bold">⭐ {h.rating || '4.90'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBookWithHub(h)}
                          className="mt-1.5 w-full py-1.5 bg-[#062419] hover:bg-[#0a3323] text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Select &amp; Book Dispatch</span>
                          <ArrowRight className="w-3 h-3 text-emerald-400" />
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {hasMapCoords && activeLocation.coords && (
                  <Marker
                    position={[parseFloat(activeLocation.coords.lat), parseFloat(activeLocation.coords.lng)]}
                    icon={L.divIcon({
                      className: 'custom-user-marker',
                      html: `<div style="background-color: #062419; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.35);">📍</div>`,
                      iconSize: [30, 30],
                      iconAnchor: [15, 30]
                    })}
                  >
                    <Popup>
                      <div className="text-xs p-1 space-y-1">
                        <strong className="block font-bold text-slate-900">
                          {hubSearchMode === 'sender' ? 'Your Origin Address' : 'Recipient Delivery Address'}
                        </strong>
                        <div className="text-slate-600 text-[11px]">{activeLocation.address || activeLocation.postcode}</div>
                        {activeLocation.postcode && (
                          <div className="text-emerald-700 font-mono text-[10px] font-bold">NDAPS: {activeLocation.postcode}</div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>

              {/* Floating Mobile Bottom Sheet for Selected Hub */}
              {selectedHub && (
                <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-xl lg:hidden animate-fadeIn">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900 text-xs truncate">{selectedHub.business_name}</h4>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold shrink-0">✓ Verified</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{selectedHub.address_text}</p>
                      <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-2">
                        <span>📍 {formatDistance(selectedHub.distanceKm)}</span>
                        <span>•</span>
                        <span>Bays: <strong className="text-slate-900">{Math.max(0, (selectedHub.capacity || 50) - (selectedHub.current_load || 0))} open</strong></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookWithHub(selectedHub)}
                      className="px-3.5 py-2 bg-[#062419] hover:bg-[#0a3323] text-white font-bold rounded-xl text-xs shrink-0 shadow-md flex items-center gap-1 cursor-pointer"
                    >
                      <span>Book</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
  );
}
