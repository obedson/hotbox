import { ShieldCheck, Search, Phone } from 'lucide-react';

export default function KycVerifyPanel({ handleKycVerify, kycLoading, kycName, kycPhone, kycPostcode, kycResult, setKycName, setKycPhone, setKycPostcode }) {
  return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">B2B NIPOST Proof of Address Verification API</h3>
                <p className="text-xs text-slate-500">Real-time address ground-truthing, digital P.O. box anchors, and relocation checks for banks & fintechs</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Micro-Charge</span>
              <div className="font-bold text-emerald-700 text-xs">₦150.00 / Query (Net-30 Invoice)</div>
            </div>
          </div>

          <form onSubmit={handleKycVerify} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">NDAPS Postcode</label>
              <input
                type="text"
                value={kycPostcode}
                onChange={e => setKycPostcode(e.target.value.toUpperCase())}
                placeholder="e.g. FC-01-A03-FK-01"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer Phone Number</label>
              <input
                type="text"
                value={kycPhone}
                onChange={e => setKycPhone(e.target.value)}
                placeholder="e.g. +2349063085415"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Legal Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={kycName}
                  onChange={e => setKycName(e.target.value)}
                  placeholder="e.g. Johnson O."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={kycLoading}
                  className="px-4 py-2 bg-[#062419] hover:bg-[#0b3827] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{kycLoading ? 'Querying...' : 'Verify'}</span>
                </button>
              </div>
            </div>
          </form>

          {kycResult && (
            <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    kycResult.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {kycResult.verified ? 'Address Verified' : 'Unverified Address'}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{kycResult.citizenName || 'Resident Query'}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Audit Token: {new Date(kycResult.verifiedAt || Date.now()).toISOString().slice(0, 19)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Certification Status</span>
                  <p className={`font-bold mt-0.5 ${kycResult.isGroundTruthVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {kycResult.proofOfAddressStatus || 'Registry Verified'}
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Digital P.O. Box Anchor</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">
                    {kycResult.digitalBoxNumber || '—'}
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Residency Status</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {kycResult.relocationStatus === 'RELOCATED' ? 'Relocated (Forwarding Active)' : 'Active Doorway Occupant'}
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Jurisdiction / Hierarchy</span>
                  <p className="font-semibold text-slate-700 mt-0.5 truncate">
                    {kycResult.hierarchy?.district || 'Wuse 2'}, {kycResult.hierarchy?.lga || 'Abuja Municipal'}
                  </p>
                </div>
              </div>

              {kycResult.relocationStatus === 'RELOCATED' && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                  <div>
                    <strong>Relocation Notice:</strong> Resident updated address. All incoming mail auto-forwards to new postcode: <span className="font-mono font-bold">{kycResult.forwardingPostcode}</span>.
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-200 font-bold text-[10px]">
                    Auto-Rerouting Active
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
  );
}
