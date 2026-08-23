import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, FileSpreadsheet, File as FileIcon, X, Search, FileText } from 'lucide-react';
import * as apiService from '../services/api.service';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ContractDetail from '../components/contract/ContractDetail';
import { API_URL } from '../config/constants';
import { useDashboardContext } from '../layouts/DashboardLayout';

function Fichas() {
  const { search, selectedBlocos, selectedSegmentos } = useDashboardContext() || {};
  const [matched, setMatched] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [selectedContratoId, setSelectedContratoId] = useState(null);

  useEffect(() => {
    if (!preview) return;
    const handler = (e) => { if (e.key === 'Escape') closePreview(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [preview]);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    apiService.getFichasMatch().then(data => {
      setMatched(data?.contratos || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  var filtered = matched;
  if (search) {
    var s = search.toLowerCase();
    filtered = matched.filter(i => (i.cd_contrato||'').toLowerCase().includes(s) || (i.nu_bloco||'').includes(s) || (i.segmento||'').toLowerCase().includes(s) || (i.ficha.nome||'').toLowerCase().includes(s));
  }
  if (selectedBlocos && selectedBlocos.length > 0)
    filtered = filtered.filter(i => i.nu_bloco && selectedBlocos.includes(i.nu_bloco));
  if (selectedSegmentos && selectedSegmentos.length > 0)
    filtered = filtered.filter(i => i.segmento && selectedSegmentos.some(s => i.segmento.toLowerCase().includes(s.toLowerCase())));

  function sortBy(col) {
    if (sortCol === col) {
      if (sortDir === 'asc') { setSortDir('desc'); }
      else { setSortCol(null); setSortDir('asc'); }
    } else { setSortCol(col); setSortDir('asc'); }
  }
  var sorted = filtered.slice();
  if (sortCol) {
    sorted.sort(function(a, b) {
      var av = a[sortCol], bv = b[sortCol];
      if (sortCol === 'cd_contrato') { av = a.cd_contrato || ''; bv = b.cd_contrato || ''; }
      else if (sortCol === 'nu_bloco') { av = parseFloat(a.nu_bloco) || 0; bv = parseFloat(b.nu_bloco) || 0; }
      else if (sortCol === 'lote') { av = parseFloat(a.lote) || (a.lote || ''); bv = parseFloat(b.lote) || (b.lote || ''); }
      else if (sortCol === 'ficha') { av = (a.ficha?.nome || '').toLowerCase(); bv = (b.ficha?.nome || '').toLowerCase(); }
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      av = String(av).toLowerCase(); bv = String(bv).toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv, 'pt-BR') : bv.localeCompare(av, 'pt-BR');
    });
  }

function getToken() {
  try { var s = JSON.parse(localStorage.getItem('sider-auth-storage') || '{}'); return s?.state?.token || s?.token || ''; }
  catch(e) { return ''; }
}

function handleOpenFile(file) {
  var t = getToken();
  setPreview({ file, data: null, loading: true, error: null });
  if (file.extensao === '.pdf') {
    fetch(API_URL + '/fichas/view?path=' + encodeURIComponent(file.caminho) + '&raw=true', { headers: { 'Authorization': 'Bearer ' + t } })
      .then(function(r) { if (!r.ok) throw new Error('Erro ' + r.status); return r.blob(); })
      .then(function(b) { var u = URL.createObjectURL(b); setPreview({ file, data: u, tipo: 'blob', loading: false, error: null }); })
      .catch(function(e) { setPreview({ file, data: null, loading: false, error: e.message }); });
  } else {
    var encPath = encodeURIComponent(file.caminho);
    var isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      setPreview({ file, data: null, loading: false, tipo: 'local_xlsx', error: null });
    } else {
      fetch(API_URL + '/fichas/pub/token?path=' + encPath, { headers: { 'Authorization': 'Bearer ' + getToken() } })
        .then(function(r) { if (!r.ok) return r.text().then(function(t) { throw new Error(t || 'Erro ' + r.status); }); return r.json(); })
        .then(function(data) {
          var pubUrl = window.location.origin + '/api/fichas/pub/' + data.token;
          var viewerUrl = 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent(pubUrl);
          setPreview({ file, data: viewerUrl, tipo: 'office', loading: false, error: null });
        })
        .catch(function(e) { setPreview({ file, data: null, loading: false, error: e.message }); });
    }
  }
}

function downloadFicha(file) {
  var t = getToken();
  fetch(API_URL + '/fichas/download?path=' + encodeURIComponent(file.caminho), { headers: { 'Authorization': 'Bearer ' + t } })
    .then(function(r) { return r.blob(); })
    .then(function(b) {
      var u = URL.createObjectURL(b);
      var a = document.createElement('a'); a.href = u; a.download = file.nome;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(u);
    })
    .catch(function(e) { alert('Erro: ' + e.message); });
}

function closePreview() {
  if (preview && preview.tipo === 'blob' && preview.data) URL.revokeObjectURL(preview.data);
  setPreview(null);
}

if (preview) {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {preview.file.extensao === '.xlsx' ? <FileSpreadsheet size={18} className="text-emerald-600 shrink-0" /> : <FileIcon size={18} className="text-red-500 shrink-0" />}
          <h2 className="font-bold text-gray-800 truncate text-sm min-w-0">{preview.file.nome}</h2>
          <span className="text-xs text-slate-400 uppercase shrink-0">{preview.file.extensao}</span>
        </div>
        <button onClick={closePreview} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 ml-auto"><X size={18} /></button>
      </div>
      <div className="flex-1 bg-[#f0f0f0] relative min-h-0">
        {preview.loading && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10"><Loader2 size={28} className="animate-spin text-emerald-600" /></div>}
        {preview.error && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10"><p className="text-red-500 text-sm">Erro: {preview.error}</p></div>}
        {preview.tipo === 'local_xlsx' && <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 gap-3"><p className="text-slate-500 text-sm">Prévia disponível apenas em produção</p><button onClick={function(e) { e.stopPropagation(); downloadFicha(preview.file); }} className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Download para visualizar</button></div>}
        {preview.tipo === 'office' && preview.data && <iframe src={preview.data} className="w-full h-full border-0" title={preview.file.nome} />}
        {preview.tipo === 'html' && preview.data && <iframe srcDoc={preview.data} className="w-full h-full border-0" title={preview.file.nome} />}
        {preview.tipo === 'blob' && preview.data && <iframe src={preview.data} className="w-full h-full border-0" title={preview.file.nome} />}
      </div>
    </div>
  );
}return (
  <div className="p-4 sm:p-6 h-[calc(100vh-4rem)] flex flex-col">
    <div className="flex items-center justify-between mb-4 shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Fichas Resumo</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{sorted.length} contratos com ficha</p>
        </div>
        {selectedBlocos?.length > 0 && <div className="hidden sm:flex items-center gap-1.5">
          {selectedBlocos.length === 1 ? <Badge variant="success" dot>Bloco {selectedBlocos[0]}</Badge> : <Badge variant="success" dot>{selectedBlocos.length} blocos</Badge>}
        </div>}
        {selectedSegmentos?.length > 0 && <div className="hidden sm:flex items-center gap-1.5">
          {selectedSegmentos.slice(0, 2).map(function(s) { return <Badge key={s} variant="info">{s}</Badge>; })}
          {selectedSegmentos.length > 2 && <Badge variant="info">+{selectedSegmentos.length - 2}</Badge>}
        </div>}
      </div>
    </div>
    <Card padding="p-0" className="overflow-hidden flex-1 flex flex-col">

      {/* ─── Desktop: tabela ──────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-emerald-100/30 bg-emerald-50/30">
              <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600 whitespace-nowrap" onClick={function() { sortBy('cd_contrato'); }}>Contrato {sortCol === 'cd_contrato' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600 whitespace-nowrap" onClick={function() { sortBy('lote'); }}>Lote {sortCol === 'lote' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600 whitespace-nowrap" onClick={function() { sortBy('ficha'); }}>Ficha {sortCol === 'ficha' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th className="px-2 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-100/20">
            {loading ? [1,2,3].map(function(i) {
              return <tr key={i}><td className="px-2 py-1.5"><div className="h-4 bg-slate-100 rounded w-20 animate-pulse" /></td><td className="px-2 py-1.5"><div className="h-4 bg-slate-100 rounded w-8 animate-pulse" /></td><td className="px-2 py-1.5"><div className="h-4 bg-slate-100 rounded w-32 animate-pulse" /></td><td className="px-2 py-1.5"><div className="h-4 bg-slate-100 rounded w-16 animate-pulse ml-auto" /></td></tr>;
            }) : sorted.length === 0 ? (
              <tr><td colSpan="4" className="px-6 py-20 text-center">
                <FileText size={40} className="mx-auto text-emerald-200 mb-4" strokeWidth={1.5} />
                <p className="text-sm font-medium text-slate-400">Nenhum contrato com ficha encontrado</p>
              </td></tr>
            ) : sorted.map(function(item, idx) {
              return (<tr key={item.cd_contrato || idx} className="group cursor-pointer transition-all duration-200 hover:bg-emerald-50/40" onClick={function() { setSelectedContratoId(item.id_bloco || item.cd_contrato); }}>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100/50 text-[9px] font-semibold text-emerald-700 shrink-0">{item.nu_bloco || "--"}</span>
                    <div className="min-w-0"><span className="text-[11px] font-semibold text-slate-900 truncate block">{item.cd_contrato}</span><span className="text-[9px] text-slate-400 truncate block leading-tight">{item.segmento || "--"}</span></div>
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <span className="text-[11px] font-medium text-slate-600">{item.lote || '--'}</span>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    {item.ficha.extensao === ".xlsx" ? <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" /> : <FileIcon size={12} className="text-red-500 shrink-0" />}
                    <span className="text-[11px] text-slate-700 truncate max-w-[200px]">{item.ficha.nome}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right">
                  <div className="inline-flex items-center gap-0.5" onClick={function(e) { e.stopPropagation(); }}>
                    <button onClick={function() { handleOpenFile(item.ficha); }}
                      className="px-2 py-1 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">Ver</button>
                    <button onClick={function() { downloadFicha(item.ficha); }}
                      className="px-2 py-1 rounded text-[9px] font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">Download</button>
                    <button onClick={function() { setSelectedContratoId(item.id_bloco || item.cd_contrato); }}
                      className="inline-flex items-center justify-center w-7 h-7 rounded bg-emerald-50 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all duration-200"><Search size={12} strokeWidth={2} /></button>
                  </div>
                </td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>
    </Card>
    {selectedContratoId && <ContractDetail contratoId={selectedContratoId} onClose={function() { setSelectedContratoId(null); }} />}
  </div>
);
}

export default Fichas;
