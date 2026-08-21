import React, { useState, useEffect, useMemo } from 'react';
import { FileText, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import Card from '../components/ui/Card';
import { API_URL } from '../config/constants';
import { useDashboardContext } from '../layouts/DashboardLayout';

function formatDate(d) {
  if (!d) return '—';
  const [dd, mm, yyyy] = d.split('/');
  if (!dd || !mm || !yyyy) return d;
  return new Date(+yyyy, +mm - 1, +dd).toLocaleDateString('pt-BR');
}

const FASE_ICONS = {
  Formalização: '📝', Elaboração: '📊', Edital: '📄',
  Licitação: '💸', Contratação: '🤝',
};

function ContratacoesAnaLuisa() {
  const { search } = useDashboardContext() || {};
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(new Set());
  const [datas, setDatas] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [kpiData, setKpiData] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/contratos-ana`).then(r => r.json()).then(j => j.data || []),
      fetch(`${API_URL}/contratos-ana/datas`).then(r => r.json()).then(j => j.data || []),
      fetch(`${API_URL}/contratos-ana/kpis`).then(r => r.json()).then(j => j.data || []),
    ])
      .then(([c, d, k]) => {
        setContratos(c);
        setDatas(d);
        setKpis(k);
        if (d.length > 0) { setDataSelecionada(d[0]); setKpiData(k.find(kk => kk.data === d[0]) || null); }
      })
      .catch(() => { setContratos([]); setDatas([]); setKpis([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const loadData = (data) => {
    setLoading(true);
    const params = data ? `?data=${encodeURIComponent(data)}` : '';
    fetch(`${API_URL}/contratos-ana${params}`)
      .then(r => r.json())
      .then(j => { setContratos(j.data || []); })
      .catch(() => setContratos([]))
      .finally(() => setLoading(false));
  };

  const selecionarData = (data) => {
    setDataSelecionada(data);
    setKpiData(kpis.find(k => k.data === data) || null);
    loadData(data);
  };

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroDiretoria, setFiltroDiretoria] = useState('');
  const [soAlertas, setSoAlertas] = useState(false);

  const tipos = useMemo(() => {
    const s = new Set();
    contratos.forEach(c => { const t = c.tipo; if (t) s.add(t); });
    return [...s].sort();
  }, [contratos]);

  const anos = useMemo(() => {
    const s = new Set();
    contratos.forEach(c => { const a = c.ano; if (a) s.add(a); });
    return [...s].sort().reverse();
  }, [contratos]);

  const diretorias = useMemo(() => {
    const s = new Set();
    contratos.forEach(c => { if (c.diretoria) s.add(c.diretoria); });
    return [...s].sort();
  }, [contratos]);

  const fases = useMemo(() => {
    if (kpiData && kpiData.fases) {
      return Object.entries(kpiData.fases).sort((a, b) => b[1] - a[1]);
    }
    const m = {};
    contratos.forEach(c => { if (c.fase) m[c.fase] = (m[c.fase] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [contratos, kpiData]);

  const filtrados = useMemo(() => {
    let lista = [...contratos];
    if (filtroTipo) lista = lista.filter(c => c.tipo === filtroTipo);
    if (filtroAno) lista = lista.filter(c => c.ano === filtroAno);
    if (filtroDiretoria) lista = lista.filter(c => c.diretoria === filtroDiretoria);
    if (soAlertas) lista = lista.filter(c => c.alerta);
    if (search) {
      const t = search.toLowerCase();
      lista = lista.filter(c =>
        c.nome?.toLowerCase().includes(t) ||
        c.processo_sei?.includes(t) ||
        c.municipios?.toLowerCase().includes(t)
      );
    }
    lista.sort((a, b) => (a.posicao || 99) - (b.posicao || 99));
    return lista;
  }, [contratos, search, filtroTipo, filtroAno, filtroDiretoria, soAlertas]);

  const toggleExpand = (id) => {
    setExpandido(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Andamento das Contratações - Sislog</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Andamento das Contratações — Sislog</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-white border border-slate-200 shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <select
              value={dataSelecionada}
              onChange={e => selecionarData(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
            >
              {datas.map(d => <option key={d} value={d}>{formatDate(d)}</option>)}
            </select>
          </div>
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw size={14} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-4 border border-slate-100/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <FileText size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{kpiData ? kpiData.total : contratos.length}</p>
              <p className="text-[10px] sm:text-xs font-medium text-slate-400">Contratos</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 border border-slate-100/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{kpiData ? kpiData.alertas : contratos.filter(c => c.alerta).length}</p>
              <p className="text-[10px] sm:text-xs font-medium text-slate-400">Alertas</p>
            </div>
          </div>
        </Card>
        {fases.slice(0, 2).map(([nome, qtd]) => (
          <Card key={nome} className="p-3 sm:p-4 border border-slate-100/80 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                {FASE_ICONS[nome] || '📋'}
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{qtd}</p>
                <p className="text-[10px] sm:text-xs font-medium text-slate-400">{nome}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-600 outline-none cursor-pointer">
          <option value="">Tipo: Todos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-600 outline-none cursor-pointer">
          <option value="">Ano: Todos</option>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {diretorias.length > 1 && (
          <select value={filtroDiretoria} onChange={e => setFiltroDiretoria(e.target.value)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-600 outline-none cursor-pointer">
            <option value="">Diretoria: Todas</option>
            {diretorias.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={soAlertas} onChange={e => setSoAlertas(e.target.checked)} className="accent-red-500" />
          🚨 Só alertas
        </label>
      </div>

      {fases.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fases.map(([nome, qtd]) => (
            <span key={nome} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              {FASE_ICONS[nome] || ''} {nome} ({qtd})
            </span>
          ))}
        </div>
      )}

      <Card padding="p-0" className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-semibold">Nenhum contrato encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtrados.map((c) => {
              const faseIcon = FASE_ICONS[c.fase] || '';
              const andamentos = c.andamentos || [];
              const aberto = expandido.has(c.id);
              return (
                <div key={c.id} className={`${c.alerta ? 'bg-red-50/30' : ''}`}>
                  <button
                    onClick={() => toggleExpand(c.id)}
                    className="w-full text-left px-5 py-4 hover:bg-slate-50/50 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!!c.alerta && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">🚨 Alerta</span>}
                        {c.fase ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{faseIcon} {c.fase}</span> : null}
                        {c.valor ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">{c.valor}</span> : null}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 mt-1">{c.nome}</p>
                      <div className="flex gap-3 mt-1 text-[10px] text-slate-400">
                        {c.processo_sei && <span className="font-mono">{c.processo_sei}</span>}
                        {c.municipios && <span>🏙️ {c.municipios}</span>}
                        <span>{andamentos.length} andamento(s)</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-slate-300">
                      {aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>
                  {aberto && andamentos.length > 0 && (
                    <div className="px-5 pb-4 pl-12 space-y-1.5">
                      {andamentos.map((a, i) => (
                        <div key={i} className="flex gap-2 text-[12px] leading-relaxed">
                          <span className="text-slate-400 whitespace-nowrap shrink-0">{formatDate(a.data)}</span>
                          {a.responsavel ? <span className="font-semibold text-emerald-700 whitespace-nowrap shrink-0">{a.responsavel}</span> : null}
                          <span className="text-slate-600">{a.descricao}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default ContratacoesAnaLuisa;
