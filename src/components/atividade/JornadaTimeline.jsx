import React from 'react';
import { ArrowRight, Globe, Search, Clock, Loader2, Route } from 'lucide-react';
import { rotuloRota } from '../../utils/rotulosRota';

const nf = new Intl.NumberFormat('pt-BR');

// created_at_local já vem convertido para o horário local pelo backend
// ('YYYY-MM-DD HH:MM:SS') — reformata sem passar por Date.
const formatarHora = (valor) => {
  if (!valor) return '—';
  const hora = String(valor).split(' ')[1];
  if (!hora) return valor;
  return `${hora.slice(0, 5)}`;
};

const formatarDataHora = (valor) => {
  if (!valor) return '—';
  const [data, hora] = String(valor).split(' ');
  if (!data) return String(valor);
  const [ano, mes, dia] = data.split('-');
  const hhmm = hora ? ` ${hora.slice(0, 5)}` : '';
  return `${dia}/${mes}/${ano}${hhmm}`;
};

/**
 * Timeline da trajetória de navegação de um usuário, agrupada por sessão.
 */
const JornadaTimeline = ({ sessoes = [], carregando = false, erro = null, usuario = null }) => {
  if (carregando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-xs">Carregando trajetória...</span>
      </div>
    );
  }

  if (erro) {
    return <p className="text-xs text-red-500 py-16 text-center">{erro}</p>;
  }

  if (!sessoes.length) {
    return (
      <div className="py-14 text-center space-y-1">
        <Route size={22} className="mx-auto text-slate-300" />
        <p className="text-xs text-slate-400">
          {usuario
            ? 'Nenhuma navegação registrada para este usuário no período.'
            : 'Selecione um usuário para ver a trajetória.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
      {sessoes.map((sessao, si) => (
        <div
          key={`${sessao.inicio}-${si}`}
          className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Sessão {si + 1}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock size={11} />
              {formatarDataHora(sessao.inicio)}
              {sessao.duracaoMin > 0 ? ` · ${nf.format(sessao.duracaoMin)} min` : ''}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-1">
            {sessao.passos.map((passo, pi) => (
              <React.Fragment key={`${passo.em}-${pi}`}>
                {pi > 0 && <ArrowRight size={12} className="text-slate-300 shrink-0" />}
                {passo.tipo === 'page' ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-100 text-[11px] font-medium text-slate-700 shadow-sm"
                    title={passo.path}
                  >
                    <Globe size={11} className="text-emerald-600 shrink-0" />
                    {rotuloRota(passo.path)}
                    <span className="text-[9px] text-slate-400">{formatarHora(passo.em)}</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700"
                    title={`Buscou: ${passo.termo}`}
                  >
                    <Search size={11} className="shrink-0" />
                    buscou: <span className="font-semibold truncate max-w-[160px]">{passo.termo}</span>
                    <span className="text-[9px] text-amber-500/80">{formatarHora(passo.em)}</span>
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default JornadaTimeline;
