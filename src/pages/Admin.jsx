import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle, XCircle, UserCheck, UserX, RefreshCw, Mail, Calendar, Clock, Upload, Terminal, ExternalLink, Activity, Lock } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import api, { triggerDeploy } from '../services/api.service';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { MODULOS_DISPONIVEIS } from '../config/constants';

const Admin = () => {
  const { usersList, loadUsers, updateUserStatus, updateUserTipo, updateUserPermissoes, isAdmin, user, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (isAdmin()) {
      setLoading(true);
      loadUsers().finally(() => setLoading(false));
    }
  }, []);

  const handleToggleStatus = async (uid, currentStatus) => {
    const novoStatus = currentStatus === 'ativo' ? 'pendente' : 'ativo';
    setActionLoading(`status-${uid}`);
    try {
      await updateUserStatus(uid, novoStatus);
    } catch (err) {
      console.error('[Admin] Erro ao alterar status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleTipo = async (uid, currentTipo) => {
    const novoTipo = currentTipo === 'admin' ? 'user' : 'admin';
    setActionLoading(`tipo-${uid}`);
    try {
      await updateUserTipo(uid, novoTipo);
    } catch (err) {
      console.error('[Admin] Erro ao alterar tipo:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadUsers().finally(() => setLoading(false));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const pendentes = usersList.filter(u => u.status === 'pendente');
  const ativos = usersList.filter(u => u.status === 'ativo');

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-sm font-semibold text-slate-400">Acesso restrito a administradores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield size={20} className="text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Administração</h1>
            <p className="text-xs text-slate-400">Gerenciamento de usuários e permissões</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-emerald-100/60 text-slate-600 text-xs font-semibold hover:bg-emerald-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-emerald-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <UserCheck size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{ativos.length}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Usuários Ativos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-amber-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pendentes.length}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pendentes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-slate-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Mail size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{usersList.length}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total de Usuários</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabela de Usuários */}
      <Card className="border border-emerald-100/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-100/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Usuários Cadastrados</h2>
            {pendentes.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                {pendentes.length} pendente(s)
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-emerald-100/20 bg-emerald-50/30">
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Primeiro Acesso</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Último Login</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/10">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <RefreshCw size={24} className="mx-auto text-emerald-300 animate-spin mb-2" />
                    <p className="text-xs text-slate-400">Carregando usuários...</p>
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <UserX size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-400">Nenhum usuário encontrado</p>
                  </td>
                </tr>
              ) : (
                usersList.map((u) => (
                  <tr key={u.uid} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.foto ? (
                          <img src={u.foto} alt="" className="w-8 h-8 rounded-full ring-2 ring-emerald-100" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">{(u.nome || 'U')[0]}</span>
                          </div>
                        )}
                        <span className="text-xs font-semibold text-slate-800">{u.nome || 'Sem nome'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500">{u.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      {u.status === 'ativo' ? (
                        <Badge variant="success" className="text-[10px]">Ativo</Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">Pendente</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.tipo === 'admin' ? (
                        <Badge variant="info" className="text-[10px]">Admin</Badge>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 px-2 py-1 rounded-md bg-slate-100">Usuário</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] text-slate-400">{formatDate(u.primeiroAcesso)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] text-slate-400">{formatDate(u.ultimoLogin)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(u.uid, u.status)}
                          disabled={actionLoading === `status-${u.uid}`}
                          className={`p-2 rounded-lg border transition-colors ${
                            u.status === 'ativo'
                              ? 'border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
                          } disabled:opacity-50`}
                          title={u.status === 'ativo' ? 'Suspender' : 'Aprovar'}
                        >
                          {actionLoading === `status-${u.uid}` ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : u.status === 'ativo' ? (
                            <UserX size={14} />
                          ) : (
                            <UserCheck size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => handleToggleTipo(u.uid, u.tipo)}
                          disabled={actionLoading === `tipo-${u.uid}`}
                          className={`p-2 rounded-lg border transition-colors ${
                            u.tipo === 'admin'
                              ? 'border-purple-200 text-purple-500 hover:bg-purple-50 hover:border-purple-300'
                              : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                          } disabled:opacity-50`}
                          title={u.tipo === 'admin' ? 'Remover admin' : 'Tornar admin'}
                        >
                          {actionLoading === `tipo-${u.uid}` ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Shield size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Permissões de Acesso ─────────── */}
      {(user?.email === 'lucas.nlopes04@gmail.com' || user?.email === 'englucasnog@gmail.com' || user?.email === 'ingcrispere94@gmail.com' || user?.email === 'tati.souza02.ts@gmail.com') && (
        <Card className="border border-emerald-100/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-100/30 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Lock size={16} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Permissões de Acesso</h2>
              <p className="text-[10px] text-slate-400">Marque quais módulos cada usuário pode acessar</p>
            </div>
          </div>

          <PermissoesGrid
            users={usersList}
            modulos={MODULOS_DISPONIVEIS}
            onSave={async (uid, novasPermissoes) => {
              await updateUserPermissoes(uid, novasPermissoes);
            }}
          />
        </Card>
      )}

      {/* ─── Monitor SEI ─────────── */}
      {(user?.email === 'lucas.nlopes04@gmail.com' || user?.email === 'ingcrispere94@gmail.com' || user?.email === 'tati.souza02.ts@gmail.com') && (
        <MonitorStatus />
      )}

      {/* ─── Informações do servidor ─────────── */}
      {(user?.email === 'lucas.nlopes04@gmail.com' || user?.email === 'ingcrispere94@gmail.com' || user?.email === 'tati.souza02.ts@gmail.com') && (
        <ServerInfo token={token} />
      )}

      {/* ─── Seção de Deploy ─────────── */}
      {(user?.email === 'lucas.nlopes04@gmail.com' || user?.email === 'ingcrispere94@gmail.com' || user?.email === 'tati.souza02.ts@gmail.com') && (
        <DeploySection token={token} />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE DE INFORMAÇÕES DO SERVIDOR
// ═══════════════════════════════════════════════════════════════════
const ServerInfo = ({ token }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = async () => {
    try {
      const res = await api.get('/deploy/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInfo(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
    const interval = setInterval(fetchInfo, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const fmtUptime = (s) => {
    if (!s) return '-';
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const fmtDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR');
  };

  return (
    <Card className="border border-slate-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-500/20">
          <Terminal size={16} className="text-white" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Servidor</h2>
          <p className="text-[10px] text-slate-400">Status e informações do backend</p>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <RefreshCw size={12} className="animate-spin" /> Carregando...
          </div>
        ) : info ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${info.status === 'error' ? 'bg-red-500' : info.status === 'restarting' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="text-xs font-semibold text-slate-700">
                {info.status === 'error' ? 'Offline' : info.status === 'restarting' ? 'Reiniciando' : 'Online'}
              </span>
            </div>

            {info.status === 'error' && info.message && (
              <div className="flex items-start gap-2 mt-1 text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <XCircle size={12} className="mt-0.5 shrink-0" />
                <span>{info.message}</span>
              </div>
            )}

            {info.status === 'restarting' && (
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                <RefreshCw size={11} className="animate-spin" />
                Servidor reiniciando...
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
              <span className="text-slate-400">Uptime</span>
              <span className="text-slate-700 font-medium text-right">{fmtUptime(info.uptime)}</span>

              {info.commit && (
                <>
                  <span className="text-slate-400">Commit</span>
                  <span className="text-slate-700 font-mono text-right">{info.commit}</span>
                </>
              )}

              {info.commitMessage && (
                <>
                  <span className="text-slate-400">Último commit</span>
                  <span className="text-slate-700 text-right truncate max-w-[200px]" title={info.commitMessage}>{info.commitMessage}</span>
                </>
              )}

              {info.commitDate && (
                <>
                  <span className="text-slate-400">Commit em</span>
                  <span className="text-slate-700 text-right">{fmtDate(info.commitDate)}</span>
                </>
              )}

              {info.startedAt && (
                <>
                  <span className="text-slate-400">Iniciado em</span>
                  <span className="text-slate-700 text-right">{fmtDate(info.startedAt)}</span>
                </>
              )}

              {info.lastRestart && (
                <>
                  <span className="text-slate-400">Último restart</span>
                  <span className="text-slate-700 text-right">{info.lastRestart}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">Não foi possível obter informações do servidor.</div>
        )}
      </div>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE DE DEPLOY
// ═══════════════════════════════════════════════════════════════════
const DeploySection = ({ token, onDeployDone }) => {
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState(null);
  const [showOutput, setShowOutput] = useState(false);

  const handleDeploy = async () => {
    const confirmMsg = 'Tem certeza? Isso vai:\n\n' +
      '1. Dar git pull no servidor de produção\n' +
      '2. Rebuildar o container Docker do backend\n\n' +
      'O backend pode ficar indisponível por alguns instantes. Continuar?';

    if (!window.confirm(confirmMsg)) return;

    setDeploying(true);
    setResult(null);
    setShowOutput(true);

    try {
      const res = await triggerDeploy(token);
      setResult(res);

      // Poll deploy status every 3s for up to 30s
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const status = await api.get('/deploy/status', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setResult(prev => ({ ...prev, deployStatus: status.data }));
          if (status.data.status === 'ok' || status.data.status === 'error' || attempts >= 10) {
            clearInterval(poll);
            setDeploying(false);
            onDeployDone?.();
          }
        } catch {
          if (attempts >= 10) {
            clearInterval(poll);
            setDeploying(false);
          }
        }
      }, 3000);
    } catch (err) {
      setResult({
        success: false,
        message: 'Erro de conexão com o servidor de produção.',
        output: err.response?.data?.output || err.message,
      });
      setDeploying(false);
    }
  };

  return (
    <Card className="border border-emerald-100/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-emerald-100/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Upload size={16} className="text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Deploy do Servidor</h2>
            <p className="text-[10px] text-slate-400">Atualizar backend de produção (git pull + docker rebuild)</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">Exclusivo</span>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-3">
              Executa <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">git pull</code> e <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">docker compose up -d --build</code> no servidor de produção.
            </p>
            <button onClick={handleDeploy} disabled={deploying}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deploying ? <><RefreshCw size={14} className="animate-spin" /> Deploy em andamento...</>
                : <><Upload size={14} /> Atualizar Servidor</>}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {result && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${result.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {result.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {result.success ? 'Deploy iniciado' : 'Erro ao iniciar'}
              </div>
            )}

            {result?.deployStatus && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${result.deployStatus.status === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : result.deployStatus.status === 'restarting' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {result.deployStatus.status === 'ok' ? <CheckCircle size={14} /> : <RefreshCw size={14} className={result.deployStatus.status === 'restarting' ? 'animate-spin' : ''} />}
                {result.deployStatus.status === 'ok' ? 'Servidor reiniciado' : result.deployStatus.status === 'restarting' ? 'Reiniciando...' : 'Falha no reinício'}
              </div>
            )}

            {result?.deployStatus?.status === 'error' && result.deployStatus.message && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] text-red-700 bg-red-50 border border-red-200">
                <XCircle size={13} className="mt-0.5 shrink-0" />
                <span>{result.deployStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        {(showOutput || result) && (
          <div className="mt-4">
            <button onClick={() => setShowOutput(!showOutput)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-2"
            >
              <Terminal size={12} /> {showOutput ? 'Ocultar log' : 'Mostrar log'}
            </button>
            {showOutput && (
              <div className="bg-slate-900 rounded-xl p-4 max-h-64 overflow-y-auto">
                <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap">
                  {deploying ? 'Iniciando deploy...\nAguardando resposta do servidor...' : (result?.message || 'Nenhuma saída')}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE DE STATUS DO MONITOR SEI
// ═══════════════════════════════════════════════════════════════════
const MonitorStatus = () => {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMonitor = async () => {
    try {
      const sRes = await api.get('/sei/processos/stats');
      setStats(sRes.data);
      setHealth({ status: 'ok' });
    } catch {
      setHealth({ status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitor();
    const interval = setInterval(fetchMonitor, 30000);
    return () => clearInterval(interval);
  }, []);

  const online = health?.status === 'ok';

  return (
    <Card className="border border-slate-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Activity size={16} className="text-white" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Monitor SEI</h2>
          <p className="text-[10px] text-slate-400">Caixa de entrada da Gerência</p>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <RefreshCw size={12} className="animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-xs font-semibold text-slate-700">
                {online ? 'Online' : 'Offline'}
              </span>
              {stats && (
                <span className="text-[10px] text-slate-400 ml-auto">
                  {online ? 'Último ciclo ativo' : 'API não respondeu'}
                </span>
              )}
            </div>

            {stats && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
                <span className="text-slate-400">Total de processos</span>
                <span className="text-slate-700 font-medium text-right">{stats.total}</span>

                <span className="text-slate-400">Recebidos hoje</span>
                <span className="text-slate-700 font-medium text-right">{stats.hoje}</span>

                <span className="text-slate-400">Com prioridade</span>
                <span className="text-slate-700 font-medium text-right">{stats.comPrioridade}</span>

                <span className="text-slate-400">Não visualizados</span>
                <span className="text-slate-700 font-medium text-right">{stats.naoVisualizados}</span>

                {stats.porTipo && (
                  <>
                    <span className="text-slate-400 col-span-2 mt-1 mb-0.5 font-semibold text-[10px] uppercase tracking-wider">Por tipo</span>
                    {stats.porTipo.slice(0, 5).map(([tipo, qtd]) => (
                      <React.Fragment key={tipo}>
                        <span className="text-slate-500 truncate">{tipo}</span>
                        <span className="text-slate-700 font-medium text-right">{qtd}</span>
                      </React.Fragment>
                    ))}
                  </>
                )}
              </div>
            )}

            {!stats && !online && (
              <div className="text-xs text-slate-400">API do monitor indisponível.</div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE DE GRADE DE PERMISSÕES
// ═══════════════════════════════════════════════════════════════════
const PermissoesGrid = ({ users, modulos, onSave }) => {
  const [saving, setSaving] = useState(null);
  const [localPerms, setLocalPerms] = useState({});

  const getPerms = (u) => localPerms[u.uid] !== undefined ? localPerms[u.uid] : (u.permissoes);

  const toggleModulo = (uid, path) => {
    const user = usuariosNaoAdmin.find(u => u.uid === uid);
    const current = localPerms[uid] !== undefined ? localPerms[uid] : (user?.permissoes || []);
    const set = new Set(current);
    if (set.has(path)) set.delete(path);
    else set.add(path);
    const novas = [...set];
    setLocalPerms(prev => ({ ...prev, [uid]: novas }));
    salvar(uid, novas);
  };

  const marcarTodos = (uid, todos) => {
    const novas = todos ? modulos.map(m => m.path) : [];
    setLocalPerms(prev => ({ ...prev, [uid]: novas }));
    salvar(uid, novas);
  };

  const salvar = async (uid, novasPermissoes) => {
    setSaving(uid);
    try {
      await onSave(uid, novasPermissoes);
    } catch (err) {
      console.error('[Permissoes] Erro ao salvar:', err);
    } finally {
      setSaving(null);
    }
  };

  const usuariosNaoAdmin = users.filter(u => u.tipo !== 'admin');

  return (
    <div className="p-6">
      {usuariosNaoAdmin.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">
          Nenhum usuário não-admin para configurar permissões.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-left">
            <thead>
              <tr className="border-b border-emerald-100/20 bg-emerald-50/30">
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap min-w-[130px]">Usuário</th>
                {modulos.map(m => (
                  <th key={m.path} className="px-1 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap" title={m.label}>
                    {m.label}
                  </th>
                ))}
                <th className="px-1 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/10">
              {usuariosNaoAdmin.map(u => {
                const permissoes = getPerms(u);
                return (
                  <tr key={u.uid} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        {u.foto ? (
                          <img src={u.foto} alt="" className="w-7 h-7 rounded-full ring-1 ring-emerald-100 shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-[10px]">{(u.nome || 'U')[0]}</span>
                          </div>
                        )}
                        <div className="leading-tight min-w-0">
                          <p className="text-[11px] font-semibold text-slate-800 truncate max-w-[120px]">{u.nome || 'Sem nome'}</p>
                          <p className="text-[8px] text-slate-400 truncate max-w-[120px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {modulos.map(m => {
                      const temPerm = permissoes ? permissoes.includes(m.path) : false;
                      return (
                        <td key={m.path} className="px-0 py-2 text-center" title={m.label}>
                          <input
                            type="checkbox"
                            checked={temPerm}
                            onChange={() => toggleModulo(u.uid, m.path)}
                            disabled={saving === u.uid}
                            className={`w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 ${saving === u.uid ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-1 py-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => marcarTodos(u.uid, true)}
                          disabled={saving === u.uid}
                          className="px-1.5 py-1 rounded bg-violet-100 text-violet-700 text-[8px] font-bold hover:bg-violet-200 transition-colors disabled:opacity-50 leading-none"
                          title="Marcar todos"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => marcarTodos(u.uid, false)}
                          disabled={saving === u.uid}
                          className="px-1.5 py-1 rounded bg-slate-200 text-slate-600 text-[8px] font-bold hover:bg-slate-300 transition-colors disabled:opacity-50 leading-none"
                          title="Desmarcar todos"
                        >
                          ❌
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 px-1">
        <p className="text-[10px] text-slate-400">
          <strong>Nota:</strong> Usuários admin têm acesso a todos os módulos independentemente das permissões.
          Usuário novo ou sem permissão configurada não vê módulo algum. Marque os módulos que ele pode acessar.
        </p>
      </div>
    </div>
  );
};

export default Admin;
