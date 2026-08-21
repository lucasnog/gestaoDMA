import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Users, ClipboardList, Medal, ChevronDown, ChevronRight, ChevronLeft, Eye, CalendarX } from 'lucide-react';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import ContractDetail from '../components/contract/ContractDetail';
import { getGestoresPorContrato, getGestoresHistoricoContrato, getGestoresStats } from '../services/api.service';
import { useDashboardContext } from '../layouts/DashboardLayout';

const PAGE_SIZE = 5;

const TIPO_COLORS = {
  'gestor e fiscal': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'gestor': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'fiscal': { bg: 'bg-blue-100', text: 'text-blue-700' },
};
const defaultColor = { bg: 'bg-slate-100', text: 'text-slate-600' };

function tipoClass(tipo) {
  const key = Object.keys(TIPO_COLORS).find(k => tipo?.toLowerCase().includes(k));
  return key ? TIPO_COLORS[key] : defaultColor;
}

function fmtDate(d) {
  if (!d || d === '') return null;
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function normalizeDate(d) {
  if (!d || d === '' || d === '-') return null;
  if (d.includes('/')) {
    const p = d.split('/');
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }
  return d;
}

function isVigente(h) {
  if (!h) return true;
  const df = h.DATA_FINAL ?? h.dataFinal;
  if (df === 'FINALIZADO') return false;
  if (df === '' || df === '-') return false;
  const d = normalizeDate(df);
  if (!d) return true;
  return d >= new Date().toISOString().slice(0, 10);
}

function fmtVigencia(dInicio, dFim) {
  const inicio = fmtDate(dInicio);
  if (dFim === 'FINALIZADO') return inicio ? `${inicio} → Finalizado` : 'Finalizado';
  if (!dFim || dFim === '' || dFim === '-') return inicio || '—';
  const hoje = new Date().toISOString().slice(0, 10);
  const fimNorm = normalizeDate(dFim);
  if (!fimNorm || fimNorm === hoje) {
    return inicio ? `${inicio} → Vigente` : 'Vigente';
  }
  const fim = fmtDate(dFim);
  if (inicio && fim) return `${inicio} → ${fim}`;
  return inicio || fim || '—';
}

const Gestores = () => {
  const { search, selectedBlocos, selectedSegmentos, showBloco61, showBloco62, showBloco7 } = useDashboardContext();
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [expandedContrato, setExpandedContrato] = useState(null);
  const [historicoPorContrato, setHistoricoPorContrato] = useState({});
  const [historicoLoading, setHistoricoLoading] = useState({});
  const [filtroNome, setFiltroNome] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [mostrarAtivos, setMostrarAtivos] = useState(false);
  const [filtrarVencidos, setFiltrarVencidos] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE);
  const [selectedContratoId, setSelectedContratoId] = useState(null);
  const [multiExpand, setMultiExpand] = useState({});
  const [multiPage, setMultiPage] = useState(1);
  const MULTI_PAGE_SIZE = 5;

  function clearFilters() {
    setFiltroNome(null);
    setFiltroTipo(null);
    setPage(1);
  }

  function handleSort(key) {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
    setPage(1);
  }

  const buildParams = useCallback((p, s, sc, fn, ft, ativos, vencidos, limit) => {
    const params = { page: p, limit: limit || PAGE_SIZE };
    if (s) params.busca = s;
    if (sc.key) { params.sortKey = sc.key; params.sortDirection = sc.direction; }
    if (selectedBlocos.length > 0) params.bloco = selectedBlocos.join(',');
    if (selectedSegmentos.length > 0) params.segmento = selectedSegmentos.join(',');
    if (fn) params.filtroNome = fn;
    if (ft) params.tipo = ft;
    if (ativos) params.ativos = 'true';
    if (vencidos) params.vencidos = 'true';
    const excl = [];
    if (!showBloco61) excl.push('6.1');
    if (!showBloco62) excl.push('6.2');
    if (!showBloco7) excl.push('7');
    if (excl.length > 0) params.excludeBlocos = excl.join(',');
    return params;
  }, [selectedBlocos, selectedSegmentos, showBloco61, showBloco62, showBloco7]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(page, search, sortConfig, filtroNome, filtroTipo, mostrarAtivos, filtrarVencidos, itemsPerPage);
      const statsParams = buildParams(1, search, { key: null, direction: null }, null, null, mostrarAtivos, filtrarVencidos);
      const [res, statsRes] = await Promise.all([
        getGestoresPorContrato(params),
        getGestoresStats(statsParams)
      ]);
      setData(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 0);
      setStats(statsRes);
      setExpandedContrato(null);
      setHistoricoPorContrato({});
    } catch (e) {
      console.error('[Gestores]', e);
      setData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [page, search, sortConfig, buildParams, filtroNome, filtroTipo, mostrarAtivos, filtrarVencidos, itemsPerPage]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, selectedBlocos, selectedSegmentos, sortConfig, filtroNome, filtroTipo, mostrarAtivos, filtrarVencidos, itemsPerPage]);
  useEffect(() => { setMultiPage(1); }, [stats?.multiContratos]);

  async function toggleHistorico(contrato) {
    if (expandedContrato === contrato) {
      setExpandedContrato(null);
      return;
    }
    setExpandedContrato(contrato);
    if (!historicoPorContrato[contrato]) {
      setHistoricoLoading(prev => ({ ...prev, [contrato]: true }));
      try {
        const rows = await getGestoresHistoricoContrato(contrato);
        setHistoricoPorContrato(prev => ({ ...prev, [contrato]: rows }));
      } catch (e) {
        console.error('[Gestores] historico', e);
        setHistoricoPorContrato(prev => ({ ...prev, [contrato]: [] }));
      } finally {
        setHistoricoLoading(prev => ({ ...prev, [contrato]: false }));
      }
    }
  }

  const COLUMNS = ['CONTRATO', 'SEGMENTO', 'LOTE', 'NOME', 'TIPO', 'VIGENCIA', 'ART', 'PORTARIA_SEI'];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-8 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/20" />
        <div>
          <h1 className="text-lg font-bold text-slate-900">Gestores e Fiscais</h1>
          </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card padding="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Users size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Pessoas</p>
              <p className="text-xl font-bold text-slate-800">{stats ? stats.totalPessoas : '—'}</p>
            </div>
          </div>
        </Card>

        <Card padding="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ClipboardList size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Contratos</p>
              <p className="text-xl font-bold text-slate-800">{stats ? stats.totalContratos : '—'}</p>
            </div>
          </div>
        </Card>
        <Card padding="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Medal size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Top Gestor</p>
              <p className="text-sm font-bold text-slate-800">
                {stats?.multiContratos?.[0]?.NOME || '—'}
              </p>
              <p className="text-[10px] text-slate-400">
                {stats?.multiContratos?.[0] ? `${stats.multiContratos[0].contratos} contratos` : ''}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="p-4" onClick={() => { setFiltrarVencidos(v => !v); setMostrarAtivos(false); setPage(1); }} className={`cursor-pointer transition-colors ${filtrarVencidos ? 'ring-2 ring-red-400' : 'hover:ring-1 hover:ring-red-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${filtrarVencidos ? 'bg-red-200' : 'bg-red-50'}`}>
              <CalendarX size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Vencidos</p>
              <p className="text-xl font-bold text-slate-800">{stats ? stats.totalVencidos : '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Por Tipo ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading && !stats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="p-3"><Skeleton className="h-12 w-full" /></Card>
          ))
        ) : stats?.porTipo?.length > 0 ? (
          (() => {
            const grouped = {};
            for (const t of stats.porTipo) {
              const norm = t.TIPO.replace(/\bContrato\b/g, 'contrato');
              grouped[norm] = (grouped[norm] || 0) + t.count;
            }
            const total = Object.values(grouped).reduce((s, v) => s + v, 0);
            return Object.entries(grouped).map(([tipo, count]) => (
              <Card key={tipo} padding="p-3"
                onClick={() => { setFiltroTipo(filtroTipo === tipo ? null : tipo); setFiltroNome(null); setPage(1); }}
                className={`cursor-pointer transition-all ${filtroTipo === tipo ? 'ring-2 ring-purple-400 shadow-md' : 'hover:ring-1 hover:ring-purple-200'}`}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tipoClass(tipo).bg}`}>
                      <ClipboardList size={14} className={tipoClass(tipo).text} />
                    </div>
                    <span className="text-xl font-bold text-slate-800">{count}</span>
                  </div>
                  <span className={`text-[10px] font-medium ${tipoClass(tipo).text} leading-tight`}>{tipo}</span>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                    <div className={`h-1.5 rounded-full ${tipoClass(tipo).bg}`} style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              </Card>
            ));
          })()
        ) : (
          <p className="text-xs text-slate-400 text-center py-4 col-span-full">Nenhum dado disponível</p>
        )}
      </div>

      {/* ─── Multi-contratos ─────────────────────────────── */}
      <Card padding="p-0">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Medal size={14} className="text-amber-500" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Multi-contratos</h3>
          <span className="text-[10px] font-normal text-slate-400 normal-case">
            ({stats?.multiContratos?.length || 0})
          </span>
        </div>
        <div>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur z-10">
              <tr className="border-b border-slate-100">
                <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left w-8">#</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left">Nome</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right w-12">Qtde</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-left">Contratos</th>
              </tr>
            </thead>
            <tbody>
              {loading && !stats ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-3 py-2"><Skeleton className="h-3" /></td>
                    ))}
                  </tr>
                ))
              ) : stats?.multiContratos?.length > 0 ? (
                (() => {
                  const multiTotalPages = Math.ceil(stats.multiContratos.length / MULTI_PAGE_SIZE);
                  const paginatedMulti = stats.multiContratos.slice((multiPage - 1) * MULTI_PAGE_SIZE, multiPage * MULTI_PAGE_SIZE);
                  const globalStartIndex = (multiPage - 1) * MULTI_PAGE_SIZE;
                  return paginatedMulti.map((p, i) => {
                    const detalhesPorContrato = new Map();
                    for (const d of (p.contratosDetalhes || [])) {
                      if (!detalhesPorContrato.has(d.contrato)) detalhesPorContrato.set(d.contrato, []);
                      detalhesPorContrato.get(d.contrato).push(d);
                    }
                    const contratosUnicos = [...detalhesPorContrato.entries()].map(([contrato, detalhes]) => ({
                      contrato,
                      vigente: detalhes.some(d => isVigente(d)),
                      inicio: detalhes.map(d => d.dataInicial || '').sort().pop() || ''
                    })).sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''));
                    const expanded = multiExpand[p.NOME] || false;
                    const maxShow = 10;
                    const showing = expanded ? contratosUnicos.length : Math.min(contratosUnicos.length, maxShow);
                    const hasMore = contratosUnicos.length > maxShow;
                    return (
                      <React.Fragment key={globalStartIndex + i}>
                        <tr
                          onClick={() => { setFiltroNome(filtroNome === p.NOME ? null : p.NOME); setFiltroTipo(null); setPage(1); }}
                          className={`border-b border-slate-50 cursor-pointer transition-colors ${filtroNome === p.NOME ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}>
                          <td className="px-3 py-2">
                            <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[9px] font-bold ${
                              globalStartIndex + i === 0 ? 'bg-amber-100 text-amber-700' :
                              globalStartIndex + i === 1 ? 'bg-slate-200 text-slate-600' :
                              globalStartIndex + i === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>{globalStartIndex + i + 1}</span>
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800 max-w-[180px] truncate" title={p.NOME}>{p.NOME}</td>
                          <td className="px-3 py-2 font-semibold text-slate-600 text-right">{p.contratos}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {contratosUnicos.slice(0, showing).map((d, idx) => (
                                <span key={idx} className={`text-[10px] font-mono whitespace-nowrap ${d.vigente ? 'text-emerald-600' : 'text-red-400'}`}>{d.contrato}</span>
                              ))}
                            </div>
                            {hasMore && (
                              <button onClick={e => { e.stopPropagation(); setMultiExpand(prev => ({ ...prev, [p.NOME]: !expanded })); }} className="text-[10px] text-emerald-600 hover:text-emerald-700 mt-1">
                                {expanded ? '⇡ Menos' : `⇣ Mais ${contratosUnicos.length - maxShow}`}
                              </button>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  });
                })()
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-400">Nenhum dado disponível</td>
                </tr>
              )}
            </tbody>
          </table>
          {stats?.multiContratos?.length > MULTI_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2 px-3 py-3 border-t border-slate-100">
              <button onClick={() => setMultiPage(multiPage - 1)} disabled={multiPage <= 1}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
              <span className="text-[10px] font-medium text-slate-400">
                {multiPage} de {Math.ceil(stats.multiContratos.length / MULTI_PAGE_SIZE)}
              </span>
              <button onClick={() => setMultiPage(multiPage + 1)} disabled={multiPage >= Math.ceil(stats.multiContratos.length / MULTI_PAGE_SIZE)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-4">
          <Card padding="p-0">
            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {total} contrato{total !== 1 ? 's' : ''}
              </span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={mostrarAtivos} onChange={e => { setMostrarAtivos(e.target.checked); if (e.target.checked) setFiltrarVencidos(false); }} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-[11px] font-medium text-slate-500">Apenas ativos</span>
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="w-8 px-2 py-3"></th>
                    {COLUMNS.map(col => (
                      <th key={col}
                        onClick={col !== 'VIGENCIA' ? () => handleSort(col) : undefined}
                        className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-left ${col !== 'VIGENCIA' ? 'cursor-pointer hover:text-emerald-600 select-none' : ''} text-slate-400`}>
                        {col === 'NOME' ? 'Gestor' : col === 'TIPO' ? 'Tipo' : col === 'CONTRATO' ? 'Contrato' : col === 'SEGMENTO' ? 'Segmento' : col === 'LOTE' ? 'Lote' : col === 'VIGENCIA' ? 'Vigência' : col === 'ART' ? 'ART' : 'Portaria SEI'}
                        {sortConfig.key === col ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="px-2 py-3"><Skeleton className="w-4 h-4" /></td>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>
                        ))}
                      </tr>
                    ))
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        <UserCheck size={32} className="mx-auto mb-2 opacity-30" />
                        Nenhum contrato encontrado
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const grouped = data.reduce((acc, g) => {
                        if (!acc[g.CONTRATO]) acc[g.CONTRATO] = [];
                        acc[g.CONTRATO].push(g);
                        return acc;
                      }, {});
                      return Object.entries(grouped).map(([contrato, rows]) => {
                        const hasActive = rows.some(r => isVigente(r));
                        const filteredRows = hasActive ? rows.filter(r => isVigente(r)) : rows;
                        const hasGEF = filteredRows.some(r => {
                          const t = String(r.TIPO || '').toLowerCase();
                          return t.includes('gestor') && t.includes('fiscal');
                        });
                        let displayRows;
                        if (hasGEF) {
                          displayRows = [filteredRows
                            .filter(r => {
                              const t = String(r.TIPO || '').toLowerCase();
                              return t.includes('gestor') && t.includes('fiscal');
                            })
                            .sort((a, b) => (b.DATA_INICIAL || '').localeCompare(a.DATA_INICIAL || ''))[0]
                          ].filter(Boolean);
                        } else {
                          const gestorOnlyRows = filteredRows.filter(r => {
                            const t = String(r.TIPO || '').toLowerCase();
                            return t.includes('gestor') && !t.includes('fiscal');
                          });
                          const fiscalRows = filteredRows.filter(r => {
                            const t = String(r.TIPO || '').toLowerCase();
                            return t.includes('fiscal') && !t.includes('gestor');
                          });
                          displayRows = [...gestorOnlyRows, ...fiscalRows];
                        }
                        const contratoInfo = filteredRows[0] || {};
                        const isExpanded = expandedContrato === contrato;
                        const hasHistory = historicoPorContrato[contrato] !== undefined;
                        const displayKeys = new Set(displayRows.map(g => `${g.NOME}|${g.TIPO}|${g.DATA_INICIAL}`));
                        const uniqueHistory = hasHistory && !historicoLoading[contrato]
                          ? historicoPorContrato[contrato].filter(h => !displayKeys.has(`${h.NOME}|${h.TIPO}|${h.DATA_INICIAL}`))
                          : [];
                        return (
                        <React.Fragment key={contrato}>
                          {(displayRows.length > 0 ? displayRows : [contratoInfo]).map((g, i) => (
                            <tr
                              key={contrato + '-' + i}
                              onClick={() => toggleHistorico(contrato)}
                              className={`border-b border-slate-50 transition-colors cursor-pointer ${
                                g.DATA_FINAL === 'FINALIZADO' ? 'bg-slate-100/60 hover:bg-slate-200/60' : isVigente(g) ? 'bg-emerald-100/60 hover:bg-emerald-200/60' : 'bg-red-100/60 hover:bg-red-200/60'
                              }`}
                            >
                              <td className="px-2 py-3 text-slate-400">
                                {i === 0 ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-medium text-slate-800">{g.CONTRATO || '—'}</span>
                                  <button
                                    onClick={e => { e.stopPropagation(); setSelectedContratoId(g.CONTRATO); }}
                                    className="p-1 rounded-md text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="Ver detalhes do contrato"
                                  >
                                    <Eye size={13} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{g.SEGMENTO || '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{g.LOTE || '—'}</td>
                              <td className="px-4 py-3 font-medium text-slate-800">{g.NOME || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${tipoClass(g.TIPO).bg} ${tipoClass(g.TIPO).text}`}>
                                  {g.TIPO || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-[10px]">
                                  {fmtVigencia(g.DATA_INICIAL, g.DATA_FINAL)}
                              </td>
                              <td className="px-4 py-3">
                                {g.POSSUI_ART ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${g.POSSUI_ART === 'SIM' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                      {g.POSSUI_ART}
                                    </span>
                                    {g.POSSUI_ART === 'SIM' && g.DOCUMENTO_ART ? (
                                      <span className="text-[8px] text-slate-400 leading-tight max-w-[80px] truncate" title={g.DOCUMENTO_ART}>{g.DOCUMENTO_ART}</span>
                                    ) : null}
                                  </div>
                                ) : <span className="text-slate-300 text-[10px]">—</span>}
                              </td>
                              <td className="px-4 py-3 text-[10px] text-slate-500 whitespace-nowrap">
                                {(() => {
                                  const m = g.PORTARIA_SEI?.match(/\(([^)]+)\)/);
                                  return m ? (
                                    <span className="cursor-pointer hover:text-emerald-600 transition-colors" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(m[1]); }} title="Copiar número SEI">
                                      {g.PORTARIA_SEI}
                                    </span>
                                  ) : (g.PORTARIA_SEI || '—');
                                })()}
                              </td>
                            </tr>
                          ))}
                          {isExpanded && hasHistory && (
                            historicoLoading[contrato]
                              ? Array.from({ length: 3 }).map((_, j) => (
                                  <tr key={`${contrato}-skel-${j}`}>
                                    <td colSpan={9} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                                  </tr>
                                ))
                              : uniqueHistory.length === 0
                                ? null
                                : uniqueHistory.map((h, hi) => (
                                    <tr
                                      key={`${contrato}-hist-${hi}`}
                                      onClick={() => toggleHistorico(contrato)}
                                      className={`border-b border-slate-50 transition-colors cursor-pointer ${
                                        h.DATA_FINAL === 'FINALIZADO' ? 'bg-slate-100/60 hover:bg-slate-200/60' : isVigente(h) ? 'bg-emerald-100/60 hover:bg-emerald-200/60' : 'bg-red-100/60 hover:bg-red-200/60'
                                      }`}
                                    >
                                      <td className="px-2 py-3 text-slate-400"></td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono font-medium text-slate-800">{contratoInfo.CONTRATO || '—'}</span>
                                          <button
                                            onClick={e => { e.stopPropagation(); setSelectedContratoId(contratoInfo.CONTRATO); }}
                                            className="p-1 rounded-md text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                            title="Ver detalhes do contrato"
                                          >
                                            <Eye size={13} />
                                          </button>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-slate-600">{contratoInfo.SEGMENTO || '—'}</td>
                                      <td className="px-4 py-3 text-slate-600">{contratoInfo.LOTE || '—'}</td>
                                      <td className="px-4 py-3 font-medium text-slate-800">{h.NOME || '—'}</td>
                                      <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${tipoClass(h.TIPO).bg} ${tipoClass(h.TIPO).text}`}>
                                          {h.TIPO || '—'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-slate-500 text-[10px]">
                                        {fmtVigencia(h.DATA_INICIAL, h.DATA_FINAL)}
                                      </td>
                                      <td className="px-4 py-3">
                                        {h.POSSUI_ART ? (
                                          <div className="flex flex-col items-center gap-0.5">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${h.POSSUI_ART === 'SIM' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                              {h.POSSUI_ART}
                                            </span>
                                            {h.POSSUI_ART === 'SIM' && h.DOCUMENTO_ART ? (
                                              <span className="text-[8px] text-slate-400 leading-tight max-w-[80px] truncate" title={h.DOCUMENTO_ART}>{h.DOCUMENTO_ART}</span>
                                            ) : null}
                                          </div>
                                        ) : <span className="text-slate-300 text-[10px]">—</span>}
                                      </td>
                                      <td className="px-4 py-3 text-[10px] text-slate-500 whitespace-nowrap">
                                        {(() => {
                                          const m = h.PORTARIA_SEI?.match(/\(([^)]+)\)/);
                                          return m ? (
                                            <span className="cursor-pointer hover:text-emerald-600 transition-colors" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(m[1]); }} title="Copiar número SEI">
                                              {h.PORTARIA_SEI}
                                            </span>
                                          ) : (h.PORTARIA_SEI || '—');
                                        })()}
                                      </td>
                                    </tr>
                                  ))
                          )}
                        </React.Fragment>
                      );
                    }
                  );
                })()
              )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} />
            </div>
          </Card>
        </div>
      </div>

      {selectedContratoId && (
        <ContractDetail
          contratoId={selectedContratoId}
          onClose={() => setSelectedContratoId(null)}
        />
      )}
    </div>
  );
};

export default Gestores;