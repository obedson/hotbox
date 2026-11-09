import { Check, CheckCircle2, Mail, Phone, RefreshCw, X } from 'lucide-react';

export default function VerifyContactModal({
  verifyModal, setVerifyModal, verifyOtp, setVerifyOtp, isVerifying,
  handleRequestOtp, handleConfirmVerify
}) {
  if (!verifyModal.isOpen) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  {verifyModal.type === 'phone' ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Verify {verifyModal.type === 'phone' ? 'Phone Number' : 'Email Address'}
                  </h3>
                  <p className="text-[11px] text-slate-500">{verifyModal.destination}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provider & Dispatch Banner */}
            {verifyModal.isLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-600 space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Generating secure 6-digit cryptographic code...</span>
              </div>
            ) : verifyModal.isSent ? (
              <div className="space-y-4">
                {verifyModal.previewOtp ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Verification Code
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono">10m expiry</span>
                    </div>
                    <p className="text-xs text-emerald-900 font-medium">
                      One-Time Passcode (OTP):
                    </p>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-300">
                      <span className="font-mono text-xl font-black text-emerald-700 tracking-widest">
                        {verifyModal.previewOtp}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVerifyOtp(verifyModal.previewOtp)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Autofill Code
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-700 leading-tight">
                      {verifyModal.notice || 'Enter this 6-digit code below to confirm your contact details.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>A verification code has been dispatched to {verifyModal.destination}.</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verifyOtp}
                    onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full border border-slate-300 text-center font-mono font-black text-2xl tracking-[0.4em] rounded-xl py-2.5 focus:border-emerald-600 focus:outline-none bg-slate-50"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    disabled={isVerifying || verifyOtp.trim().length !== 6}
                    onClick={handleConfirmVerify}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm & Verify {verifyModal.type === 'phone' ? 'Phone' : 'Email'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestOtp(verifyModal.type)}
                    className="px-3 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
                  >
                    Resend
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-600">
                  Ready to send a 6-digit confirmation code to <span className="font-bold text-slate-900">{verifyModal.destination}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => handleRequestOtp(verifyModal.type)}
                  className="w-full py-2.5 bg-[#062419] hover:bg-[#0b3827] text-white font-bold text-xs rounded-xl transition"
                >
                  Send Verification Code Now
                </button>
              </div>
            )}
          </div>
        </div>
  );
}
