import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Ruler,
  TrendingUp,
  Building2,
  FileText,
  Clock,
  Download,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import * as apiService from '../services/api.service';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import ContractDetail from '../components/contract/ContractDetail';
import ExportDialog from '../components/ui/ExportDialog';
import { useDashboardContext } from '../layouts/DashboardLayout';

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



  const isNewDate = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const cutoff = new Date(Date.now() - 7 * 86400000);
    return d >= cutoff;
  };

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: key.includes('data') ? 'desc' : 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key, direction: null };
      return { key: null, direction: null };
    });
  };

  // (exportColumns movido para depois de anosExport)

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

  function toggleSelect(id) {
    setSelectedIds(function(prev) {
      if (prev.includes(id)) return prev.filter(function(x) { return x !== id; });
      return [].concat(prev, [id]);
    });
  }

  function toggleSelectAll() {
    if (selectedIds.length === sorted.length) { setSelectedIds([]); }
    else { setSelectedIds(sorted.map(function(c) { return c.id_bloco; }).filter(Boolean)); }
  }

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
  const getPercMedido = (c) => {
    const total = getVlTotal(c);
    return total > 0 ? (getVlMedido(c) / total) * 100 : 0;
  };

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

  var anosExport = useMemo(function() {
    var lista = [];
    for (var y = 2021; y <= new Date().getFullYear(); y++) lista.push(String(y));
    return lista;
  }, []);

  const exportColumns = useMemo(function() {
    var cols = [
      { key: 'nu_bloco', label: 'Bloco' },
      { key: 'segmento', label: 'Segmento' },
      { key: 'cd_contrato', label: 'Contrato' },
      { key: 'lote', label: 'Lote' },
      { key: 'razao_social', label: 'Empresa' },
      { key: 'municipios', label: 'Municípios' },
      { key: 'situacao_atual', label: 'Status' },
      { key: 'vl_total', label: 'Valor Contrato' },
      { key: 'vl_total_medido', label: 'Total Medido' },
    ];
    anosExport.forEach(function(a) { cols.push({ key: 'medido_' + a, label: 'Medido ' + a }); });
    cols.push(
      { key: 'perc_pago', label: 'Avanço Financeiro' },
      { key: 'ultima_medicao_data', label: 'Medição Data' },
      { key: 'ultima_medicao_valor', label: 'Medição Valor' },
      { key: 'dt_vigencia_inicio', label: 'Início Vigência' },
      { key: 'dt_vigencia_fim', label: 'Fim Vigência' },
      { key: 'dt_execucao_inicio', label: 'Início Execução' },
      { key: 'dt_execucao_fim', label: 'Fim Execução' },
    );
    return cols;
  }, [anosExport]);

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

  // Mapa com dados de medição do período selecionado (para exibir na coluna e ordenar)
  const monthlyDataMap = React.useMemo(() => {
    if (!selectedMes) return null;
    const isAno = selectedMes.length === 4;
    const map = {};
    const pickDt = (item) => dataRef === 'medicao' ? (item.dt_medicao || item.dt_periodo_fim || item.mes) : (item.dt_periodo_fim || item.dt_medicao || item.mes);
    if (!isAno && detailMap[selectedMes]) {
      detailMap[selectedMes].forEach(item => {
        const dt = pickDt(item);
        map[item.id_bloco_fk] = { dt, dtNovo: item.dt_medicao || dt, vl: item.vl_total, dtPeriodoInicio: item.dt_periodo_inicio, dtPeriodoFim: item.dt_periodo_fim, nrMedicao: item.nr_medicao };
      });
    } else if (isAno) {
        Object.entries(detailMap).forEach(([key, items]) => {
            if (key.startsWith(selectedMes)) {
                items.forEach(item => {
                    if (!map[item.id_bloco_fk]) {
                        map[item.id_bloco_fk] = { dt: null, dtNovo: null, vl: 0, dtPeriodoInicio: null, dtPeriodoFim: null, nrMedicao: null };
                    }
                    map[item.id_bloco_fk].vl += item.vl_total;
                    const itemDt = pickDt(item);
                    const itemDtNovo = item.dt_medicao || itemDt;
                    if (!map[item.id_bloco_fk].dt || itemDt > map[item.id_bloco_fk].dt) {
                        map[item.id_bloco_fk].dt = itemDt;
                        map[item.id_bloco_fk].dtNovo = itemDtNovo;
                        map[item.id_bloco_fk].dtPeriodoInicio = item.dt_periodo_inicio || null;
                        map[item.id_bloco_fk].dtPeriodoFim = item.dt_periodo_fim || null;
                        map[item.id_bloco_fk].nrMedicao = item.nr_medicao || null;
                    }
                });
            }
        });
    }
    return Object.keys(map).length > 0 ? map : null;
  }, [selectedMes, detailMap, dataRef]);

  // Mapa com a última medição de cada contrato dentro do período filtrado (year/bloco/segmento)
  const periodoDataMap = React.useMemo(() => {
    if (!Array.isArray(monthlyDetailPorPeriodo)) return null;
    const map = {};
    monthlyDetailPorPeriodo.forEach(item => {
      const key = item.id_bloco_fk;
      if (!key) return;
      const dt = dataRef === 'medicao' ? (item.dt_medicao || (item.mes ? item.mes + '-01' : null)) : (item.dt_periodo_fim || item.dt_medicao || (item.mes ? item.mes + '-01' : null));
      if (!dt) return;
      const dtNovo = item.dt_medicao || dt;
      if (!map[key] || dt > map[key].dt) {
        map[key] = { dt, dtNovo, vl: parseFloat(item.vl_total || 0), dtPeriodoInicio: item.dt_periodo_inicio, dtPeriodoFim: item.dt_periodo_fim, nrMedicao: item.nr_medicao || null };
      }
    });
    return Object.keys(map).length > 0 ? map : null;
  }, [monthlyDetailPorPeriodo, dataRef]);

  const sorted = React.useMemo(() => {
    var list = contratosBase ? [...contratosBase] : [];

    if (sortConfig.key && sortConfig.direction) {
      list.sort((a, b) => {
        let aVal, bVal;
        if (sortConfig.key === 'ultima_medicao_data') {
          aVal = monthlyDataMap?.[a.id_bloco]?.dtNovo || periodoDataMap?.[a.id_bloco]?.dtNovo || a.ultima_medicao_data;
          bVal = monthlyDataMap?.[b.id_bloco]?.dtNovo || periodoDataMap?.[b.id_bloco]?.dtNovo || b.ultima_medicao_data;
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
      list.sort((a, b) => {
        const aDt = monthlyDataMap?.[a.id_bloco]?.dtNovo || periodoDataMap?.[a.id_bloco]?.dtNovo || a.ultima_medicao_data;
        const bDt = monthlyDataMap?.[b.id_bloco]?.dtNovo || periodoDataMap?.[b.id_bloco]?.dtNovo || b.ultima_medicao_data;
        if (!aDt && !bDt) return 0;
        if (!aDt) return 1;
        if (!bDt) return -1;
        return bDt.localeCompare(aDt);
      });
    }
    return list;
  }, [contratosBase, selectedMes, detailMap, sortConfig, filtroMedicaoFinal, selectedIds, monthlyDataMap, periodoDataMap]);

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

    const totalTablePages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const pagedContracts = sorted.slice((safeTablePage - 1) * itemsPerPage, safeTablePage * itemsPerPage);

  const exportData = React.useMemo(() => {
    const yearlyMap = {};
    var anos = [];
    for (var y = 2021; y <= new Date().getFullYear(); y++) anos.push(String(y));
    // Dedup monthlyDetailPorPeriodo por (id_bloco_fk, mes)
    var seen = new Set();
    (monthlyDetailPorPeriodo || []).forEach(item => {
      var key = item.id_bloco_fk + '|' + (item.mes || '');
      if (seen.has(key)) return;
      seen.add(key);
      const ano = (item.mes || "").substring(0, 4);
      if (!ano) return;
      if (!yearlyMap[item.id_bloco_fk]) yearlyMap[item.id_bloco_fk] = {};
      yearlyMap[item.id_bloco_fk][ano] = (yearlyMap[item.id_bloco_fk][ano] || 0) + parseFloat(item.vl_total || 0);
    });
    // Dedup sorted por id_bloco
    var seenContratos = new Set();
    return (sorted || []).filter(function(c) {
      if (seenContratos.has(c.id_bloco)) return false;
      seenContratos.add(c.id_bloco);
      return true;
    }).map(c => {
      var row = { ...c };
      anos.forEach(function(a) { row['medido_' + a] = yearlyMap[c.id_bloco]?.[a] || 0; });
      return row;
    });
  }, [sorted, monthlyDetailPorPeriodo]);

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
            disabled={loading || sorted.length === 0}
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

      {/* Tabela de Contratos com Medição */}
      <Card padding="p-0" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-100/30 bg-emerald-50/30 flex items-center gap-2.5 flex-wrap">
          <Ruler size={16} className="text-emerald-600" strokeWidth={2} />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Medições
          </span>
          {selectedMes && (
            <>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-600/10 text-blue-600 border border-blue-600/20 text-[10px] font-semibold">
                {getPeriodoLabel(selectedMes, chartPeriodo)}
              </span>
              <button
                onClick={() => setSelectedMes(null)}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                Limpar filtros
              </button>
            </>
          )}
          <button
            onClick={function() { setFiltroMedicaoFinal(!filtroMedicaoFinal); }}
            className={'ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ' + (filtroMedicaoFinal ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white text-slate-500 border-emerald-100/60 hover:border-emerald-200')}
          >
            <CheckCircle2 size={12} strokeWidth={2} />
            {filtroMedicaoFinal ? 'Medição Final' : 'Final'}
          </button>
          <span className="text-[10px] font-medium text-slate-400 ml-2">{sorted.length} contratos</span>
        </div>

        {/* ─── Desktop: tabela completa ─────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-emerald-100/30">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === sorted.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Contrato
                </th>
                <th onClick={() => handleSort('lote')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Lote{sortConfig.key === 'lote' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('razao_social')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Empresa{sortConfig.key === 'razao_social' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('vl_total')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Valor Contrato{sortConfig.key === 'vl_total' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Nº
                </th>
                <th onClick={() => handleSort('ultima_medicao_data')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Data{sortConfig.key === 'ultima_medicao_data' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('vl_total_medido')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Total Medido{sortConfig.key === 'vl_total_medido' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('perc_pago')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none text-center">
                  % Medido{sortConfig.key === 'perc_pago' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/20">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className={`h-6 ${j === 0 ? 'w-4' : j === 1 ? 'w-48' : j === 2 ? 'w-12' : 'w-20'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-20 text-center">
                    <FileText size={40} className="mx-auto text-emerald-200 mb-4" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-slate-400">Nenhuma medição encontrada</p>
                    <p className="text-xs text-slate-300 mt-1">Tente ajustar os filtros no painel principal</p>
                  </td>
                </tr>
              ) : (
                pagedContracts.map((c, idx) => {
                  const percMedido = getPercMedido(c);
                  const vlMedido = getVlMedido(c);
                  const vlTotal = getVlTotal(c);

                  return (
                    <tr
                      key={`${c.nu_bloco}-${c.cd_contrato}-${idx}`}
                      onClick={() => setSelectedContratoId(c.id_bloco || c.cd_contrato)}
                      className="group cursor-pointer transition-all duration-200 hover:bg-emerald-50/40"
                    >
                      <td className="px-3 py-3 w-8" onClick={function(e) { e.stopPropagation(); }}>
                        <input type="checkbox" checked={selectedIds.includes(c.id_bloco)} onChange={function() { toggleSelect(c.id_bloco); }} className="w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100/50 text-[11px] font-semibold text-emerald-700">
                            {c.nu_bloco}
                          </span>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-slate-900 truncate block">{c.cd_contrato}</span>
                            <span className="text-[10px] text-slate-400 truncate block">{c.segmento || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-slate-900">{c.lote || '—'}</span>
                      </td>
                      <td className="px-6 py-4 max-w-[180px]">
                        <p className="text-sm text-slate-700 truncate">{c.razao_social}</p>
                        {c.municipios?.length > 0 && (
                          <p className="text-[10px] text-emerald-600 font-medium truncate">{c.municipios.join(', ')}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(vlTotal)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.has_medicao_final ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Final</span>
                        ) : (() => {
                          const md = monthlyDataMap?.[c.id_bloco];
                          const pd = periodoDataMap?.[c.id_bloco];
                          const nr = md?.nrMedicao || (selectedMes ? null : (pd?.nrMedicao || c.total_medicoes));
                          return nr ? <span className="text-[11px] text-slate-400">{nr + 'ª'}</span> : <span className="text-[11px] text-slate-400">—</span>;
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const md = monthlyDataMap?.[c.id_bloco];
                            const pd = periodoDataMap?.[c.id_bloco];
                            const dt = md?.dtNovo || (selectedMes ? null : (pd?.dtNovo || (filtroMedicaoFinal && c.dt_medicao_final ? c.dt_medicao_final : c.ultima_medicao_data)));
                            const dtPeriodoInicio = md?.dtPeriodoInicio || (selectedMes ? null : (pd?.dtPeriodoInicio || null));
                            const dtPeriodoFim = md?.dtPeriodoFim || (selectedMes ? null : (pd?.dtPeriodoFim || null));
                            const vl = md?.vl || (selectedMes ? null : (pd?.vl || (parseFloat(c.ultima_medicao_valor || 0) > 0 && !filtroMedicaoFinal ? c.ultima_medicao_valor : null)));
                            return (
                              <>
                                <span className="text-xs text-slate-600 font-medium inline-flex items-center gap-1">
                                  {dt ? <>{formatDate(dt)}{isNewDate(dt) && <Badge variant="success" size="sm">Novo</Badge>}</> : '\u2014'}
                                </span>
                                {dtPeriodoFim ? (
                                  <span className="text-[10px] text-slate-400">
                                    Período: {dtPeriodoInicio ? `${formatDate(dtPeriodoInicio)} a ` : ''}{formatDate(dtPeriodoFim)}
                                  </span>
                                ) : null}
                                {vl ? <span className="text-[10px] font-medium text-emerald-600">{formatCurrency(vl)}</span> : null}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-emerald-600">{formatCurrency(vlMedido)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-sm font-bold ${percMedido >= 90 ? 'text-red-500' : percMedido >= 75 ? 'text-amber-500' : 'text-slate-900'}`}>
                            {percMedido.toFixed(1)}%
                          </span>
                          <div className="w-16">
                            <ProgressBar progress={percMedido} size="sm" />
                          </div>
                        </div>
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
          var f = {
            vl_total: formatCurrency,
            vl_total_medido: formatCurrency,
            perc_pago: formatPercent,
            ultima_medicao_valor: formatCurrency,
            ultima_medicao_data: formatDate,
            dt_vigencia_inicio: formatDate,
            dt_vigencia_fim: formatDate,
            dt_execucao_inicio: formatDate,
            dt_execucao_fim: formatDate,
          };
          for (var y = 2021; y <= new Date().getFullYear(); y++) { f['medido_' + y] = formatCurrency; }
          return f;
        }()}
        filename="medicoes"
        title="Exportar Medições"
        onExtraDownload={() => {
          const filtros = {};
          const blocos = selectedBlocos?.length > 0 ? selectedBlocos : blocosDisponiveis;
          if (blocos?.length > 0) filtros.bloco = blocos.join(',');
          if (selectedSegmentos?.length > 0) filtros.segmento = selectedSegmentos.join(',');
          apiService.downloadMedicoesPorSegmento(filtros);
        }}
      />

      <ContractDetail
        contratoId={selectedContratoId}
        onClose={() => setSelectedContratoId(null)}
      />
    </div>
    </>
  );
};

// ─── Tooltip customizado ─────────────────────────────────────
const CustomTooltip = ({ active, payload, label, detailMap }) => {
  if (!active || !payload || !payload.length) return null;
  const valor = payload[0]?.value || 0;
  const contratos = detailMap?.[label] || [];
  const [y, m] = (label || '').split('-');
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const nomeMes = meses[parseInt(m)-1] || label;

  // Agrupa por segmento e totaliza
  const segmentTotals = {};
  contratos.forEach(c => {
    const seg = c.segmento || 'Sem segmento';
    if (!segmentTotals[seg]) segmentTotals[seg] = 0;
    segmentTotals[seg] += c.vl_total;
  });
  const segmentos = Object.entries(segmentTotals).sort((a, b) => b[1] - a[1]); // maior valor primeiro

  return (
    <div className="bg-white border border-emerald-100/60 rounded-xl shadow-lg px-4 py-3 max-w-[300px]">
      <p className="text-[11px] font-bold text-slate-700 mb-2">{nomeMes} {y}</p>
      <p className="text-[10px] font-semibold text-slate-400 mb-2">
        Total: <span className="text-emerald-600">{formatCurrency(valor)}</span>
        <span className="text-slate-300 ml-1">({contratos.length} contratos)</span>
      </p>
      {segmentos.length > 0 && (
        <div className="border-t border-emerald-100/30 pt-2 mt-1 space-y-1.5">
          {segmentos.map(([seg, total], i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="font-medium text-slate-600 truncate">{seg}</span>
              <span className="font-semibold text-slate-800 shrink-0">{formatCurrency(total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Medicoes;
