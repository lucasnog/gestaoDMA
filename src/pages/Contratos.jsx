import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileText,
  Building2,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  PauseCircle,
  XCircle,
  Activity,
  DollarSign,
  Ruler,
  CalendarX,
  FileQuestion,
  FileWarning,
  Gauge,
  Download,
  AlertOctagon
} from 'lucide-react';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import Skeleton from '../components/ui/Skeleton';
import ExpandableText from '../components/ui/ExpandableText';
import Pagination from '../components/ui/Pagination';
import ContractDetail from '../components/contract/ContractDetail';
import ExportDialog from '../components/ui/ExportDialog';
import { useDashboardContext } from '../layouts/DashboardLayout';

const Contratos = () => {
  const { contratos, loading, selectedBlocos } = useDashboardContext();
  const [selectedContratoId, setSelectedContratoId] = useState(null);
  const [statusFilter, setStatusFilter] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [monthlyDetail, setMonthlyDetail] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('contratoId') || location.state?.contratoId;
    if (id) {
      setSelectedContratoId(id);
      window.history.replaceState({}, '');
    }
  }, []);

  useEffect(() => {
    import("../services/api.service").then(api => {
      api.getMonthlyMedicoesDetail().then(data => setMonthlyDetail(data || [])).catch(() => {});
    });
  }, []);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  const exportColumns = useMemo(() => [
    { key: 'nu_bloco', label: 'Bloco' },
    { key: 'segmento', label: 'Segmento' },
    { key: 'cd_contrato', label: 'Contrato' },
    { key: 'lote', label: 'Lote' },
    { key: 'objeto', label: 'Objeto' },
    { key: 'objeto_completo_gemoc', label: 'Objeto Completo' },
    { key: 'razao_social', label: 'Empresa' },
    { key: 'municipios', label: 'Municípios' },
    { key: 'situacao_atual', label: 'Status' },
    { key: 'vl_total', label: 'Investimento' },
    { key: 'vl_total_medido', label: 'Total Medido' },
    { key: 'medido_2021', label: 'Medido 2021' },
    { key: 'medido_2022', label: 'Medido 2022' },
    { key: 'medido_2023', label: 'Medido 2023' },
    { key: 'medido_2024', label: 'Medido 2024' },
    { key: 'medido_2025', label: 'Medido 2025' },
    { key: 'medido_2026', label: 'Medido 2026' },
    { key: 'perc_pago', label: 'Avanço Financeiro' },
    { key: 'dt_vigencia_inicio', label: 'Início Vigência' },
    { key: 'dt_vigencia_fim', label: 'Fim Vigência' },
    { key: 'dias_restantes', label: 'Dias Restantes' },
    { key: 'dt_execucao_inicio', label: 'Início Execução' },
    { key: 'dt_execucao_fim', label: 'Fim Execução' },
    { key: 'dias_exec_restantes', label: 'Dias Exec Restantes' },
  ], []);

  	// Mapa de filtros: cada key tem label e função de filtro
	const filterMap = {
		ativos:      { label: 'Em Andamento',    fn: (c) => {
			const terminalList = ['finalizado','concluído','rescindido','trp','trd','paralisado'];
			const s = c.situacao_atual?.toLowerCase() || '';
			return !terminalList.some(t => s === t);
		}},
		paralisados: { label: 'Paralisados',     fn: (c) => c.situacao_atual === 'Paralisado' },
		concluidos:  { label: 'Concluídos - Medição final',      fn: (c) => {
			// Tem medição final (descricao contém 'Final' no SMO) E não avançou para TRP/TRD/Finalizado/Rescindido
			if (!c.has_medicao_final) return false;
			const s = c.situacao_atual?.toLowerCase() || '';
			return !['trp', 'trd', 'finalizado', 'rescindido'].includes(s);
		}},
		finalizados: { label: 'Finalizados',     fn: (c) => c.situacao_atual === 'Finalizado' },
		trp:         { label: 'TRP',             fn: (c) => c.situacao_atual === 'TRP' },
		trd:         { label: 'TRD',             fn: (c) => c.situacao_atual === 'TRD' },
		rescindidos: { label: 'Rescindidos',     fn: (c) => c.situacao_atual === 'Rescindido' },
			proximos:    { label: 'Próx. Vencer Vigência', fn: (c) => { const d = parseInt(c.dias_restantes); return d > 0 && d <= 60; } },
		vencidos:    { label: 'Vigência Vencida', fn: (c) => {
			const s = c.situacao_atual?.toLowerCase() || '';
			if (s === 'concluído' || s === 'finalizado' || s === 'rescindido' || s === 'trp' || s === 'trd') return false;
			const d = parseInt(c.dias_restantes);
			return !isNaN(d) && d < 0;
		} },
		execVencida: { label: 'Execução Vencida', fn: (c) => {
			const s = c.situacao_atual?.toLowerCase() || '';
			if (s === 'concluído' || s === 'finalizado' || s === 'rescindido' || s === 'trp' || s === 'trd') return false;
			const d = parseInt(c.dias_exec_restantes);
			return !isNaN(d) && d < 0;
		}},
		execAVencer: { label: 'Execução a Vencer', fn: (c) => {
			const s = c.situacao_atual?.toLowerCase() || '';
			if (s === 'concluído' || s === 'finalizado' || s === 'rescindido' || s === 'trp' || s === 'trd') return false;
			const d = parseInt(c.dias_exec_restantes);
			return !isNaN(d) && d > 0 && d <= 60;
		}},
		vigExecVencida: { label: 'Vigência e Execução Vencidas', fn: (c) => {
			const s = c.situacao_atual?.toLowerCase() || '';
			if (s === 'concluído' || s === 'finalizado' || s === 'rescindido' || s === 'trp' || s === 'trd') return false;
			const dV = parseInt(c.dias_restantes);
			const dE = parseInt(c.dias_exec_restantes);
			return !isNaN(dV) && dV < 0 && !isNaN(dE) && dE < 0;
		}},
		alcance70:   { label: 'Alcance 70%',     fn: (c) => {
			const s = c.situacao_atual?.toLowerCase() || '';
			if (s === 'concluído' || s === 'finalizado' || s === 'rescindido' || s === 'trp' || s === 'trd') return false;
			return parseFloat(c.perc_pago || 0) >= 70;
		}},
		observacoes: { label: 'Com Observações', fn: (c) => c.observacoes && c.observacoes.trim() },
		nda:         { label: 'NDA',              fn: (c) => {
			const s = c.situacao_atual?.toLowerCase() || '';
			// NDA = Concluído sem medição final, ou sem status definido
			return s === 'concluído' ? !c.has_medicao_final : !s;
		}},
	};


  // Contratos filtrados para a tabela
  const filteredContratos = statusFilter.length > 0
    ? contratos.filter(c => statusFilter.some(key => filterMap[key]?.fn(c)))
    : contratos;

  // Ordenação
  const sortedContratos = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredContratos;
    return [...filteredContratos].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredContratos, sortConfig]);

  const exportData = React.useMemo(() => {
    const yearlyMap = {};
    (monthlyDetail || []).forEach(item => {
      const ano = (item.dt_medicao || "").substring(0, 4);
      if (!ano || ano < "2021" || ano > "2026") return;
      if (!yearlyMap[item.id_bloco_fk]) yearlyMap[item.id_bloco_fk] = {};
      yearlyMap[item.id_bloco_fk][ano] = (yearlyMap[item.id_bloco_fk][ano] || 0) + parseFloat(item.vl_total || 0);
    });
    return (sortedContratos || []).map(c => ({
      ...c,
      medido_2021: yearlyMap[c.id_bloco]?.["2021"] || 0,
      medido_2022: yearlyMap[c.id_bloco]?.["2022"] || 0,
      medido_2023: yearlyMap[c.id_bloco]?.["2023"] || 0,
      medido_2024: yearlyMap[c.id_bloco]?.["2024"] || 0,
      medido_2025: yearlyMap[c.id_bloco]?.["2025"] || 0,
      medido_2026: yearlyMap[c.id_bloco]?.["2026"] || 0,
    }));
  }, [sortedContratos, monthlyDetail]);

  // Paginação da tabela
  const [tablePage, setTablePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const totalTablePages = Math.max(1, Math.ceil(sortedContratos.length / itemsPerPage));
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const pagedContratos = sortedContratos.slice((safeTablePage - 1) * itemsPerPage, safeTablePage * itemsPerPage);

  // Reset page when filter or items per page changes
  useEffect(() => {
    setTablePage(1);
  }, [statusFilter, contratos, itemsPerPage]);

  // ─── KPIs derivados dos contratos filtrados ──────────────────
  const kpis = useMemo(() => {
    const total = contratos.length;

    // Status (exato do GemocDocs)
    const terminalStatus = ['Finalizado','Concluído','Rescindido','TRP','TRD','Paralisado'];
    const ativos = contratos.filter(c => {
      const s = c.situacao_atual?.toLowerCase() || '';
      return !terminalStatus.some(t => s === t.toLowerCase());
    }).length;
    const paralisados = contratos.filter(c => c.situacao_atual === 'Paralisado').length;
    const trpCount = contratos.filter(c => c.situacao_atual === 'TRP').length;
    const concluidos = contratos.filter(c => {
      // Tem medição final (descricao contém 'Final' no SMO) E não avançou para TRP/TRD/Finalizado/Rescindido
      if (!c.has_medicao_final) return false;
      const s = c.situacao_atual?.toLowerCase() || '';
      return !['trp', 'trd', 'finalizado', 'rescindido'].includes(s);
    }).length;
    const finalizados = contratos.filter(c => c.situacao_atual === 'Finalizado').length;
    const trdCount = contratos.filter(c => c.situacao_atual === 'TRD').length;
    const rescindidos = contratos.filter(c => c.situacao_atual === 'Rescindido').length;
    const semStatus = contratos.filter(c => !c.situacao_atual).length;
	    const comObservacoes = contratos.filter(c => c.observacoes && c.observacoes.trim()).length;

    // Financeiro
    const totalInvestimento = contratos.reduce((acc, c) => acc + parseFloat(c.vl_total || 0), 0);
    const totalMedido = contratos.reduce((acc, c) => acc + parseFloat(c.vl_total_medido || 0), 0);
    const percExecucaoMedia = total > 0
      ? contratos.reduce((acc, c) => acc + parseFloat(c.perc_pago || 0), 0) / total
      : 0;

    // Prazos
    const proximosVencer = contratos.filter(c => {
      const dias = parseInt(c.dias_restantes);
      return dias > 0 && dias <= 60;
    }).length;
    const vencidos = contratos.filter(c => {
      const s = c.situacao_atual?.toLowerCase() || '';
      if (s === 'concluído' || s === 'finalizado' || s === 'rescindido' || s === 'trp' || s === 'trd') return false;
      const dias = parseInt(c.dias_restantes);
      return !isNaN(dias) && dias < 0;
    }).length;
    const prazoIndefinido = contratos.filter(c => {
      if (c.situacao_atual?.toLowerCase().includes('concluída') || c.situacao_atual === 'Rescindido') return false;
      return c.dias_restantes === null || c.dias_restantes === undefined;
    }).length;

    // Execução (exclui concluídos/finalizados/rescindidos — já encerrados)
    const alcance70 = contratos.filter(c => {
      const s = c.situacao_atual?.toLowerCase() || '';
      if (s === 'concluído' || s === 'finalizado' || s === 'rescindido' || s === 'trp' || s === 'trd') return false;
      const perc = parseFloat(c.perc_pago || 0);
      return perc >= 70;
    }).length;
    const execVencida = contratos.filter(c => {
      const s = c.situacao_atual?.toLowerCase() || '';
      if (s === 'concluído' || s === 'finalizado' || s === 'rescindido' || s === 'trp' || s === 'trd') return false;
      const d = parseInt(c.dias_exec_restantes);
      return !isNaN(d) && d < 0;
    }).length;
    const execAVencer = contratos.filter(c => {
      const s = c.situacao_atual?.toLowerCase() || '';
      if (s === 'concluído' || s === 'finalizado' || s === 'rescindido' || s === 'trp' || s === 'trd') return false;
      const d = parseInt(c.dias_exec_restantes);
      return !isNaN(d) && d > 0 && d <= 60;
    }).length;
    const vigExecVencida = contratos.filter(c => {
      const s = c.situacao_atual?.toLowerCase() || '';
      if (s === 'concluído' || s === 'finalizado' || s === 'rescindido' || s === 'trp' || s === 'trd') return false;
      const dV = parseInt(c.dias_restantes);
      const dE = parseInt(c.dias_exec_restantes);
      return !isNaN(dV) && dV < 0 && !isNaN(dE) && dE < 0;
    }).length;

    return {
      total, ativos, paralisados, trp: trpCount, concluidos, finalizados, trd: trdCount, rescindidos, semStatus, comObservacoes,
      totalInvestimento, totalMedido, percExecucaoMedia,
      proximosVencer, vencidos, prazoIndefinido,
      alcance70, execVencida, execAVencer, vigExecVencida,
      nda: contratos.filter(c => {
        const s = c.situacao_atual?.toLowerCase() || '';
        // NDA = Concluído sem medição final, ou sem status definido
        return s === 'concluído' ? !c.has_medicao_final : !s;
      }).length
    };
  }, [contratos]);

  // ─── KPIs financeiros baseados nos contratos filtrados ─────
  const financialKpis = useMemo(() => {
    const list = filteredContratos;
    const totalInvestimento = list.reduce((acc, c) => acc + parseFloat(c.vl_total || 0), 0);
    const totalMedido = list.reduce((acc, c) => acc + parseFloat(c.vl_total_medido || 0), 0);
    return { totalInvestimento, totalMedido, total: list.length };
  }, [filteredContratos]);

  // Cards de Status (cada status separado)
  const statusCards = [
    { key: 'ativos',      label: 'Em Andamento', value: kpis.ativos, icon: Activity, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', sub: `${((kpis.ativos / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
    { key: 'rescindidos', label: 'Rescindidos', value: kpis.rescindidos, icon: XCircle, color: 'from-red-500 to-red-600', shadow: 'shadow-red-500/20', sub: `${((kpis.rescindidos / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
    { key: 'paralisados', label: 'Paralisados', value: kpis.paralisados, icon: PauseCircle, color: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20', sub: `${((kpis.paralisados / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
    { key: 'concluidos',  label: 'Concluídos - Medição final',  value: kpis.concluidos, icon: CheckCircle2, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', sub: `${((kpis.concluidos / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
    { key: 'trp',         label: 'TRP',         value: kpis.trp, icon: FileQuestion, color: 'from-sky-500 to-sky-600', shadow: 'shadow-sky-500/20', sub: `${((kpis.trp / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
    { key: 'trd',         label: 'TRD',         value: kpis.trd, icon: FileWarning, color: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/20', sub: `${((kpis.trd / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
    { key: 'finalizados', label: 'Finalizados', value: kpis.finalizados, icon: CheckSquare, color: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20', sub: `${((kpis.finalizados / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
    { key: 'nda',         label: 'NDA',         value: kpis.nda, icon: FileQuestion, color: 'from-slate-400 to-slate-500', shadow: 'shadow-slate-400/20', sub: `${((kpis.nda / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
  ];

  const comObs = kpis.comObservacoes;
  const alertCards = [
    { key: 'alcance70',   label: 'Alcance 70%', value: kpis.alcance70, icon: FileQuestion, color: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/20', sub: `${((kpis.alcance70 / (kpis.total || 1)) * 100).toFixed(0)}% da carteira no limite` },
    { key: 'proximos',    label: 'Vigência a Vencer', value: kpis.proximosVencer, icon: Clock, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20', sub: 'menos de 60 dias restantes' },
    { key: 'vencidos',    label: 'Vigência Vencida', value: kpis.vencidos, icon: CalendarX, color: 'from-red-500 to-rose-600', shadow: 'shadow-red-500/20', sub: kpis.prazoIndefinido > 0 ? `${kpis.prazoIndefinido} sem prazo definido` : 'prazo expirado' },
    { key: 'execAVencer', label: 'Execução a Vencer', value: kpis.execAVencer, icon: Clock, color: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/20', sub: 'menos de 60 dias para execução' },
    { key: 'execVencida', label: 'Execução Vencida', value: kpis.execVencida, icon: AlertTriangle, color: 'from-rose-500 to-red-600', shadow: 'shadow-rose-500/20', sub: `${((kpis.execVencida / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
    { key: 'vigExecVencida', label: 'Vigência e Exec. Vencidas', value: kpis.vigExecVencida, icon: AlertOctagon, color: 'from-red-600 to-rose-700', shadow: 'shadow-red-600/20', sub: `${((kpis.vigExecVencida / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
    { key: 'observacoes', label: 'Com Observações', value: comObs, icon: FileText, color: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20', sub: `${((comObs / (kpis.total || 1)) * 100).toFixed(0)}% da carteira` },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Contratos</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Carteira completa de ativos</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          {selectedBlocos.length === 1 && <Badge variant="success" dot>Bloco {selectedBlocos[0]}</Badge>}
          {selectedBlocos.length > 1 && <Badge variant="success" dot>{selectedBlocos.length} blocos</Badge>}
          {statusFilter.length > 0 && (
            <button
              onClick={() => { setStatusFilter([]); setTablePage(1); }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-600/10 text-emerald-600 border border-emerald-600/20 text-[10px] sm:text-[11px] font-semibold hover:bg-emerald-600/20 transition-colors"
            >
              {statusFilter.map(k => filterMap[k]?.label).filter(Boolean).join(', ')}
              <span className="text-[9px]">✕</span>
            </button>
          )}
          <Badge variant="info" size="sm" className="sm:size-lg">
            {loading ? '...' : `${filteredContratos.length} de ${contratos.length}`}
          </Badge>
          <button
            onClick={() => setExportOpen(true)}
            disabled={loading || filteredContratos.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </button>
        </div>
      </div>

      {/* ─── Dashboard de KPIs ──────────────────────────────────── */}
      {!loading && kpis.total > 0 && (
        <>
          {/* Panorama Financeiro — topo (mais relevante) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 rounded-full bg-emerald-600" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Panorama Financeiro</h3>
              {statusFilter.length > 0 && (
                <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {statusFilter.map(k => filterMap[k]?.label).filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="p-3 sm:p-4 border border-slate-100/80 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={13} className="text-emerald-500" strokeWidth={2} />
                  <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Investimento Total</span>
                </div>
                <p className="text-xs sm:text-sm lg:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">{formatCurrency(financialKpis.totalInvestimento)}</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1">{financialKpis.total} contratos</p>
              </Card>
              <Card className="p-3 sm:p-4 border border-slate-100/80 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Ruler size={13} className="text-teal-500" strokeWidth={2} />
                  <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Total Medido</span>
                </div>
                <p className="text-xs sm:text-sm lg:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">{formatCurrency(financialKpis.totalMedido)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min((financialKpis.totalMedido / (financialKpis.totalInvestimento || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-medium text-teal-600 whitespace-nowrap">{((financialKpis.totalMedido / (financialKpis.totalInvestimento || 1)) * 100).toFixed(1)}%</span>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 border border-slate-100/80 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge size={13} className="text-purple-500" strokeWidth={2} />
                  <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Execução Média</span>
                </div>
                <p className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight">{formatPercent(kpis.percExecucaoMedia)}</p>
                <div className="mt-2">
                  <ProgressBar progress={kpis.percExecucaoMedia} size="sm" />
                </div>
              </Card>
            </div>
          </div>

          {/* Status da Carteira */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status da Carteira</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-stretch gap-2 sm:gap-3">
              {statusCards.map((card) => {
                const isActive = statusFilter.includes(card.key);
                return (
                  <button
                    key={card.key}
                    onClick={() => { setStatusFilter(prev => isActive ? prev.filter(k => k !== card.key) : [...prev, card.key]); setTablePage(1); }}
                    className={`flex-1 p-2 sm:p-3 rounded-xl border text-left transition-all duration-200 group flex flex-col justify-center cursor-pointer ${
                      isActive
                        ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-400/30 shadow-md'
                        : 'border-slate-100/80 bg-white shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-xs shrink-0`}>
                        <card.icon size={10} className="text-white" strokeWidth={2.5} />
                      </div>
                      <span className="text-sm sm:text-[18px] font-bold text-slate-900 leading-none">{card.value}</span>
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{card.label}</p>
                    <p className="text-[7px] sm:text-[8px] text-slate-300 mt-0.5 leading-tight">{card.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alertas — abaixo dos status, grid separado para mobile */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 rounded-full bg-amber-500" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:flex lg:items-stretch gap-2 sm:gap-3">
              {alertCards.map((card) => {
                const isActive = statusFilter.includes(card.key);
                return (
                  <button
                    key={card.key}
                    onClick={() => { setStatusFilter(prev => isActive ? prev.filter(k => k !== card.key) : [...prev, card.key]); setTablePage(1); }}
                    className={`flex-1 p-2 sm:p-3 rounded-xl border text-left transition-all duration-200 group flex flex-col justify-center cursor-pointer ${
                      isActive
                        ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-400/30 shadow-md'
                        : 'border-slate-100/80 bg-white shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-xs shrink-0`}>
                        <card.icon size={10} className="text-white" strokeWidth={2.5} />
                      </div>
                      <span className="text-sm sm:text-[18px] font-bold text-slate-900 leading-none">{card.value}</span>
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{card.label}</p>
                    <p className="text-[7px] sm:text-[8px] text-slate-300 mt-0.5 leading-tight">{card.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

        {/* ─── Tabela de Contratos ──────────────────────────────── */}
      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <colgroup>
              <col className="min-w-[140px] w-[20%]" />
              <col className="min-w-[50px] w-[6%]" />
              <col className="min-w-[160px] w-[40%]" />
              <col className="min-w-[90px] w-[12%]" />
              <col className="min-w-[60px] w-[9%]" />
              <col className="min-w-[60px] w-[8%]" />
              <col className="min-w-[60px] w-[7%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-emerald-100/30">
                <th onClick={() => handleSort('cd_contrato')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Contrato{sortConfig.key === 'cd_contrato' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('lote')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Lote{sortConfig.key === 'lote' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider overflow-hidden">
                  Objeto
                </th>
                <th onClick={() => handleSort('vl_total')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Investimento{sortConfig.key === 'vl_total' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('perc_pago')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                  Avanço Fin.{sortConfig.key === 'perc_pago' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th onClick={() => handleSort('dias_restantes')} className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">
                  Prazo{sortConfig.key === 'dias_restantes' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/20">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                  </tr>
                ))
              ) : filteredContratos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <FileText size={40} className="mx-auto text-emerald-200 mb-4" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-slate-400">
                      {statusFilter.length > 0 ? 'Nenhum contrato com esses filtros' : 'Nenhum contrato encontrado'}
                    </p>
                    <p className="text-xs text-slate-300 mt-1">Tente ajustar os filtros</p>
                  </td>
                </tr>
              ) : (
                pagedContratos.map((c, idx) => {
                  const perc_pago = parseFloat(c.perc_pago || 0);
                  const diasRestantes = parseInt(c.dias_restantes);
                  const hasDiasRestantes = !isNaN(diasRestantes);
                  const nomeEmpresa = c.razao_social?.trim() || 'Processo';
                  const isProcesso = c.cd_contrato === 'Processo';
                  const isCritical = perc_pago >= 90;
                  const isAttention = hasDiasRestantes && diasRestantes <= 60 && diasRestantes >= 0;
                  const isFinished = c.situacao_atual?.toLowerCase().includes('concluída')
                    || c.situacao_atual === 'Concluído'
                    || c.situacao_atual === 'Finalizado'
                    || c.situacao_atual === 'TRP'
                    || c.situacao_atual === 'TRD';
                  const isRescinded = c.situacao_atual === 'Rescindido';
                  const isVencido = !isFinished && !isRescinded && hasDiasRestantes && diasRestantes < 0;

                  const situacaoVariant = isRescinded ? 'danger'
                    : isFinished ? 'neutral'
                    : isVencido ? 'danger'
                    : isCritical ? 'warning'
                    : 'success';

                  const situacaoLabel = c.situacao_atual || (isRescinded ? 'Rescindido'
                    : isFinished ? 'Finalizado'
                    : isVencido ? 'Vigência Vencida'
                    : 'Ativo');

                  const empresa = nomeEmpresa !== 'Processo' && !nomeEmpresa.includes('Sem empresa') ? nomeEmpresa : null;

                  return (
                    <tr
                      key={`${c.nu_bloco}-${c.cd_contrato}-${idx}`}
                      onClick={() => setSelectedContratoId(c.id_bloco || c.cd_contrato)}
                      className="group cursor-pointer transition-all duration-200 hover:bg-emerald-50/40"
                    >
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
                      <td className="px-4 py-3 overflow-hidden">
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-slate-900 truncate block">{c.lote || '—'}</span>
                          {empresa && <span className="text-[10px] text-slate-400 truncate block">{empresa}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{wordBreak:'break-word',overflowWrap:'break-word'}}>
                        <div className="min-w-0">
                          {c.objeto && !c.objeto.includes('Sem objeto') ? (
                            <ExpandableText text={c.objeto} maxLines={2} className="text-[13px] font-semibold text-slate-800 leading-snug" />
                          ) : (
                            <span className="text-[13px] font-semibold text-slate-800">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(c.vl_total)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${isCritical ? 'text-red-500' : 'text-slate-900'}`}>
                          {perc_pago.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isRescinded || isFinished || isProcesso || !hasDiasRestantes ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {isAttention && <AlertTriangle size={12} className="text-amber-500 shrink-0" strokeWidth={2} />}
                            <span className={`text-xs font-semibold ${isAttention ? 'text-amber-600' : 'text-slate-500'}`}>
                              {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d vencido` : `${diasRestantes} dias`}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={situacaoVariant} size="sm" className="text-[10px]">
                          {situacaoLabel}
                        </Badge>
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
        formatters={{
          vl_total: formatCurrency,
          vl_total_medido: formatCurrency,
          perc_pago: formatPercent,
          dt_vigencia_inicio: formatDate,
          dt_vigencia_fim: formatDate,
          dt_execucao_inicio: formatDate,
          dt_execucao_fim: formatDate,
        }}
        filename="contratos"
        title="Exportar Contratos"
      />

      {selectedContratoId && (
        <ContractDetail
          contratoId={selectedContratoId}
          onClose={() => setSelectedContratoId(null)}
        />
      )}
    </div>
  );
};

export default Contratos;

