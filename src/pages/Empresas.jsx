import React, { useState, useEffect, useMemo, Fragment } from 'react';
import {
  Building2,
  FileText,
  Ruler,
  DollarSign,
  Download,
  Eye,
  X,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import ExportDialog from '../components/ui/ExportDialog';
import {
  getControlePagamentos,
  getControlePagamentoResumo,
  getDocumentosContrato,
  getDocumentoPubToken,
  downloadDocumentoContrato,
} from '../services/api.service';
import { API_URL } from '../config/constants';
import { useAuthStore } from '../stores/auth.store';

const EMPRESA_BADGE = {
  Dynatest: 'success',
  STE: 'info',
  HS: 'warning',
};

const ORDEM_EMPRESAS = ['Dynatest', 'STE', 'HS'];

// Empresa do controle de pagamentos -> rótulo usado nas notas fiscais
const EMPRESA_NOTA = {
  Dynatest: 'DYNATEST',
  STE: 'STE',
  HS: 'HUMBERTO SANTANA',
};

const Empresas = () => {
  const { isAdmin } = useAuthStore();
  const [pagamentos, setPagamentos] = useState([]);
  const [resumoPag, setResumoPag] = useState(null);
  const [pagLoading, setPagLoading] = useState(true);
  const [empresasSel, setEmpresasSel] = useState([]);
  const [tablePage, setTablePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [exportOpen, setExportOpen] = useState(false);

  // ─── Notas fiscais / atestes do contrato 61/2023 ─────────────────
  const [docsNotas, setDocsNotas] = useState([]);
  const [docsAtestes, setDocsAtestes] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null); // { doc, url, loading, error }

  useEffect(() => {
    let ativo = true;
    getDocumentosContrato()
      .then((data) => {
        if (!ativo) return;
        const docs = data?.documentos || [];
        setDocsNotas(docs.filter((d) => d.grupo === 'notas-fiscais'));
        setDocsAtestes(docs.filter((d) => d.grupo === 'atestes-nf'));
      })
      .catch(() => {
        if (ativo) { setDocsNotas([]); setDocsAtestes([]); }
      });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!previewDoc) return;
    const handler = (e) => { if (e.key === 'Escape') setPreviewDoc(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [previewDoc]);

  // Mapa `${medicao}|${empresaLabel}` -> documento da nota fiscal
  const notasMap = useMemo(() => {
    const map = new Map();
    for (const d of docsNotas) {
      const empresa = (d.empresa || '').toUpperCase();
      if (d.medicao) map.set(`${d.medicao}|${empresa}`, d);
    }
    return map;
  }, [docsNotas]);

  const getNota = (p) => {
    const label = EMPRESA_NOTA[p.empresa];
    if (!label) return null;
    return notasMap.get(`${p.nr_medicao}|${label}`) || null;
  };

  // Mapa medicao -> ateste de nota fiscal
  const atestesMap = useMemo(() => {
    const map = new Map();
    for (const d of docsAtestes) {
      if (d.medicao) map.set(String(d.medicao), d);
    }
    return map;
  }, [docsAtestes]);

  const getDocRelPath = (d) => (d?.arquivo ? String(d.arquivo).replace(/\\/g, '/') : null);

  const handleVerDoc = (d) => {
    const relPath = getDocRelPath(d);
    if (!relPath) return;
    setPreviewDoc({ doc: d, url: '', loading: true, error: null });
    getDocumentoPubToken(relPath)
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
    downloadDocumentoContrato(relPath)
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
      .sort((a, b) => parseInt(b) - parseInt(a))
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
    // saldo atual = menor saldo do conjunto (independe da ordem de exibição)
    const saldo = grupos.length ? Math.min(...grupos.map(g => g.saldo || 0)) : 0;
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
                            {isAdmin() && (() => {
                              const ateste = atestesMap.get(String(g.nr));
                              if (!ateste) return null;
                              return (
                                <span className="inline-flex items-center gap-1">
                                  <span className="text-[11px] text-slate-500">Ateste:</span>
                                  <button
                                    onClick={() => handleVerDoc(ateste)}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
                                    title="Visualizar ateste"
                                  >
                                    <Eye size={13} strokeWidth={2} />
                                  </button>
                                  <button
                                    onClick={() => handleDownloadDoc(ateste)}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                                    title="Baixar ateste"
                                  >
                                    <Download size={13} strokeWidth={2} />
                                  </button>
                                </span>
                              );
                            })()}
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
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-slate-500">{p.nr_nf || '—'}</span>
                                {isAdmin() && (() => {
                                  const nota = getNota(p);
                                  if (!nota) return null;
                                  return (
                                    <div className="inline-flex items-center gap-0.5 shrink-0">
                                      <button
                                        onClick={() => handleVerDoc(nota)}
                                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
                                        title="Visualizar nota fiscal"
                                      >
                                        <Eye size={13} strokeWidth={2} />
                                      </button>
                                      <button
                                        onClick={() => handleDownloadDoc(nota)}
                                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                                        title="Baixar nota fiscal"
                                      >
                                        <Download size={13} strokeWidth={2} />
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
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

      {/* ─── Prévia da nota fiscal (tela cheia) ─────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText size={18} className="text-red-500 shrink-0" />
              <h2 className="font-bold text-gray-800 truncate text-sm min-w-0">
                {previewDoc.doc?.titulo || previewDoc.doc?.nome || 'Nota Fiscal'}
              </h2>
              <span className="text-xs text-slate-400 uppercase shrink-0">.pdf</span>
            </div>
            <button
              onClick={() => handleDownloadDoc(previewDoc.doc)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              title="Baixar"
            >
              <Download size={18} />
            </button>
            <button
              onClick={() => setPreviewDoc(null)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              title="Fechar (Esc)"
            >
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
                title={previewDoc.doc?.titulo || 'Nota Fiscal'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Empresas;