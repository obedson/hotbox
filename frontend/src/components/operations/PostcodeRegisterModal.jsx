import { MapPin, Copy, X, ExternalLink, HelpCircle } from 'lucide-react';

export default function PostcodeRegisterModal({ isRegisterOpen, postcodes, setIsRegisterOpen }) {
  if (!isRegisterOpen) return null;
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleUp">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">Request Official NDAPS Postcode</h2>
                  <p className="text-xs text-slate-400">Issued exclusively by the Nigerian Postal Service (NIPOST)</p>
                </div>
              </div>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-emerald-950">
                <div className="font-bold flex items-center gap-2 mb-1 text-emerald-900">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  Independent Courier Logistics Notice
                </div>
                <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                  Hotbox does not issue or register digital postcodes. Official alphanumeric digital postcodes for residential and business premises across Nigeria are generated and maintained exclusively by <strong>NIPOST</strong>.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">How to obtain your postcode:</div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  <div className="text-[11px]">Visit the official NIPOST Postcode Portal at <strong className="font-mono text-slate-800">postcode.gov.ng/find</strong>.</div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  <div className="text-[11px]">Select your State, LGA, and enter your street address or landmark.</div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                  <div className="text-[11px]">Copy your official code (e.g. <span className="font-mono font-bold text-emerald-700">FC-01-A05-FK-05</span>) and return to Hotbox to verify coverage or book a delivery.</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Close
                </button>
                <a
                  href="https://postcode.gov.ng/find"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs"
                >
                  <span>Go to Official NIPOST Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
  );
}
