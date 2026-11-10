import { ShieldCheck, ArrowRight, ArrowLeft, Box } from 'lucide-react';
export default function BookingStep3({ booking }) {
  const {
    canProceedStep3, declaredValue, isFragile, packageDescription, setDeclaredValue, setIsFragile, setPackageDescription, setSize, setStep, size, step
  } = booking;

  return (
                <div className="space-y-5 animate-fadeIn">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">3. Package Specifications & Protection</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Select parcel size and packaging specifications.</p>
                  </div>

                  {/* Size Preset Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'small', label: 'Small Pouch', weight: 'Up to 1 kg', desc: 'Documents, flyers, phones, cards', price: '₦1,200' },
                      { id: 'medium', label: 'Standard Box', weight: '1 kg – 5 kg', desc: 'Shoebox, apparel, electronics', price: '₦1,600' },
                      { id: 'large', label: 'Heavy Carton', weight: '5 kg – 15 kg', desc: 'Bulk goods, hampers, appliances', price: '₦2,400' }
                    ].map(sz => {
                      const isSelected = size === sz.id;
                      return (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() => setSize(sz.id)}
                          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900">{sz.label}</span>
                              <Box className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">{sz.weight}</span>
                            <p className="text-[11px] text-slate-500 mt-2 leading-tight">{sz.desc}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">Flat Rate:</span>
                            <span className="text-sm font-black text-emerald-700">{sz.price}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Package Description */}
                  <div>
                    <label className="font-bold text-xs text-slate-700 block mb-1">Package Contents Description</label>
                    <input
                      type="text"
                      required
                      value={packageDescription}
                      onChange={e => setPackageDescription(e.target.value)}
                      placeholder="e.g. Legal documents & bank credentials"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>

                  {/* Declared Value & Protection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-xs text-slate-700 block mb-1">Declared Item Value (₦)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={declaredValue}
                        onChange={e => setDeclaredValue(e.target.value)}
                        placeholder="25000"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 self-end">
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">Fragile Item Tag</span>
                        <span className="text-[10px] text-slate-500">Requires gentle handling</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isFragile}
                        onChange={e => setIsFragile(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Insurance Banner */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-emerald-950 block">
                        Complimentary Hotbox Cargo Protection (Free ₦0.00)
                      </span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Your parcel is insured up to ₦50,000 against loss, theft, or damage with instant automated claim payouts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canProceedStep3}
                      onClick={() => setStep(4)}
                      className="px-6 py-2.5 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Review & Confirm</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
  );
}
