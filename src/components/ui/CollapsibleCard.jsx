import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const CollapsibleCard = ({ icon: Icon, title, summary, children, defaultOpen = false, className = "" }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border border-emerald-100/50 bg-white shadow-sm ${className}`}>
      {/* Clickable header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-5 py-4 text-left group cursor-pointer"
      >
        {Icon && <Icon size={15} className="text-slate-400 shrink-0" strokeWidth={2} />}
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {summary && (
          <span className="text-xs font-semibold text-slate-700 ml-1">
            {summary}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-slate-400 group-hover:text-slate-600 transition-colors">
          <span className="text-[10px] font-medium">{open ? "Recolher" : "Expandir"}</span>
          {open ? (
            <ChevronUp size={15} strokeWidth={2} />
          ) : (
            <ChevronDown size={15} strokeWidth={2} />
          )}
        </div>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleCard;
