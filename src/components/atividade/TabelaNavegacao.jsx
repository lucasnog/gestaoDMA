import React, { useState } from 'react';
import {
  Loader2, Globe, Search, ChevronRight, FileSpreadsheet, FileText,
  Presentation, Download, X,
} from 'lucide-react';
import { rotuloRota } from '../../utils/rotulosRota';

const formatarDataHora = (valor) => {
  if (!valor) return '—';
  const [data, hora] = String(valor).split(' ');
  if (!data) return String(valor);
  const [ano, mes, dia] = data.split('-');
  const hhmm = hora ? ` ${hora.slice(0, 5)}` : '';
  return `${dia}/${mes}/${ano}${hhmm}`;
};

const formatarHora = (valor) => {
  if (!valor) return '—';
  const hora = String(valor).split(' ')[1];
  return hora ? hora.slice(0, 5) : '—';
};

/** Tamanho legível; null quando o backend não soube o tamanho. */
const formatarBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** Ícone por tipo de arquivo exportado/baixado. */
const iconeDoArquivo = (nome) => {
  const ext = String(nome || '').toLowerCase().split('.').pop();
  if (['xlsx', 'xlsm', 'xls', 'csv'].includes(ext)) return FileSpreadsheet;
  if (['pptx', 'ppt'].includes(ext)) return Presentation;
  if (['pdf', 'docx', 'doc', 'txt'].includes(ext)) return FileText;
  return Download;
};

const ChipBusca = ({ termo, vezes, em }) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 max-w-[200px]"
    title={`Buscou "${termo}"${vezes > 1 ? ` (${vezes}x)` : ''}${em ? ` às ${formatarHora(em)}` : ''}`}
  >
    <Search size={11} className="shrink-0" />
    <span className="truncate font-medium">{termo}</span>
    {vezes > 1 && <span className="text-[9px] font-bold text-amber-500 shrink-0">{vezes}x</span>}
    {em && <span className="text-[9px] text-amber-500/80 shrink-0">{formatarHora(em)}</span>}
  </span>
);

const ChipArquivo = ({ arquivo, em }) => {
  const Icone = iconeDoArquivo(arquivo.arquivo);
  const tamanho = formatarBytes(arquivo.bytes);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 max-w-[260px]"
      title={`${arquivo.arquivo}${tamanho ? ` · ${tamanho}` : ''}${em ? ` às ${formatarHora(em)}` : ''}`}
    >
      <Icone size={11} className="shrink-0" />
      <span className="truncate font-medium">{arquivo.arquivo}</span>
      {tamanho && <span className="text-[9px] text-blue-500/80 shrink-0">{tamanho}</span>}
    </span>
  );
};

/**
 * Tabela da navegação recente: apenas páginas (origem='page').
 * Cada linha expande para mostrar buscas digitadas e arquivos baixados
 * enquanto o usuário estava naquela página.
 */
const TabelaNavegacao = ({ eventos = [], loading = false, erro = null }) => {
  const [abertos, setAbertos] = useState(() => new Set());

  const alternar = (id) => {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-xs">Carregando navegação...</span>
      </div>
    );
  }

  if (erro) {
    return <p className="text-xs text-red-500 py-16 text-center">{erro}</p>;
  }

  if (!eventos.length) {
    return (
      <p className="text-xs text-slate-400 py-16 text-center">
        Nenhuma página acessada no período selecionado.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50/80 text-slate-500">
            <th className="w-8 px-2 py-2.5" aria-label="Expandir" />
            <th className="text-left font-semibold px-4 py-2.5 whitespace-nowrap">Data/hora</th>
            <th className="text-left font-semibold px-4 py-2.5">Usuário</th>
            <th className="text-left font-semibold px-4 py-2.5">Página</th>
            <th className="text-left font-semibold px-4 py-2.5">Busca</th>
            <th className="text-left font-semibold px-4 py-2.5">Arquivos</th>
            <th className="text-left font-semibold px-4 py-2.5">IP</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => {
            const buscas = e.buscas || [];
            const downloads = e.downloads || [];
            const temDetalhe = buscas.length > 0 || downloads.length > 0;
            const aberto = abertos.has(e.id);
            const buscasExtras = buscas.length - 2;

            return (
              <React.Fragment key={e.id}>
                <tr className="border-t border-slate-100 hover:bg-emerald-50/30 transition-colors">
                  <td className="px-2 py-2.5 align-top">
                    <button
                      type="button"
                      onClick={() => alternar(e.id)}
                      aria-expanded={aberto}
                      aria-label={aberto ? 'Recolher detalhes da página' : 'Ver buscas e arquivos da página'}
                      className={`p-1 rounded-md transition-colors ${
                        temDetalhe
                          ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          : 'text-slate-200 hover:text-slate-400'
                      }`}
                    >
                      <ChevronRight size={13} className={aberto ? 'rotate-90' : ''} />
                    </button>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                    {formatarDataHora(e.created_at_local)}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-slate-700 font-medium truncate max-w-[180px]">
                      {e.user_nome || '—'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                      {e.user_email || e.user_id || 'não autenticado'}
                    </p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <Globe size={12} className="text-emerald-600 shrink-0" />
                      <span className="text-slate-700 font-medium">{rotuloRota(e.path)}</span>
                    </span>
                    <p className="font-mono text-[10px] text-slate-400 truncate max-w-[240px]" title={e.path}>
                      {e.path}
                    </p>
                  </td>
                  <td className="px-4 py-2.5">
                    {buscas.length ? (
                      <span className="flex flex-wrap items-center gap-1 max-w-[280px]">
                        {buscas.slice(0, 2).map((b, i) => (
                          <ChipBusca key={`${b.termo}-${i}`} termo={b.termo} vezes={b.vezes} em={b.em} />
                        ))}
                        {buscasExtras > 0 && (
                          <button
                            type="button"
                            onClick={() => alternar(e.id)}
                            className="text-[10px] font-semibold text-amber-600 hover:underline"
                          >
                            +{buscasExtras}
                          </button>
                        )}
                      </span>
                    ) : e.query ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 max-w-[260px]">
                        <Search size={11} className="shrink-0" />
                        <span className="truncate font-medium" title={e.query}>{`?${e.query}`}</span>
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {downloads.length ? (
                      <button
                        type="button"
                        onClick={() => alternar(e.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                        title={downloads.map((d) => d.arquivo).join('\n')}
                      >
                        <Download size={11} className="shrink-0" />
                        <span className="font-semibold">{downloads.length}</span>
                        <span className="text-[10px] font-medium text-blue-600">
                          {downloads.length === 1 ? 'arquivo' : 'arquivos'}
                        </span>
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-400 whitespace-nowrap">{e.ip || '—'}</td>
                </tr>

                {aberto && (
                  <tr className="border-t border-slate-100 bg-slate-50/40">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Atividade em {rotuloRota(e.path)}
                        </span>
                        <button
                          type="button"
                          onClick={() => alternar(e.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-600"
                        >
                          <X size={11} /> Fechar
                        </button>
                      </div>

                      {!temDetalhe && (
                        <p className="text-[11px] text-slate-400">
                          Nenhuma busca nem arquivo baixado nesta página.
                        </p>
                      )}

                      {buscas.length > 0 && (
                        <div className="mb-3">
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1.5">
                            <Search size={11} /> Buscas
                            <span className="text-slate-400">({buscas.length})</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {buscas.map((b, i) => (
                              <ChipBusca key={`${b.termo}-${b.em}-${i}`} termo={b.termo} vezes={b.vezes} em={b.em} />
                            ))}
                          </div>
                        </div>
                      )}

                      {downloads.length > 0 && (
                        <div>
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-1.5">
                            <Download size={11} /> Arquivos baixados / exportados
                            <span className="text-slate-400">({downloads.length})</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {downloads.map((d, i) => (
                              <ChipArquivo key={`${d.arquivo}-${d.em}-${i}`} arquivo={d} em={d.em} />
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TabelaNavegacao;
