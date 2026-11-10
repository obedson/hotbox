import { useState } from 'react';
import { Info } from 'lucide-react';
// Reusable lightweight tooltip component to explain courier terms on hover
function Tooltip({ children, content, position = 'top' }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`absolute z-50 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-normal rounded-lg shadow-xl pointer-events-none border border-slate-700 transition-all ${
            position === 'bottom'
              ? 'top-full left-1/2 -translate-x-1/2 mt-2 max-w-[260px] whitespace-normal text-center leading-snug'
              : 'bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap'
          }`}
        >
          {content}
          {position === 'bottom' ? (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900"></div>
          ) : (
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoTooltip({ text, position = 'bottom' }) {
  return (
    <Tooltip content={text} position={position}>
      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer ml-1 inline-block shrink-0" />
    </Tooltip>
  );
}

export { Tooltip, InfoTooltip };
