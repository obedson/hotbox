import { MapPin, Globe, Compass, ShieldCheck, CheckCircle2, AlertTriangle, Search, Filter, RefreshCw, Download, ChevronRight, ChevronLeft, Copy, Check, X, ExternalLink, Eye, Store, Bike, Navigation, Layers, Sparkles, TrendingUp } from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Zones' },
  { id: 'SERVICED', label: 'Fully Serviced' },
  { id: 'HUB_CATCHMENT', label: 'Hub Catchments' },
  { id: 'EXPANSION', label: 'Expansion Zones' },
];

export default function PostcodePanel({
  actionNotice, activeTab, copiedKey, counts, currentPage, error, exportToCsv,
  fetchDirectory, handleCopy, loading, lookupError, lookupLoading, lookupResult,
  openPostcodeDossier, pageSize, paginatedPostcodes, postcodes, refreshing, runLookup,
  searchQuery, selectedState, setActionNotice, setActiveTab, setCurrentPage,
  setSearchQuery, setSelectedState, setTestCode, states, testCode, totalPages, totalRecords
}) {
  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Service Corridors & Postcodes
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight" title="Manage operational delivery corridors, partner hub catchments, and geocoded address coverage across Nigerian service areas.">
            Postcode Network Coverage
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Corridors, partner hub catchments & NDAPS digital postcode coverage.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => fetchDirectory(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs"
            title="Refresh postcode coverage feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportToCsv}
            disabled={!postcodes.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs disabled:opacity-50"
            title="Export mapped zones to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Four Postcode & Service Area KPI Cards (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Registered Delivery Zones */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Total geocoded postal sectors registered in the national system"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Delivery Zones</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl font-black text-slate-900">{counts.total_registered || 0}</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1 truncate" title="Standard digital postal grid">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Digital grid</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Service Zones */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Postal zones with active rider coverage and same-day delivery SLAs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Corridors</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl font-black text-slate-900">
              {counts.serviced_postcodes || 0}
              <span className="text-xs text-slate-400 font-normal ml-1.5">/ {counts.total_registered || 0}</span>
            </div>
            <div className="text-[11px] text-blue-600 font-bold mt-1 flex items-center gap-1 truncate" title="Percentage of geographic zones with active courier service">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>{Math.round(((counts.serviced_postcodes || 0) / (counts.total_registered || 1)) * 100)}% Coverage</span>
            </div>
          </div>
        </div>

        {/* Card 3: Areas with Drop-off Hubs */}
        <div
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          title="Postal zones anchored by at least one accredited community drop-off hub"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hub Catchments</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-2xl font-black text-slate-900">{counts.hub_catchments || 0}</div>
            <div className="text-[11px] text-purple-600 font-bold mt-1 flex items-center gap-1 truncate" title="Anchored by partner drop-off hubs">
              <Layers className="w-3.5 h-3.5" />
              <span>{counts.active_hubs_count || 0} Accredited Partner Hubs</span>
            </div>
          </div>
        </div>

        {/* Card 4: Digital Postcode Usage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400"> Alphanumeric Digital Postcode Adoption</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{counts.adoption_rate_pct || '0.0'}%</div>
            <div className="text-[11px] text-amber-600 font-bold mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{counts.total_shipments_routed || 0} Shipments Geocoded & Delivered</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Zone & Hub Resolver */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold mt-1"> Zones, Hubs or Delivery Area Postcode Validation</h2>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder="Enter address code or zone (e.g. FC-01-A05-FK-05 or 900211)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-2xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') runLookup();
              }}
            />
          </div>

          <button
            onClick={() => runLookup()}
            disabled={lookupLoading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {lookupLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
             Validate Postcode
          </button>
        </div>

        {/* Format Helper & Registry Link */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 px-1">
          <span>Standard Postcode Format: <code className="text-emerald-400 font-mono font-bold">XX-99-A99-XX-99</code> (e.g. FC-01-A05-FK-05)</span>
          
        </div>

        {lookupError && (
          <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800 p-3.5 rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-200">Postcode Verification Notice</div>
              <p className="text-[11px] text-amber-300/80">
                {lookupError}. If this location does not yet have an assigned NDAPS digital postcode, you can request one directly on the official NIPOST portal.
              </p>
              <a
                href="https://postcode.gov.ng/find"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline mt-1"
              >
                <span>Request Official Postcode on NIPOST Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Resolved Live Output Box */}
        {lookupResult && (
          <div className="bg-slate-800/60 border border-slate-700/80 p-4 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-emerald-400">
                  {lookupResult.postcode.ndaps_code || lookupResult.postcode.postcode}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-200 font-semibold">
                  {lookupResult.postcode.neighbourhood || lookupResult.postcode.district}, {lookupResult.postcode.lga}, {lookupResult.postcode.state}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Postcode is Valid, see details below </span>
              </span>
            </div>

            {/* Address Details Breakdown (State, LGA, District, Area, Building) */}
            {lookupResult.segments && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Address Details Breakdown:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400">State</div>
                    <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">{lookupResult.segments.state}</div>
                    <div className="text-[10px] text-slate-300 truncate mt-0.5">{lookupResult.postcode.state}</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400">LGA</div>
                    <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">{lookupResult.segments.lga}</div>
                    <div className="text-[10px] text-slate-300 truncate mt-0.5">{lookupResult.postcode.lga}</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400">District</div>
                    <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">{lookupResult.segments.district}</div>
                    <div className="text-[10px] text-slate-300 truncate mt-0.5">{lookupResult.postcode.district || 'Metro'}</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Area</div>
                    <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">{lookupResult.segments.area}</div>
                    <div className="text-[10px] text-slate-300 truncate mt-0.5">{lookupResult.postcode.neighbourhood || 'Urban'}</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/60 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Building</div>
                    <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">{lookupResult.segments.unit}</div>
                    <div className="text-[10px] text-slate-300 truncate mt-0.5">Building Unit</div>
                  </div>
                </div>
              </div>
            )}

            {/* Nearby Partner Hubs */}
            <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">Nearest Partner Hub:</span>
                <span className="font-bold text-white">
                  {lookupResult.nearby_hubs?.[0]
                    ? `${lookupResult.nearby_hubs[0].business_name} (${lookupResult.nearby_hubs[0].distance_km} km away)`
                    : 'No hubs within immediate 5km radius'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Bike className="w-3.5 h-3.5 text-blue-400" />
                <span>{lookupResult.assigned_riders?.length || 0} active couriers assigned to this area</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Segment Filter Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          let badgeCount = null;
          if (tab.id === 'ALL') badgeCount = counts.total_registered;
          else if (tab.id === 'SERVICED') badgeCount = counts.serviced_postcodes;
          else if (tab.id === 'HUB_CATCHMENT') badgeCount = counts.hub_catchments;
          else if (tab.id === 'EXPANSION') badgeCount = counts.expansion_zones;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {badgeCount !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 5. Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by zone code, LGA, State, neighbourhood..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* State Filter & Reset */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All States / FCT</option>
              {states.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {(selectedState !== 'ALL' || searchQuery || activeTab !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedState('ALL');
                setSearchQuery('');
                setActiveTab('ALL');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1 transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 6. Ten-Column Data Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading NDAPS digital postcode directory...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-xs text-rose-600 font-bold">{error}</p>
            <button
              onClick={() => fetchDirectory(true)}
              className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
            >
              Retry Connection
            </button>
          </div>
        ) : paginatedPostcodes.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No postcode records match criteria</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria or register a new NDAPS postcode.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Postal Code / Zone</th>
                  <th className="py-3.5 px-4">Legacy Code</th>
                  <th className="py-3.5 px-4">District & Neighbourhood</th>
                  <th className="py-3.5 px-4">LGA & State</th>
                  <th className="py-3.5 px-4">Geopolitical Zone</th>
                  <th className="py-3.5 px-4">Nearby Hubs</th>
                  <th className="py-3.5 px-4">Assigned Riders</th>
                  <th className="py-3.5 px-4">Shipments Routed</th>
                  <th className="py-3.5 px-4">Service Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedPostcodes.map((item, idx) => {
                  const isServiced = item.service_status === 'ACTIVE_SERVICED';
                  const isHubCatchment = item.service_status === 'HUB_CATCHMENT';
                  const isExpansion = item.service_status === 'EXPANSION_ZONE';

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => openPostcodeDossier(item)}
                    >
                      {/* Col 1: NDAPS Postcode Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(item.canonical_postcode || item.postcode, `p-${idx}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                          title="Click to copy NDAPS code"
                        >
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>{item.canonical_postcode || item.postcode}</span>
                          {copiedKey === `p-${idx}` ? (
                            <Check className="w-3 h-3 text-emerald-700" />
                          ) : (
                            <Copy className="w-3 h-3 text-emerald-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      </td>

                      {/* Col 2: Legacy Reference */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.legacy_code ? (
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.legacy_code}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">None</span>
                        )}
                      </td>

                      {/* Col 3: District & Neighbourhood */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 truncate max-w-[160px]">
                          {item.neighbourhood || item.district || 'Metro'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px]">
                          {item.description}
                        </div>
                      </td>

                      {/* Col 4: LGA & State */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{item.lga}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.state}</div>
                      </td>

                      {/* Col 5: Geopolitical Zone */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.zone || 'NORTH CENTRAL'}
                        </span>
                      </td>

                      {/* Col 6: Nearby Hubs */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          item.hub_count > 0
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          <Store className="w-3 h-3 text-purple-500" />
                          <span>{item.hub_count} Hubs</span>
                        </div>
                        {item.hubs && item.hubs[0] && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[130px]">
                            {item.hubs[0].distance_km}km: {item.hubs[0].business_name}
                          </div>
                        )}
                      </td>

                      {/* Col 7: Assigned Riders */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          item.rider_count > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          <Bike className="w-3 h-3 text-blue-500" />
                          <span>{item.rider_count} Riders</span>
                        </div>
                      </td>

                      {/* Col 8: Shipments Routed */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{item.shipments_routed}</span>
                        <span className="text-[10px] text-slate-400 ml-1">pkgs</span>
                      </td>

                      {/* Col 9: Service Coverage Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isServiced
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isHubCatchment
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isServiced ? 'bg-emerald-500' : isHubCatchment ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                          {isServiced ? 'Fully Serviced' : isHubCatchment ? 'Hub Covered' : 'Expansion Area'}
                        </span>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Tier: {item.tier === 'SAME_DAY_COMMUNITY' ? 'Same-Day' : 'Standard'}
                        </div>
                      </td>

                      {/* Col 10: Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openPostcodeDossier(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            title="View Delivery Coverage Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setTestCode(item.canonical_postcode || item.postcode);
                              runLookup(item.canonical_postcode || item.postcode);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Check Postcode Details"
                          >
                            <Navigation className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {!loading && paginatedPostcodes.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Showing</span>
              <span className="font-bold text-slate-900">
                {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalRecords)}
              </span>
              <span>of</span>
              <span className="font-bold text-slate-900">{totalRecords}</span>
              <span>postcodes</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-bold text-slate-800 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
  );
}
