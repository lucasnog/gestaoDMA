import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Inbox, AlertTriangle, Calendar, BarChart3, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../components/ui/Card';

import api from '../services/api.service';
import { useDashboardContext } from '../layouts/DashboardLayout';

function parseDate(d) {
  if (!d) return null;
  if (typeof d === 'string' && d.includes('/')) {
    const [dd, mm, r] = d.split(' ')[0].split('/');
    const [h, mi] = (d.split(' ')[1] || '00:00').split(':');
    return new Date(+r, +mm - 1, +dd, +h || 0, +mi || 0);
  }
  return new Date(d);
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = parseDate(d);
  if (!dt || isNaN(dt)) return d;
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(d) {
  if (!d) return '—';
  const dt = parseDate(d);
  if (!dt || isNaN(dt)) return d;
  const hoje = new Date();
  const diff = Math.floor((hoje - dt) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7) return `${diff} dias atrás`;
  return dt.toLocaleDateString('pt-BR');
}

function statusBadge(proc) {
  if (proc.prioridade) return { label: 'Prioridade', class: 'bg-red-100 text-red-700 border-red-200' };
  return null;
}

function TextoExpansivel({ texto, aberto, aoClicar }) {
  const ref = useRef(null);
  const [temScroll, setTemScroll] = useState(false);

  useEffect(() => {
    if (ref.current) {
      setTemScroll(ref.current.scrollWidth > ref.current.clientWidth);
    }
  }, [texto]);

  return (
    <>
      <button onClick={aoClicar} className="text-left w-full">
        <p ref={ref} className={`text-sm text-slate-600 ${!aberto ? 'truncate' : ''}`}>
          {texto || '—'}
        </p>
      </button>
      {temScroll && (
        <button onClick={aoClicar} className="text-[10px] text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-0.5">
          {aberto ? <><ChevronUp size={12} /> Menos</> : <><ChevronDown size={12} /> Mais</>}
        </button>
      )}
    </>
  );
}

function SeiProcessos() {
  const { search } = useDashboardContext() || {};

  const [processos, setProcessos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [porTipoAberto, setPorTipoAberto] = useState(false);
  const [expanded, setExpanded] = useState(new Set());

  const toggleExpand = useCallback((key) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/sei/processos?limit=200').then(r => r.data),
      api.get('/sei/processos/stats').then(r => r.data),
    ])
      .then(([procs, st]) => {
        setProcessos(procs.data || []);
        setStats(st);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtrados = useMemo(() => {
    let lista = [...processos];
    if (search) {
      const t = search.toLowerCase();
      lista = lista.filter(p =>
        (p.numero_processo && p.numero_processo.toLowerCase().includes(t)) ||
        (p.especificacao && p.especificacao.toLowerCase().includes(t)) ||
        (p.responsavel && p.responsavel.toLowerCase().includes(t)) ||
        (p.tipo && p.tipo.toLowerCase().includes(t))
      );
    }
    if (filtroTipo) lista = lista.filter(p => p.tipo === filtroTipo);
    if (filtroStatus === 'prioridade') lista = lista.filter(p => p.prioridade);
    else if (filtroStatus === 'hoje') {
      const hojeStr = new Date().toISOString().slice(0, 10);
      lista = lista.filter(p => String(p.primeira_vez).startsWith(hojeStr));
    }
    // Ordena: do mais recente ao mais antigo
    lista.sort((a, b) => {
      const da = new Date(a.primeira_vez || 0).getTime();
      const db = new Date(b.primeira_vez || 0).getTime();
      return db - da;
    });
    return lista;
  }, [processos, search, filtroTipo, filtroStatus]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Processos SEI</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Caixa de entrada da Gerência</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          <RefreshCw size={14} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button onClick={() => { setFiltroStatus('todos'); setFiltroTipo(''); }} className="text-left">
            <Card className={`p-3 sm:p-4 border border-slate-100/80 shadow-sm transition-all duration-200 ${filtroStatus === 'todos' && !filtroTipo ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Inbox size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400">Total de processos</p>
                </div>
              </div>
            </Card>
          </button>
          <button onClick={() => { setFiltroStatus(filtroStatus === 'hoje' ? 'todos' : 'hoje'); setFiltroTipo(''); }} className="text-left">
            <Card className={`p-3 sm:p-4 border border-slate-100/80 shadow-sm transition-all duration-200 ${filtroStatus === 'hoje' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Calendar size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.hoje}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400">Recebidos hoje</p>
                </div>
              </div>
            </Card>
          </button>
          <button onClick={() => { setFiltroStatus(filtroStatus === 'prioridade' ? 'todos' : 'prioridade'); setFiltroTipo(''); }} className="text-left">
            <Card className={`p-3 sm:p-4 border border-slate-100/80 shadow-sm transition-all duration-200 ${filtroStatus === 'prioridade' ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.comPrioridade}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-slate-400">Com prioridade</p>
                </div>
              </div>
            </Card>
          </button>
        </div>
      )}

      {stats && stats.porTipo && stats.porTipo.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 rounded-full bg-emerald-600" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Processos por tipo</h3>
          </div>
          <Card className="p-4 border border-slate-100/80 shadow-sm">
            <button onClick={() => setPorTipoAberto(!porTipoAberto)} className="w-full flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Distribuição</span>
              {porTipoAberto ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
          {porTipoAberto && (
            <div className="space-y-2 mt-4">
              {stats.porTipo.map(([tipo, qtd]) => {
                const pct = Math.round((qtd / stats.total) * 100);
                return (
                  <button key={tipo} onClick={() => { setFiltroTipo(filtroTipo === tipo ? '' : tipo); setFiltroStatus('todos'); }} className={`flex items-center gap-3 w-full text-left p-1.5 rounded-lg transition-colors ${filtroTipo === tipo ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-slate-50'}`}>
                    <span className="text-sm text-slate-600 w-48 truncate">{tipo}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-600 w-10 text-right">{qtd}</span>
                    <span className="text-xs text-slate-400 w-10">{pct}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
      )}

      <Card className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Inbox size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-semibold">Nenhum processo encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full">
              <thead>
                <tr className="border-b border-emerald-100/30">
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Processo</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Tipo</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Descrição</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Responsável</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Anotação</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Visto em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.map((proc, i) => {
                  const badge = statusBadge(proc);
                  return (
                    <tr key={proc.numero_processo + '-' + i} className={`hover:bg-slate-50/50 transition-colors ${!proc.visualizado ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {badge && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badge.class}`}>
                              {badge.label}
                            </span>
                          )}
                          <div>
                            <span className={`text-sm font-mono ${!proc.visualizado ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                              {proc.numero_processo}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">{proc.data_anotacao || fmtDate(proc.primeira_vez)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">{proc.tipo || '—'}</span>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <TextoExpansivel texto={proc.especificacao} aberto={expanded.has('desc-' + i)} aoClicar={() => toggleExpand('desc-' + i)} />
                        {proc.marcadores && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{proc.marcadores}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">{proc.responsavel || '—'}</span>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        {proc.anotacao ? (
                          <div>
                            <TextoExpansivel texto={proc.anotacao} aberto={expanded.has('ano-' + i)} aoClicar={() => toggleExpand('ano-' + i)} />
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {proc.usuario_anotacao || ''}{proc.data_anotacao ? ` • ${proc.data_anotacao}` : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500" title={fmtDate(proc.data_anotacao || proc.ultima_vez)}>
                            {fmtDateShort(proc.data_anotacao || proc.ultima_vez)}
                          </p>
                          {proc.retorno_programado && (
                            <p className="text-[10px] text-amber-600 font-medium">Retorno: {proc.retorno_programado}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default SeiProcessos;
