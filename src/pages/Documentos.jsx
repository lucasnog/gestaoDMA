import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FileText, Download, Search, Loader2, X, FileSpreadsheet, File, FileImage, Building2, FileUp, Eye } from 'lucide-react';
import * as apiService from '../services/api.service';
import { API_URL } from '../config/constants';
import Card from '../components/ui/Card';
import { useDashboardContext } from '../layouts/DashboardLayout';
import ContractDetail from '../components/contract/ContractDetail';


const PROGRAMA_CORES = {
  'GMK': { bg: 'from-blue-500 to-blue-600', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  'GME': { bg: 'from-purple-500 to-purple-600', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  'GMM': { bg: 'from-emerald-500 to-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'GMP': { bg: 'from-amber-500 to-amber-600', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
};

function extrairPrograma(nome) {
  const m = nome?.match(/^(GMK|GME|GMM|GMP)/);
  return m ? m[1] : null;
}

function formatBytes(b) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0, s = b;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
  return s.toFixed(i > 0 ? 1 : 0) + ' ' + u[i];
}

function Documentos() {
  const { search, selectedBlocos, selectedStatus, selectedSegmentos, contratos } = useDashboardContext() || {};
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contratoBusca, setContratoBusca] = useState('');
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [contratosLista, setContratosLista] = useState([]);
  const [contratoBuscaOpen, setContratoBuscaOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [selectedContratoId, setSelectedContratoId] = useState(null);
  // Lookup por id_bloco ou cd_contrato
  const contratoLookup = useMemo(() => {
    const map = {};
    if (!contratos) return map;
    for (const c of contratos) {
      const info = { nu_bloco: c.nu_bloco, cd_contrato: c.cd_contrato, segmento: c.segmento };
      if (c.id_bloco) map[c.id_bloco] = info;
      if (c.cd_contrato) map[c.cd_contrato] = info;
    }
    return map;
  }, [contratos]);

  const loadDocs = () => {
    setLoading(true);
    apiService.listarDocumentos({ limit: 9999 })
      .then(d => setDocumentos(d.data || []))
      .catch(() => setDocumentos([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadDocs(); }, []);



  const apiOrigin = API_URL.replace(/\/api$/, '');
  const docUrl = (p) => p?.startsWith('http') ? p : apiOrigin + p;
  var OFFICE_VIEWER_EXTS = ['.xlsx', '.xls', '.docx', '.doc', '.pptx', '.ppt'];
  var officeViewerUrl = (hash) => 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent(apiOrigin + '/api/documentos/view/' + hash + '?raw=true');
  const fmtDate = (d) => d ? new Date(d + 'Z').toLocaleDateString('pt-BR') : '—';
  const getIcon = (e) => {
    if (['.xlsx','.xls','.csv'].includes(e)) return FileSpreadsheet;
    if (['.pdf'].includes(e)) return FileText;
    if (['.png','.jpg','.jpeg','.gif','.svg','.webp'].includes(e)) return FileImage;
    return File;
  };

  const grupos = useMemo(() => {
    const map = {};
    for (const doc of documentos) {
      const chave = doc.id_bloco_fk || '__sem_contrato';
      (map[chave] = map[chave] || []).push(doc);
    }
    let entries = Object.entries(map);
    if (search) {
      const s = search.toLowerCase();
      entries = entries.filter(([chave, docs]) =>
        chave.toLowerCase().includes(s) || docs.some(d => d.nome_original.toLowerCase().includes(s))
      );
    }
    return entries.map(([chave, docs]) => {
      docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const prog = extrairPrograma(docs[0]?.nome_original);
      const cor = PROGRAMA_CORES[prog] || { bg: 'from-slate-500 to-slate-600', badge: 'bg-slate-100 text-slate-700 border-slate-200' };
      return {
        contrato: chave, programa: prog, cor, docs, total: docs.length,
        totalBytes: docs.reduce((s, d) => s + (d.tamanho||0), 0),
        totalFmt: formatBytes(docs.reduce((s, d) => s + (d.tamanho||0), 0)),
        exts: [...new Set(docs.map(d => d.extensao))],
        maisRecente: docs[0]?.created_at,
      };
    }).sort((a, b) => new Date(b.maisRecente) - new Date(a.maisRecente));
  }, [documentos, search]);

  const kpis = useMemo(() => ({
    totalContratos: grupos.filter(g => g.contrato !== '__sem_contrato').length,
    totalDocumentos: documentos.length,
    comPrograma: grupos.filter(g => g.programa).length,
  }), [grupos, documentos]);

  const abrirPreview = (doc) => {
    if (OFFICE_VIEWER_EXTS.includes(doc.extensao)) {
      setPreviewDoc({ ...doc, _viewerUrl: officeViewerUrl(doc.hash) });
    } else {
      window.open(docUrl(doc.view_url), '_blank');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deletar este documento?')) return;
    try { await apiService.deletarDocumento(id); loadDocs(); } catch (e) { console.error(e); }
  };


  const PROGRAM_ICONS = { 'GMK': '🛣️', 'GME': '🏗️', 'GMM': '🛤️', 'GMP': '🏘️' };

  // Documentos filtrados por busca + blocos + segmentos
  const documentosFiltrados = useMemo(() => {
    let lista = documentos;
    if (search) {
      const s = search.toLowerCase();
      lista = lista.filter(d => d.nome_original.toLowerCase().includes(s) || d.id_bloco_fk?.toLowerCase().includes(s));
    }
    if (selectedBlocos?.length > 0) {
      const normBloco = (b) => String(b || '').replace(/^0+/, '');
      lista = lista.filter(d => {
        if (!d.id_bloco_fk) return false;
        return d.nu_bloco && selectedBlocos.includes(normBloco(d.nu_bloco));
      });
    }
    if (selectedSegmentos?.length > 0) {
      lista = lista.filter(d => {
        if (!d.id_bloco_fk) return false;
        return d.segmento && selectedSegmentos.includes(d.segmento);
      });
    }
    return lista;
  }, [documentos, search, selectedBlocos, selectedSegmentos]);

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Fichas</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{kpis.totalContratos} contratos · {documentosFiltrados.length} documentos</p>
        </div>

      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 shrink-0">
        {[
          { icon: Building2, label: 'Contratos', value: kpis.totalContratos, cor: 'text-emerald-500' },
          { icon: FileUp, label: 'Documentos', value: kpis.totalDocumentos, cor: 'text-blue-500' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-3 border border-emerald-100/50">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} className={k.cor} />
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{k.label}</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{k.value}</p>
            </Card>
          );
        })}
      </div>


      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 size={24} className="animate-spin text-emerald-600" /></div>
        ) : documentosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
            <span className="text-sm font-medium">Nenhuma ficha encontrada</span>
            <span className="text-xs mt-1 text-center px-4">
              {selectedSegmentos?.length > 0
                ? 'Nao ha fichas importadas para este segmento'
                : 'Clique em Upload para adicionar fichas aos contratos'}
            </span>
          </div>
        ) : (
          <>


            {/* Desktop: tabela */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-emerald-100/30">
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contrato</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lote</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Arquivo</th>
                    
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Atualização</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100/20">
                  {documentosFiltrados.map(doc => {
                    const info = contratoLookup[doc.id_bloco_fk];
                    const prog = extrairPrograma(doc.nome_original);
                    const cor = PROGRAMA_CORES[prog] || { badge: 'bg-slate-100 text-slate-700 border-slate-200' };
                    const Icon = getIcon(doc.extensao);
                    return (
                      <tr key={doc.id} className="group cursor-pointer transition-all duration-200 hover:bg-emerald-50/40"
                        onClick={() => abrirPreview(doc)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100/50 text-[11px] font-semibold text-emerald-700">
                              {doc.nu_bloco || prog || '—'}
                            </span>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-slate-900 truncate block">{doc.id_bloco_fk || <span className="text-slate-400">Sem contrato</span>}</span>
                          <span className="text-[10px] text-slate-400 truncate block">{doc.segmento || (doc.id_bloco_fk ? '—' : '—')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900">{info?.lote || '—'}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[280px]">
                          <div className="flex items-center gap-2">
                            <Icon size={14} className="text-slate-400 shrink-0" />
                            <span className="text-[13px] font-semibold text-slate-800 truncate">{doc.nome_original}</span>
                          </div>
                        </td>
                        
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{fmtDate(doc.created_at)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedContratoId(doc.id_bloco_fk)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                              <Building2 size={10} /> Detalhes
                            </button>
                            <button onClick={() => abrirPreview(doc)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                              <Eye size={10} /> Ficha
                            </button>
                            <a href={docUrl(doc.download_url)} target="_blank"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                              <Download size={10} /> Download
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Preview full screen */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex bg-black" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white w-screen h-screen flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0">
              <h2 className="font-bold text-gray-800 truncate text-sm">{previewDoc.nome_original}</h2>
              <button onClick={() => setPreviewDoc(null)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 bg-[#f9fafb]">
              <iframe src={previewDoc._viewerUrl} className="w-full h-full border-0" title="Preview" />
            </div>
          </div>
        </div>
      )}

      {selectedContratoId && (
        <ContractDetail
          contratoId={selectedContratoId}
          onClose={() => setSelectedContratoId(null)}
        />
      )}
    </div>
  );
}

export default Documentos;