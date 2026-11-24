import { Crosshair, Mail, RefreshCw, ShieldCheck } from 'lucide-react';

function Fact({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700'
  };
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`font-bold text-right ${tones[tone] || tones.slate}`}>{value}</span>
    </div>
  );
}

export default function DigitalBoxActivation({
  digitalBox, wallet, isActivating, onActivate, onRequestGroundTruth, isRequestingGroundTruth
}) {
  const annualFee = Number(digitalBox?.annualFeeNgn) || 0;
  const trialDays = Number(digitalBox?.freeTrialDays) || 0;
  const price = trialDays > 0 ? 0 : annualFee;
  const hasCertificate = Boolean(digitalBox?.certificate);
  const balance = Number(wallet?.balance || 0);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
          <Mail className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-slate-900">Activate Your Digital P.O. Box</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            An optional paid service that receives mail addressed to your box number and follows you when you relocate.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
        <Fact
          label="Annual subscription"
          value={trialDays > 0 ? `Free for ${trialDays} days` : `₦${annualFee.toLocaleString('en-NG')} / year`}
        />
        <Fact label="Wallet balance" value={`₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`} />
        <Fact
          label="Proof of Address"
          value={hasCertificate ? 'Active certificate' : 'Required before activation'}
          tone={hasCertificate ? 'emerald' : 'amber'}
        />
      </div>

      {!hasCertificate && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 space-y-2">
          <p className="font-black">A validated Proof of Address is required first</p>
          <p className="leading-relaxed">
            Complete doorway verification below, then activate your Digital P.O. Box. The two services are billed separately.
          </p>
          <button
            type="button"
            onClick={onRequestGroundTruth}
            disabled={isRequestingGroundTruth}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 hover:text-amber-950 disabled:opacity-50 cursor-pointer"
          >
            {isRequestingGroundTruth
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <Crosshair className="w-3.5 h-3.5" />}
            Request Doorway Verification
          </button>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={onActivate}
          disabled={isActivating || !hasCertificate}
          className="w-full py-2.5 px-4 bg-[#062419] hover:bg-[#0b3827] disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {isActivating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Allocating your number…</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {trialDays > 0
                  ? `Start ${trialDays}-day free trial`
                  : `Activate for ₦${price.toLocaleString('en-NG')}`}
              </span>
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-slate-400">
          {trialDays > 0
            ? `No card is charged today. ₦${annualFee.toLocaleString('en-NG')} applies after ${trialDays} days.`
            : 'Billed annually to your prepaid Hotbox wallet.'}
        </p>
      </div>
    </div>
  );
}