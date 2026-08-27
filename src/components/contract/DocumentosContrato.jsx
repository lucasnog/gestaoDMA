import React, { useState, useEffect } from 'react';
import { FileText, Download, X, Loader2, File as FileIcon } from 'lucide-react';
import * as apiService from '../../services/api.service';
import { API_URL } from '../../config/constants';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';

/**
 * Tabela de documentos PDF do contrato 61/2023 filtrada por grupo.
 * Padrão igual ao das medições: Ver (viewer) + Baixar.
 * @param {string} grupo - apostilas | OS | portarias | readequacoes | retificacoes
 * @param {string} titulo - título da seção
 */
const DocumentosContrato = ({ grupo, titulo }) => {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiService.getDocumentosContrato()
      .then((data) => {
        if (!active) return;
        const lista = data?.documentos || [];
        setDocumentos(lista.filter(d => d.grupo === grupo));
      })
      .catch(() => { if (active) setDocumentos([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [grupo]);

  useEffect(() => {
    if (!preview) return;
    const handler = (e) => { if (e.key === 'Escape') setPreview(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [preview]);

  const getRelPath = (d) => d?.arquivo ? String(d.arquivo).replace(/\\/g, '/') : null;

  const handleVer = (d) => {
    const relPath = getRelPath(d);
    if (!relPath) return;
    setPreview({ doc: d, url: '', loading: true, error: null });
    apiService.getDocumentoPubToken(relPath)
      .then((data) => {
        if (!data?.token) throw new Error('Sem token');
        const pubUrl = API_URL + '/documentos-contrato/pub/' + data.token;
        setPreview({ doc: d, url: pubUrl, loading: false, error: null });
      })
      .catch((e) => setPreview({ doc: d, url: '', loading: false, error: e.message }));
  };

  const handleDownload = (d) => {
    const relPath = getRelPath(d);
    if (!relPath) return;
    apiService.downloadDocumentoContrato(relPath)
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

  return (
    <>
      <Card padding="p-0" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-100/30 bg-emerald-50/30 flex items-center gap-2.5 flex-wrap">
          <FileText size={16} className="text-emerald-600" strokeWidth={2} />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {titulo}
          </span>
          <span className="text-[10px] font-medium text-slate-400 ml-2">{documentos.length} arquivos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-emerald-100/30">
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Arquivo
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Atualizado em
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center w-28">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/20">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-6 w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : documentos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <FileText size={32} className="mx-auto text-emerald-200 mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-slate-400">Nenhum documento disponível</p>
                  </td>
                </tr>
              ) : (
                documentos.map((d, idx) => {
                  const relPath = getRelPath(d);
                  return (
                    <tr
                      key={`${d.nome}-${idx}`}
                      onClick={() => { if (relPath) handleVer(d); }}
                      className={`group transition-all duration-200 hover:bg-emerald-50/40 ${relPath ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileIcon size={14} className="text-red-400 shrink-0" strokeWidth={2} />
                          <span className="text-sm font-semibold text-slate-800">{d.titulo || d.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">{d.nome}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">
                          {d.baixadoEm ? new Date(d.baixadoEm).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleVer(d); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
                            title="Visualizar documento"
                          >
                            <FileText size={12} strokeWidth={2} />
                            Ver
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(d); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                            title="Baixar arquivo"
                          >
                            <Download size={12} strokeWidth={2} />
                            Baixar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Prévia do documento (tela cheia) ─────────── */}
      {preview && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText size={18} className="text-red-500 shrink-0" />
              <h2 className="font-bold text-gray-800 truncate text-sm min-w-0">
                {preview.doc?.titulo || preview.doc?.nome || 'Documento'}
              </h2>
              <span className="text-xs text-slate-400 uppercase shrink-0">.pdf</span>
            </div>
            <button onClick={() => setPreview(null)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-auto" title="Fechar (Esc)">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 bg-[#f0f0f0] relative min-h-0">
            {preview.loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <Loader2 size={28} className="animate-spin text-emerald-600" />
              </div>
            )}
            {preview.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <p className="text-red-500 text-sm">Erro: {preview.error}</p>
              </div>
            )}
            {!preview.loading && !preview.error && (
              <iframe
                src={preview.url}
                className="w-full h-full border-0"
                title={preview.doc?.titulo || 'Documento'}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentosContrato;
