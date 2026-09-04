import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  DollarSign,
  TrendingUp,
  Download,
  BadgeCheck,
  Clock,
  X,
  Calendar,
  RefreshCw,
  History
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import ExportDialog from '../components/ui/ExportDialog';
import { getEmpenhos, getEmpenhosResumo, getEmpenhosTotais } from '../services/api.service';

const TIPO_BADGE = {
  EXC: 'info',
  DEA: 'warning',
  RAP: 'success',
  X: 'success',
};

const TIPO_LABEL = {
  EXC: 'EXC',
  DEA: 'DEA',
  RAP: 'RAP',
  X: 'Liquidado',
};

// ─── Significado de cada tipo de empenho ──────────────────────────────
const TIPO_INFO = {
  EXC: {
    nome: 'Exercício Corrente',
    descricao: 'Empenho do orçamento do exercício atual (ano vigente). É o tipo padrão para novas despesas.',
    icon: Calendar,
    color: 'from-sky-500 to-blue-600',
    shadow: 'shadow-sky-500/20',
  },
  DEA: {
    nome: 'Despesa de Exercícios Anteriores',
    descricao: 'Despesas cujo fato gerador ocorreu em exercícios anteriores e são pagas no exercício atual.',
    icon: History,
    color: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/20',
  },
  RAP: {
    nome: 'Restos a Pagar',
    descricao: 'Empenhos emitidos em anos anteriores que ainda não foram pagos, inscritos em restos a pagar.',
    icon: RefreshCw,
    color: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/20',
  },
  X: {
    nome: 'Liquidado',
    descricao: 'Empenho totalmente liquidado e pago (sem saldo a liquidar ou a pagar).',
    icon: BadgeCheck,
    color: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/20',
  },
};

const Empenhos = () => {
  const [empenhos, setEmpenhos] = useState([]);
  const [resumoAnos, setResumoAnos] = useState([]);
  const [totais, setTotais] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroAno, setFiltroAno] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [exportOpen, setExportOpen] = useState(false);

  // Totais por tipo de empenho
  const totaisPorTipo = useMemo(() => {
    const map = {};
    empenhos.forEach(e => {
      const tipo = e.tipo || 'X';
      if (!map[tipo]) map[tipo] = { total: 0, qtd: 0 };
      map[tipo].total += parseFloat(e.saldo_empenhado || 0);
      map[tipo].qtd += 1;
    });
    return map;
  }, [empenhos]);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const [lista, resumo, totaisData] = await Promise.all([
          getEmpenhos(),
          getEmpenhosResumo(),
          getEmpenhosTotais(),
        ]);
        if (!ativo) return;
        setEmpenhos(lista?.empenhos || []);
        setResumoAnos(resumo?.anos || []);
        setTotais(totaisData);
      } catch (err) {
        console.error('[Empenhos] Erro ao carregar:', err);
      } finally {
        if (ativo) setLoading(false);
      }
    };
    carregar();
    return () => { ativo = false; };
  }, []);

  useEffect(() => { setPage(1); }, [filtroAno, filtroTipo, itemsPerPage]);

  const filtrados = useMemo(() => {
    let list = empenhos;
    if (filtroAno) list = list.filter(e => e.ano === filtroAno);
    if (filtroTipo) list = list.filter(e => e.tipo === filtroTipo);
    return list;
  }, [empenhos, filtroAno, filtroTipo]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtrados.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const exportColumns = [
    { key: 'nr_empenho', label: 'Empenho' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'ano', label: 'Ano' },
    { key: 'saldo_empenhado', label: 'Saldo Empenhado' },
    { key: 'saldo_liquidado', label: 'Saldo Liquidado' },
    { key: 'saldo_pago', label: 'Saldo Pago' },
    { key: 'emp_a_liquidar', label: 'A Liquidar' },
    { key: 'liq_a_pagar', label: 'A Pagar' },
    { key: 'total', label: 'Total' },
  ];

  const exportData = useMemo(() =>
    filtrados.map(e => ({
      nr_empenho: e.nr_empenho,
      tipo: (e.tipo && TIPO_LABEL[e.tipo]) || e.tipo || '',
      ano: e.ano || '',
      saldo_empenhado: e.saldo_empenhado || 0,
      saldo_liquidado: e.saldo_liquidado || 0,
      saldo_pago: e.saldo_pago || 0,
      emp_a_liquidar: e.emp_a_liquidar || 0,
      liq_a_pagar: e.liq_a_pagar || 0,
      total: e.total || 0,
    })),
    [filtrados]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Empenhos</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            Empenhos do contrato 61/2023 — Gestão DMA
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          <button
            onClick={() => setExportOpen(true)}
            disabled={loading || exportData.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20">
                  <DollarSign size={14} className="text-white" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Empenhado</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{formatCurrency(totais?.total_empenhado || 0)}</p>
              <p className="text-[8px] text-slate-300 mt-1">{totais?.total_empenhos || 0} empenhos · {totais?.total_anos || 0} anos</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
                  <BadgeCheck size={14} className="text-white" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Liquidado</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{formatCurrency(totais?.total_liquidado || 0)}</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm shadow-teal-500/20">
                  <TrendingUp size={14} className="text-white" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Pago</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{formatCurrency(totais?.total_pago || 0)}</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm shadow-amber-500/20">
                  <Clock size={14} className="text-white" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">A Liquidar</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{formatCurrency(totais?.total_a_liquidar || 0)}</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-sm shadow-red-500/20">
                  <FileText size={14} className="text-white" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">A Pagar</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{formatCurrency(totais?.total_a_pagar || 0)}</p>
            </Card>
          </>
        )}
      </div>

      {/* Resumo por ano */}
      {resumoAnos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {resumoAnos.map(a => (
            <button
              key={a.ano}
              onClick={() => setFiltroAno(filtroAno === a.ano ? null : a.ano)}
              className={`p-3 sm:p-4 rounded-xl border text-left transition-all duration-200 ${
                filtroAno === a.ano
                  ? 'border-emerald-600/30 bg-emerald-50/50 ring-2 ring-emerald-600/15'
                  : 'border-emerald-100/50 bg-white hover:shadow-card hover:border-emerald-200/60'
              }`}
            >
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{a.ano}</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 mt-1">{formatCurrency(a.total_empenhado)}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{a.total_empenhos} empenhos</p>
            </button>
          ))}
        </div>
      )}

      {/* Tipos de empenho */}
      <div>
        <div className="flex items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-6 sm:h-7 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/20" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Tipos de Empenho</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Classificação e total por tipo</p>
            </div>
          </div>
          {(filtroAno || filtroTipo) && (
            <button
              onClick={() => { setFiltroAno(null); setFiltroTipo(null); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X size={12} strokeWidth={2} />
              Limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {['EXC', 'DEA', 'RAP', 'X'].map(tipo => {
            const info = TIPO_INFO[tipo] || TIPO_INFO.X;
            const dados = totaisPorTipo[tipo] || { total: 0, qtd: 0 };
            const Icon = info.icon;
            const ativo = filtroTipo === tipo;
            return (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(filtroTipo === tipo ? null : tipo)}
                className={`text-left rounded-xl border transition-all duration-200 cursor-pointer p-4 sm:p-5 group ${
                  ativo
                    ? 'border-emerald-600/30 bg-emerald-50/50 ring-2 ring-emerald-600/15'
                    : 'border-emerald-100/50 bg-white hover:shadow-card hover:border-emerald-200/60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center shadow-sm ${info.shadow} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={16} className="text-white" strokeWidth={2} />
                  </div>
                  <Badge variant={TIPO_BADGE[tipo] || 'neutral'} size="sm">{TIPO_LABEL[tipo] || tipo}</Badge>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{info.nome}</p>
                <p className="text-sm sm:text-base font-bold text-slate-900 tracking-tight break-words">{formatCurrency(dados.total)}</p>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{info.descricao}</p>
                <p className="text-[9px] text-slate-300 mt-2">{dados.qtd} empenho(s)</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela */}
      <Card className="border border-emerald-100/50 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-emerald-100/30 flex items-center gap-2">
          <FileText size={14} className="text-emerald-600" strokeWidth={2} />
          <h3 className="text-[11px] sm:text-sm font-bold text-slate-900">Empenhos</h3>
          <span className="text-[10px] sm:text-[11px] text-slate-400">({filtrados.length} registros)</span>
        </div>

        {loading ? (
          <div className="p-6">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full mb-2" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-emerald-100/30 bg-emerald-50/30">
                  <th className="px-3 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Empenho</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ano</th>
                  <th className="px-3 sm:px-6 py-3 text-right text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Saldo Empenhado</th>
                  <th className="px-3 sm:px-6 py-3 text-right text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Liquidado</th>
                  <th className="px-3 sm:px-6 py-3 text-right text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pago</th>
                  <th className="px-3 sm:px-6 py-3 text-right text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">A Liquidar</th>
                  <th className="px-3 sm:px-6 py-3 text-right text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">A Pagar</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 sm:px-6 py-8 text-center text-slate-400 text-xs">
                      Nenhum empenho encontrado
                    </td>
                  </tr>
                ) : (
                  paged.map((e, idx) => (
                    <tr key={e.id || idx} className="group transition-all duration-200 hover:bg-emerald-50/40">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="text-[11px] sm:text-sm font-semibold text-slate-900">{e.nr_empenho}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        {e.tipo ? (
                          <Badge variant={TIPO_BADGE[e.tipo] || 'neutral'} size="sm">{TIPO_LABEL[e.tipo] || e.tipo}</Badge>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="text-[11px] sm:text-sm font-medium text-slate-700">{e.ano || '—'}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        <span className="text-[11px] sm:text-sm font-semibold text-slate-900">{formatCurrency(e.saldo_empenhado)}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        <span className="text-[11px] sm:text-sm font-medium text-slate-700">{formatCurrency(e.saldo_liquidado)}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        <span className="text-[11px] sm:text-sm font-medium text-emerald-600">{formatCurrency(e.saldo_pago)}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        <span className="text-[11px] sm:text-sm font-medium text-amber-600">{formatCurrency(e.emp_a_liquidar)}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        <span className="text-[11px] sm:text-sm font-medium text-red-500">{formatCurrency(e.liq_a_pagar)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} />
      </Card>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        data={exportData}
        columns={exportColumns}
        formatters={{
          saldo_empenhado: formatCurrency,
          saldo_liquidado: formatCurrency,
          saldo_pago: formatCurrency,
          emp_a_liquidar: formatCurrency,
          liq_a_pagar: formatCurrency,
          total: formatCurrency,
        }}
        filename="empenhos"
        title="Exportar Empenhos"
      />
    </div>
  );
};

export default Empenhos;