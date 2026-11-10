import { Tooltip, InfoTooltip } from './ReportsUi';
import { Store, MapPin, Clock, Search, RefreshCw, Download, X, DollarSign, BarChart3, Wallet, Truck } from 'lucide-react';
import AreaCoverageTab from './AreaCoverageTab';
import HubStorageTab from './HubStorageTab';
import RevenuePayoutsTab from './RevenuePayoutsTab';
import DeliverySpeedTab from './DeliverySpeedTab';

export default function ReportsPanel({ directory }) {
  const {
    activeTab, currentPage, data, exportActiveReportCSV, fetchReports, filterTier, filteredHubs, filteredPostcodes, filteredSettlements, filteredSlaRecords, loading, pageSize, paginatedHubs, paginatedPostcodes, paginatedSettlements, paginatedSlaRecords, refreshing, searchQuery, setActiveTab, setCurrentPage, setFilterTier, setPageSize, setSearchQuery, setTimeframe, summary, timeframe
  } = directory;

  return (
    <>
      {loading && !data && (
<div className="min-h-[450px] flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading Reports & Analytics...</p>
        <p className="text-xs text-slate-400 mt-1">Aggregating live delivery data, earnings, and storage space</p>
      </div>
      )}

    <div className="space-y-6">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Reports & Analytics
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track delivery speed, revenue, storage space, and address coverage across Nigeria.
                </p>
              </div>
            </div>
          </div>

          {/* Timeframe & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Selector */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'quarter', label: 'This Quarter' },
                { id: 'all', label: 'All Time' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeframe(t.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all text-xs ${
                    timeframe === t.id
                      ? 'bg-white text-emerald-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchReports(true)}
              disabled={refreshing}
              className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh ledger data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={exportActiveReportCSV}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI SUMMARY CARDS (Stack on small screens: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Gross Revenue */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-bold tracking-wide uppercase text-slate-700">Gross Billings</span>
              <InfoTooltip text="Total customer payments for all bookings before partner payouts" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              ₦{summary.gross_revenue_ngn.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium truncate" title={`₦${summary.hub_payouts_ngn.toLocaleString()} Hubs • ₦${summary.courier_earnings_ngn.toLocaleString()} Drivers`}>
              <span className="text-emerald-700 font-semibold">₦{summary.hub_payouts_ngn.toLocaleString()}</span> Hubs • 
              <span className="text-emerald-700 font-semibold">₦{summary.courier_earnings_ngn.toLocaleString()}</span> Couriers
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Margin (30%):</span>
            <span className="font-bold text-emerald-700">₦{summary.platform_margin_ngn.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 2: On-Time Deliveries */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-bold tracking-wide uppercase text-slate-700">On-Time SLA</span>
              <InfoTooltip text="Percentage of packages delivered within promised schedule (Target: 95%+)" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5 sm:my-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 flex items-baseline gap-2">
              <span>{summary.on_time_delivery_rate_pct}%</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ≥ 95% SLA
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium truncate">
              <span>{summary.total_shipments} Dispatches</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">On The Road:</span>
            <span className="font-bold text-slate-900">{summary.active_transit_parcels} In Transit</span>
          </div>
        </div>

        {/* KPI 3: Hub Storage Space */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-bold tracking-wide uppercase text-slate-500">Hub Storage Space</span>
              <InfoTooltip text="Percentage of locker compartments currently holding packages across all partner hubs" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-slate-900 flex items-baseline gap-2">
              <span>{summary.hub_capacity_utilization_pct}%</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Space Available
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span>{data?.hub_capacity_report?.total_occupied_bays || 6} of {data?.hub_capacity_report?.total_network_bays || 39} Lockers Full</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Late Storage Fees:</span>
            <span className="font-bold text-amber-800">₦{summary.overdue_storage_surcharges_ngn.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 4: Digital Postcodes */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-bold tracking-wide uppercase text-slate-500">Postcodes Usage Rate</span>
              <InfoTooltip text="Percentage of shipments booked using verified official 11-digit alphanumeric digital postcodes (NDAPS)" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-slate-900 flex items-baseline gap-2">
              <span>{summary.postcode_adoption_rate_pct}%</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                98% Found
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span>{data?.postcode_coverage_report?.total_cached_postcodes || 37} Valid Postcodes</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Coverage:</span>
            <span className="font-bold text-indigo-700">{data?.postcode_coverage_report?.total_states_covered || 6} States • {data?.postcode_coverage_report?.total_lgas_covered || 9} LGAs</span>
          </div>
        </div>
      </div>

      {/* 3. REPORT TAB SELECTION (Fixed layout, no horizontal scrollbar) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 px-5 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs with short simple names and no horizontal overflow scrollbar */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {[
              { id: 'speed', label: 'Delivery Speed', icon: Truck, desc: 'Delivery turnaround and on-time records' },
              { id: 'finance', label: 'Revenue & Payouts', icon: Wallet, desc: 'Sales, hub earnings, and driver payouts' },
              { id: 'hubs', label: 'Hub Storage', icon: Store, desc: 'Locker space and parcel dwell times' },
              { id: 'coverage', label: 'Area Coverage', icon: MapPin, desc: 'Postcodes and regional service areas' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Tooltip key={tab.id} content={tab.desc}>
                  <button
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery('');
                      setFilterTier('ALL');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all rounded-t-lg ${
                      isActive
                        ? 'border-emerald-700 text-emerald-800 bg-emerald-50/60'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="pb-3 md:pb-0 w-full md:w-56">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search records..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. DEDICATED TAB CONTENT PANELS */}
        <div className="p-5 sm:p-6">
          {/* TAB 1: DELIVERY SPEED */}
          {activeTab === 'speed' && <DeliverySpeedTab currentPage={directory.currentPage} data={directory.data} filteredSlaRecords={directory.filteredSlaRecords} pageSize={directory.pageSize} paginatedSlaRecords={directory.paginatedSlaRecords} setCurrentPage={directory.setCurrentPage} setPageSize={directory.setPageSize} />}

          {/* TAB 2: REVENUE & PAYOUTS */}
          {activeTab === 'finance' && <RevenuePayoutsTab currentPage={directory.currentPage} filterTier={directory.filterTier} filteredSettlements={directory.filteredSettlements} pageSize={directory.pageSize} paginatedSettlements={directory.paginatedSettlements} setCurrentPage={directory.setCurrentPage} setFilterTier={directory.setFilterTier} setPageSize={directory.setPageSize} summary={directory.summary} />}

          {/* TAB 3: HUB STORAGE */}
          {activeTab === 'hubs' && <HubStorageTab currentPage={directory.currentPage} data={directory.data} filteredHubs={directory.filteredHubs} pageSize={directory.pageSize} paginatedHubs={directory.paginatedHubs} setCurrentPage={directory.setCurrentPage} setPageSize={directory.setPageSize} />}

          {/* TAB 4: AREA COVERAGE */}
          {activeTab === 'coverage' && <AreaCoverageTab currentPage={directory.currentPage} data={directory.data} filterTier={directory.filterTier} filteredPostcodes={directory.filteredPostcodes} pageSize={directory.pageSize} paginatedPostcodes={directory.paginatedPostcodes} setCurrentPage={directory.setCurrentPage} setFilterTier={directory.setFilterTier} setPageSize={directory.setPageSize} />}
        </div>
      </div>
    </div>
    </>
  );
}
