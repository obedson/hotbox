import { BadgeCheck, Check, FileText, Save, ShieldCheck, X } from 'lucide-react';

export default function CertificateModal({
  isOpen, digitalBox, profile, currentUser, senderLocation, setIsCertificateModalOpen
}) {
  if (!isOpen) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Official NIPOST Proof-of-Address Certificate
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hotbox NDAPS Ground-Truth Verification Network (hotbox.com.ng)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCertificateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Printable Certificate Document Frame */}
            <div id="printable-nipost-certificate" className="border-4 border-double border-emerald-900/30 rounded-2xl p-6 bg-gradient-to-b from-white via-emerald-50/20 to-emerald-100/30 space-y-5 text-center relative overflow-hidden shadow-inner">
              <div className="flex items-center justify-between border-b border-emerald-900/20 pb-3">
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-950">Federal Republic of Nigeria</p>
                  <p className="text-[11px] font-black text-emerald-800">Nigerian Postal Service (NIPOST)</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-black text-[10px] flex items-center justify-center">
                  NG
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-950">Hotbox Network</p>
                  <p className="text-[11px] font-black text-emerald-800">hotbox.com.ng</p>
                </div>
              </div>

              <div className="py-2 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                  Certificate of Ground-Truth Address Verification
                </span>
                <h2 className="text-xl font-serif font-black text-slate-950 pt-2">
                  Official Proof of Address Certificate
                </h2>
                <p className="text-[11px] text-slate-600 max-w-md mx-auto">
                  This document certifies that the doorway and identity of the individual named below have been physically inspected and verified under the National Digital Address & Postcode System (NDAPS).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left bg-white/90 p-4 rounded-xl border border-emerald-900/20 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Registered Citizen</span>
                  <p className="font-bold text-slate-900">{profile?.name || currentUser?.name || 'Citizen'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Digital P.O. Box Anchor</span>
                  <p className="font-mono font-bold text-emerald-800">{digitalBox?.boxNumber || 'HBX-0005'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">NDAPS Digital Postcode</span>
                  <p className="font-mono font-bold text-slate-900">{digitalBox?.activePostcode || 'FC-01-A03-FK-01'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Doorway GPS Check</span>
                  <p className="font-mono font-bold text-emerald-700">&lt; 15m Geofenced Verified</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Physical Verified Address</span>
                  <p className="font-medium text-slate-900">{profile?.postcode_description || senderLocation.address}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">District / LGA</span>
                  <p className="font-medium text-slate-800">{digitalBox?.hierarchy?.district || 'Wuse 2'}, {digitalBox?.hierarchy?.lga || 'Abuja Municipal'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">State / Jurisdiction</span>
                  <p className="font-medium text-slate-800">{digitalBox?.hierarchy?.state || 'Federal Capital Territory'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-emerald-900/20 text-[10px] text-slate-500">
                <div className="text-left">
                  <p className="font-mono font-bold text-slate-800">Certificate No: HBX-CERT-{(profile?.id || '0000').slice(0, 8).toUpperCase()}</p>
                  <p>Issued: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified by NIPOST
                  </span>
                  <p className="text-[9px] text-slate-400">Valid for Banks, KYC & Visas</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCertificateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
  );
}
