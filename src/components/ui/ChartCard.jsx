import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import Card from './Card';

const CHART_PER_PAGE = 12;

export function getWeekNumber(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const weekNum = Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${year}-${String(weekNum).padStart(2, '0')}`;
}

export function getPeriodoKey(data, periodo) {
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
}

export function getPeriodoLabel(periodoKey, tipo) {
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
}

export default function ChartCard({
  title = 'Gráfico',
  dataKey = 'quantidade',
  data = [],
  tooltipFormatter,
  yTickFormatter,
  selectedPeriodo,
  onSelectPeriodo,
  colorActive = '#059669',
  colorInactive = '#D1D5DB',
  emptyText = 'Sem dados para exibir',
}) {
  const [chartPeriodo, setChartPeriodo] = useState('mes');
  const [chartPage, setChartPage] = useState(0);

  const chartData = useMemo(() => {
    if (!data.length) return [];
    const chartMap = {};
    data.forEach(item => {
      const dt = item.DATA_DA_ASSINATURA || item.DATA_OS || item.dt_medicao || '';
      if (dt) {
        const key = getPeriodoKey(dt, chartPeriodo);
        if (!key) return;
        if (!chartMap[key]) chartMap[key] = { periodo: key, quantidade: 0, valor: 0 };
        chartMap[key].quantidade++;
        chartMap[key].valor += parseFloat(item.valor || item.vl_total || item.VALOR_DO_ADITIVO_NUM || item.VALOR_DA_APOSTILA_NUM || 0);
        return;
      }
      const key = item.periodo || item.mes || '';
      if (!key) return;
      if (!chartMap[key]) chartMap[key] = { periodo: key, quantidade: 0, valor: 0 };
      chartMap[key].quantidade += item.quantidade || 1;
      chartMap[key].valor += item.valor || item.vl_total || 0;
    });
    return Object.values(chartMap).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [data, chartPeriodo]);

  useEffect(() => { setChartPage(0); }, [chartPeriodo]);
  const newestFirst = [...chartData].reverse();
  const totalPages = Math.max(1, Math.ceil(newestFirst.length / CHART_PER_PAGE));
  const safePage = Math.min(chartPage, totalPages - 1);
  const pagedData = newestFirst.slice(safePage * CHART_PER_PAGE, (safePage + 1) * CHART_PER_PAGE).reverse();

  const defaultTooltip = (value, name) => [
    name === 'valor' ? `R$ ${(value / 1000000).toFixed(2)}M` : value,
    name === 'quantidade' ? 'Quantidade' : 'Valor'
  ];

  return (
    <Card className="p-4 sm:p-6 border border-emerald-100/50 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-emerald-600" strokeWidth={2} />
          <h3 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h3>
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
              onClick={() => { setChartPeriodo(opt.key); setChartPage(0); }}
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
        {pagedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pagedData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              onClick={(d) => {
                if (d?.activeLabel && onSelectPeriodo) onSelectPeriodo(d.activeLabel);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={(v) => getPeriodoLabel(v, chartPeriodo)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                tickFormatter={yTickFormatter} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={tooltipFormatter || defaultTooltip}
                labelFormatter={(label) => getPeriodoLabel(label, chartPeriodo)} />
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={40} style={{ cursor: 'pointer', outline: 'none' }}>
                {pagedData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.periodo === selectedPeriodo ? colorActive : colorInactive} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300 text-sm">{emptyText}</div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-emerald-100/30">
          <button onClick={() => setChartPage(safePage + 1)} disabled={safePage >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            &larr; Anterior
          </button>
          <span className="text-[11px] font-medium text-slate-400">{safePage + 1} de {totalPages}</span>
          <button onClick={() => setChartPage(safePage - 1)} disabled={safePage <= 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Próximo &rarr;
          </button>
        </div>
      )}
    </Card>
  );
}
