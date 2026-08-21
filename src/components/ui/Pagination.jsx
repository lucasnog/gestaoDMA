import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEM_OPTIONS = [5, 10, 20, 50];

const Pagination = ({ page, totalPages, onChange, itemsPerPage, onItemsPerPageChange }) => {
  if (totalPages <= 1 && !onItemsPerPageChange) return null;

  const getVisiblePages = () => {
    const pages = [];
    const range = 1;
    const start = Math.max(1, page - range);
    const end = Math.min(totalPages, page + range);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-3 border-t border-emerald-100/30 flex-wrap">
      {totalPages > 1 && (
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 mr-1">
            <span>Linhas:</span>
            <select
              value={itemsPerPage}
              onChange={e => onItemsPerPageChange?.(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] sm:text-xs font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              {ITEM_OPTIONS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value={Infinity}>Todos</option>
            </select>
          </div>
          <button
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <div className="flex items-center gap-1">
            {visiblePages.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-[11px] text-slate-300">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onChange(p)}
                  className={`min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-200 ${
                    p === page
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                      : 'text-slate-500 hover:bg-emerald-50 hover:text-slate-700'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight size={14} strokeWidth={2} />
          </button>

          <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 ml-1">
            {page} de {totalPages}
          </span>
        </div>
      )}
      {totalPages <= 1 && (
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400">
          <span>Linhas:</span>
          <select
            value={itemsPerPage}
            onChange={e => onItemsPerPageChange?.(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] sm:text-xs font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
          >
            {ITEM_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value={Infinity}>Todos</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default Pagination;
