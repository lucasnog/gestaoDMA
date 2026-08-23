import React, { useState, useEffect, useMemo } from 'react';
import {
  FilePlus,
  FileText,
  Calendar,
  Building2,
  TrendingUp,
  DollarSign,
  Tag,
  List,
  BadgeCheck,
  Download,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatCurrency, formatDate } from '../utils/formatters';
import * as apiService from '../services/api.service';
import Card from '../components/ui/Card';
import { useDashboardContext } from '../layouts/DashboardLayout';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import ExportDialog from '../components/ui/ExportDialog';
import ContractDetail from '../components/contract/ContractDetail';

const TIPO_CORES = {
  'Apostila': { bg: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', icon: BadgeCheck },
  'Readequação': { bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', icon: FilePlus },
  'Prazo': { bg: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20', icon: Calendar },
  'Reequilibrio': { bg: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20', icon: TrendingUp },
  'Prorrogação': { bg: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20', icon: Calendar },
  'Retificação': { bg: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/20', icon: FileText },
  'Aditivo': { bg: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/20', icon: FilePlus },
  'Inclusão': { bg: 'from-teal-500 to-teal-600', shadow: 'shadow-teal-500/20', icon: List },
};

const Apostilas = () => {
  const { selectedBlocos = [], selectedSegmentos = [], search, contratos } = useDashboardContext();
  const [allApostilas, setAllApostilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [selectedContratoId, setSelectedContratoId] = useState(null);
  const [chartPeriodo, setChartPeriodo] = useState('mes');
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
  const [chartPage, setChartPage] = useState(0);
  const CHART_PER_PAGE = 12;
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Helpers: período ──────────────────────────────────────
  const getWeekNumber = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const weekNum = Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
    return `${year}-${String(weekNum).padStart(2, '0')}`;
  };

  const getPeriodoKey = (data, periodo) => {
    if (!data) return null;
    if (periodo === 'dia') return data;
    if (periodo === 'semana') return getWeekNumber(data);
    if (periodo === 'mes') return data.substring(0, 7);
    if (periodo === 'ano') return data.substring(0, 4);
    return null;
  };

  const getPeriodoLabel = (periodoKey, tipo) => {
    if (!periodoKey) return '';
    if (tipo === 'ano') {
      return periodoKey;
    }
    if (tipo === 'mes') {
      const [y, m] = periodoKey.split('-');
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${meses[parseInt(m)-1] || m} ${y}`;
    }
    if (tipo === 'semana') {
      const [y, w] = periodoKey.split('-');
      const firstDay = new Date(parseInt(y), 0, 1);
      firstDay.setDate(firstDay.getDate() + (parseInt(w) - 1) * 7);
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${meses[firstDay.getMonth()]} S${w}/${y}`;
    }
    if (tipo === 'dia') {
      const [y, m, d] = periodoKey.split('-');
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${d} ${meses[parseInt(m)-1]} ${y}`;
    }
    return periodoKey;
  };

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  const getApostilaId = (a) => a.N_DO_ADITIVO || `${a.CONTRATO}-${a.DATA_DA_ASSINATURA}`;

  function toggleSelect(id) {
    setSelectedIds(function(prev) {
      if (prev.includes(id)) return prev.filter(function(x) { return x !== id; });
      return [].concat(prev, [id]);
    });
  }

  function toggleSelectAll() {
    if (selectedIds.length === sortedApostilas.length) { setSelectedIds([]); }
    else { setSelectedIds(sortedApostilas.map(function(a) { return getApostilaId(a); }).filter(Boolean)); }
  }

  const exportColumns = useMemo(() => [
    { key: 'N_DO_ADITIVO', label: 'Nº da Apostila' },
    { key: 'SEI', label: 'SEI' },
    { key: 'DATA_DA_ASSINATURA', label: 'Data da Assinatura' },
    { key: 'VALOR_DA_APOSTILA', label: 'Valor da Apostila' },
    { key: 'OBJETO', label: 'Objeto' },
  ], []);

  // Carrega dados filtrados por bloco, segmento e busca (via Header)
  const blocoKey = [...selectedBlocos].sort().join(',');
  const segmentoKey = [...selectedSegmentos].sort().join(',');
  useEffect(() => {
    const fetchData = async () => {
      if (!contratos || contratos.length === 0) { setLoading(false); return; }
      setLoading(true);
      try {
        const blocoParam = blocoKey || undefined;
        const segmentoParam = segmentoKey || undefined;
        const searchParam = search || undefined;
        const data = await apiService.getAditivos({
          bloco: blocoParam,
          segmento: segmentoParam,
          search: searchParam,
          tipo: 'Apostila',
          limit: 99999,
        });
        const contratoSet = new Set((contratos || []).map(function(c) { return c.cd_contrato; }).filter(Boolean));
        var lista = (data.data || []).filter(function(a) { return contratoSet.has(a.CONTRATO); });
        setAllApostilas(lista);
      } catch (error) {
        console.error('[Apostilas] Erro:', error);
        setAllApostilas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [blocoKey, segmentoKey, search, contratos]);

  // Filtro por período (tabela + KPIs)
  const apostilas = useMemo(() => {
    let filtered = allApostilas;
    if (selectedPeriodo) {
      filtered = filtered.filter(a => {
        if (!a.DATA_DA_ASSINATURA) return false;
        return getPeriodoKey(a.DATA_DA_ASSINATURA, chartPeriodo) === selectedPeriodo;
      });
    }
    if (selectedIds.length > 0) filtered = filtered.filter(a => selectedIds.includes(getApostilaId(a)));
    return filtered;
  }, [allApostilas, selectedPeriodo, chartPeriodo, selectedIds]);

  useEffect(() => { setPage(1); }, [selectedPeriodo, itemsPerPage]);

  // Stats
  const stats = useMemo(() => {
    if (!apostilas.length) return null;
    let totalValorApostila = 0;
    for (const a of apostilas) totalValorApostila += parseFloat(a.VALOR_DA_APOSTILA) || 0;
    return { total: apostilas.length, totalValorApostila };
  }, [apostilas]);

  // Chart data: agrupa por período a partir de allApostilas (sempre completo)
  const chartData = useMemo(() => {
    const source = selectedIds.length > 0 ? allApostilas.filter(a => selectedIds.includes(getApostilaId(a))) : allApostilas;
    const chartMap = {};
    source.forEach(a => {
      if (!a.DATA_DA_ASSINATURA) return;
      const key = getPeriodoKey(a.DATA_DA_ASSINATURA, chartPeriodo);
      if (!key) return;
      if (!chartMap[key]) chartMap[key] = { periodo: key, quantidade: 0, valor: 0, contratos: new Set() };
      chartMap[key].quantidade++;
      chartMap[key].valor += a.VALOR_DA_APOSTILA_NUM || 0;
      chartMap[key].contratos.add(a.CONTRATO);
    });
    return Object.values(chartMap).map(g => ({ ...g, contratos: g.contratos.size })).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [allApostilas, chartPeriodo, selectedIds]);

  // Paginação do gráfico: 12 itens por vez
  const newestFirst = [...chartData].reverse();
  const totalChartPages = Math.max(1, Math.ceil(newestFirst.length / CHART_PER_PAGE));
  const safeChartPage = Math.min(chartPage, totalChartPages - 1);
  const pagedChartData = newestFirst.slice(safeChartPage * CHART_PER_PAGE, (safeChartPage + 1) * CHART_PER_PAGE).reverse();

  useEffect(() => { setChartPage(0); }, [chartPeriodo]);

  const sortedApostilas = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return apostilas;
    return [...apostilas].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [apostilas, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedApostilas.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedData = sortedApostilas.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const kpis = useMemo(() => {
    if (!apostilas.length) return null;
    const totalContratos = new Set(apostilas.map(a => a.CONTRATO)).size;
    let totalApostila = 0;
    for (const a of apostilas) totalApostila += parseFloat(a.VALOR_DA_APOSTILA) || 0;
    return { totalContratos, totalApostila };
  }, [apostilas]);

  const exportData = useMemo(() => {
    return apostilas.map((a) => {
      const seiMatch = (a.N_DO_ADITIVO || '').match(/\(([^)]+)\)/);
      return { ...a, SEI: seiMatch ? seiMatch[1] : '' };
    });
  }, [apostilas]);

  const buildContratoId = (a) => {
    const blocoNum = (a.BLOCO || '').replace('Bloco ', '');
    const blocoPrefix = a.BLOCO_NORM ? a.BLOCO_NORM.replace(/^0+/, '') : blocoNum;
    return 'bl' + blocoPrefix + '-' + a.CONTRATO;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Apostilas</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Reajustes contratuais e apostilamentos</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          {selectedPeriodo && (
            <>
              <span className="px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-600 border border-blue-600/20 text-[10px] sm:text-[11px] font-semibold">
                {getPeriodoLabel(selectedPeriodo, chartPeriodo)}
              </span>
              <button
                onClick={() => setSelectedPeriodo(null)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                Limpar filtros
              </button>
            </>
          )}
          <Badge variant="info" size="sm" className="sm:size-lg">
            {loading ? '...' : `${apostilas.length} de ${allApostilas.length}`}
          </Badge>
          <button
            onClick={() => setExportOpen(true)}
            disabled={loading || apostilas.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-5 border border-emerald-100/50">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 shrink-0">
                <BadgeCheck size={14} className="text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[8px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total de Apostilas</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1">{kpis?.totalContratos || 0} contratos envolvidos</p>
          </Card>
          <Card className="p-3 sm:p-5 border border-emerald-100/50">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm shadow-purple-500/20 shrink-0">
                <TrendingUp size={14} className="text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[8px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor Total</p>
            <p className="text-xs sm:text-lg lg:text-2xl font-bold text-slate-900 break-all sm:truncate">{formatCurrency(stats.totalValorApostila || 0)}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1">em apostilas</p>
          </Card>
        </div>
      )}

      {/* Chart Section */}
      <Card className="p-4 sm:p-6 border border-emerald-100/50 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-600" strokeWidth={2} />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Apostilas por Período</h3>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {[
              { key: 'dia', label: 'Dia' },
              { key: 'semana', label: 'Semana' },
              { key: 'mes', label: 'Mês' },
            { key: 'ano', label: 'Ano' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => { setChartPeriodo(opt.key); setSelectedPeriodo(null); }}
                className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all ${
                  chartPeriodo === opt.key
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 sm:h-64 chart-no-focus">
          {pagedChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pagedChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                onClick={(data) => {
                  if (!data?.activeLabel) return;
                  const p = data.activeLabel;
                  setSelectedPeriodo(prev => prev === p ? null : p);
                  setPage(1);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(v) => getPeriodoLabel(v, chartPeriodo)} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value, name) => [name === 'valor' ? `R$ ${(value / 1000000).toFixed(2)}M` : value, name === 'quantidade' ? 'Quantidade' : 'Valor']}
                  labelFormatter={(label) => getPeriodoLabel(label, chartPeriodo)} />
                <Bar dataKey="quantidade" radius={[4, 4, 0, 0]} maxBarSize={40} style={{ cursor: 'pointer', outline: 'none' }}>
                  {pagedChartData.map((entry, idx) => (<Cell key={idx} fill={entry.periodo === selectedPeriodo ? '#059669' : '#D1D5DB'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300 text-sm">Sem dados para exibir</div>
          )}
        </div>
        {totalChartPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-emerald-100/30">
            <button onClick={() => setChartPage(safeChartPage + 1)} disabled={safeChartPage >= totalChartPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              ← Anterior
            </button>
            <span className="text-[11px] font-medium text-slate-400">{safeChartPage + 1} de {totalChartPages}</span>
            <button onClick={() => setChartPage(safeChartPage - 1)} disabled={safeChartPage <= 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Próximo →
            </button>
          </div>
        )}
      </Card>

      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-emerald-100/30">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === sortedApostilas.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                </th>
                <th onClick={() => handleSort('N_DO_ADITIVO')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  N&deg; da Apostila{sortConfig.key === 'N_DO_ADITIVO' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  SEI
                </th>
                <th onClick={() => handleSort('DATA_DA_ASSINATURA')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Data{sortConfig.key === 'DATA_DA_ASSINATURA' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('VALOR_DA_APOSTILA')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Valor{sortConfig.key === 'VALOR_DA_APOSTILA' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/20">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-4" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                  </tr>
                ))
              ) : pagedData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <FileText size={40} className="mx-auto text-emerald-200 mb-4" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-slate-400">Nenhuma apostila encontrada</p>
                    <p className="text-xs text-slate-300 mt-1">Tente ajustar os filtros</p>
                  </td>
                </tr>
              ) : (
                pagedData.map((a, idx) => {
                  const valorApostila = parseFloat(a.VALOR_DA_APOSTILA) || 0;
                  const seiMatch = (a.N_DO_ADITIVO || '').match(/\(([^)]+)\)/);
                  const sei = seiMatch ? seiMatch[1] : '';
                  return (
                    <tr key={`${a.CONTRATO}-${a.N_DO_ADITIVO}-${idx}`} onClick={() => setSelectedContratoId(buildContratoId(a))} className="group cursor-pointer transition-all duration-200 hover:bg-emerald-50/40">
                      <td className="px-3 py-3 w-8" onClick={function(e) { e.stopPropagation(); }}>
                        <input type="checkbox" checked={selectedIds.includes(getApostilaId(a))} onChange={function() { toggleSelect(getApostilaId(a)); }} className="w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3"><span className="text-sm font-semibold text-slate-900">{a.N_DO_ADITIVO ? a.N_DO_ADITIVO.split(' ')[0] : '—'}</span></td>
                      <td className="px-4 py-3" onClick={function(e) { e.stopPropagation(); }}>
                        {sei ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer hover:text-emerald-600 transition-colors" onClick={function(e) { e.stopPropagation(); navigator.clipboard.writeText(sei); }} title="Copiar número SEI">
                            <FileText size={12} className="text-slate-400" />
                            {sei}
                          </span>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Calendar size={12} className="text-slate-400" />
                          {a.DATA_DA_ASSINATURA ? formatDate(a.DATA_DA_ASSINATURA) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${valorApostila > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {valorApostila > 0 ? formatCurrency(valorApostila) : '—'}
                        </span>
                      </td>
                      </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} />
      </Card>
      {/* ─── Modal de Detalhes do Contrato ─────────────── */}
      {selectedContratoId && (
        <ContractDetail
          contratoId={selectedContratoId}
          onClose={() => setSelectedContratoId(null)}
        />
      )}

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        data={exportData}
        columns={exportColumns}
        formatters={{
          VALOR_DA_APOSTILA: formatCurrency,
          DATA_DA_ASSINATURA: formatDate,
        }}
        filename="apostilas"
        title="Exportar Apostilas"
      />
    </div>
  );
};

export default Apostilas;
