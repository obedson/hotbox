import React, { useState } from 'react';
import LegacyBoxLinkRequests from './operations/LegacyBoxLinkRequests';
import LegacyLinkRemittance from './operations/LegacyLinkRemittance';

const VIEWS = [
  { id: 'queue', label: 'Review queue' },
  { id: 'remittance', label: 'Remittance' }
];

export default function LegacyBoxLinkManagement() {
  const [view, setView] = useState('queue');

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer ${
              view === item.id
                ? 'bg-[#062419] text-white border-[#062419]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {view === 'queue' ? <LegacyBoxLinkRequests /> : <LegacyLinkRemittance />}
    </div>
  );
}