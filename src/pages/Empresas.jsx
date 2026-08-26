import React, { useState, useEffect, useMemo, Fragment } from 'react';
import {
  Building2,
  FileText,
  Ruler,
  DollarSign,
  Download
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import ExportDialog from '../components/ui/ExportDialog';
import { getControlePagamentos, getControlePagamentoResumo } from '../services/api.service';

const EMPRESA_BADGE = {
  Dynatest: 'success',
  STE: 'info',
  HS: 'warning',
};

const ORDEM_EMPRESAS = ['Dynatest', 'STE', 'HS'];

const Empresas = () => {
  const [pagamentos, setPagamentos] = useState([]);
  const [resumoPag, setResumoPag] = useState(null);
  const [pagLoading, setPagLoading] = useState(true);
  const [empresasSel, setEmpresasSel] = useState([]);
  const [tablePage, setTablePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const [lista, resumo] = await Promise.all([
          getControlePagamentos(),
          getControlePagamentoResumo(),
        ]);
        if (!ativo) return;
        setPagamentos(lista?.pagamentos || []);
        setResumoPag(resumo);
      } catch (err) {
        console.error('[Empresas] Erro ao carregar controle de pagamentos:', err);
      } finally {
        if (ativo) setPagLoading(false);
      }
    };
    carregar();
    return () => { ativo = false; };
  }, []);

  useEffect(() => { setTablePage(1); }, [empresasSel, itemsPerPage]);

  const filtrados = useMemo(() => {
    let list = pagamentos;
    if (empresasSel.length > 0) {
      const set = new Set(empresasSel);
      list = list.filter(p => set.has(p.empresa));
    }
    return list;
  }, [pagamentos, empresasSel]);

  const grupos = useMemo(() => {
    const map = {};
    filtrados.forEach(p => {
      const chave = p.nr_medicao;
      if (!map[chave]) map[chave] = [];
      map[chave].push(p);
    });
    return Object.keys(map)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(nr => {
        const linhas = map[nr].sort((a, b) => {
          const ia = ORDEM_EMPRESAS.indexOf(a.empresa);
          const ib = ORDEM_EMPRESAS.indexOf(b.empresa);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
        const totalPago = linhas.reduce((s, p) => s + (p.vl_pago || 0), 0);
        const acumulado = linhas.reduce((m, p) => Math.max(m, p.vl_acumulado || 0), 0);
        return {
          nr,
          linhas,
          periodo: linhas[0]?.periodo || '—',
          dt_periodo_inicio: linhas[0]?.dt_periodo_inicio || '',
          dt_periodo_fim: linhas[0]?.dt_periodo_fim || '',
          dt_liberacao: linhas[0]?.dt_liberacao || '—',
          saldo: linhas[0]?.saldo_contrato || 0,
          totalPago,
          acumulado,
        };
      });
  }, [filtrados]);

  const totalTablePages = Math.max(1, Math.ceil(grupos.length / itemsPerPage));
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const pagedGrupos = grupos.slice((safeTablePage - 1) * itemsPerPage, safeTablePage * itemsPerPage);

  // Valor total do contrato para calcular % de execução
  // totalContrato = acumulado final + saldo atual (do próprio conjunto de pagamentos)
  const totais = useMemo(() => {
    const totalPago = filtrados.reduce((s, p) => s + (p.vl_pago || 0), 0);
    const acumulado = filtrados.reduce((m, p) => Math.max(m, p.vl_acumulado || 0), 0);
    const saldo = grupos.length ? grupos[grupos.length - 1].saldo : 0;
    return { totalPago, acumulado, saldo, totalContrato: acumulado + saldo };
  }, [filtrados, grupos]);

  const formatarPeriodo = (g) => {
    if (g.dt_periodo_inicio && g.dt_periodo_fim) return `${g.dt_periodo_inicio} a ${g.dt_periodo_fim}`;
    return g.periodo;
  };

  // Exportação (uma linha por pagamento)
  const exportColumns = useMemo(() => [
    { key: 'nr_medicao', label: 'Medição' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'periodo', label: 'Período' },
    { key: 'nr_nf', label: 'NF' },
    { key: 'vl_pago', label: 'Valor Pago' },
    { key: 'perc', label: '% Med.' },
    { key: 'dt_liberacao', label: 'Liberação' },
  ], []);

  const exportData = useMemo(() => {
    return filtrados.map(p => {
      const grupo = grupos.find(g => g.nr === p.nr_medicao);
      const perc = grupo?.totalPago > 0 ? ((p.vl_pago || 0) / grupo.totalPago) * 100 : 0;
      return {
        nr_medicao: p.nr_medicao ? `${p.nr_medicao}ª` : '',
        empresa: p.empresa || '',
        periodo: p.periodo || '',
        nr_nf: p.nr_nf || '',
        vl_pago: p.vl_pago || 0,
        perc: perc.toFixed(1) + '%',
        dt_liberacao: p.dt_liberacao || '',
      };
    });
  }, [filtrados, grupos]);

  const toggleEmpresa = (emp) => {
    setEmpresasSel(prev =>
      prev.includes(emp) ? prev.filter(e => e !== emp) : [...prev, emp]
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Empresas</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            Controle de pagamentos do contrato 61/2023 — Gestão DMA
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          {empresasSel.length > 0 && (
            <button
              onClick={() => setEmpresasSel([])}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              Limpar filtros
            </button>
          )}
          <button
            onClick={() => setExportOpen(true)}
            disabled={pagLoading || exportData.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        {(resumoPag?.empresas || []).map((e) => {
          const selecionada = empresasSel.includes(e.empresa);
          return (
            <Card
              key={e.empresa}
              className={`p-4 sm:p-5 border border-emerald-100/50 hover:shadow-card transition-all duration-200 cursor-pointer ${
                selecionada
                  ? 'ring-2 ring-emerald-600/30 border-emerald-600/40 bg-emerald-50/30'
                  : ''
              }`}
              onClick={() => toggleEmpresa(e.empresa)}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200/60 flex items-center justify-center">
                  <Building2 size={15} className="text-emerald-600" strokeWidth={2} />
                </div>
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-900 mb-1">{e.empresa}</p>
              <p className="text-lg sm:text-xl font-bold text-emerald-600 tracking-tight">{formatCurrency(e.total_pago)}</p>
              <div className="flex items-center gap-3 mt-1 sm:mt-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><FileText size={10} strokeWidth={2} /> {e.total_medicoes} medições</span>
                <span>Saldo: {formatCurrency(e.saldo_atual)}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card padding="p-0" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-100/30 bg-emerald-50/30 flex items-center gap-2.5 flex-wrap">
          <DollarSign size={16} className="text-emerald-600" strokeWidth={2} />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medições</span>
          <span className="text-[10px] font-medium text-slate-400 ml-2">
            {grupos.length} medições{empresasSel.length > 0 ? ` · ${empresasSel.join(', ')}` : ' · Todas as empresas'}
          </span>
        </div>

        {pagLoading ? (
          <div className="p-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full mb-2" />
            ))}
          </div>
        ) : (
                    <div className="overflow-x-auto">
            {pagedGrupos.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <Ruler size={40} className="mx-auto text-emerald-200 mb-4" strokeWidth={1.5} />
                <p className="text-sm font-medium text-slate-400">Nenhuma medição encontrada</p>
                <p className="text-xs text-slate-300 mt-1">
                  {empresasSel.length > 0 ? 'Ajuste os filtros para ver os resultados' : 'Nenhum pagamento cadastrado'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left">
                <tbody className="divide-y divide-emerald-100/20">
                  {pagedGrupos.map((g) => (
                    <Fragment key={g.nr}>
                      {/* Linha informativa da medição */}
                      <tr className="bg-emerald-50/60 border-t border-emerald-100/30">
                        <td colSpan="7" className="px-4 py-2.5">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100/50 text-[11px] font-semibold text-emerald-700">
                              {g.nr}ª Medição
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Período: {formatarPeriodo(g)}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800">
                              Valor Total: {formatCurrency(g.totalPago)}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {/* Cabeçalho de colunas (dentro da medição) */}
                      <tr className="bg-emerald-50/20 border-b border-emerald-100/20">
                        <th className="px-4 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider"></th>
                        <th className="px-4 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Empresa</th>
                        <th className="px-4 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider"></th>
                        <th className="px-4 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">NF</th>
                        <th className="px-4 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider text-right">Valor</th>
                        <th className="px-4 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider text-right">% Med.</th>
                        <th className="px-4 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Liberação</th>
                      </tr>
                      {/* Linhas por empresa */}
                      {g.linhas.map((p) => {
                        const perc = g.totalPago > 0 ? ((p.vl_pago || 0) / g.totalPago) * 100 : 0;
                        return (
                          <tr key={p.id} className="text-[12px] text-slate-600 hover:bg-emerald-50/40 transition-colors">
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2">
                              <Badge variant={EMPRESA_BADGE[p.empresa] || 'neutral'} size="sm">
                                {p.empresa}
                              </Badge>
                            </td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2 font-mono text-xs text-slate-500">{p.nr_nf || '—'}</td>
                            <td className="px-4 py-2 text-right font-medium text-slate-800">{formatCurrency(p.vl_pago)}</td>
                            <td className="px-4 py-2 text-right">
                              <span className="text-xs font-semibold text-slate-500">{perc.toFixed(1)}%</span>
                            </td>
                            <td className="px-4 py-2 whitespace-owrap text-xs text-slate-500">{p.dt_liberacao || '—'}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        <Pagination page={safeTablePage} totalPages={totalTablePages} onChange={setTablePage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} />
      </Card>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        data={exportData}
        columns={exportColumns}
        formatters={{
          vl_pago: formatCurrency,
        }}
        filename="controle-pagamentos"
        title="Exportar Controle de Pagamentos"
      />
    </div>
  );
};

export default Empresas;