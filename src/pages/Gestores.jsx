import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserCheck, Users, ClipboardList, Download, Eye, X, Loader2, FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import ContractDetail from '../components/contract/ContractDetail';
import { getGestores, getDocumentosContrato, getDocumentoPubToken, downloadDocumentoContrato } from '../services/api.service';
import { API_URL } from '../config/constants';
import { useDashboardContext } from '../layouts/DashboardLayout';

const PAGE_SIZE = 10;

const TIPO_COLORS = {
  'gestor e fiscal': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'gestor': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'fiscal': { bg: 'bg-blue-100', text: 'text-blue-700' },
};
const defaultColor = { bg: 'bg-slate-100', text: 'text-slate-600' };

function tipoClass(tipo) {
  const key = Object.keys(TIPO_COLORS).find(k => tipo?.toLowerCase().includes(k));
  return key ? TIPO_COLORS[key] : defaultColor;
}

function fmtDate(d) {
  if (!d || d === '') return null;
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function normalizeDate(d) {
  if (!d || d === '' || d === '-') return null;
  if (d.includes('/')) {
    const p = d.split('/');
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }
  return d;
}

function fmtVigencia(dInicio, dFim) {
  const inicio = fmtDate(dInicio);
  if (dFim === 'FINALIZADO') return inicio ? `${inicio} → Finalizado` : 'Finalizado';
  if (!dFim || dFim === '' || dFim === '-') return inicio || '—';
  const hoje = new Date().toISOString().slice(0, 10);
  const fimNorm = normalizeDate(dFim);
  if (!fimNorm || fimNorm === hoje) {
    return inicio ? `${inicio} → Vigente` : 'Vigente';
  }
  const fim = fmtDate(dFim);
  if (inicio && fim) return `${inicio} → ${fim}`;
  return inicio || fim || '—';
}

const Gestores = () => {
  const { search } = useDashboardContext();
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedContratoId, setSelectedContratoId] = useState(null);
  const [docsPortarias, setDocsPortarias] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Carrega PDFs de portarias do contrato 61/2023
  useEffect(() => {
    let active = true;
    getDocumentosContrato()
      .then((data) => {
        if (!active) return;
        setDocsPortarias((data?.documentos || []).filter(d => d.grupo === 'portarias'));
      })
      .catch(() => { if (active) setDocsPortarias([]); });
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

  // Mapa de portarias PDF por SEI e por título
  const docsPortariasMap = useMemo(() => {
    const map = new Map();
    for (const d of docsPortarias) {
      if (d.numero) map.set(String(d.numero), d);
      const numMatch = (d.titulo || '').match(/(\d+)[-/](\d{4})/);
      if (numMatch) map.set(`${numMatch[1]}/${numMatch[2]}`, d);
    }
    return map;
  }, [docsPortarias]);

  const findDocPortaria = (grupo) => {
    const m = (grupo.portaria || '').match(/\(([^)]+)\)/);
    const sei = m ? m[1] : (grupo.portaria || '');
    if (docsPortariasMap.has(sei)) return docsPortariasMap.get(sei);
    const numMatch = (grupo.portaria || '').match(/(\d+)[-/](\d{4})/);
    if (numMatch) {
      const key = `${numMatch[1]}/${numMatch[2]}`;
      if (docsPortariasMap.has(key)) return docsPortariasMap.get(key);
    }
    return null;
  };

  const buildParams = useCallback((s, limit) => {
    const params = { page: 1, limit: limit || PAGE_SIZE };
    if (s) params.busca = s;
    return params;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(search, 500);
      const res = await getGestores(params);
      setData(res.data || []);
    } catch (e) {
      console.error('[Gestores]', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [search, buildParams]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, itemsPerPage]);

  // Agrupa por portaria e ordena do mais recente para o mais antigo
  const gruposPorPortaria = useMemo(() => {
    const grupos = {};
    for (const g of data) {
      const chave = g.PORTARIA_SEI || '—';
      if (!grupos[chave]) {
        grupos[chave] = { portaria: chave, dataInicial: null, dataFinal: null, pessoas: new Map() };
      }
      const grupo = grupos[chave];
      if (!grupo.dataInicial || (g.DATA_INICIAL || '') < grupo.dataInicial) grupo.dataInicial = g.DATA_INICIAL || '';
      if (!grupo.dataFinal || (g.DATA_FINAL || '') > grupo.dataFinal) grupo.dataFinal = g.DATA_FINAL || '';
      const pessoa = grupo.pessoas.get(g.NOME) || { nome: g.NOME, tipos: new Set(), dataInicial: null };
      if (g.TIPO) pessoa.tipos.add(g.TIPO);
      if (!pessoa.dataInicial || (g.DATA_INICIAL || '') > pessoa.dataInicial) pessoa.dataInicial = g.DATA_INICIAL || '';
      grupo.pessoas.set(g.NOME, pessoa);
    }
    return Object.values(grupos)
      .map(grupo => ({
        ...grupo,
        pessoas: [...grupo.pessoas.values()].sort((a, b) => {
          const aGestor = [...a.tipos].some(t => t.toLowerCase().includes('gestor'));
          const bGestor = [...b.tipos].some(t => t.toLowerCase().includes('gestor'));
          if (aGestor && !bGestor) return -1;
          if (!aGestor && bGestor) return 1;
          return (a.nome || '').localeCompare(b.nome || '');
        }),
      }))
      .sort((a, b) => {
        const aData = a.dataInicial || '';
        const bData = b.dataInicial || '';
        return bData.localeCompare(aData);
      })
      .map((grupo, idx) => ({ ...grupo, isAtual: idx === 0 }));
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(gruposPorPortaria.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedGrupos = gruposPorPortaria.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const totalPessoas = useMemo(() => {
    const nomes = new Set();
    for (const g of gruposPorPortaria) {
      for (const p of g.pessoas) nomes.add(p.nome);
    }
    return nomes.size;
  }, [gruposPorPortaria]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-8 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/20" />
        <div>
          <h1 className="text-lg font-bold text-slate-900">Gestores e Fiscais</h1>
          </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Users size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Pessoas</p>
              <p className="text-xl font-bold text-slate-800">{loading ? '—' : totalPessoas}</p>
            </div>
          </div>
        </Card>

        <Card padding="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ClipboardList size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Portarias</p>
              <p className="text-xl font-bold text-slate-800">{loading ? '—' : gruposPorPortaria.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-left text-slate-400">Portaria SEI</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-left text-slate-400">Vigência</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-left text-slate-400">Pessoas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>
                    ))}
                  </tr>
                ))
              ) : gruposPorPortaria.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-slate-400">
                    <UserCheck size={32} className="mx-auto mb-2 opacity-30" />
                    Nenhum gestor/fiscal encontrado
                  </td>
                </tr>
              ) : (
                pagedGrupos.map((grupo, idx) => {
                  const doc = findDocPortaria(grupo);
                  return (
                  <tr key={idx} className="border-b border-slate-50 align-top">
                    <td className="px-4 py-3 text-[10px] text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                      {(() => {
                        const m = grupo.portaria?.match(/\(([^)]+)\)/);
                        return m ? (
                          <span className="font-medium cursor-pointer hover:text-emerald-600 transition-colors" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(m[1]); }} title="Copiar número SEI">
                            {grupo.portaria}
                          </span>
                        ) : (grupo.portaria || '—');
                      })()}
                        {doc && (
                          <div className="inline-flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => handleVerDoc(doc)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
                              title="Visualizar portaria"
                            >
                              <Eye size={13} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => handleDownloadDoc(doc)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-semibold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                              title="Baixar portaria"
                            >
                              <Download size={13} strokeWidth={2} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
<td className="px-4 py-3 text-slate-500 text-[10px]">
  {grupo.isAtual ? (
    <span className="text-emerald-600 font-semibold whitespace-nowrap">{fmtDate(grupo.dataInicial) || '—'} · VIGENTE</span>
  ) : (
    fmtVigencia(grupo.dataInicial, grupo.dataFinal)
  )}
</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {grupo.pessoas.map((p, pi) => (
                          <div key={pi} className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-800">{p.nome || '—'}</span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-medium ${tipoClass([...p.tipos][0]).bg} ${tipoClass([...p.tipos][0]).text}`}>
                              {[...p.tipos][0] || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} />
        </div>
      </Card>

      {selectedContratoId && (
        <ContractDetail
          contratoId={selectedContratoId}
          onClose={() => setSelectedContratoId(null)}
        />
      )}

      {/* ─── Prévia da portaria (tela cheia) ─────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText size={18} className="text-red-500 shrink-0" />
              <h2 className="font-bold text-gray-800 truncate text-sm min-w-0">
                {previewDoc.doc?.titulo || previewDoc.doc?.nome || 'Portaria'}
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
                title={previewDoc.doc?.titulo || 'Portaria'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Gestores;