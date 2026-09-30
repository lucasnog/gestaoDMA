import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Users, Globe, Server, Search, RotateCcw, Loader2,
  MousePointerClick, ShieldAlert, CalendarClock, Route, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  getAtividadeEventos, getAtividadeResumo, getAtividadeUsuarios, getAtividadeJornada,
} from '../services/api.service';
import Card from '../components/ui/Card';
import Pagination from '../components/ui/Pagination';
import JornadaTimeline from '../components/atividade/JornadaTimeline';
import TabelaNavegacao from '../components/atividade/TabelaNavegacao';
import { rotuloRota } from '../utils/rotulosRota';

const ORIGEM_META = {
  api: { label: 'API', className: 'bg-blue-100 text-blue-700' },
  page: { label: 'Página', className: 'bg-purple-100 text-purple-700' },
};

const nf = new Intl.NumberFormat('pt-BR');

const hojeISO = () => new Date().toISOString().slice(0, 10);
const diasAtrasISO = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
};

// created_at_local já vem convertido para o horário local pelo backend
// ('YYYY-MM-DD HH:MM:SS') — reformata sem passar por Date para não
// deslocar o fuso de novo.
const formatarDataHora = (valor) => {
  if (!valor) return '—';
  const [data, hora] = String(valor).split(' ');
  if (!data) return String(valor);
  const [ano, mes, dia] = data.split('-');
  const hhmm = hora ? ` ${hora.slice(0, 5)}` : '';
  return `${dia}/${mes}/${ano}${hhmm}`;
};

const corStatus = (status) => {
  if (status >= 500) return 'text-red-600 bg-red-50';
  if (status >= 400) return 'text-amber-600 bg-amber-50';
  if (status >= 200) return 'text-emerald-600 bg-emerald-50';
  return 'text-slate-500 bg-slate-50';
};

const FILTROS_INICIAIS = {
  usuario: '',
  desde: diasAtrasISO(7),
  ate: hojeISO(),
};

// Atualização automática (tempo real): recarrega a lista e os agregados.
const INTERVALO_REFRESH_MS = 15_000;

const Atividade = () => {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Aba da listagem: navegação (páginas) ou requisições de API.
  const [aba, setAba] = useState('navegacao');

  const [eventos, setEventos] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // Tempo real
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const [atualizando, setAtualizando] = useState(false);

  // Trajetória
  const [jornadaUsuarioSel, setJornadaUsuarioSel] = useState('');
  const [jornada, setJornada] = useState(null);
  const [jornadaLoading, setJornadaLoading] = useState(false);
  const [jornadaErro, setJornadaErro] = useState(null);

  // Parâmetros enviados à API: o filtro "usuário" aceita e-mail ou uid
  const params = useMemo(() => {
    const p = {};
    if (filtros.usuario) {
      if (filtros.usuario.includes('@')) p.email = filtros.usuario;
      else p.userId = filtros.usuario;
    }
    if (filtros.desde) p.desde = filtros.desde;
    if (filtros.ate) p.ate = filtros.ate;
    return p;
  }, [filtros]);

  const origemLista = aba === 'navegacao' ? 'page' : 'api';

  // `silencioso=true` é o refresh automático: não acende o spinner grande.
  const carregar = useCallback(async (silencioso = false) => {
    if (silencioso) setAtualizando(true);
    else setLoading(true);
    setErro(null);
    try {
      const [lista, agregado] = await Promise.all([
        getAtividadeEventos({ ...params, origem: origemLista, page, limit }),
        getAtividadeResumo(params),
      ]);
      setEventos(lista);
      setResumo(agregado);
      setAtualizadoEm(new Date());
    } catch (err) {
      setErro(err.response?.data?.message || err.message || 'Falha ao carregar os eventos.');
    } finally {
      if (silencioso) setAtualizando(false);
      else setLoading(false);
    }
  }, [params, page, limit, origemLista]);

  useEffect(() => { carregar(false); }, [carregar]);

  // Tempo real: recarrega em intervalos. Pausa quando a aba do navegador
  // não está visível e retoma ao voltar.
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const tick = () => {
      if (document.visibilityState === 'visible') carregar(true);
    };
    const timer = setInterval(tick, INTERVALO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, carregar]);

  // Lista de usuários para o filtro (carrega uma vez)
  useEffect(() => {
    getAtividadeUsuarios({})
      .then((d) => setUsuarios(d.usuarios || []))
      .catch(() => {});
  }, []);

  // Carrega a trajetória quando um usuário é selecionado.
  useEffect(() => {
    if (!jornadaUsuarioSel) {
      setJornada(null);
      setJornadaErro(null);
      return undefined;
    }
    let cancelado = false;
    setJornadaLoading(true);
    setJornadaErro(null);
    const p = { maxSessoes: 50 };
    if (jornadaUsuarioSel.includes('@')) p.email = jornadaUsuarioSel;
    else p.userId = jornadaUsuarioSel;
    if (params.desde) p.desde = params.desde;
    if (params.ate) p.ate = params.ate;
    getAtividadeJornada(p)
      .then((d) => { if (!cancelado) setJornada(d); })
      .catch((err) => {
        if (!cancelado) setJornadaErro(err.response?.data?.message || err.message || 'Falha ao carregar a trajetória.');
      })
      .finally(() => { if (!cancelado) setJornadaLoading(false); });
    return () => { cancelado = true; };
  }, [jornadaUsuarioSel, params]);

  const atualizarFiltro = (campo, valor) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPage(1);
  };

  const limparFiltros = () => {
    setFiltros(FILTROS_INICIAIS);
    setPage(1);
  };

  const trocarAba = (nova) => {
    setAba(nova);
    setPage(1);
  };

  const acessosApi = resumo?.porOrigem?.find((o) => o.origem === 'api')?.eventos || 0;
  const acessosPagina = resumo?.porOrigem?.find((o) => o.origem === 'page')?.eventos || 0;

  const cards = [
    { label: 'Eventos no período', valor: resumo?.total || 0, icon: Activity, cor: 'from-emerald-500 to-emerald-600' },
    { label: 'Usuários ativos', valor: resumo?.totalUsuarios || 0, icon: Users, cor: 'from-blue-500 to-blue-600' },
    { label: 'Visualizações de página', valor: acessosPagina, icon: Globe, cor: 'from-purple-500 to-purple-600' },
    { label: 'Requisições de API', valor: acessosApi, icon: Server, cor: 'from-indigo-500 to-indigo-600' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldAlert size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Auditoria de Atividade</h1>
            <p className="text-xs text-slate-400">
              Navegação, buscas e trajetória dos usuários — sem payloads, senhas ou tokens
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? 'Pausar atualização automática' : 'Ativar atualização automática'}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              autoRefresh
                ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            {autoRefresh ? 'Tempo real' : 'Pausado'}
          </button>
          <button
            onClick={() => carregar(false)}
            title="Atualizar agora"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={13} className={atualizando ? 'animate-spin text-emerald-600' : ''} />
            Atualizar
          </button>
          <button
            onClick={limparFiltros}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={14} /> Limpar filtros
          </button>
        </div>
      </div>

      {/* Filtros */}
      <Card padding="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="filtro-usuario" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Usuário
            </label>
            <select
              id="filtro-usuario"
              value={filtros.usuario}
              onChange={(e) => atualizarFiltro('usuario', e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none"
            >
              <option value="">Todos os usuários</option>
              {usuarios.map((u) => (
                <option key={u.usuario} value={u.usuario}>
                  {u.nome ? `${u.nome} (${u.usuario})` : u.usuario} — {nf.format(u.eventos)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-desde" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              De
            </label>
            <input
              id="filtro-desde"
              type="date"
              value={filtros.desde}
              max={filtros.ate || undefined}
              onChange={(e) => atualizarFiltro('desde', e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none"
            />
          </div>
          <div>
            <label htmlFor="filtro-ate" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Até
            </label>
            <input
              id="filtro-ate"
              type="date"
              value={filtros.ate}
              min={filtros.desde || undefined}
              onChange={(e) => atualizarFiltro('ate', e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none"
            />
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} padding="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.cor} flex items-center justify-center shadow-sm`}>
                <c.icon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
                <p className="text-xl font-bold text-slate-800 leading-tight">{nf.format(c.valor)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Trajetória do usuário */}
      <Card padding="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Route size={15} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-700">Trajetória do usuário</h2>
          </div>
          <div className="sm:w-72">
            <select
              aria-label="Usuário da trajetória"
              value={jornadaUsuarioSel}
              onChange={(e) => setJornadaUsuarioSel(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 outline-none"
            >
              <option value="">Selecione um usuário...</option>
              {usuarios.map((u) => (
                <option key={u.usuario} value={u.usuario}>
                  {u.nome ? `${u.nome} (${u.usuario})` : u.usuario}
                </option>
              ))}
            </select>
          </div>
        </div>
        <JornadaTimeline
          sessoes={jornada?.sessoes || []}
          carregando={jornadaLoading}
          erro={jornadaErro}
          usuario={jornadaUsuarioSel}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Volume por dia */}
        <Card padding="p-5" className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={15} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-700">Eventos por dia</h2>
          </div>
          {resumo?.porDia?.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={resumo.porDia.map((d) => ({
                ...d,
                label: formatarDataHora(d.dia).slice(0, 5),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  labelStyle={{ fontSize: 11, fontWeight: 600 }}
                  formatter={(v, k) => [nf.format(v), k === 'eventos' ? 'Eventos' : 'Usuários']}
                />
                <Bar dataKey="eventos" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="usuarios" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 py-16 text-center">Sem eventos no período.</p>
          )}
        </Card>

        {/* Páginas mais acessadas */}
        <Card padding="p-5">
          <div className="flex items-center gap-2 mb-4">
            <MousePointerClick size={15} className="text-purple-600" />
            <h2 className="text-sm font-semibold text-slate-700">Páginas mais acessadas</h2>
          </div>
          <div className="space-y-2">
            {resumo?.topPaginas?.length ? resumo.topPaginas.map((p) => (
              <div key={p.alvo} className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 truncate" title={p.alvo}>{rotuloRota(p.alvo)}</span>
                <span className="text-xs font-semibold text-slate-700 shrink-0">{nf.format(p.acessos)}</span>
              </div>
            )) : <p className="text-xs text-slate-400">Sem acessos de página no período.</p>}
          </div>
        </Card>
      </div>

      {/* Buscas mais frequentes + Usuários mais ativos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card padding="p-5" className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Search size={15} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-700">Buscas mais frequentes</h2>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {resumo?.topBuscas?.length ? resumo.topBuscas.map((b) => (
              <div key={b.termo} className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-600 truncate" title={b.termo}>{b.termo}</span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {nf.format(b.usuarios)} usuário(s) · <span className="font-semibold text-slate-700">{nf.format(b.buscas)}</span>
                </span>
              </div>
            )) : <p className="text-xs text-slate-400">Sem buscas registradas no período.</p>}
          </div>
        </Card>

        <Card padding="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-700">Usuários mais ativos</h2>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {resumo?.topUsuarios?.length ? resumo.topUsuarios.map((u) => (
              <div key={u.usuario}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600 truncate">{u.nome || u.usuario}</span>
                  <span className="text-xs font-semibold text-slate-700 shrink-0">{nf.format(u.eventos)}</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {u.nome ? u.usuario : ''} · {nf.format(u.paginas)} rota(s) · último {formatarDataHora(u.ultimo_acesso)}
                </p>
              </div>
            )) : <p className="text-xs text-slate-400">Sem atividade no período.</p>}
          </div>
        </Card>
      </div>

      {/* Listagem com abas */}
      <Card padding="p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-emerald-100/50">
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 self-start">
            <button
              onClick={() => trocarAba('navegacao')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                aba === 'navegacao' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Globe size={13} /> Navegação
            </button>
            <button
              onClick={() => trocarAba('api')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                aba === 'api' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Server size={13} /> Requisições de API
            </button>
          </div>
          {eventos && (
            <span className="text-[10px] text-slate-400">
              {nf.format(eventos.total)} registro(s)
              {atualizadoEm ? ` · atualizado ${atualizadoEm.toLocaleTimeString('pt-BR')}` : ''}
            </span>
          )}
        </div>

        {aba === 'navegacao' ? (
          <TabelaNavegacao
            eventos={eventos?.itens || []}
            loading={loading}
            erro={erro}
          />
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Carregando requisições...</span>
          </div>
        ) : erro ? (
          <p className="text-xs text-red-500 py-16 text-center">{erro}</p>
        ) : !eventos?.itens?.length ? (
          <p className="text-xs text-slate-400 py-16 text-center">Nenhuma requisição no período selecionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500">
                  <th className="text-left font-semibold px-4 py-2.5 whitespace-nowrap">Data/hora</th>
                  <th className="text-left font-semibold px-4 py-2.5">Usuário</th>
                  <th className="text-left font-semibold px-4 py-2.5">Origem</th>
                  <th className="text-left font-semibold px-4 py-2.5">Método</th>
                  <th className="text-left font-semibold px-4 py-2.5">Rota / Página</th>
                  <th className="text-left font-semibold px-4 py-2.5">Busca</th>
                  <th className="text-center font-semibold px-4 py-2.5">Status</th>
                  <th className="text-right font-semibold px-4 py-2.5">Duração</th>
                  <th className="text-left font-semibold px-4 py-2.5">IP</th>
                </tr>
              </thead>
              <tbody>
                {eventos.itens.map((e) => {
                  const meta = ORIGEM_META[e.origem] || ORIGEM_META.api;
                  return (
                    <tr key={e.id} className="border-t border-slate-100 hover:bg-emerald-50/30 transition-colors">
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
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{e.metodo || '—'}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-mono text-slate-600 truncate max-w-[280px]" title={e.path}>
                          {e.path}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        {e.termo_busca ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-amber-700 bg-amber-50 max-w-[200px] truncate" title={e.termo_busca}>
                            {e.termo_busca}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${corStatus(e.status_code)}`}>
                          {e.status_code ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500">
                        {e.duracao_ms == null ? '—' : `${e.duracao_ms} ms`}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-400 whitespace-nowrap">{e.ip || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {eventos && (
          <Pagination
            page={eventos.page}
            totalPages={eventos.totalPaginas}
            onChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={(n) => { setLimit(n); setPage(1); }}
          />
        )}
      </Card>
    </div>
  );
};

export default Atividade;
