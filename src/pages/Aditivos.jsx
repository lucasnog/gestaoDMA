import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FilePlus,
  FileText,
  Calendar,
  Building2,
  TrendingUp,
  DollarSign,
  Tag,
  List,
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
import DocumentosContrato from '../components/contract/DocumentosContrato';

const TIPO_CORES = {
  'Readequação': { bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', icon: FilePlus },
  'Prazo': { bg: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20', icon: Calendar },
  'Reequilibrio': { bg: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20', icon: TrendingUp },
  'Prorrogação': { bg: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20', icon: Calendar },
  'Retificação': { bg: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/20', icon: FileText },
  'Aditivo': { bg: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/20', icon: FilePlus },
  'Inclusão': { bg: 'from-teal-500 to-teal-600', shadow: 'shadow-teal-500/20', icon: List },
};

const Aditivos = () => {
  const { selectedBlocos = [], selectedSegmentos = [], search, contratos, customDateStart, customDateEnd, selectedPeriod } = useDashboardContext();
  const [allAditivos, setAllAditivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoFilter, setTipoFilter] = useState([]); // [] = todos
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [selectedContratoId, setSelectedContratoId] = useState(null);
  const [chartPeriodo, setChartPeriodo] = useState('mes');
  const [chartPage, setChartPage] = useState(0);
  const CHART_PER_PAGE = 12;
  const [selectedPeriodo, setSelectedPeriodo] = useState(null);
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

  const getAditivoId = (a) => a.N_DO_ADITIVO || `${a.CONTRATO}-${a.DATA_DA_ASSINATURA}`;

  function toggleSelect(id) {
    setSelectedIds(function(prev) {
      if (prev.includes(id)) return prev.filter(function(x) { return x !== id; });
      return [].concat(prev, [id]);
    });
  }

  function toggleSelectAll() {
    if (selectedIds.length === sortedAditivos.length) { setSelectedIds([]); }
    else { setSelectedIds(sortedAditivos.map(function(a) { return getAditivoId(a); }).filter(Boolean)); }
  }

  const exportColumns = useMemo(() => [
    { key: 'N_DO_ADITIVO', label: 'Nº do Aditivo' },
    { key: 'SEI', label: 'SEI' },
    { key: 'TIPO_DO_ADITIVO', label: 'Tipo' },
    { key: 'DATA_DA_ASSINATURA', label: 'Data da Assinatura' },
    { key: 'VALOR_DO_ADITIVO', label: 'Valor do Aditivo' },
    { key: 'OBJETO', label: 'Objeto' },
    { key: 'OBSERVACOES', label: 'Observações' },
  ], []);

  // Limpa os filtros locais quando o período global muda
  useEffect(() => { setSelectedPeriodo(null); setTipoFilter([]); }, [customDateStart, customDateEnd, selectedPeriod]);

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
        console.log('[Aditivos] Fetching with blocoKey:', blocoKey, 'segmentoKey:', segmentoKey, 'search:', search);

        const aditivosData = await apiService.getAditivos({
          bloco: blocoParam,
          segmento: segmentoParam,
          search: searchParam,
          limit: 99999,
        });
        const contratoSet = new Set((contratos || []).map(function(c) { return c.cd_contrato; }).filter(Boolean));
        var lista = (aditivosData.data || []).filter(function(a) { return a.TIPO_DO_ADITIVO !== 'Apostila' && contratoSet.has(a.CONTRATO); });
        setAllAditivos(lista);
      } catch (error) {
        console.error('[Aditivos] Erro:', error);
        setAllAditivos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [blocoKey, segmentoKey, search, contratos]);

  // ─── Filtro global por período do Header ───
  const withinGlobalPeriod = useCallback((a) => {
    if (selectedPeriod !== 'custom' || !customDateStart) return true;
    if (!a.DATA_DA_ASSINATURA) return false;
    const d = a.DATA_DA_ASSINATURA;
    if (customDateEnd) return d >= customDateStart && d <= customDateEnd;
    return d >= customDateStart;
  }, [selectedPeriod, customDateStart, customDateEnd]);

  // ─── Dados: filtrados por período global + selectedIds (sem selectedPeriodo ou tipoFilter) ───
  // Serve de base para o gráfico (mostra todos os meses do período selecionado no Header)
  const aditivosPeriodo = useMemo(() => {
    let filtered = allAditivos;
    filtered = filtered.filter(a => withinGlobalPeriod(a));
    if (selectedIds.length > 0) filtered = filtered.filter(a => selectedIds.includes(getAditivoId(a)));
    return filtered;
  }, [allAditivos, withinGlobalPeriod, selectedIds]);

  // Chart data: usa aditivosPeriodo (NUNCA filtrado por selectedPeriodo ou tipoFilter)
  const chartData = useMemo(() => {
    const chartMap = {};
    aditivosPeriodo.forEach(a => {
      if (!a.DATA_DA_ASSINATURA) return;
      const key = getPeriodoKey(a.DATA_DA_ASSINATURA, chartPeriodo);
      if (!key) return;
      if (!chartMap[key]) chartMap[key] = { periodo: key, quantidade: 0, valor: 0, contratos: new Set() };
      chartMap[key].quantidade++;
      chartMap[key].valor += a.VALOR_DO_ADITIVO_NUM || 0;
      chartMap[key].contratos.add(a.CONTRATO);
    });
    return Object.values(chartMap)
      .map(g => ({ ...g, contratos: g.contratos.size }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [aditivosPeriodo, chartPeriodo]);

  // ─── Dados para cards de tipo: filtrados por período global + selectedPeriodo (mas NÃO por tipo) ───
  // Os cards sempre mostram todos os tipos disponíveis no período selecionado
  const aditivosCardTipo = useMemo(() => {
    let filtered = aditivosPeriodo;
    if (selectedPeriodo) {
      filtered = filtered.filter(a => {
        if (!a.DATA_DA_ASSINATURA) return false;
        return getPeriodoKey(a.DATA_DA_ASSINATURA, chartPeriodo) === selectedPeriodo;
      });
    }
    return filtered;
  }, [aditivosPeriodo, selectedPeriodo, chartPeriodo]);

  // ─── Dados da tabela/KPIs: filtrados por período global + selectedPeriodo + tipoFilter ───
  const aditivos = useMemo(() => {
    let filtered = aditivosCardTipo;
    if (tipoFilter.length > 0) filtered = filtered.filter(a => tipoFilter.includes(a.TIPO_DO_ADITIVO));
    return filtered;
  }, [aditivosCardTipo, tipoFilter]);

  useEffect(() => { setPage(1); }, [tipoFilter, selectedPeriodo, itemsPerPage]);

  // Stats computados de aditivos (já filtrado por tipo + período)
  const stats = useMemo(() => {
    if (!aditivos.length) return null;
    let totalValorAditivo = 0;
    const byTypeMap = {};
    for (const a of aditivos) {
      totalValorAditivo += parseFloat(a.VALOR_DO_ADITIVO) || 0;
      const tipo = a.TIPO_DO_ADITIVO || 'Outros';
      if (!byTypeMap[tipo]) byTypeMap[tipo] = { TIPO_DO_ADITIVO: tipo, quantidade: 0, total_valor_aditivo: 0 };
      byTypeMap[tipo].quantidade++;
      byTypeMap[tipo].total_valor_aditivo += parseFloat(a.VALOR_DO_ADITIVO) || 0;
    }
    return { total: aditivos.length, totalValorAditivo, byType: Object.values(byTypeMap) };
  }, [aditivos]);

  // Paginação do gráfico: 12 itens por vez (do mais recente para o mais antigo)
  const newestFirst = [...chartData].reverse();
  const totalChartPages = Math.max(1, Math.ceil(newestFirst.length / CHART_PER_PAGE));
  const safeChartPage = Math.min(chartPage, totalChartPages - 1);
  const pagedChartData = newestFirst.slice(safeChartPage * CHART_PER_PAGE, (safeChartPage + 1) * CHART_PER_PAGE).reverse();

  // Reset chart page when period changes
  useEffect(() => { setChartPage(0); }, [chartPeriodo]);

  const sortedAditivos = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return aditivos;
    return [...aditivos].sort((a, b) => {
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
  }, [aditivos, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedAditivos.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedData = sortedAditivos.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const exportData = useMemo(() => {
    return aditivos.map((a) => {
      const seiMatch = (a.N_DO_ADITIVO || '').match(/\(([^)]+)\)/);
      return { ...a, SEI: seiMatch ? seiMatch[1] : '' };
    });
  }, [aditivos]);

  const kpis = useMemo(() => {
    if (!aditivos.length) return null;
    const totalContratos = new Set(aditivos.map(a => a.CONTRATO)).size;
    let totalValor = 0;
    for (const a of aditivos) totalValor += parseFloat(a.VALOR_DO_ADITIVO) || 0;
    return { totalContratos, totalValor };
  }, [aditivos]);

  const tipoCardsData = useMemo(() => {
    if (!aditivosCardTipo.length) return [];
    const byTypeMap = {};
    for (const a of aditivosCardTipo) {
      const tipo = a.TIPO_DO_ADITIVO || 'Outros';
      if (!byTypeMap[tipo]) byTypeMap[tipo] = { quantidade: 0, total_valor_aditivo: 0 };
      byTypeMap[tipo].quantidade++;
      byTypeMap[tipo].total_valor_aditivo += parseFloat(a.VALOR_DO_ADITIVO) || 0;
    }
    return Object.entries(byTypeMap).map(([key, val]) => ({
      key,
      label: key,
      value: val.quantidade,
      valor: val.total_valor_aditivo || 0,
      ...(TIPO_CORES[key] || { bg: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20', icon: Tag }),
    }));
  }, [aditivosCardTipo]);

  function buildContratoId(a) {
    // Converte "Bloco 5" -> "bl5", "Bloco 6.3" -> "bl6.3"
    const blocoNum = (a.BLOCO || '').replace('Bloco ', '');
    // Se tiver BLOCO_NORM (ex: "05"), usa ele, senão usa o número do BLOCO
    const blocoPrefix = a.BLOCO_NORM ? a.BLOCO_NORM.replace(/^0+/, '') : blocoNum;
    // Se BLOCO_NORM for "05", vira "bl5-{contrato}"
    return `bl${blocoPrefix}-${a.CONTRATO}`;
  }

  function getTipoColor(tipo) {
    const map = {
      'Readequação': 'bg-blue-100 text-blue-700 border-blue-200',
      'Prazo': 'bg-purple-100 text-purple-700 border-purple-200',
      'Reequilibrio': 'bg-amber-100 text-amber-700 border-amber-200',
      'Prorrogação': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'Retificação': 'bg-rose-100 text-rose-700 border-rose-200',
      'Aditivo': 'bg-cyan-100 text-cyan-700 border-cyan-200',
      'Inclusão': 'bg-teal-100 text-teal-700 border-teal-200',
    };
    return map[tipo] || 'bg-slate-100 text-slate-700 border-slate-200';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Aditivos</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Readequações, reequilíbrios e aditivos contratuais</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          {tipoFilter.length > 0 && (
            <button
              onClick={() => setTipoFilter([])}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-600/10 text-emerald-600 border border-emerald-600/20 text-[10px] sm:text-[11px] font-semibold hover:bg-emerald-600/20 transition-colors"
            >
              {tipoFilter.join(', ')}
              <span className="text-[9px]">x</span>
            </button>
          )}
          {selectedPeriodo && (
            <button
              onClick={() => setSelectedPeriodo(null)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-blue-600/10 text-blue-600 border border-blue-600/20 text-[10px] sm:text-[11px] font-semibold hover:bg-blue-600/20 transition-colors"
            >
              {selectedPeriodo}
              <span className="text-[9px]">x</span>
            </button>
          )}
          {(tipoFilter.length > 0 || selectedPeriodo) && (
            <button
              onClick={() => { setTipoFilter([]); setSelectedPeriodo(null); }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              Limpar filtros
            </button>
          )}
          <Badge variant="info" size="sm" className="sm:size-lg">
            {loading ? '...' : `${aditivos.length} registros`}
          </Badge>
          <button
            onClick={() => setExportOpen(true)}
            disabled={loading || aditivos.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-5 border border-emerald-100/50">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-sm shadow-emerald-500/20 shrink-0">
                <FilePlus size={14} className="text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[8px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total de Aditivos</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1">{kpis?.totalContratos || 0} contratos envolvidos</p>
          </Card>

          <Card className="p-3 sm:p-5 border border-emerald-100/50">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
                <DollarSign size={14} className="text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[8px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor Total</p>
            <p className="text-xs sm:text-lg lg:text-2xl font-bold text-slate-900 break-all sm:truncate">{formatCurrency(stats.totalValorAditivo || 0)}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1">em aditivos</p>
          </Card>
        </div>
      )}

      {/* Chart Section */}
      <Card className="p-4 sm:p-6 border border-emerald-100/50 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-600" strokeWidth={2} />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Aditivos por Período</h3>
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
                  const periodo = data.activeLabel;
                  setSelectedPeriodo(prev => prev === periodo ? null : periodo);
                  setPage(1);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="periodo"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(v) => getPeriodoLabel(v, chartPeriodo)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  formatter={(value, name) => [
                    name === 'valor' ? `R$ ${(value / 1000000).toFixed(2)}M` : value,
                    name === 'quantidade' ? 'Quantidade' : 'Valor'
                  ]}
                  labelFormatter={(label) => getPeriodoLabel(label, chartPeriodo)}
                />
                <Bar
                  dataKey="quantidade"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {pagedChartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.periodo === selectedPeriodo ? '#059669' : '#D1D5DB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300 text-sm">
              Sem dados para exibir
            </div>
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

      {/* Cards clicáveis por tipo (igual Contratos) */}
      {tipoCardsData.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 rounded-full bg-emerald-600" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipos de Aditivo</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-stretch gap-2 sm:gap-3">
            {tipoCardsData.map((card) => {
              const isActive = tipoFilter.includes(card.key);
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  onClick={() => { setTipoFilter(prev => isActive ? prev.filter(k => k !== card.key) : [...prev, card.key]); setPage(1); }}
                  className={`flex-1 p-2 sm:p-3 rounded-xl border text-left transition-all duration-200 group flex flex-col justify-center cursor-pointer ${
                    isActive
                      ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-400/30 shadow-md'
                      : 'border-slate-100/80 bg-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br ${card.bg} flex items-center justify-center shadow-xs shrink-0`}>
                      <Icon size={10} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm sm:text-[18px] font-bold text-slate-900 leading-none">{card.value}</span>
                  </div>
                  <p className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{card.label}</p>
                  <p className="text-[7px] sm:text-[8px] text-slate-300 mt-0.5 leading-tight">R$ {(card.valor / 1000000).toFixed(1)}M</p>
                </button>
              );
            })}
          </div>
        </>
      )}

      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-emerald-100/30">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === sortedAditivos.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                </th>
                <th onClick={() => handleSort('N_DO_ADITIVO')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  N&deg; do Aditivo{sortConfig.key === 'N_DO_ADITIVO' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  SEI
                </th>
                <th onClick={() => handleSort('TIPO_DO_ADITIVO')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Tipo{sortConfig.key === 'TIPO_DO_ADITIVO' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('DATA_DA_ASSINATURA')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Data{sortConfig.key === 'DATA_DA_ASSINATURA' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('VALOR_DO_ADITIVO')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Valor{sortConfig.key === 'VALOR_DO_ADITIVO' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
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
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                  </tr>
                ))
              ) : pagedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <FileText size={40} className="mx-auto text-emerald-200 mb-4" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-slate-400">Nenhum aditivo encontrado</p>
                    <p className="text-xs text-slate-300 mt-1">Tente ajustar os filtros</p>
                  </td>
                </tr>
              ) : (
                pagedData.map((a, idx) => {
                  const valor = parseFloat(a.VALOR_DO_ADITIVO) || 0;
                  const valorApostila = parseFloat(a.VALOR_DA_APOSTILA) || 0;
                  const valorExibir = valor || valorApostila;
                  const seiMatch = (a.N_DO_ADITIVO || '').match(/\(([^)]+)\)/);
                  const sei = seiMatch ? seiMatch[1] : '';
                  return (
                    <tr key={`${a.CONTRATO}-${a.N_DO_ADITIVO}-${idx}`} onClick={() => setSelectedContratoId(buildContratoId(a))} className="group cursor-pointer transition-all duration-200 hover:bg-emerald-50/40">
                      <td className="px-3 py-3 w-8" onClick={function(e) { e.stopPropagation(); }}>
                        <input type="checkbox" checked={selectedIds.includes(getAditivoId(a))} onChange={function() { toggleSelect(getAditivoId(a)); }} className="w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
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
                      <td className="px-4 py-3"><Badge className={getTipoColor(a.TIPO_DO_ADITIVO)}>{a.TIPO_DO_ADITIVO}</Badge></td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Calendar size={12} className="text-slate-400" />
                          {a.DATA_DA_ASSINATURA ? formatDate(a.DATA_DA_ASSINATURA) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${valorExibir > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {valorExibir > 0 ? formatCurrency(valorExibir) : '—'}
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
          VALOR_DO_ADITIVO: formatCurrency,
          DATA_DA_ASSINATURA: formatDate,
        }}
        filename="aditivos"
        title="Exportar Aditivos"
      />

      {/* ─── PDFs de readequações e retificações baixados do SIDER ─── */}
      <DocumentosContrato grupo="readequacoes" titulo="Readequações (PDF)" />
      <DocumentosContrato grupo="retificacoes" titulo="Retificações (PDF)" />
    </div>
  );
};

export default Aditivos;
