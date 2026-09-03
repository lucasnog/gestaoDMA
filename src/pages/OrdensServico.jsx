import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  Download,
  BarChart3,
  Activity,
  Eye,
  Loader2,
  X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatDate } from '../utils/formatters';
import * as apiService from '../services/api.service';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import ExpandableText from '../components/ui/ExpandableText';
import ExportDialog from '../components/ui/ExportDialog';
import { useDashboardContext } from '../layouts/DashboardLayout';
import { API_URL, expandirSegmentosSelecionados } from '../config/constants';

const TIPO_CORES = {
  'Início': { bg: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', icon: TrendingUp },
  'Término': { bg: 'from-red-500 to-red-600', shadow: 'shadow-red-500/20', icon: Clock },
  'Reinício': { bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', icon: Activity },
  'Suspensão': { bg: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20', icon: Clock },
  'Alteração': { bg: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20', icon: FileText },
};

const OrdensServico = () => {
  const { selectedBlocos = [], selectedSegmentos = [], search, contratos } = useDashboardContext();
  const [allOs, setAllOs] = useState([]);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriodo, setChartPeriodo] = useState('mes'); // 'dia' | 'mes' | 'trimestre' | 'semestre' | 'ano'
  const [selectedPeriodo, setSelectedPeriodo] = useState(null); // período clicado no gráfico
  const [chartPage, setChartPage] = useState(0);
  const CHART_PER_PAGE = 12;
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [docsContrato, setDocsContrato] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);

  // ─── Carrega PDFs de OS (todos os contratos) ───
  useEffect(() => {
    let active = true;
    apiService.getDocumentosContrato()
      .then((data) => {
        if (!active) return;
        setDocsContrato((data?.documentos || []).filter(d => d.grupo === 'OS'));
      })
      .catch(() => { if (active) setDocsContrato([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!previewDoc) return;
    const handler = (e) => { if (e.key === 'Escape') setPreviewDoc(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [previewDoc]);

  const getDocRelPath = (d) => d?.arquivo ? String(d.arquivo).replace(/\\/g, '/') : null;

  const handleVerDoc = (d) => {
    const relPath = getDocRelPath(d);
    if (!relPath) return;
    setPreviewDoc({ doc: d, url: '', loading: true, error: null });
    apiService.getDocumentoPubToken(relPath)
      .then((data) => {
        if (!data?.token) throw new Error('Sem token');
        const pubUrl = API_URL + '/documentos-contrato/pub/' + data.token;
        setPreviewDoc({ doc: d, url: pubUrl, loading: false, error: null });
      })
      .catch((e) => setPreviewDoc({ doc: d, url: '', loading: false, error: e.message }));
  };

  const handleDownloadDoc = (d) => {
    const relPath = getDocRelPath(d);
    if (!relPath) return;
    apiService.downloadDocumentoContrato(relPath)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = d.nome || relPath.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((e) => alert('Erro: ' + e.message));
  };

  // Mapa de documentos por SEI (numero do arquivo)
  const docsMap = useMemo(() => {
    const map = new Map();
    for (const d of docsContrato) {
      if (d.numero) map.set(String(d.numero), d);
    }
    return map;
  }, [docsContrato]);

  const findDoc = (os) => {
    // Procura o SEI no nome/objeto da OS, ou pelo número do contrato + data
    const osNome = `${os.OBJETO_EXIBICAO || ''} ${os.CONTRATO || ''}`;
    for (const d of docsContrato) {
      if (!d.arquivo) continue;
      const nomeArq = String(d.arquivo).toLowerCase();
      const contratoPasta = String(os.CONTRATO || '').replace('/', '-').toLowerCase();
      if (nomeArq.includes(contratoPasta)) {
        // Tenta bater pela data da OS no nome do arquivo (ex: 2024-08-15)
        const dataOs = (os.DATA_OS || '').replace(/-/g, '');
        const semHifen = dataOs.replace(/-/g, '');
        if (dataOs && (nomeArq.includes(dataOs) || nomeArq.includes(semHifen))) return d;
        // Fallback: se for o único documento desse contrato, usa
        const doContrato = docsContrato.filter(x => x.arquivo && String(x.arquivo).toLowerCase().includes(contratoPasta));
        if (doContrato.length === 1) return d;
      }
    }
    // Fallback: match por SEI no objeto
    const seiMatch = osNome.match(/\b\d{8,17}\b/);
    if (seiMatch && docsMap.has(seiMatch[0])) return docsMap.get(seiMatch[0]);
    // Fallback 2: match por SEI no OS_SEI (ex: "94/2023 (48712027)")
    const seiMatch2 = (os.OS_SEI || '').match(/\b(\d{8,17})\b/);
    if (seiMatch2 && docsMap.has(seiMatch2[1])) return docsMap.get(seiMatch2[1]);
    return null;
  };

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  const getOsId = (os) => `${os.CONTRATO}-${os.DATA_OS}`;

  function toggleSelect(id) {
    setSelectedIds(function(prev) {
      if (prev.includes(id)) return prev.filter(function(x) { return x !== id; });
      return [].concat(prev, [id]);
    });
  }

  function toggleSelectAll() {
    if (selectedIds.length === sortedOs.length) { setSelectedIds([]); }
    else { setSelectedIds(sortedOs.map(function(os) { return getOsId(os); }).filter(Boolean)); }
  }

  const exportColumns = useMemo(() => [
    { key: 'BLOCO_NORM', label: 'Bloco' },
    { key: 'CONTRATO', label: 'Contrato' },
    { key: 'LOTE', label: 'Lote' },
    { key: 'EMPRESA', label: 'Empresa' },
    { key: 'SEGMENTO', label: 'Segmento' },
    { key: 'GERENCIA', label: 'Gerência' },
    { key: 'TIPO_DE_OS', label: 'Tipo' },
    { key: 'NUMERO_OS', label: 'Nº OS' },
    { key: 'DATA_OS', label: 'Data' },
    { key: 'ASSINATURA_OS', label: 'Assinatura' },
    { key: 'PROXIMA_OS', label: 'Próxima OS' },
    { key: 'OS_SEI', label: 'OS/SEI Original' },
    { key: 'PROCESSO_CONTRATO', label: 'Processo' },
    { key: 'DOCUMENTO_SEI_CONTRATO', label: 'Doc. SEI' },
    { key: 'OBJETO_EXIBICAO', label: 'Objeto' },
  ], []);

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

  const getPeriodoKey = (dataOs, periodo) => {
    if (!dataOs) return null;
    if (periodo === 'dia') return dataOs;
    if (periodo === 'mes') return dataOs.substring(0, 7);
    if (periodo === 'trimestre') {
      const m = parseInt(dataOs.substring(5, 7));
      const q = Math.ceil(m / 3);
      return dataOs.substring(0, 4) + '-Q' + q;
    }
    if (periodo === 'semestre') {
      const m = parseInt(dataOs.substring(5, 7));
      const s = m <= 6 ? 1 : 2;
      return dataOs.substring(0, 4) + '-S' + s;
    }
    if (periodo === 'ano') return dataOs.substring(0, 4);
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
    if (tipo === 'trimestre') {
      const parts = periodoKey.split('-Q');
      if (parts.length < 2) return periodoKey;
      return parts[1] + 'º Trim ' + parts[0];
    }
    if (tipo === 'semestre') {
      const parts = periodoKey.split('-S');
      if (parts.length < 2) return periodoKey;
      return parts[1] + 'º Sem ' + parts[0];
    }
    if (tipo === 'dia') {
      const [y, m, d] = periodoKey.split('-');
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${d} ${meses[parseInt(m)-1]} ${y}`;
    }
    return periodoKey;
  };

  const blocoKey = [...selectedBlocos].sort().join(',');
  const segmentoKey = [...selectedSegmentos].sort().join(',');

  useEffect(() => {
    const fetchData = async () => {
      if (!contratos || contratos.length === 0) { setLoading(false); return; }
      setLoading(true);
      try {
        const blocoParam = blocoKey || undefined;
        const segmentoParam = expandirSegmentosSelecionados(selectedSegmentos).join(',') || undefined;
        const searchParam = search || undefined;

        const osResult = await apiService.getOrdensServico({
          bloco: blocoParam,
          segmento: segmentoParam,
          search: searchParam,
          limit: 99999,
        });
        const contratoSet = new Set((contratos || []).map(function(c) { return c.cd_contrato; }).filter(Boolean));
        var osData = (osResult.data || []).filter(function(o) { return contratoSet.has(o.CONTRATO); });

        setAllOs(osData);

        setStats({
          total: osData.length,
          contratos_com_os: new Set(osData.map(o => o.CONTRATO).filter(Boolean)).size,
          primeira_os: osData.reduce((min, r) => !min || r.DATA_OS < min ? r.DATA_OS : min, null),
          ultima_os: osData.reduce((max, r) => !max || r.DATA_OS > max ? r.DATA_OS : max, null),
        });
      } catch (error) {
        console.error('[OS] Erro:', error);
        setAllOs([]);
        setStats(null);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [blocoKey, segmentoKey, search, contratos]);

  // Chart data computado client-side (independente do fetch)
  useEffect(() => {
    const source = selectedIds.length > 0 ? allOs.filter(os => selectedIds.includes(getOsId(os))) : allOs;
    const chartMap = {};
    source.forEach(os => {
      const key = getPeriodoKey(os.DATA_OS, chartPeriodo);
      if (!key) return;
      if (!chartMap[key]) chartMap[key] = { periodo: key, quantidade: 0, contratos: new Set() };
      chartMap[key].quantidade++;
      chartMap[key].contratos.add(os.CONTRATO);
    });
    setChartData(
      Object.values(chartMap)
        .map(g => ({ ...g, contratos: g.contratos.size }))
        .sort((a, b) => a.periodo.localeCompare(b.periodo))
    );
  }, [allOs, chartPeriodo, selectedIds]);

  // Paginação do gráfico
  useEffect(() => { setChartPage(0); }, [chartPeriodo]);
  const newestFirst = [...chartData].reverse();
  const totalChartPages = Math.max(1, Math.ceil(newestFirst.length / CHART_PER_PAGE));
  const safeChartPage = Math.min(chartPage, totalChartPages - 1);
  const pagedChartData = newestFirst.slice(safeChartPage * CHART_PER_PAGE, (safeChartPage + 1) * CHART_PER_PAGE).reverse();

  // Filtro por período (clicou na barra do gráfico)
  const filteredOs = useMemo(() => {
    let result = allOs;
    if (selectedPeriodo) {
      result = result.filter(os => {
        const key = getPeriodoKey(os.DATA_OS, chartPeriodo);
        return key === selectedPeriodo;
      });
    }
    if (selectedIds.length > 0) result = result.filter(os => selectedIds.includes(getOsId(os)));
    return result;
  }, [allOs, selectedPeriodo, chartPeriodo, selectedIds]);

  // Ordenação
  const sortedOs = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredOs;
    return [...filteredOs].sort((a, b) => {
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
  }, [filteredOs, sortConfig]);

  const exportData = useMemo(() =>
    filteredOs.map(os => {
      const m = (os.OS_SEI || '').match(/(?:OS\s*n[ºo]?\s*)?(\d+\/\d{4})/i);
      return { ...os, NUMERO_OS: m ? m[1] : '' };
    }),
    [filteredOs]
  );

  // Paginação
  const totalPages = Math.max(1, Math.ceil(sortedOs.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedOs = sortedOs.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  useEffect(() => { setPage(1); setSelectedPeriodo(null); }, [blocoKey, segmentoKey, search, chartPeriodo]);
  useEffect(() => { setPage(1); }, [itemsPerPage]);

  // KPI Cards
  const kpiCards = [
    {
      label: selectedPeriodo ? 'OS no período' : 'Total de OS',
      value: selectedPeriodo ? filteredOs.length : (stats?.total || 0),
      icon: FileText,
      color: 'from-emerald-600 to-emerald-700',
      shadow: 'shadow-emerald-500/20',
      sub: selectedPeriodo
        ? `${new Set(filteredOs.map(o => o.CONTRATO)).size} contratos`
        : `${stats?.contratos_com_os || 0} contratos com OS`,
    },
    {
      label: 'Primeira OS',
      value: stats?.primeira_os ? formatDate(stats.primeira_os) : '—',
      icon: Calendar,
      color: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
      sub: 'Data da primeira OS',
    },
    {
      label: 'Última OS',
      value: stats?.ultima_os ? formatDate(stats.ultima_os) : '—',
      icon: Calendar,
      color: 'from-teal-500 to-teal-600',
      shadow: 'shadow-teal-500/20',
      sub: 'Data da última OS',
    },
  ];

  // Agrupa OS por contrato para o card de contratos com OS
  const osPorContrato = useMemo(() => {
    const map = {};
    filteredOs.forEach(os => {
      const key = os.CONTRATO;
      if (!map[key]) map[key] = { contrato: key, quantidade: 0, ultima_data: null, lotes: new Set() };
      map[key].quantidade++;
      map[key].lotes.add(os.BLOCO_NORM || '—');
      if (!map[key].ultima_data || os.DATA_OS > map[key].ultima_data) {
        map[key].ultima_data = os.DATA_OS;
      }
    });
    return Object.values(map)
      .map(m => ({ ...m, lotes: [...m.lotes].join(', ') }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredOs]);

  const totalOsValue = selectedPeriodo ? filteredOs.length : (stats?.total || 0);
  // Mostra o badge "X OS registradas" de forma dinâmica
  const badgeLabel = selectedPeriodo
    ? `${filteredOs.length} OS neste período`
    : `${totalOsValue} OS registradas`;

  // Cores para o gráfico
  const CHART_COLORS = ['#0D6B2E', '#1B8C3E', '#34A853', '#4CAF50', '#81C784', '#A5D6A7', '#C8E6C9'];

  if (loading && allOs.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Ordens de Serviço</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Histórico completo de OS</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          <Badge variant="info" size="sm">
            {badgeLabel}
          </Badge>
          <button
            onClick={() => setExportOpen(true)}
            disabled={loading || allOs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {kpiCards.map((kpi, idx) => (
          <Card key={idx} className="p-4 sm:p-5 border border-emerald-100/50 shadow-sm hover:shadow-card transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm ${kpi.shadow} group-hover:scale-110 transition-transform duration-300`}>
                <kpi.icon size={16} className="text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className="text-sm sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight break-words">{kpi.value}</p>
            <p className="text-[8px] sm:text-[9px] text-slate-300 mt-1">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      {/* Chart Section */}
      <Card className="p-4 sm:p-6 border border-emerald-100/50 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-600" strokeWidth={2} />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">OS por Período</h3>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {[
              { key: 'dia', label: 'Dia' },
              { key: 'mes', label: 'Mês' },
              { key: 'trimestre', label: 'Trimestre' },
              { key: 'semestre', label: 'Semestre' },
              { key: 'ano', label: 'Ano' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setChartPeriodo(opt.key)}
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
                    value,
                    name === 'quantidade' ? 'Quantidade' : 'Contratos'
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
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              Nenhum dado disponível para o período selecionado
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

      {/* Table */}
      <Card className="border border-emerald-100/50 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-emerald-100/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-emerald-600" strokeWidth={2} />
            <h3 className="text-[11px] sm:text-sm font-bold text-slate-900">Todas as OS</h3>
            <span className="text-[10px] sm:text-[11px] text-slate-400">({filteredOs.length} registros)</span>
          </div>
          {selectedPeriodo && (
            <button
              onClick={() => { setSelectedPeriodo(null); setPage(1); }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100/80 text-emerald-700 border border-emerald-200 text-[10px] font-semibold hover:bg-emerald-200 transition-colors"
              title="Remover filtro do período"
            >
              {getPeriodoLabel(selectedPeriodo, chartPeriodo)} <span className="text-[9px] ml-0.5">✕</span>
            </button>
          )}
        </div>

        {/* ─── Desktop: tabela ──────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-emerald-100/30 bg-emerald-50/30">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === sortedOs.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Contrato
                </th>
                <th onClick={() => handleSort('TIPO_DE_OS')} className="px-3 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Tipo{sortConfig.key === "TIPO_DE_OS" ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Nº OS
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  SEI
                </th>
                <th onClick={() => handleSort('DATA_OS')} className="px-3 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Data{sortConfig.key === "DATA_OS" ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Observação</th>
                <th className="px-3 sm:px-6 py-3 text-center text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-28">PDF</th>
              </tr>
            </thead>
            <tbody>
              {pagedOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 sm:px-6 py-8 text-center text-slate-400 text-xs">
                    Nenhuma Ordem de Serviço encontrada
                  </td>
                </tr>
              ) : (
                pagedOs.map((os, idx) => {
                  const tipoCor = TIPO_CORES[os.TIPO_DE_OS] || { bg: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20', icon: FileText };
                  const TipoIcon = tipoCor.icon;
                  const numeroOsMatch = (os.OS_SEI || '').match(/(?:OS\s*n[ºo]?\s*)?(\d+\/\d{4})/i);
                  const numeroOs = numeroOsMatch ? numeroOsMatch[1] : '';
                  const seiMatch = (os.OS_SEI || '').match(/\(([^)]+)\)/);
                  const sei = seiMatch ? seiMatch[1] : '';
                  const obsMatch = (os.OS_SEI || '').match(/\)\s*[-–—]\s*(.+)$/);
                  const observacao = obsMatch ? obsMatch[1].trim() : '';
                  return (
                    <tr
                      key={`${os.CONTRATO}-${os.DATA_OS}-${idx}`}
                      className="group transition-all duration-200 hover:bg-emerald-50/40"
                    >
                      <td className="px-3 py-3 w-8" onClick={function(e) { e.stopPropagation(); }}>
                        <input type="checkbox" checked={selectedIds.includes(getOsId(os))} onChange={function() { toggleSelect(getOsId(os)); }} className="w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <span className="text-[11px] sm:text-sm font-semibold text-slate-900 truncate block">{os.CONTRATO}</span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 truncate block">{os.SEGMENTO || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-gradient-to-br ${tipoCor.bg} text-white text-[9px] sm:text-[10px] font-semibold shadow-xs`}>
                          <TipoIcon size={9} strokeWidth={2.5} />
                          {os.TIPO_DE_OS || '—'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        {numeroOs ? (
                          <span className="text-[11px] sm:text-sm font-semibold text-slate-900" title={os.OS_SEI || ''}>
                            {numeroOs}
                          </span>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4" onClick={function(e) { e.stopPropagation(); }}>
                        {sei ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer hover:text-emerald-600 transition-colors" onClick={function(e) { e.stopPropagation(); navigator.clipboard.writeText(sei); }} title="Copiar número SEI">
                            <FileText size={12} className="text-slate-400" />
                            {sei}
                          </span>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="text-[11px] sm:text-sm font-medium text-slate-700">
                          {os.DATA_OS ? formatDate(os.DATA_OS) : '—'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 min-w-[160px] sm:min-w-0">
                        {observacao ? (
                          <ExpandableText text={observacao} maxLines={2} className="text-[10px] sm:text-[11px] text-slate-600 leading-snug" />
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-center" onClick={function(e) { e.stopPropagation(); }}>
                        {findDoc(os) ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVerDoc(findDoc(os)); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
                              title="Visualizar documento"
                            >
                              <Eye size={12} strokeWidth={2} />
                              Ver
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownloadDoc(findDoc(os)); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                              title="Baixar arquivo"
                            >
                              <Download size={12} strokeWidth={2} />
                              Baixar
                            </button>
                          </div>
                        ) : <span className="text-[11px] text-slate-300">—</span>}
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

      {/* Export Dialog */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        data={exportData}
        columns={exportColumns}
        formatters={{
          DATA_OS: formatDate,
          ASSINATURA_OS: formatDate,
          PROXIMA_OS: formatDate,
        }}
        filename="ordens-servico"
        title="Exportar Ordens de Serviço"
      />

      {/* ─── Prévia do PDF (tela cheia) ─────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText size={18} className="text-red-500 shrink-0" />
              <h2 className="font-bold text-gray-800 truncate text-sm min-w-0">
                {previewDoc.doc?.titulo || previewDoc.doc?.nome || 'Documento'}
              </h2>
              <span className="text-xs text-slate-400 uppercase shrink-0">.pdf</span>
            </div>
            <button onClick={() => setPreviewDoc(null)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-auto" title="Fechar (Esc)">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 bg-[#f0f0f0] relative min-h-0">
            {previewDoc.loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <Loader2 size={28} className="animate-spin text-emerald-600" />
              </div>
            )}
            {previewDoc.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <p className="text-red-500 text-sm">Erro: {previewDoc.error}</p>
              </div>
            )}
            {!previewDoc.loading && !previewDoc.error && (
              <iframe
                src={previewDoc.url}
                className="w-full h-full border-0"
                title={previewDoc.doc?.titulo || 'Documento'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdensServico;
