import React, { useState } from "react";
import { ChevronDown, ChevronUp, UserCheck, User, CalendarDays, FileBadge, BadgeCheck } from "lucide-react";
import { formatDate } from "../../utils/formatters";

/**
 * Accordion que exibe o histórico completo de gestores/fiscais de um contrato.
 * Mostra todos os registros ordenados por DATA_INICIAL (mais recente primeiro),
 * destacando o(s) gestor(es) ativo(s).
 */
const HistoricGestoresAccordion = ({ gestores = [] }) => {
  const [open, setOpen] = useState(false);

  if (!gestores || gestores.length === 0) return null;

  const hoje = new Date().toISOString().split("T")[0];

  // Ordena por DATA_INICIAL decrescente (mais recente primeiro)
  const sorted = [...gestores].sort((a, b) => {
    const aDate = a.DATA_INICIAL || "0000-00-00";
    const bDate = b.DATA_INICIAL || "0000-00-00";
    return bDate.localeCompare(aDate);
  });

  // Determina quais estão ativos
  const isAtivo = (g) => {
    if (!g.DATA_FINAL || g.DATA_FINAL.trim() === "") return true;
    return g.DATA_FINAL >= hoje;
  };

  const ativosCount = sorted.filter(isAtivo).length;

  const getRoleVariant = (tipo) => {
    if (!tipo) return "bg-slate-100 text-slate-600 border-slate-200";
    const lower = tipo.toLowerCase();
    if (lower.includes("gestor") && lower.includes("fiscal"))
      return "bg-purple-50 text-purple-700 border-purple-200";
    if (lower.includes("gestor"))
      return "bg-emerald-600/10 text-emerald-600 border-emerald-600/20";
    if (lower.includes("fiscal"))
      return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <div className="select-none">
      {/* Accordion Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-left group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <UserCheck size={15} className="text-slate-400" strokeWidth={2} />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Histórico de Gestores
          </span>
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {gestores.length} registro{gestores.length !== 1 ? "s" : ""}
          </span>
          {ativosCount > 0 && (
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-600/10 px-2 py-0.5 rounded-full">
              {ativosCount} ativo{ativosCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-600 transition-colors">
          <span className="text-[10px] font-medium hidden sm:inline">
            {open ? "Recolher" : "Expandir"}
          </span>
          {open ? (
            <ChevronUp size={15} strokeWidth={2} />
          ) : (
            <ChevronDown size={15} strokeWidth={2} />
          )}
        </div>
      </button>

      {/* Accordion Body */}
      {open && (
        <div className="mt-1 space-y-1.5">
          {sorted.map((g, idx) => {
            const ativo = isAtivo(g);
            return (
              <div
                key={idx}
                className={`
                  flex items-start gap-3 px-3 py-2.5 rounded-lg border text-xs transition-colors
                  ${ativo
                    ? "bg-emerald-600/[0.04] border-emerald-600/20"
                    : "bg-slate-50/50 border-slate-100/80"
                  }
                `}
              >
                {/* Ícone indicador de ativo/inativo */}
                <div className="shrink-0 mt-0.5">
                  {ativo ? (
                    <BadgeCheck size={14} className="text-emerald-600" strokeWidth={2} />
                  ) : (
                    <User size={14} className="text-slate-300" strokeWidth={2} />
                  )}
                </div>

                {/* Informações do gestor */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                    <span
                      className={`font-semibold text-sm ${
                        ativo ? "text-emerald-700" : "text-slate-700"
                      }`}
                    >
                      {g.NOME || "—"}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${getRoleVariant(g.TIPO)}`}
                    >
                      {g.TIPO || "—"}
                    </span>
                    {ativo && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 uppercase tracking-wider">
                        <BadgeCheck size={10} strokeWidth={2.5} />
                        Atual
                      </span>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                    {g.DATA_INICIAL && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={11} strokeWidth={1.5} className="text-slate-400" />
                        {formatDate(g.DATA_INICIAL)}
                        {g.DATA_FINAL ? (
                          <>
                            <span className="text-slate-300">→</span>
                            {formatDate(g.DATA_FINAL)}
                          </>
                        ) : (
                          <span className="text-slate-300">→</span>
                        )}
                      </span>
                    )}
                    {!g.DATA_INICIAL && g.DATA_FINAL && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={11} strokeWidth={1.5} className="text-slate-400" />
                        até {formatDate(g.DATA_FINAL)}
                      </span>
                    )}
                    {/* CPF removido por LGPD */}
                  </div>

                  {g.PORTARIA_SEI && (
                    <div className="flex items-center gap-1 mt-1">
                      <FileBadge size={11} strokeWidth={1.5} className="text-slate-400" />
                      <span className="text-[10px] text-slate-400">
                        Portaria: {g.PORTARIA_SEI}
                      </span>
                    </div>
                  )}

                  {g.OBSERVACOES && (
                    <p className="text-[10px] text-slate-400 italic mt-0.5 leading-relaxed">
                      {g.OBSERVACOES}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoricGestoresAccordion;
