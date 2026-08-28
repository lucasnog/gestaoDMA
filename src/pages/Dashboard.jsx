import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  FilePlus,
  BadgeCheck,
  Clock,
  Building2,
  Activity,
  UserCheck,
} from 'lucide-react';
import { LineChart, Line, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency, formatCurrencyShort, formatPercent } from '../utils/formatters';
import Card from '../components/ui/Card';
import ContractDetail from '../components/contract/ContractDetail';
import { useDashboard } from '../hooks/useDashboard';
import { getSectionStats, getContratoDetails } from '../services/api.service';
import { CONTRATO_ALVO } from '../config/constants';

const Dashboard = () => {
  const navigate = useNavigate();
  const { contratos, loading, contratoAlvo } = useDashboard();
  const [sectionStats, setSectionStats] = useState(null);
  const [selectedContratoId, setSelectedContratoId] = useState(null);
  const [medicoes, setMedicoes] = useState([]);

  // ─── Busca as medições do contrato 61/2023 para o gráfico acumulado ──
  useEffect(() => {
    let ativo = true;
    getContratoDetails(CONTRATO_ALVO.id)
      .then((details) => {
        if (!ativo) return;
        const rows = (details && Array.isArray(details.medicoes)) ? details.medicoes : [];
        setMedicoes(rows);
      })
      .catch(() => { if (ativo) setMedicoes([]); });
    return () => { ativo = false; };
  }, []);

  // ─── KPIs a partir do único contrato 61/2023 ───────────────────────
  const dashboardKpis = useMemo(() => {
    const c = contratos[0] || {};
    const total = contratos.length;
    const investido = parseFloat(c.vl_total || 0);
    const pago = parseFloat(c.vl_total_pago || 0);
    const medido = parseFloat(c.vl_total_medido || 0);
    const percGlobal = investido > 0 ? (medido / investido) * 100 : 0;
    return { total, investido, pago, medido, percGlobal, contrato: c };
  }, [contratos]);

  // ─── Gráfico acumulado das medições (0 → valor do contrato) ──────────
  const chartAcumulado = useMemo(() => {
    if (medicoes.length === 0) return [];
    const ordenadas = [...medicoes]
      .filter(m => m.vl_total || m.vl_pi || m.vl_ra)
      .map(m => {
        const vl = parseFloat(m.vl_total ?? (parseFloat(m.vl_pi || 0) + parseFloat(m.vl_ra || 0)) || 0);
        const dt = m.dt_medicao || m.dt_periodo_fim || m.dt_periodo_inicio || '';
        return { dt, label: `${m.nr_medicao || '?'}ª Medição`, valor: vl };
      })
      .filter(m => m.dt)
      .sort((a, b) => a.dt.localeCompare(b.dt));
    let acc = 0;
    return ordenadas.map((m, i) => {
      acc += m.valor;
      return { ...m, acumulado: acc, contrato: dashboardKpis.investido, idx: i };
    });
  }, [medicoes, dashboardKpis.investido]);

  // ─── Seções rápidas (todas as áreas do contrato 61/2023) ───────────────
  const sections = useMemo(() => [
    { path: '/medicoes', label: 'Medições', icon: BarChart3, key: 'medicoes', desc: 'Histórico de medições', color: 'teal' },
    { path: '/aditivos', label: 'Aditivos', icon: FilePlus, key: 'aditivos', desc: 'Aditivos contratuais', color: 'blue' },
    { path: '/apostilas', label: 'Apostilas', icon: BadgeCheck, key: 'apostilas', desc: 'Reajustes contratuais', color: 'amber' },
    { path: '/os', label: 'Ordens de Serviço', icon: Clock, key: 'os', desc: 'Histórico de OS', color: 'violet' },
    { path: '/empresas', label: 'Empresas', icon: Building2, key: 'empresas', desc: 'Fornecedores', color: 'rose' },
    { path: '/gestores', label: 'Gestores / Fiscais', icon: UserCheck, key: 'gestores', desc: 'Gestores e fiscais', color: 'emerald' },
  ], []);

  const SECTION_COLORS = {
    teal: { bg: 'from-teal-500 to-teal-600', shadow: 'shadow-teal-500/20', bar: 'bg-teal-500' },
    blue: { bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', bar: 'bg-blue-500' },
    amber: { bg: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20', bar: 'bg-amber-500' },
    violet: { bg: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/20', bar: 'bg-violet-500' },
    rose: { bg: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/20', bar: 'bg-rose-500' },
    emerald: { bg: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', bar: 'bg-emerald-500' },
  };

  // ─── Atualizar stats do backend por seção ─────────────────────────────
  useEffect(() => {
    const params = { search: contratoAlvo?.cd || '61/2023' };
    getSectionStats(params).then(res => {
      // res.gestores já vem do backend como o total de gestores+fiscais ativos
      setSectionStats(res);
    }).catch(() => {});
  }, [contratoAlvo?.cd, contratos]);

  // ─── KPI Cards ───────────────────────────────────────────────────────
  const kpiCards = useMemo(() => [
    {
      label: 'Valor do Contrato',
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
      onClick: () => navigate('/medicoes'),
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
  ], [dashboardKpis, navigate]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* KPI Cards Grid — 3 colunas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {kpiCards.map((kpi, idx) => (
          <Card
            key={idx}
            className="p-4 sm:p-5 lg:p-6 border border-emerald-100/50 shadow-sm hover:shadow-card transition-all duration-300 group cursor-pointer"
            onClick={kpi.onClick}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm ${kpi.shadow} group-hover:scale-110 transition-transform duration-300 shrink-0`}
              >
                <kpi.icon size={16} className="text-white" strokeWidth={2} />
              </div>
              <div className="ml-3 min-w-0 flex-1 text-right">
                <p className="text-[9px] sm:text-[10px] lg:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  {kpi.label}
                </p>
                <p className="text-xs sm:text-sm lg:text-xl font-bold text-slate-900 tracking-tight break-words leading-snug">
                  {kpi.value}
                </p>
              </div>
            </div>
            <div
              className={`mt-2 sm:mt-3 lg:mt-4 h-0.5 sm:h-1 w-8 sm:w-12 rounded-full ${kpi.bottomBar} opacity-30 group-hover:opacity-60 group-hover:w-full transition-all duration-500`}
            />
          </Card>
        ))}
      </div>

      {/* ─── Gráfico de Execução Acumulada ─────────────────────────────── */}
      <Card className="p-4 sm:p-6 border border-emerald-100/50 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600" strokeWidth={2} />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Execução Acumulada</h3>
            <span className="text-[10px] sm:text-[11px] text-slate-400">
              medido vs. valor do contrato ({formatCurrencyShort(dashboardKpis.investido)})
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            <span className="font-semibold text-emerald-600">{(dashboardKpis.percGlobal || 0).toFixed(1)}%</span> executado
          </div>
        </div>
        <div className="h-48 sm:h-64 chart-no-focus">
          {chartAcumulado.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartAcumulado} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <ReferenceLine y={dashboardKpis.investido} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={1}
                  label={{ value: 'Valor do Contrato', position: 'insideTopRight', fill: '#94a3b8', fontSize: 10 }} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  domain={[0, dashboardKpis.investido > 0 ? dashboardKpis.investido : 'dataMax']}
                  tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value, name) => {
                    if (name === 'acumulado') return [formatCurrency(value), 'Medido acumulado'];
                    if (name === 'contrato') return [formatCurrency(value), 'Valor do Contrato'];
                    return [formatCurrency(value), 'Valor'];
                  }}
                  labelFormatter={(label) => label}
                />
                <Line type="monotone" dataKey="acumulado" stroke="#059669" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#059669', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#059669', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300 text-sm">Carregando dados de medições...</div>
          )}
        </div>
      </Card>

      {/* ─── Section Quick Nav ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-1 h-6 sm:h-7 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/20" />
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Seções</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400">Acesso rápido às principais funcionalidades do contrato</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {sections.map((sec) => {
            const c = SECTION_COLORS[sec.color] || SECTION_COLORS.teal;
            const count = sectionStats?.[sec.key] ?? '—';
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

      {/* Contract Detail Panel (Drawer lateral sob demanda) */}
      <ContractDetail
        contratoId={selectedContratoId}
        onClose={() => setSelectedContratoId(null)}
      />
    </div>
  );
};

export default Dashboard;