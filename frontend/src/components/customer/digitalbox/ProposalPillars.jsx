import { Anchor, FileBadge, Route } from 'lucide-react';

const PILLARS = [
  {
    icon: Anchor,
    title: '1. Link the old box to a digital anchor',
    body: 'Every legacy P.O. Box number is aliased to a digital P.O. Box, so mail addressed to a box a customer stopped renewing years ago still resolves to a live address.'
  },
  {
    icon: Route,
    title: '2. One postcode, one live address',
    body: 'The NDAPS alphanumeric postcode becomes the routing key. When a customer relocates and updates it, forwarding follows automatically — no returned mail, no manual re-direction.'
  },
  {
    icon: FileBadge,
    title: '3. Proof of Address as a service',
    body: 'A doorway inspection produces a serialised certificate with GPS coordinates and a public verification link that banks, embassies and regulators can check directly.'
  }
];

export default function ProposalPillars() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900">The Hotbox Proposal to NIPOST</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Three changes that turn an abandoned P.O. Box estate into a live national address registry.
          </p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full self-start sm:self-auto">
          Working implementation
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PILLARS.map((pillar) => (
          <div key={pillar.title} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
            <pillar.icon className="w-4 h-4 text-emerald-700" />
            <p className="text-xs font-black text-slate-900">{pillar.title}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">{pillar.body}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Hotbox operates the digital registry, inspection network and certificate issuance shown above. NIPOST remains the
        authoritative postal operator and the source of the national postcode and legacy box estate.
      </p>
    </section>
  );
}