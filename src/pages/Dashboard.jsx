import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  Layers,
  Activity,
  CheckCircle2,
  PauseCircle,
  XCircle,
  FileText,
  BarChart3,
  FilePlus,
  BadgeCheck,
  Clock,
  Building2,
  MapPin,
} from 'lucide-react';
import { formatCurrency, formatCurrencyShort, formatPercent } from '../utils/formatters';
import Card from '../components/ui/Card';
import ContractDetail from '../components/contract/ContractDetail';
import PieChart, { RING_COLORS } from '../components/ui/DonutChart';
import { useDashboardContext } from '../layouts/DashboardLayout';
import { getSectionStats } from '../services/api.service';
import { sortSegmentos } from '../config/constants';

const Dashboard = () => {
  const navigate = useNavigate();
  const { contratos, stats, loading, selectedBlocos, selectedSegmentos, selectedPeriod, search, selectedStatus } = useDashboardContext();

  // ─── Calcular KPIs a partir dos contratos ───────────────────────
  const dashboardKpis = useMemo(() => {
    const total = contratos.length;
    const investido = contratos.reduce((acc, c) => acc + parseFloat(c.vl_total || 0), 0);
    const pago = contratos.reduce((acc, c) => acc + parseFloat(c.vl_total_pago || 0), 0);
    const medido = contratos.reduce((acc, c) => acc + parseFloat(c.vl_total_medido || 0), 0);
    const percGlobal = investido > 0 ? (medido / investido) * 100 : 0;
    return { total, investido, medido, percGlobal };
  }, [contratos, selectedBlocos, selectedSegmentos, selectedPeriod]);

  // ─── Maiores Pagamentos (todos, ordenados) ──────────────
  const maioresPagamentos = useMemo(() => {
    return [...contratos]
      .filter(c => parseFloat(c.vl_total_pago || 0) > 0)
      .sort((a, b) => parseFloat(b.vl_total_pago || 0) - parseFloat(a.vl_total_pago || 0));
  }, [contratos, selectedBlocos, selectedSegmentos, selectedPeriod]);

  const [selectedContratoId, setSelectedContratoId] = useState(null);
  const [sectionStats, setSectionStats] = useState(null);

  useEffect(() => {
    const params = {
      search: search || undefined,
      bloco: selectedBlocos.length > 0 ? selectedBlocos.join(',') : undefined,
      status: selectedStatus && selectedStatus !== 'Todos' ? selectedStatus : undefined,
      segmento: selectedSegmentos.length > 0 ? selectedSegmentos.join(',') : undefined,
    };
    getSectionStats(params).then(setSectionStats).catch(() => {});
  }, [search, selectedBlocos, selectedSegmentos, selectedStatus]);

  const sections = [
    { path: '/contratos', label: 'Contratos', icon: FileText, key: 'contratos', desc: 'Carteira de ativos', color: 'emerald' },
    { path: '/medicoes', label: 'Medições', icon: BarChart3, key: 'medicoes', desc: 'Histórico de medições', color: 'teal' },
    { path: '/aditivos', label: 'Aditivos', icon: FilePlus, key: 'aditivos', desc: 'Aditivos contratuais', color: 'blue' },
    { path: '/apostilas', label: 'Apostilas', icon: BadgeCheck, key: 'apostilas', desc: 'Reajustes contratuais', color: 'indigo' },
    { path: '/os', label: 'Ordens de Serviço', icon: Clock, key: 'os', desc: 'Histórico de OS', color: 'violet' },
    { path: '/empresas', label: 'Empresas', icon: Building2, key: 'empresas', desc: 'Fornecedores', color: 'rose' },
    { path: '/municipios', label: 'Municípios', icon: MapPin, key: 'municipios', desc: 'Distribuição por localidade', color: 'cyan' },

  ];

  const SECTION_COLORS = {
    emerald: { bg: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', bar: 'bg-emerald-500' },
    teal: { bg: 'from-teal-500 to-teal-600', shadow: 'shadow-teal-500/20', bar: 'bg-teal-500' },
    blue: { bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', bar: 'bg-blue-500' },
    indigo: { bg: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-500/20', bar: 'bg-indigo-500' },
    violet: { bg: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/20', bar: 'bg-violet-500' },
    amber: { bg: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20', bar: 'bg-amber-500' },
    rose: { bg: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/20', bar: 'bg-rose-500' },
    cyan: { bg: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/20', bar: 'bg-cyan-500' },
    slate: { bg: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-500/20', bar: 'bg-slate-500' },
    orange: { bg: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/20', bar: 'bg-orange-500' },
    lime: { bg: 'from-lime-500 to-lime-600', shadow: 'shadow-lime-500/20', bar: 'bg-lime-500' },
  };

  // ─── Normaliza status do banco para nomes amigáveis ─────────────────────
  const normalizeStatus = (s) => {
    if (!s) return 'Indefinido';
    const lower = s.toLowerCase();
    if (lower.includes('andamento')) return 'Em Andamento';
    if (lower.includes('paralisado')) return 'Paralisado';
    if (lower.includes('concluído') || lower.includes('concluida')) return 'Concluído';
    if (lower.includes('rescindido')) return 'Rescindido';
    if (lower.includes('contratado')) return 'Contratado';
    return s;
  };

  // ─── Chart data computations ────────────────────────────────────────────
  const statusDonutData = useMemo(() => {
    const counts = {};
    contratos.forEach(c => {
      const s = normalizeStatus(c.situacao_atual);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [contratos]);

  const segmentoChartData = useMemo(() => {
    const map = {};
    contratos.forEach(c => {
      const s = c.segmento || 'Sem segmento';
      if (!map[s]) map[s] = { count: 0, total: 0, medido: 0 };
      map[s].count++;
      map[s].total += parseFloat(c.vl_total || 0);
      map[s].medido += parseFloat(c.vl_total_medido || 0);
    });
    return sortSegmentos(
      Object.entries(map)
        .map(([segmento, data]) => ({ segmento, ...data, perc: data.total > 0 ? (data.medido / data.total) * 100 : 0 }))
    );
  }, [contratos]);

  const DONUT_COLORS = RING_COLORS;

  const donutSegments = useMemo(() => {
    const total = contratos.length || 1;
    return Object.entries(statusDonutData)
      .filter(([key]) => DONUT_COLORS[key])
      .map(([key, value]) => ({
        label: key,
        value,
        color: DONUT_COLORS[key].stroke,
        pct: ((value / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.value - a.value);
  }, [statusDonutData]);

  const topSegmentos = segmentoChartData;

  const kpiCards = [
    {
      label: 'Total de Contratos',
      value: dashboardKpis.total,
      icon: LayoutDashboard,
      color: 'from-emerald-600 to-emerald-700',
      shadow: 'shadow-emerald-500/20',
      bottomBar: 'bg-emerald-600',
      onClick: () => navigate('/contratos'),
    },
    {
      label: selectedBlocos.length === 1 ? `Bloco ${selectedBlocos[0]}` : selectedBlocos.length > 1 ? `${selectedBlocos.length} blocos` : 'Investimento Total',
      value: formatCurrencyShort(dashboardKpis.investido),
      icon: DollarSign,
      color: 'from-emerald-600 to-emerald-500',
      shadow: 'shadow-emerald-500/25',
      bottomBar: 'bg-emerald-500',
      onClick: () => navigate('/medicoes'),
    },
    {
      label: 'Total Medido',
      value: formatCurrencyShort(dashboardKpis.medido),
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
      bottomBar: 'bg-blue-500',
      onClick: () => navigate('/contratos'),
    },
    {
      label: 'Execução Global',
      value: formatPercent(dashboardKpis.percGlobal),
      icon: Activity,
      color: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
      bottomBar: 'bg-blue-500',
      onClick: () => navigate('/contratos'),
    },
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-10">
      {/* KPI Cards Grid — sempre no topo */}
      <div className="order-1 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {kpiCards.map((kpi, idx) => (
          <Card key={idx} className="p-4 sm:p-5 lg:p-6 border border-emerald-100/50 shadow-sm hover:shadow-card transition-all duration-300 group cursor-pointer" onClick={kpi.onClick}>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm ${kpi.shadow} group-hover:scale-110 transition-transform duration-300`}>
                <kpi.icon size={16} className="text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[9px] sm:text-[10px] lg:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {kpi.label}
            </p>
            <p className="text-xs sm:text-sm lg:text-lg xl:text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {kpi.value}
            </p>
            <div className={`mt-2 sm:mt-3 lg:mt-4 h-0.5 sm:h-1 w-8 sm:w-12 rounded-full ${kpi.bottomBar} opacity-30 group-hover:opacity-60 group-hover:w-full transition-all duration-500`} />
          </Card>
        ))}
      </div>

      {/* ─── Section Quick Nav ──────────────────────────────────────────── */}
      <div className="order-2">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-1 h-6 sm:h-7 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/20" />
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Seções</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400">Acesso rápido às principais funcionalidades</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3">
          {sections.map((sec) => {
            const c = SECTION_COLORS[sec.color] || SECTION_COLORS.emerald;
            const count = sec.key === 'contratos' ? dashboardKpis.total : (sec.key ? (sectionStats?.[sec.key] ?? '—') : '—');
            return (
              <div
                key={sec.path}
                onClick={() => navigate(sec.path)}
                className="bg-white rounded-xl border border-emerald-100/50 shadow-sm hover:shadow-md hover:border-emerald-200/60 transition-all duration-300 group cursor-pointer p-3 sm:p-4"
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${c.bg} flex items-center justify-center shadow-sm ${c.shadow} group-hover:scale-110 transition-transform duration-300 mb-2`}>
                  <sec.icon size={13} className="text-white" strokeWidth={2} />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  {count}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 truncate leading-tight">
                  {sec.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Charts Section ──────────────────────────────────────────────── */}
      {!loading && contratos.length > 0 && (
        <div className="order-2 grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Donut: Status Distribution */}
          <Card padding="p-4 sm:p-5 lg:p-6" className="lg:col-span-3 border border-emerald-100/50 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-1 h-6 sm:h-7 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/20" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Resumo dos Contratos</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400">Distribuição por status</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="shrink-0 self-center sm:self-start">
                <PieChart
                  size={140}
                  segments={donutSegments}
                  total={contratos.length}
                  donut
                  center={{ label: 'Total', value: contratos.length }}
                />
              </div>
              <div className="flex-1 w-full min-w-0 space-y-2">
                  {donutSegments.map((seg, i) => {
                  const Icon = seg.label === 'Em Andamento' ? Activity
                    : seg.label === 'Paralisado' ? PauseCircle
                    : seg.label === 'Concluído' ? CheckCircle2
                    : seg.label === 'Rescindido' ? XCircle
                    : Layers;
                  return (
                    <div key={i} className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => navigate('/contratos')}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                      <Icon size={9} className="text-slate-400 shrink-0" strokeWidth={2} />
                      <span className="text-[11px] font-medium text-slate-500 leading-tight">{seg.label}</span>
                      <span className="text-xs font-bold text-slate-900 shrink-0 ml-auto">{seg.value}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">({seg.pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Segmento Distribution */}
          <Card padding="p-4 sm:p-5 lg:p-6" className="lg:col-span-2 border border-emerald-100/50 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-1 h-6 sm:h-7 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/20" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Contratos por Segmento</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400">Distribuição da carteira</p>
              </div>
            </div>
            <div className="overflow-y-auto space-y-3 pr-1" style={{ maxHeight: '230px' }}>
              {topSegmentos.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nenhum segmento disponível</p>
              ) : (
                topSegmentos.map((s, i) => {
                  const barPct = s.perc;
                  return (
                      <div key={s.segmento} className="group cursor-pointer" onClick={() => navigate('/contratos')}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-slate-300 w-4 shrink-0">{i + 1}</span>
                          <Layers size={11} className="text-emerald-500 shrink-0" strokeWidth={2} />
                          <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[180px]">{s.segmento}</span>
                          <span className="text-[10px] text-slate-400">({s.count})</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-900">{formatCurrencyShort(s.total)}</span>
                      </div>
                      <div className="relative h-6 sm:h-7 bg-slate-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700"
                          style={{ width: `${barPct}%` }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-slate-800">
                          {formatPercent(s.perc)} medido
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}



      {/* ─── Maiores Pagamentos (fundido do Financeiro) ───────────────────── */}
      {!loading && maioresPagamentos.length > 0 && (
        <div className="order-6 lg:order-6 bg-white rounded-xl sm:rounded-2xl border border-emerald-100/50 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between border-b border-emerald-100/30">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-1.5 sm:w-2 h-8 sm:h-10 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/20 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight truncate">Maiores Pagamentos</h2>
                <p className="text-[10px] sm:text-xs font-medium text-slate-400">Contratos ordenados por valor pago</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-emerald-100/20 max-h-[400px] overflow-y-auto">
            {maioresPagamentos.map((c, idx) => (
              <div
                key={`${c.nu_bloco}-${c.cd_contrato}-${idx}`}
                onClick={() => setSelectedContratoId(c.id_bloco || c.cd_contrato)}
                className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4 hover:bg-emerald-50/20 transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-300 min-w-[20px]">{idx + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{c.cd_contrato}</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{c.razao_social || 'Processo'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-bold text-slate-900">{formatCurrency(c.vl_total_pago)}</p>
                  <p className="text-[10px] text-slate-400">
                    {parseFloat(c.perc_pago || 0).toFixed(1)}% do total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contract Detail Panel */}
      <ContractDetail
        contratoId={selectedContratoId}
        onClose={() => setSelectedContratoId(null)}
      />
    </div>
  );
};

export default Dashboard;
