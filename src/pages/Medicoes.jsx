import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Ruler,
  TrendingUp,
  FileText,
  Download,
  DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatCurrency, formatDate } from '../utils/formatters';
import * as apiService from '../services/api.service';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import ContractDetail from '../components/contract/ContractDetail';
import ExportDialog from '../components/ui/ExportDialog';
import { useDashboardContext } from '../layouts/DashboardLayout';
import { CONTRATO_ALVO } from '../config/constants';

const Medicoes = () => {
  const { contratos, contratosRaw, loading, selectedBloco, selectedBlocos, selectedSegmentos, blocosDisponiveis, customDateStart, customDateEnd, selectedPeriod } = useDashboardContext();
  const [monthlyData, setMonthlyData] = useState([]);
  const [monthPage, setMonthPage] = useState(0);
  const MONTHS_PER_PAGE = 12;
  const [selectedContratoId, setSelectedContratoId] = useState(null);
  const [monthlyDetail, setMonthlyDetail] = useState([]);
  const [selectedMes, setSelectedMes] = useState(null);
  const [chartPeriodo, setChartPeriodo] = useState('mes');
  const [dataRef, setDataRef] = useState('periodo');
  const [filtroMedicaoFinal, setFiltroMedicaoFinal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [tablePage, setTablePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [exportOpen, setExportOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [medicoesList, setMedicoesList] = useState([]);
  const [medicoesLoading, setMedicoesLoading] = useState(true);



  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: key.includes('data') ? 'desc' : 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key, direction: null };
      return { key: null, direction: null };
    });
  };

  // ─── Helpers: período ──────────────────────────────────────
  const getPeriodoKey = (data, periodo) => {
    if (!data) return null;
    if (periodo === 'dia') return data;
    if (periodo === 'mes') return data.substring(0, 7);
    if (periodo === 'trimestre') {
      const m = parseInt(data.substring(5, 7));
      const q = Math.ceil(m / 3);
      return data.substring(0, 4) + '-Q' + q;
    }
    if (periodo === 'semestre') {
      const m = parseInt(data.substring(5, 7));
      const s = m <= 6 ? 1 : 2;
      return data.substring(0, 4) + '-S' + s;
    }
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
      if (!m) return periodoKey;
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

  // ─── Funções auxiliares ─────────────────────────────────────
  // Cada contrato já vem com vl_total_medido do banco (valores_contrato)
  const getVlMedido = (c) => parseFloat(c.vl_total_medido || 0);
  const getVlTotal = (c) => parseFloat(c.vl_total || 0);

  // Fetch monthly data + detail conforme dataRef (e período quandoseleciona no gráfico)
  useEffect(() => {
    const periodo = selectedMes && selectedMes.length === 4 ? 'ano' : chartPeriodo;
    Promise.all([
      apiService.getMonthlyMedicoes(selectedBloco, dataRef),
      apiService.getMonthlyMedicoesDetail(selectedBloco, periodo, dataRef),
    ])
      .then(([series, detail]) => {
        setMonthlyData(series || []);
        setMonthlyDetail(detail || []);
      })
      .catch(() => { setMonthlyData([]); setMonthlyDetail([]); });
  }, [selectedBloco, chartPeriodo, dataRef, selectedMes]);

  // Reset table page when filtered contracts or items per page change
  useEffect(() => {
    setTablePage(1);
  }, [contratos, itemsPerPage]);

  // Busca todas as medições do contrato alvo (61/2023)
  useEffect(() => {
    let active = true;
    setMedicoesLoading(true);
    apiService.getContratoDetails(CONTRATO_ALVO.id)
      .then((details) => {
        if (!active) return;
        setMedicoesList(Array.isArray(details?.medicoes) ? details.medicoes : []);
      })
      .catch(() => { if (active) setMedicoesList([]); })
      .finally(() => { if (active) setMedicoesLoading(false); });
    return () => { active = false; };
  }, []);

  // Mapa: mes -> contratos com detalhes (para tooltip e filtro)
  const monthlyDetailFiltrado = React.useMemo(() => {
    if (!Array.isArray(monthlyDetail)) return [];
    const idsValidos = new Set();
    contratos.forEach(c => { if (c.id_bloco) idsValidos.add(c.id_bloco); });
    return monthlyDetail.filter(item => idsValidos.has(item.id_bloco_fk));
  }, [monthlyDetail, contratos]);

  // Filtra dados pelo período selecionado no header (customDateStart/customDateEnd)
  const monthlyDetailPorPeriodo = React.useMemo(() => {
    if (selectedPeriod !== 'custom' || !customDateStart) return monthlyDetailFiltrado;
    const tmpl = chartPeriodo === 'dia' ? 10 : 7;
    const start = customDateStart.substring(0, tmpl);
    const end = customDateEnd ? customDateEnd.substring(0, tmpl) : start;
    return monthlyDetailFiltrado.filter(item => {
      if (!item.mes) return false;
      return item.mes >= start && item.mes <= end;
    });
  }, [monthlyDetailFiltrado, selectedPeriod, customDateStart, customDateEnd, chartPeriodo]);

const detailMap = React.useMemo(() => {
    const map = {};
    const contratoLookup = {};
    contratos.forEach(c => {
      if (c.id_bloco) {
        contratoLookup[c.id_bloco] = {
          nu_bloco: c.nu_bloco,
          segmento: c.segmento,
          razao_social: c.razao_social,
        };
      }
    });

    if (Array.isArray(monthlyDetailPorPeriodo)) {
      monthlyDetailPorPeriodo.forEach(item => {
        if (!item.mes) return;
        if (!map[item.mes]) map[item.mes] = [];
        const lookup = contratoLookup[item.id_bloco_fk] || {};
        map[item.mes].push({
          id_bloco_fk: item.id_bloco_fk,
          cd_contrato: item.cd_contrato,
          nu_bloco: lookup.nu_bloco || item.nu_bloco || null,
          segmento: lookup.segmento || null,
          razao_social: lookup.razao_social || '',
          nr_medicao: item.nr_medicao || null,
          dt_medicao: item.dt_medicao || null,
          dt_periodo_inicio: item.dt_periodo_inicio || null,
          dt_periodo_fim: item.dt_periodo_fim || (item.mes ? item.mes + '-01' : null),
          vl_total: parseFloat(item.vl_total || 0),
          vl_pi: parseFloat(item.vl_pi || 0),
          vl_ra: parseFloat(item.vl_ra || 0),
        });
      });
    }
    return map;
  }, [monthlyDetailPorPeriodo, contratos]);

  const exportColumns = useMemo(function() {
    return [
      { key: 'nr_medicao', label: 'Nº Medição' },
      { key: 'dt_medicao', label: 'Data Medição' },
      { key: 'dt_periodo_inicio', label: 'Início Período' },
      { key: 'dt_periodo_fim', label: 'Fim Período' },
      { key: 'vl_pi', label: 'PI' },
      { key: 'vl_ra', label: 'RA' },
      { key: 'vl_total', label: 'Total Medido' },
    ];
  }, []);

  // Chart data computado do monthlyDetailPorPeriodo agrupado por período
  const chartData = React.useMemo(() => {
    if (!Array.isArray(monthlyDetailPorPeriodo) || monthlyDetailPorPeriodo.length === 0) return [];
    var filtrados = monthlyDetailPorPeriodo;
    if (selectedIds.length > 0) {
      var idSet = new Set(selectedIds);
      filtrados = monthlyDetailPorPeriodo.filter(function(item) { return idSet.has(item.id_bloco_fk); });
    }
    const chartMap = {};
    filtrados.forEach(item => {
      if (!item.mes) return;
      const dataRef = chartPeriodo === 'dia' || chartPeriodo === 'ano' ? item.mes : item.mes + '-01';
      const key = getPeriodoKey(dataRef, chartPeriodo);
      if (!key) return;
      if (!chartMap[key]) chartMap[key] = { periodo: key, quantidade: 0, valor: 0 };
      chartMap[key].quantidade++;
      chartMap[key].valor += parseFloat(item.vl_total || 0);
    });
    return Object.values(chartMap).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [monthlyDetailPorPeriodo, chartPeriodo, selectedIds]);

  // Paginação do gráfico: 12 itens por vez (do mais recente para o mais antigo)
  const newestFirst = [...chartData].reverse();
  const totalChartPages = Math.max(1, Math.ceil(newestFirst.length / MONTHS_PER_PAGE));
  const safeChartPage = Math.min(monthPage, totalChartPages - 1);
  const pagedChartData = newestFirst.slice(safeChartPage * MONTHS_PER_PAGE, (safeChartPage + 1) * MONTHS_PER_PAGE).reverse();

  // Contratos filtrados por período selecionado (mês, ano, etc.)
  const contratosFiltradosMes = React.useMemo(() => {
    if (!selectedMes) return contratos;

    const isAno = selectedMes.length === 4;
    const isDia = chartPeriodo === 'dia';

    // Busca id_bloco_fk direto do monthlyDetailPorPeriodo (filtrado pelo período do header)
    let idsNoMes = new Set();
    (monthlyDetailPorPeriodo || []).forEach(function(item) {
      if (!item.mes) return;
      if (isAno) {
        if (item.mes.startsWith(selectedMes)) idsNoMes.add(item.id_bloco_fk);
      } else if (isDia) {
        if (item.mes === selectedMes) idsNoMes.add(item.id_bloco_fk);
      } else {
        var mk = item.mes.substring(0, 7);
        if (mk === selectedMes.substring(0, 7)) idsNoMes.add(item.id_bloco_fk);
      }
    });
    if (idsNoMes.size === 0) return contratos;

    let filtered = contratos.filter(c => idsNoMes.has(c.id_bloco));
    if (!isAno && !isDia) {
      const mesKey = selectedMes.substring(0, 7);
      if (filtered.length < detailMap[mesKey]?.length) {
        const contratoCdNoMes = new Set(detailMap[mesKey].map(c => c.cd_contrato));
        const extra = contratos.filter(c => {
          if (idsNoMes.has(c.id_bloco)) return false;
          if (contratoCdNoMes.has(c.cd_contrato)) return true;
          for (const cd of contratoCdNoMes) {
            if (c.cd_contrato.startsWith(cd) || cd.startsWith(c.cd_contrato)) return true;
          }
          return false;
        });
        if (extra.length > 0) filtered = [...filtered, ...extra];
      }
    }
    return filtered;
  }, [contratos, selectedMes, detailMap, monthlyDetailPorPeriodo, chartPeriodo]);

  // Filtro "Medição Final" — só contratos com has_medicao_final
  const contratosBase = React.useMemo(function() {
    var lista = selectedMes && contratosFiltradosMes ? contratosFiltradosMes : contratos;
    if (filtroMedicaoFinal) {
      if (selectedMes && selectedMes.length === 4) {
        const dateField = dataRef === 'medicao' ? 'dt_medicao_final' : 'dt_periodo_fim_final';
        lista = lista.filter(function(c) {
          return c.has_medicao_final && c[dateField] && c[dateField].startsWith(selectedMes);
        });
      } else {
        lista = lista.filter(function(c) { return c.has_medicao_final; });
      }
    }
    return lista;
  }, [contratos, contratosFiltradosMes, selectedMes, filtroMedicaoFinal]);

  // KPIs — usa contratosBase (filtro de mês + medição final)
  var contratosKpi = contratosBase;
  if (selectedIds.length > 0) contratosKpi = contratosKpi.filter(function(c) { return selectedIds.includes(c.id_bloco); });
  const kpiMedido = contratosKpi.reduce((acc, c) => acc + getVlMedido(c), 0);
  const kpiInvestido = contratosKpi.reduce((acc, c) => acc + getVlTotal(c), 0);
  const kpiComMedicao = contratosKpi.filter((c) => getVlMedido(c) > 0).length;
  const kpiTotal = contratosKpi.length;
 
  // Valor medido no período selecionado (a partir do monthlyDetailFiltrado)
  var monthlyDetailFiltradoKpi = monthlyDetailPorPeriodo;
  if (selectedIds.length > 0) {
    var idSet = new Set(selectedIds);
    monthlyDetailFiltradoKpi = monthlyDetailPorPeriodo.filter(function(item) { return idSet.has(item.id_bloco_fk); });
  }

  const kpiMedidoPeriodo = React.useMemo(() => {
    if (!selectedMes) {
      const dozeAtras = new Date();
      dozeAtras.setMonth(dozeAtras.getMonth() - 12);
      let total = 0;
      (monthlyDetailFiltradoKpi || []).forEach(item => {
        const refDate = dataRef === 'medicao' ? item.dt_medicao : (item.dt_periodo_fim || item.dt_medicao);
        if (!refDate) return;
        const data = new Date(refDate + 'T12:00:00');
        if (data >= dozeAtras) {
          total += parseFloat(item.vl_total || 0);
        }
      });
      return total;
    }
    let total = 0;
    (monthlyDetailFiltradoKpi || []).forEach(item => {
      const dataSource = chartPeriodo === 'dia' || chartPeriodo === 'ano' ? item.mes : item.mes + '-01';
      const chave = getPeriodoKey(dataSource, chartPeriodo);
      if (chave === selectedMes) {
        total += parseFloat(item.vl_total || 0);
      }
    });
    return total;
  }, [selectedMes, monthlyDetailFiltradoKpi, chartPeriodo, selectedIds, dataRef]);
 
  const kpiRitmoMensal = React.useMemo(() => {
    const meses = {};
    (monthlyDetailFiltradoKpi || []).forEach(item => {
      if (!item.mes) return;
      const mes = item.mes;
      if (!meses[mes]) meses[mes] = 0;
      meses[mes] += parseFloat(item.vl_total || 0);
    });
    const comValor = Object.entries(meses)
      .filter(([_, v]) => v > 0)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 3);
    if (comValor.length === 0) return 0;
    return comValor.reduce((s, [_, v]) => s + v, 0) / comValor.length;
  }, [monthlyDetailFiltradoKpi, selectedIds]);
 
  const periodLabel = selectedMes
    ? getPeriodoLabel(selectedMes, chartPeriodo)
    : "últimos 12 meses";

  const kpiCards = [
    {
      label: 'Investimento Total',
      value: formatCurrency(kpiInvestido),
      icon: DollarSign,
      color: 'from-blue-600 to-blue-700',
      shadow: 'shadow-blue-500/20',
      sub: `${kpiTotal} contratos`,
    },
    {
      label: 'Total Medido',
      value: formatCurrency(kpiMedido),
      icon: Ruler,
      color: 'from-emerald-600 to-emerald-700',
      shadow: 'shadow-emerald-500/20',
      sub: `${kpiComMedicao} de ${kpiTotal} contratos com medição`,
    },
    {
      label: `Medido (${periodLabel})`,
      value: formatCurrency(kpiMedidoPeriodo),
      icon: TrendingUp,
      color: 'from-emerald-600 to-emerald-500',
      shadow: 'shadow-emerald-500/25',
      sub: 'Total no período selecionado',
    },
    {
      label: 'Ritmo Médio Mensal',
      value: formatCurrency(kpiRitmoMensal),
      icon: BarChart3,
      color: 'from-teal-500 to-emerald-600',
      shadow: 'shadow-teal-500/20',
      sub: 'média dos últimos 3 meses',
    },
  ];

  // Ordenação da lista de medições (por padrão, Nº desc)
  const sortedMedicoes = React.useMemo(() => {
    const list = [...medicoesList];
    if (sortConfig.key && sortConfig.direction) {
      list.sort((a, b) => {
        let aVal, bVal;
        if (sortConfig.key === 'dt_medicao' || sortConfig.key === 'dt_periodo_inicio' || sortConfig.key === 'dt_periodo_fim') {
          aVal = a[sortConfig.key] || '';
          bVal = b[sortConfig.key] || '';
        } else {
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
        }
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
    } else {
      list.sort((a, b) => (parseInt(b.nr_medicao) || 0) - (parseInt(a.nr_medicao) || 0));
    }
    return list;
  }, [medicoesList, sortConfig]);

  const totalTablePages = Math.max(1, Math.ceil(sortedMedicoes.length / itemsPerPage));
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const pagedMedicoes = sortedMedicoes.slice((safeTablePage - 1) * itemsPerPage, safeTablePage * itemsPerPage);

  const exportData = React.useMemo(() => {
    return sortedMedicoes.map((m) => ({
      nr_medicao: m.nr_medicao,
      dt_medicao: m.dt_medicao,
      dt_periodo_inicio: m.dt_periodo_inicio,
      dt_periodo_fim: m.dt_periodo_fim,
      vl_pi: parseFloat(m.vl_pi || 0),
      vl_ra: parseFloat(m.vl_ra || 0),
      vl_total: parseFloat(m.vl_total || 0) || (parseFloat(m.vl_pi || 0) + parseFloat(m.vl_ra || 0)),
    }));
  }, [sortedMedicoes]);

  const chartCss = `
    .recharts-wrapper *:focus,
    .recharts-wrapper *:focus-visible,
    .recharts-surface,
    .recharts-bar-rectangle {
      outline: none !important;
    }
  `;

  return (
    <>
      <style>{chartCss}</style>
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Medições</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            Histórico e acompanhamento de medições
            {selectedBloco && <span className="text-emerald-500 font-medium"> — Bloco {selectedBloco}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          {selectedMes && (
            <>
              <span className="px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-600 border border-blue-600/20 text-[10px] sm:text-[11px] font-semibold">
                {getPeriodoLabel(selectedMes, chartPeriodo)}
              </span>
              <button
                onClick={() => setSelectedMes(null)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                Limpar filtros
              </button>
            </>
          )}
          <button
            onClick={() => setExportOpen(true)}
            disabled={medicoesLoading || sortedMedicoes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </button>
        </div>
      </div>

      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {kpiCards.map((kpi, idx) => (
          <Card key={idx} className="p-3 sm:p-4 lg:p-5 border border-emerald-100/50 shadow-sm hover:shadow-card transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm ${kpi.shadow} group-hover:scale-110 transition-transform duration-300`}>
                <kpi.icon size={14} className="text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap">{kpi.value}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      {/* Chart Section */}
      <Card className="p-4 sm:p-6 border border-emerald-100/50 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-600" strokeWidth={2} />
            <span className="text-xs sm:text-sm font-bold text-slate-900 mr-1">Medições por:</span>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              {[
                { key: 'periodo', label: 'Período' },
                { key: 'medicao', label: 'Medição' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setDataRef(opt.key); setSelectedMes(null); setMonthPage(0); }}
                  className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all ${
                    dataRef === opt.key
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
                onClick={() => { setChartPeriodo(opt.key); setSelectedMes(null); }}
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
                  setSelectedMes(prev => prev === periodo ? null : periodo);
                  setTablePage(1);
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
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value) => [formatCurrency(value), 'Valor']}
                  labelFormatter={(label) => getPeriodoLabel(label, chartPeriodo)}
                  cursor={{ fill: '#f0fdf4' }}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={40} style={{ cursor: 'pointer', outline: 'none' }}>
                  {pagedChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.periodo === selectedMes ? '#059669' : '#D1D5DB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300 text-sm">Nenhum dado de medição disponível</div>
          )}
        </div>
        {totalChartPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-emerald-100/30">
            <button onClick={() => setMonthPage(safeChartPage + 1)} disabled={safeChartPage >= totalChartPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              ← Anterior
            </button>
            <span className="text-[11px] font-medium text-slate-400">{safeChartPage + 1} de {totalChartPages}</span>
            <button onClick={() => setMonthPage(safeChartPage - 1)} disabled={safeChartPage <= 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Próximo →
            </button>
          </div>
        )}
      </Card>

{/* Tabela de Medições do Contrato */}
      <Card padding="p-0" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-100/30 bg-emerald-50/30 flex items-center gap-2.5 flex-wrap">
          <Ruler size={16} className="text-emerald-600" strokeWidth={2} />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Medições
          </span>
          <span className="text-[10px] font-medium text-slate-400 ml-2">{medicoesList.length} registros · {CONTRATO_ALVO.label}</span>
        </div>

        {/* ─── Desktop: tabela completa ─────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-emerald-100/30">
                <th onClick={() => handleSort('nr_medicao')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none w-16">
                  Nº{sortConfig.key === 'nr_medicao' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('dt_medicao')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Data Medição{sortConfig.key === 'dt_medicao' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Período
                </th>
                <th onClick={() => handleSort('vl_pi')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none text-right">
                  PI{sortConfig.key === 'vl_pi' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('vl_ra')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none text-right">
                  RA{sortConfig.key === 'vl_ra' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('vl_total')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none text-right">
                  Total{sortConfig.key === 'vl_total' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/20">
              {medicoesLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className={`h-6 ${j === 0 ? 'w-10' : 'w-20'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pagedMedicoes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <FileText size={40} className="mx-auto text-emerald-200 mb-4" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-slate-400">Nenhuma medição encontrada</p>
                    <p className="text-xs text-slate-300 mt-1">Tente ajustar os filtros no painel principal</p>
                  </td>
                </tr>
              ) : (
                pagedMedicoes.map((m, idx) => {
                  const pi = parseFloat(m.vl_pi || 0);
                  const ra = parseFloat(m.vl_ra || 0);
                  const total = parseFloat(m.vl_total || 0) || pi + ra;
                  return (
                    <tr
                      key={`${m.nr_medicao}-${idx}`}
                      onClick={() => setSelectedContratoId(CONTRATO_ALVO.id)}
                      className="group cursor-pointer transition-all duration-200 hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100/50 text-[11px] font-semibold text-emerald-700">
                          {m.nr_medicao ? `${m.nr_medicao}ª` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">{m.dt_medicao ? formatDate(m.dt_medicao) : '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {m.dt_periodo_fim ? (
                          <span className="text-xs text-slate-400">
                            {m.dt_periodo_inicio ? `${formatDate(m.dt_periodo_inicio)} a ` : ''}{formatDate(m.dt_periodo_fim)}
                          </span>
                        ) : <span className="text-[11px] text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-emerald-700">{formatCurrency(pi)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-amber-600">{ra > 0 ? formatCurrency(ra) : '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(total)}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
          <Pagination page={safeTablePage} totalPages={totalTablePages} onChange={setTablePage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} />
      </Card>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        data={exportData}
        columns={exportColumns}
        formatters={function() {
          return {
            dt_medicao: formatDate,
            dt_periodo_inicio: formatDate,
            dt_periodo_fim: formatDate,
            vl_pi: formatCurrency,
            vl_ra: formatCurrency,
            vl_total: formatCurrency,
          };
        }()}
        filename="medicoes"
        title="Exportar Medições"
      />

      <ContractDetail
        contratoId={selectedContratoId}
        onClose={() => setSelectedContratoId(null)}
      />
    </div>
    </>
  );
};

export default Medicoes;
