import { useState } from 'react';
import { ChevronRight, ChevronLeft, Info } from 'lucide-react';
// Reusable lightweight tooltip component to prevent long cluttered text
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
              ? 'top-full left-1/2 -translate-x-1/2 mt-2 max-w-[240px] whitespace-normal text-center leading-snug'
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

// Enterprise table pagination bar
function TablePagination({ currentPage, setCurrentPage, pageSize, setPageSize, totalItems, label = 'records' }) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (totalItems <= 0) return null;

  return (
    <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 rounded-b-xl">
      <div className="flex items-center gap-3">
        <div>
          Showing <span className="font-semibold text-slate-900">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to{' '}
          <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalItems}</span> {label}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-semibold focus:outline-none"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 shadow-2xs font-semibold transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>
        <span className="px-2 text-slate-900 font-bold">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 shadow-2xs font-semibold transition-all"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export { Tooltip, InfoTooltip, TablePagination };
