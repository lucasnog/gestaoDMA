import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, FileText, ChevronLeft, ChevronRight, Printer, Download } from 'lucide-react';
import * as apiService from '../../services/api.service';

const FichaView = ({ contratoId, contratos, onClose, onNavigate }) => {
  const [html, setHtml] = useState('');
  const [officeUrl, setOfficeUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef(null);

  const idxAtual = contratos.findIndex(c => (c.id_bloco || c.cd_contrato) === contratoId);

  useEffect(() => {
    if (!contratoId) return;
    setLoading(true);
    apiService.popularFicha(contratoId)
      .then((data) => {
        if (data.officeUrl) { setOfficeUrl(data.officeUrl); setDownloadUrl(data.downloadUrl || ''); }
        else if (data.html) { setHtml(data.html); setDownloadUrl(data.downloadUrl || ''); }
        else { setHtml('<p style="padding:20px;color:red">Erro: ' + (data.error || 'Falha ao gerar ficha') + '</p>'); }
      })
      .catch(() => { setHtml('<p style="padding:20px;color:red">Erro ao gerar ficha</p>'); })
      .finally(() => setLoading(false));
  }, [contratoId]);

  useEffect(() => {
    if (iframeRef.current && html) iframeRef.current.srcdoc = html;
  }, [html]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDownload = () => {
    if (!downloadUrl) {
      const token = JSON.parse(localStorage.getItem('gemoc-auth') || '{}')?.state?.token || '';
      window.open('/api/fichas/download-populada/' + contratoId + '?token=' + token, '_blank');
      return;
    }
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden">
      <style>{`@media print{.print\\:hidden{display:none!important}}`}</style>
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={18} className="text-emerald-600 shrink-0" />
            <h2 className="font-bold text-gray-800 truncate text-sm sm:text-base">
              Ficha — {contratoId}
            </h2>
            {idxAtual >= 0 && (
              <span className="text-xs text-slate-400 shrink-0">({idxAtual + 1} de {contratos.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
              <Download size={13} /> Download
            </button>
            {!officeUrl && <button onClick={() => { iframeRef.current?.contentWindow?.print(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <Printer size={13} /> Imprimir
            </button>}
            <button onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 relative bg-[#f9fafb]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <Loader2 size={28} className="animate-spin text-emerald-600" />
            </div>
          )}
          {officeUrl ? (
            <iframe src={officeUrl} className="w-full h-full border-0" title="Ficha" />
          ) : (
            <iframe ref={iframeRef} className="w-full h-full border-0" title="Ficha" />
          )}
        </div>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 shrink-0 bg-white">
          <button onClick={() => onNavigate(idxAtual - 1)} disabled={idxAtual <= 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={15} /> Anterior
          </button>
          <span className="text-xs text-slate-400">{(idxAtual >= 0 ? idxAtual + 1 : '?')} de {contratos.length}</span>
          <button onClick={() => onNavigate(idxAtual + 1)} disabled={idxAtual < 0 || idxAtual >= contratos.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Próximo <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FichaView;
