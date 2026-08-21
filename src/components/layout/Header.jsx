import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Layers, Menu, LogOut, User, Eye, EyeOff, Calendar, Check, X } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuthStore } from '../../stores/auth.store';

// ─── Multi-Select Dropdown ─────────────────────────────────
const MultiSelect = ({ label, options, selected, onChange, allLabel = 'Todos' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleOption = (value) => {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const clearAll = () => onChange([]);

    const displayText = selected.length === 0
        ? allLabel
        : selected.length === 1
            ? `${label} ${selected[0]}`
            : `${selected.length} ${label}`;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-1 px-2.5 py-2 rounded-xl border text-[10px] sm:text-[11px] font-semibold transition-all shadow-sm ${
                    selected.length > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-slate-600 border-emerald-100/60 hover:border-emerald-200'
                }`}
            >
                <span className="truncate max-w-[60px] sm:max-w-[100px] lg:max-w-[120px]">{displayText}</span>
                {selected.length > 0 && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-[8px] text-white font-bold">
                        {selected.length}
                    </span>
                )}
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-emerald-100/60 overflow-hidden z-[9999]">
                    <div className="max-h-56 overflow-y-auto py-1">
                        {selected.length > 0 && (
                          <>
                            <button
                                onClick={clearAll}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                <X size={12} strokeWidth={2} />
                                Limpar filtro
                            </button>
                            <div className="border-t border-emerald-100/30 mx-2" />
                          </>
                        )}
                        {options.map((option) => {
                            const isSelected = selected.includes(option);
                            return (
                                <label
                                    key={option}
                                    onClick={() => toggleOption(option)}
                                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-emerald-50/50 transition-colors"
                                >
                                    <div
                                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'bg-emerald-600 border-emerald-600'
                                                : 'border-slate-300 hover:border-emerald-400'
                                        }`}
                                    >
                                        {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-700">{option}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2012 }, (_, i) => String(currentYear - i));

function applyPeriod(years, setCustomDateStart, setCustomDateEnd, setPeriod) {
    if (years.length === 0) {
        setPeriod('all');
        setCustomDateStart('');
        setCustomDateEnd('');
        return;
    }
    var sorted = years.slice().sort();
    setCustomDateStart(sorted[0] + '-01-01');
    setCustomDateEnd(sorted[sorted.length - 1] + '-12-31');
    setPeriod('custom');
}

const Header = ({
    search, setSearch,
    customDateStart, setCustomDateStart,
    customDateEnd, setCustomDateEnd,
    selectedPeriod, setPeriod,
    anosDisponiveis,
    selectedBlocos, setSelectedBlocos,
    selectedStatus, setSelectedStatus,
    selectedSegmentos, setSelectedSegmentos,
    segmentosList,
    blocosDisponiveis,
    showBloco61, setShowBloco61,
    showBloco62, setShowBloco62,
    showBloco7, setShowBloco7,
    onMenuToggle
}) => {
    var [selectedYears, setSelectedYears] = useState([]);

    return (
        <header className="relative z-[9999] space-y-2 sm:space-y-3">
            {/* ── Row 1: Hamburger + Search + Status + Bell ── */}
            <div className="flex items-center gap-2 sm:gap-5">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={onMenuToggle}
                    className="lg:hidden p-2 rounded-xl bg-emerald-50 border border-emerald-100/60 text-emerald-600 hover:bg-emerald-100 transition-colors shrink-0"
                    aria-label="Abrir menu"
                >
                    <Menu size={20} strokeWidth={2} />
                </button>

                {/* Search */}
                <div className="flex-1 min-w-0 relative">
                    <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-emerald-400/60" size={15} strokeWidth={2} />
                    <input
                        type="text"
                        placeholder="Buscar contrato, empresa..."
                        className="w-full bg-white rounded-xl border border-emerald-100/60 py-2.5 sm:py-3 pl-9 sm:pl-11 pr-3 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400/70 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/15 focus:border-emerald-600/30 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <NotificationBell />

                {/* User Menu */}
                <UserMenu />
            </div>

            {/* ── Row 2: Bloco & Segmento Filters ─────────── */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 shrink-0">
                    <Layers size={13} className="text-emerald-500" strokeWidth={2} />
                    <span>Bloco:</span>
                </div>

                <MultiSelect
                    label="Bloco"
                    options={blocosDisponiveis}
                    selected={selectedBlocos}
                    onChange={setSelectedBlocos}
                    allLabel="Todos"
                />

                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 shrink-0 ml-1">
                    <span>Segmento:</span>
                </div>

                <MultiSelect
                    label="Seg."
                    options={segmentosList}
                    selected={selectedSegmentos}
                    onChange={setSelectedSegmentos}
                    allLabel="Todos"
                />

                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 shrink-0 ml-1">
                    <Calendar size={13} className="text-emerald-500" strokeWidth={2} />
                    <span>Ano:</span>
                </div>

                <MultiSelect
                    label="Ano"
                    options={anosDisponiveis || YEARS}
                    selected={selectedYears}
                    onChange={function(v) { setSelectedYears(v); applyPeriod(v, setCustomDateStart, setCustomDateEnd, setPeriod); }}
                    allLabel="Todos"
                />

                {/* Toggles individuais para blocos ocultos */}
                <button
                    onClick={() => setShowBloco61(!showBloco61)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                        showBloco61
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-white text-slate-400 border-emerald-100/60'
                    }`}
                >
                    {showBloco61 ? <Eye size={12} /> : <EyeOff size={12} />}
                    6.1
                </button>
                <button
                    onClick={() => setShowBloco62(!showBloco62)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                        showBloco62
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-white text-slate-400 border-emerald-100/60'
                    }`}
                >
                    {showBloco62 ? <Eye size={12} /> : <EyeOff size={12} />}
                    6.2
                </button>
                <button
                    onClick={() => setShowBloco7(!showBloco7)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                        showBloco7
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-white text-slate-400 border-emerald-100/60'
                    }`}
                >
                    {showBloco7 ? <Eye size={12} /> : <EyeOff size={12} />}
                    7
                </button>
            </div>

        </header>
    );
};

// ─── User Menu (dropdown) ─────────────────────────────────────
const UserMenu = () => {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-100/60 transition-all"
      >
        {user.foto ? (
          <img src={user.foto} alt="" className="w-8 h-8 rounded-full ring-2 ring-emerald-100" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        )}
        <span className="hidden sm:block text-xs font-semibold text-slate-600 max-w-[100px] truncate">
          {user.nome?.split(' ')[0]}
        </span>
        <ChevronDown size={12} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-emerald-100/60 overflow-hidden z-[9999]">
          <div className="px-4 py-3 border-b border-emerald-100/30 bg-emerald-50/30">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.nome}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { logout(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default Header;
