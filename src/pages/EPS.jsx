import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart, FileText, DollarSign,
  ChevronDown, Building2, MapPin,
  Target, Activity, ChevronRight,
  CalendarDays, CheckCircle2, Truck,
  AlertCircle, BarChart3,
  TrendingUp, TrendingDown,
  Eye, EyeOff, X,
  Upload, Download, RefreshCw, ArrowRight, ClipboardCheck
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import api, { conferirEPS, downloadConferenciaEPS, listarRelatoriosEPS } from '../services/api.service';
import Card from '../components/ui/Card';

function fmtPct(v) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

function fmtCurrency(v) {
  if (!v) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtDate(v) {
  if (!v || v === '-' || v === '') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [y, m, d] = v.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }
  if (/^\d{5}$/.test(String(v)) || /^\d{5}\.\d+$/.test(String(v))) {
    const serial = Number(v);
    if (serial > 40000 && serial < 60000) {
      const date = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(date)) {
        return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
      }
    }
  }
  return v;
}

function fillProgress(arr) {
  let last = null;
  const fwd = arr.map(v => {
    if (v != null) last = v;
    return last;
  });
  let next = null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) next = arr[i];
    else if (fwd[i] == null && next != null) fwd[i] = next;
  }
  return fwd;
}

function ProgressRing({ value, size = 44, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(value ?? 0, 100) / 100) * circ;
  const color = value >= 80 ? '#059669' : value >= 50 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700 ease-out"
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.28} fontWeight="700" fill="#0f172a"
      >
        {value != null ? `${Math.round(value)}%` : '—'}
      </text>
    </svg>
  );
}

function Badge({ children, variant = 'default' }) {
  const styles = {
    default: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md ${styles[variant] || styles.default}`}>
      {children}
    </span>
  );
}

const STATUS_CORES = {
  'Concluído': 'emerald',
  'Em Andamento': 'blue',
  'Não Iniciado': 'default',
  'Em Licitação': 'amber',
  'Em Mobilização': 'purple',
  'Finalizado': 'emerald',
  'Paralisado': 'red',
  'Cancelado': 'red',
  'Suspenso': 'red',
};

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

function PontoAccordion({
  nome, segmento, status, municipio, fisicos, financeiros, semanas,
  detalhamentos, statusPorSemana, statusContratoSemana, municipiosSemana, datasChegada,
  previsoesSaida, proximosMunicipios, observacoesSemana, patrulhasSemana,
  previsoesConclusao, datasConclusao,
  previsaoConclusao, dataConclusao, patrulha, dataChegada,
  previsaoSaida, proximoMunicipio, observacoes,
  ativo, onToggleAtivo,
}) {
  const [aberto, setAberto] = useState(false);
  const isPatrulha = segmento === 'GMPK' || segmento === 'GMP';
  const ultimoFisico = fisicos[fisicos.length - 1];
  const pPrevisao = fmtDate(previsaoConclusao);
  const pConclusao = fmtDate(dataConclusao);

  return (
    <div className={`rounded-xl border transition-shadow overflow-hidden ${
      aberto ? 'border-slate-200 shadow-sm' : 'border-slate-200/80 hover:shadow-sm'
    }`}>
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className={`flex-1 flex items-center gap-2.5 min-w-0 ${isPatrulha ? 'flex-wrap' : ''}`}>
          <span className="text-sm font-semibold text-slate-800">{nome}</span>
          {status && ['Paralisado', 'Suspenso', 'Cancelado'].includes(status) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-md whitespace-nowrap">
              <AlertCircle className="w-3.5 h-3.5" /> {status}
            </span>
          )}
          {!isPatrulha && (status === 'Concluído' || status === 'Finalizado') && pConclusao && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" /> Concluído em: {pConclusao}
            </span>
          )}
          {!isPatrulha && (!status || (status !== 'Concluído' && status !== 'Finalizado')) && pPrevisao && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md whitespace-nowrap">
              <CalendarDays className="w-3.5 h-3.5" /> Previsão: {pPrevisao}
            </span>
          )}
          {isPatrulha && municipio && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
              <MapPin className="w-3.5 h-3.5" /> {municipio}
            </span>
          )}
          {!isPatrulha && municipio && (
            <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />{municipio}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isPatrulha && ultimoFisico != null && (
            <span className={`text-sm font-bold ${
              ultimoFisico >= 80 ? 'text-emerald-600' : ultimoFisico >= 50 ? 'text-amber-600' : 'text-red-500'
            }`}>
              {fmtPct(ultimoFisico)}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleAtivo?.(); }}
            title={ativo ? 'Remover do gráfico' : 'Mostrar no gráfico'}
            className={`p-1 rounded-lg transition-colors ${ativo ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-300 bg-slate-50 hover:bg-slate-100'}`}
          >
            {ativo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <div className={`p-1 rounded-lg transition-colors ${aberto ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300'}`}>
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${aberto ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </button>

      {aberto && (
        <div className="border-t border-slate-100">
          <div className="px-4 pt-4 pb-1 space-y-0">
            {!isPatrulha && observacoes && observacoes !== '-' && observacoes !== '' && (
              <div className="flex flex-wrap items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg">
                  Obs: {observacoes.length > 50 ? observacoes.slice(0, 50) + '...' : observacoes}
                </span>
              </div>
            )}

            {semanas.map((sem, i) => {
              const v = fisicos[i];
              const vf = financeiros[i];
              const det = detalhamentos?.[i];
              const st = (statusPorSemana?.[i] && statusPorSemana[i] !== '-')
                ? statusPorSemana[i]
                : statusContratoSemana?.[i];
              const isAtual = i === semanas.length - 1;
              const stCor = STATUS_CORES[st] || 'default';

              const vAnterior = i > 0 ? fisicos[i - 1] : null;
              const vfAnterior = i > 0 ? financeiros[i - 1] : null;

              const deltaFisico = (v != null && vAnterior != null) ? v - vAnterior : null;
              const deltaFinanceiro = (vf != null && vfAnterior != null) ? vf - vfAnterior : null;

              const muni = municipiosSemana?.[i];
              const chegada = datasChegada?.[i];
              const saida = previsoesSaida?.[i];
              const proxMuni = proximosMunicipios?.[i];
              const patr = patrulhasSemana?.[i];
              const obs = observacoesSemana?.[i];
              const prevC = previsoesConclusao?.[i];
              const dataC = datasConclusao?.[i];

              const showPrevC = prevC && prevC !== '-' && prevC !== '';
              const dataCAnterior = i > 0 ? datasConclusao?.[i - 1] : null;
              const showDataC = dataC && dataC !== '-' && dataC !== '' && (!dataCAnterior || dataCAnterior !== dataC);

              const prevCAnterior = i > 0 ? previsoesConclusao?.[i - 1] : null;
              const prevCChanged = showPrevC && prevCAnterior && prevC !== prevCAnterior;

              return (
                <div key={sem} className={`relative flex gap-4 pb-6 last:pb-0 ${i > 0 ? 'pt-1' : ''}`}>
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-3 h-3 rounded-full ring-4 z-10 ${
                      isAtual
                        ? 'bg-indigo-500 ring-indigo-100'
                        : 'bg-slate-300 ring-slate-50'
                    }`} />
                    {i < semanas.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                    )}
                  </div>

                  <div className={`flex-1 min-w-0 -mt-1 p-3 rounded-xl ${isAtual ? 'bg-indigo-50/50 ring-1 ring-indigo-100' : 'bg-white border border-slate-100'}`}>
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <span className={`text-xs font-bold ${isAtual ? 'text-indigo-700' : 'text-slate-500'}`}>
                        {sem.replace('/2026', '')}
                      </span>
                      {isAtual && (
                        <span className="text-[9px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded-md uppercase">Atual</span>
                      )}
                      {st && st !== '-' && (
                        <Badge variant={stCor}>{st}</Badge>
                      )}
                    </div>

                    {muni && muni !== '-' && !isPatrulha && (
                      <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {muni}
                      </div>
                    )}

                    {(showPrevC || showDataC) && !isPatrulha && (
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {showPrevC && (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-md px-2 py-0.5 ${
                            prevCChanged ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <CalendarDays className="w-3 h-3" />
                            Prev: {fmtDate(prevC) || prevC}
                            {prevCChanged && <span className="text-[9px] font-bold text-amber-600">(alterada)</span>}
                          </span>
                        )}
                        {showDataC && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-100 rounded-md px-2 py-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Concluído: {fmtDate(dataC) || dataC}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-2">
                      {!isPatrulha && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">Físico</span>
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                v >= 80 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`} style={{ width: `${Math.min(v ?? 0, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-bold w-12 text-right ${
                              v >= 80 ? 'text-emerald-600' : v >= 50 ? 'text-amber-600' : 'text-red-500'
                            }`}>{fmtPct(v)}</span>
                            {deltaFisico != null && deltaFisico !== 0 && (
                              <span className={`text-[10px] flex items-center gap-0.5 font-semibold ${
                                deltaFisico > 0 ? 'text-emerald-500' : 'text-red-400'
                              }`}>
                                {deltaFisico > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {deltaFisico > 0 ? '+' : ''}{deltaFisico.toFixed(1)}pp
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">Financeiro</span>
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                vf >= 80 ? 'bg-blue-500' : vf >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`} style={{ width: `${Math.min(vf ?? 0, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-bold w-12 text-right ${
                              vf >= 80 ? 'text-blue-600' : vf >= 50 ? 'text-amber-600' : 'text-red-500'
                            }`}>{fmtPct(vf)}</span>
                            {deltaFinanceiro != null && deltaFinanceiro !== 0 && (
                              <span className={`text-[10px] flex items-center gap-0.5 font-semibold ${
                                deltaFinanceiro > 0 ? 'text-blue-500' : 'text-red-400'
                              }`}>
                                {deltaFinanceiro > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {deltaFinanceiro > 0 ? '+' : ''}{deltaFinanceiro.toFixed(1)}pp
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      {isPatrulha && muni && muni !== '-' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                          <Truck className="w-3.5 h-3.5" /> {muni}
                        </span>
                      )}
                      {isPatrulha && chegada && chegada !== '-' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                          <CalendarDays className="w-3.5 h-3.5" /> Chegada: {fmtDate(chegada) || chegada}
                        </span>
                      )}
                      {isPatrulha && saida && saida !== '-' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg">
                          <CalendarDays className="w-3.5 h-3.5" /> Saída: {fmtDate(saida) || saida}
                        </span>
                      )}
                      {isPatrulha && proxMuni && proxMuni !== '-' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                          <MapPin className="w-3.5 h-3.5" /> Próximo: {proxMuni}
                        </span>
                      )}
                    </div>

                    {obs && obs !== '-' && obs !== '' && (
                      <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-2 border border-slate-100">
                        <span className="font-semibold text-slate-400 mr-1">Obs:</span> {obs}
                      </div>
                    )}

                    {det && det !== '-' && (
                      <div className="text-sm text-slate-700 leading-relaxed p-3 rounded-lg bg-blue-50/60 border border-blue-100/50">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-2">Detalhamento</span>
                        {det.split(/\r?\n/).filter(Boolean).map((linha, li) => {
                          const limpa = linha.replace(/^\.\s*/, '').trim();
                          const STATUS_CONHECIDOS = ['Aprovado', 'Aprovado pela analista', 'Finalizado', 'Em analise', 'Em Andamento', 'Paralisado', 'Reprovado', 'Não se aplica', 'Em andamento'];
                          let fase = limpa;
                          let situacao = null;
                          let descricao = null;
                          const separadoPorTravessao = limpa.split(' - ');
                          if (separadoPorTravessao.length >= 2) {
                            fase = separadoPorTravessao.slice(0, -1).join(' - ').trim();
                            situacao = separadoPorTravessao[separadoPorTravessao.length - 1].trim();
                          } else if (limpa.includes(':')) {
                            const i = limpa.lastIndexOf(':');
                            const posStatus = limpa.slice(i + 1).trim();
                            fase = limpa.slice(0, i).trim();
                            if (STATUS_CONHECIDOS.includes(posStatus)) {
                              situacao = posStatus;
                            } else if (posStatus) {
                              descricao = posStatus;
                            }
                          }
                          const cor = situacao === 'Aprovado' || situacao === 'Aprovado pela analista' || situacao === 'Finalizado' ? 'emerald'
                            : situacao === 'Em analise' || situacao === 'Em Andamento' || situacao === 'Em andamento' ? 'blue'
                            : situacao === 'Paralisado' ? 'red'
                            : situacao === 'Reprovado' ? 'red'
                            : situacao === 'Não se aplica' ? 'slate'
                            : 'default';
                          if ((situacao || descricao) && fase) {
                            return (
                              <div key={li} className="flex items-start gap-2 py-1 first:pt-0 last:pb-0">
                                <span className="text-blue-700 font-medium">{fase}</span>
                                {situacao
                                  ? <Badge variant={cor}>{situacao}</Badge>
                                  : <span className="text-slate-600">{descricao}</span>}
                              </div>
                            );
                          }
                          return <div key={li} className="py-0.5 text-slate-600">{linha}</div>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const CORES_PONTOS = ['#059669','#3b82f6','#d97706','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#e11d48','#06b6d4','#a855f7','#f59e0b','#0ea5e9','#10b981','#f43f5e'];

function renderPontoAccordion(chave, nome, dados, contrato, semanas, semanaMaisRecente, ativo, onToggleAtivo) {
  const ultimo = dados?.[semanaMaisRecente];
  const fisicosRaw = semanas.map(s => {
    const p = dados?.[s];
    return p?.avanco_fisico != null ? Number(p.avanco_fisico) : null;
  });
  const financeirosRaw = semanas.map(s => {
    const p = dados?.[s];
    return p?.avanco_financeiro != null ? Number(p.avanco_financeiro) : null;
  });
  const fisicos = fillProgress(fisicosRaw);
  const financeiros = fillProgress(financeirosRaw);
  const extrairArray = (campo) => semanas.map(s => dados?.[s]?.[campo] || null);
  const detalhamentos = extrairArray('detalhamento');
  const statusPorSemana = extrairArray('status_ponto');
  const statusContratoSemana = extrairArray('status_contrato');
  const municipiosSemana = extrairArray('municipio');
  const datasChegada = extrairArray('data_chegada');
  const previsoesSaida = extrairArray('previsao_saida');
  const proximosMunicipios = extrairArray('proximo_municipio');
  const observacoesSemana = extrairArray('observacoes');
  const patrulhasSemana = extrairArray('patrulha');
  const previsoesConclusao = extrairArray('previsao_conclusao');
  const datasConclusao = extrairArray('data_conclusao');
  return (
    <PontoAccordion
      key={chave}
      nome={nome}
      segmento={contrato.segmento}
      status={(ultimo?.status_ponto && ultimo.status_ponto !== '-') ? ultimo.status_ponto : ultimo?.status_contrato}
      municipio={(ultimo?.municipio && ultimo.municipio !== '-' && ultimo.municipio !== '') ? ultimo.municipio : null}
      fisicos={fisicos}
      financeiros={financeiros}
      semanas={semanas}
      detalhamentos={detalhamentos}
      statusPorSemana={statusPorSemana}
      statusContratoSemana={statusContratoSemana}
      municipiosSemana={municipiosSemana}
      datasChegada={datasChegada}
      previsoesSaida={previsoesSaida}
      proximosMunicipios={proximosMunicipios}
      observacoesSemana={observacoesSemana}
      patrulhasSemana={patrulhasSemana}
      previsoesConclusao={previsoesConclusao}
      datasConclusao={datasConclusao}
      previsaoConclusao={ultimo?.previsao_conclusao}
      dataConclusao={ultimo?.data_conclusao}
      patrulha={ultimo?.patrulha}
      dataChegada={ultimo?.data_chegada}
      previsaoSaida={ultimo?.previsao_saida}
      proximoMunicipio={ultimo?.proximo_municipio}
      observacoes={ultimo?.observacoes}
      ativo={ativo}
      onToggleAtivo={onToggleAtivo}
    />
  );
}

function ContratoCard({ contrato, idx, semanas, semanaMaisRecente, toggleContrato, aberto, detalhe }) {
  const [metrica, setMetrica] = useState('fisico');
  const [pontosAtivos, setPontosAtivos] = useState(null);
  const evol = contrato.evolucao || {};
  const recente = evol[semanaMaisRecente];

  const pontosPorNome = useMemo(() => {
    const map = {};
    if (detalhe?.pontos) {
      for (const p of detalhe.pontos) {
        const muni = (p.municipio && p.municipio !== '-' && p.municipio !== '')
          ? p.municipio
          : 'Sem município';
        const nome = p.ponto === '_CONTRATO' ? 'Resumo' : p.ponto;
        const chave = `${muni} · ${nome}`;
        if (!map[chave]) map[chave] = { municipio: muni, nome, semana: {} };
        map[chave].semana[p.semana] = {
          avanco_fisico: p.avanco_fisico,
          avanco_financeiro: p.avanco_financeiro,
          status_ponto: p.status_ponto,
          status_contrato: p.status_contrato,
          municipio: p.municipio,
          detalhamento: p.detalhamento,
          previsao_conclusao: p.previsao_conclusao,
          data_conclusao: p.data_conclusao,
          patrulha: p.patrulha,
          data_chegada: p.data_chegada,
          previsao_saida: p.previsao_saida,
          proximo_municipio: p.proximo_municipio,
          observacoes: p.observacoes,
        };
      }
    }
    return map;
  }, [detalhe]);

  const nomesPontos = useMemo(() =>
    Object.keys(pontosPorNome).sort((a, b) => {
      const ma = a.split(' · ')[1] || '';
      const mb = b.split(' · ')[1] || '';
      const na = parseInt(ma.replace(/\D/g, '')) || 0;
      const nb = parseInt(mb.replace(/\D/g, '')) || 0;
      if (na !== nb) return na - nb;
      return a.localeCompare(b, 'pt-BR');
    }),
  [pontosPorNome]);

  const municipiosList = useMemo(() => {
    const set = new Set();
    for (const p of detalhe?.pontos || []) {
      if (p.municipio && p.municipio !== '-' && p.municipio !== '') set.add(p.municipio);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [detalhe]);

  const isPontoAtivo = (chave) => !pontosAtivos || pontosAtivos.has(chave);

  const togglePonto = (chave) => {
    setPontosAtivos(prev => {
      if (!prev) return new Set([chave]);
      const next = new Set(prev);
      if (next.has(chave)) {
        next.delete(chave);
        if (next.size === 0) return null;
      } else {
        next.add(chave);
      }
      return next;
    });
  };

  const pontosGrafico = useMemo(() => {
    if (!pontosAtivos) return nomesPontos;
    return nomesPontos.filter(ch => pontosAtivos.has(ch));
  }, [nomesPontos, pontosAtivos]);

  const getStatusFromProgress = (fisico) => {
    if (fisico == null) return null;
    if (fisico >= 100) return { label: 'Concluído', variant: 'emerald' };
    if (fisico >= 1) return { label: 'Em Andamento', variant: 'blue' };
    return { label: 'Não Iniciado', variant: 'default' };
  };

  const statusReal = contrato.status && contrato.status !== '-' ? contrato.status : null;
  const statusInfo = statusReal
    ? { label: statusReal, variant: STATUS_CORES[statusReal] || 'default' }
    : getStatusFromProgress(recente?.fisico);

  return (
    <Card padding="p-0" className="!rounded-2xl overflow-hidden border-slate-200/80">
      <button
        onClick={() => toggleContrato(contrato.contrato)}
        className="w-full text-left transition-colors hover:bg-slate-50/50"
      >
        <div className="p-5 flex items-start gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-mono text-slate-400 font-medium">#{String(idx + 1).padStart(2, '0')}</span>
              <span className="text-base font-bold text-slate-800">{contrato.contrato}</span>
              <Badge variant="emerald">{contrato.segmento}</Badge>
              {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
              {contrato.prioritario === 'SIM' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">
                  Prioritário
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 leading-snug">{contrato.objeto}</p>
            <div className="flex items-center gap-4 mt-2.5">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />{contrato.empresa}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />{fmtCurrency(contrato.valor)}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />{recente?.pontos || 0} pontos
              </span>
              {recente?.fisico != null && (
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />{fmtPct(recente.fisico)} fís.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {recente && (
              <div className="text-center">
                <div className="text-[10px] text-indigo-500 font-semibold mb-1">{semanaMaisRecente?.replace('/2026', '')}</div>
                <ProgressRing value={recente.fisico} size={48} stroke={4} />
              </div>
            )}

            <div className={`p-1.5 rounded-lg transition-colors ${aberto ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300'}`}>
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
      </button>

      {aberto && <div className="h-px bg-slate-100 mx-5" />}

      {aberto && (
        <div className="px-5 pb-6 pt-5 space-y-6">
          {nomesPontos.length > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evolução</h4>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setMetrica('fisico')}
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${
                        metrica === 'fisico'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >Físico</button>
                    <button
                      onClick={() => setMetrica('financeiro')}
                      className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${
                        metrica === 'financeiro'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >Financeiro</button>
                    {pontosAtivos && (
                      <button
                        onClick={() => setPontosAtivos(null)}
                        className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                        title="Limpar filtro do gráfico"
                      >
                        <X className="w-3 h-3" /> Limpar filtro
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={(() => {
                      const semLabels = semanas.map(s => s.replace('/2026', ''));
                      const metricKey = metrica === 'fisico' ? 'avanco_fisico' : 'avanco_financeiro';
                      return semLabels.map((sem, i) => {
                        const o = { semana: sem };
                        for (const chave of pontosGrafico) {
                          const d = pontosPorNome[chave];
                          const vals = semLabels.map((_, j) => {
                            const p = d?.semana?.[semanas[j]];
                            return p?.[metricKey] != null ? Number(p[metricKey]) : null;
                          });
                          o[chave] = fillProgress(vals)[i] ?? 0;
                        }
                        return o;
                      });
                    })()}>
                      <XAxis dataKey="semana" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                        formatter={(v) => `${Number(v).toFixed(1)}%`}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 9, paddingTop: 8 }}
                        iconType="circle"
                        payload={nomesPontos.map((chave, idx) => {
                          const entry = pontosPorNome[chave];
                          const muni = entry?.municipio && entry.municipio !== 'Sem município' ? entry.municipio : null;
                          return {
                            value: muni ? `${muni} · ${entry.nome}` : entry.nome,
                            dataKey: chave,
                            color: CORES_PONTOS[idx % CORES_PONTOS.length],
                            type: 'circle',
                            inactive: pontosAtivos != null && !pontosAtivos.has(chave),
                          };
                        })}
                        onClick={(entry) => {
                          const k = entry?.dataKey ?? entry?.value;
                          if (k) togglePonto(k);
                        }}
                      />
                      <ReferenceLine y={100} stroke="#e2e8f0" strokeDasharray="3 3" />
                      {pontosGrafico.map((chave, idx) => {
                        const entry = pontosPorNome[chave];
                        const muni = entry?.municipio && entry.municipio !== 'Sem município' ? entry.municipio : null;
                        const nomeLegenda = muni ? `${muni} · ${entry.nome}` : entry.nome;
                        return (
                          <Line key={chave} type="monotone" dataKey={chave} stroke={CORES_PONTOS[idx % CORES_PONTOS.length]} strokeWidth={2} dot={false} name={nomeLegenda} connectNulls />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pontos</h4>
                  <span className="text-[11px] text-slate-400">({nomesPontos.length})</span>
                  {municipiosList.length > 1 && (
                    <span className="text-[11px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold">
                      {municipiosList.length} cidades
                    </span>
                  )}
                  {pontosAtivos && (
                    <button
                      onClick={() => setPontosAtivos(null)}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition-colors"
                    >
                      <EyeOff className="w-3 h-3" /> Mostrar todos no gráfico
                    </button>
                  )}
                </div>
              <div className="space-y-2">
                {municipiosList.length > 1 ? municipiosList.map(muni => {
                  const chavesDoMuni = nomesPontos.filter(ch => pontosPorNome[ch].municipio === muni);
                  return (
                    <div key={muni} className="rounded-xl border border-indigo-100 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50/60 border-b border-indigo-100">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-700">{muni}</span>
                        <span className="text-[10px] text-indigo-400 font-medium">({chavesDoMuni.length} pontos)</span>
                      </div>
                      <div className="p-2 space-y-2 bg-white">
                        {chavesDoMuni.map(chave => {
                          const entry = pontosPorNome[chave];
                          const dados = entry.semana;
                          return renderPontoAccordion(chave, entry.nome, dados, contrato, semanas, semanaMaisRecente, isPontoAtivo(chave), () => togglePonto(chave));
                        })}
                      </div>
                    </div>
                  );
                }) : nomesPontos.map(chave => {
                  const entry = pontosPorNome[chave];
                  const dados = entry.semana;
                  return renderPontoAccordion(chave, entry.nome, dados, contrato, semanas, semanaMaisRecente, isPontoAtivo(chave), () => togglePonto(chave));
                })}
              </div>
            </div>
          </>
          )}
        </div>
      )}
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div>
          <Skeleton className="w-48 h-6 mb-1" />
          <Skeleton className="w-32 h-4" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="!p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="w-20 h-3 mb-2" />
                <Skeleton className="w-16 h-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="!rounded-2xl !p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-4" />
              <div className="flex-1">
                <Skeleton className="w-64 h-5 mb-2" />
                <Skeleton className="w-full h-4 mb-2" />
                <Skeleton className="w-48 h-4" />
              </div>
              <Skeleton className="w-12 h-12 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const CAMPO_LABEL = {
  status: 'Status',
  empresa: 'Empresa',
  segmento: 'Segmento',
  fundo: 'Fundo',
  valor_contrato: 'Valor Contrato',
  valor_medicao: 'Valor Medição',
  etapa: 'Etapa',
};

function ConferenciaEPS() {
  const [relatorios, setRelatorios] = useState(null);
  const [oldFile, setOldFile] = useState(null);
  const [newFile, setNewFile] = useState(null);
  const [usarUpload, setUsarUpload] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await listarRelatoriosEPS();
        setRelatorios(res.relatorios || []);
        if (res.relatorios?.length >= 2) {
          const ultimos = res.relatorios.slice(-2);
          setOldFile({ semana_id: ultimos[0].id, nome: ultimos[0].periodo || ultimos[0].arquivo });
          setNewFile({ semana_id: ultimos[1].id, nome: ultimos[1].periodo || ultimos[1].arquivo });
        }
      } catch (err) {
        setErro(err.response?.data?.error || 'Não foi possível carregar os relatórios do banco.');
      }
    })();
  }, []);

  const temArquivos = oldFile && newFile;

  function onFileChange(e, setter) {
    const f = e.target.files?.[0];
    if (f) setter({ file: f, nome: f.name });
    e.target.value = '';
  }

  function selecionarRelatorio(posicao, id) {
    const arquivo = relatorios?.find(a => String(a.id) === String(id));
    const setter = posicao === 'old' ? setOldFile : setNewFile;
    if (arquivo) setter({ semana_id: arquivo.id, nome: arquivo.periodo || arquivo.arquivo });
  }

  async function processar() {
    if (!oldFile || !newFile) return;
    setProcessando(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await conferirEPS(
        oldFile.semana_id ? { semana_id: oldFile.semana_id } : oldFile.file,
        newFile.semana_id ? { semana_id: newFile.semana_id } : newFile.file,
      );
      setResultado(res);
    } catch (err) {
      setErro(err.response?.data?.error || err.message || 'Erro ao processar arquivos');
    } finally {
      setProcessando(false);
    }
  }

  async function baixarDocx() {
    if (!resultado) return;
    try {
      await downloadConferenciaEPS(
        oldFile.semana_id ? { semana_id: oldFile.semana_id } : oldFile.file,
        newFile.semana_id ? { semana_id: newFile.semana_id } : newFile.file,
        resultado.fileName,
      );
    } catch (err) {
      setErro(err.response?.data?.error || err.message || 'Erro ao gerar o documento');
    }
  }

  function toggleAbas(aba) {
    setExpanded(prev => ({ ...prev, [aba]: !prev[aba] }));
  }

  const totalAlteracoes = resultado?.all_results?.reduce((s, r) => s + (r.num_changes || 0), 0) || 0;
  const totalNovos = resultado?.all_results?.reduce((s, r) => s + (r.added_contracts?.length || 0), 0) || 0;
  const totalRemovidos = resultado?.all_results?.reduce((s, r) => s + (r.removed_contracts?.length || 0), 0) || 0;

  return (
    <Card className="!p-6 border-indigo-100">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <ClipboardCheck className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Conferência EPS</h3>
        <span className="text-[11px] text-slate-400">Compare o relatório da semana anterior com o atual</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button
          onClick={() => { setUsarUpload(false); if (relatorios?.length >= 2) { const ultimos = relatorios.slice(-2); setOldFile({ semana_id: ultimos[0].id, nome: ultimos[0].periodo || ultimos[0].arquivo }); setNewFile({ semana_id: ultimos[1].id, nome: ultimos[1].periodo || ultimos[1].arquivo }); } }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            !usarUpload ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Relatórios do banco
        </button>
        <button
          onClick={() => { setUsarUpload(true); setOldFile(null); setNewFile(null); }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            usarUpload ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Upload manual
        </button>
      </div>

      {!usarUpload ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className={`p-4 rounded-xl border-2 ${oldFile ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'}`}>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Relatório anterior</p>
            <select
              value={oldFile?.semana_id || ''}
              onChange={(e) => selecionarRelatorio('old', e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
            >
              <option value="">Selecione...</option>
              {relatorios?.map(a => (
                <option key={`old-${a.id}`} value={a.id}>{a.periodo || a.arquivo}</option>
              ))}
            </select>
          </div>
          <div className={`p-4 rounded-xl border-2 ${newFile ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'}`}>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Relatório atual</p>
            <select
              value={newFile?.semana_id || ''}
              onChange={(e) => selecionarRelatorio('new', e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
            >
              <option value="">Selecione...</option>
              {relatorios?.map(a => (
                <option key={`new-${a.id}`} value={a.id}>{a.periodo || a.arquivo}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <label className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            oldFile ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
          }`}>
            <input type="file" accept=".xlsm,.xlsx" className="hidden" onChange={(e) => onFileChange(e, setOldFile)} />
            <div className={`p-2.5 rounded-lg ${oldFile ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400'}`}>
              {oldFile ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Relatório anterior</p>
              <p className="text-sm text-slate-500 truncate">{oldFile?.nome || 'Selecione o .xlsm da semana anterior'}</p>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            newFile ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
          }`}>
            <input type="file" accept=".xlsm,.xlsx" className="hidden" onChange={(e) => onFileChange(e, setNewFile)} />
            <div className={`p-2.5 rounded-lg ${newFile ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400'}`}>
              {newFile ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Relatório atual</p>
              <p className="text-sm text-slate-500 truncate">{newFile?.nome || 'Selecione o .xlsm da semana atual'}</p>
            </div>
          </label>
        </div>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={processar}
          disabled={!temArquivos || processando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {processando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {processando ? 'Conferindo...' : 'Conferir relatórios'}
        </button>
        {resultado && (
          <button
            onClick={baixarDocx}
            disabled={processando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            <Download className="w-4 h-4" /> Baixar .docx
          </button>
        )}
      </div>

      {erro && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
        </div>
      )}

      {resultado && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
              {resultado.meta_old?.periodo || 'Sem anterior'} <ArrowRight className="w-3 h-3" /> {resultado.meta_new?.periodo || 'Esta semana'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
              <ClipboardCheck className="w-3.5 h-3.5" /> {totalAlteracoes} alterações
            </span>
            {totalNovos > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" /> {totalNovos} novos
              </span>
            )}
            {totalRemovidos > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                <X className="w-3.5 h-3.5" /> {totalRemovidos} removidos
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2.5 font-semibold">Categoria</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Anterior</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Atual</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Δ</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Alterações</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Novos</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Removidos</th>
                </tr>
              </thead>
              <tbody>
                {resultado.all_results.map((r, i) => {
                  const delta = r.new_count - r.old_count;
                  return (
                    <tr key={r.sheet} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="px-3 py-2 font-semibold text-slate-600">{r.sheet}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{r.old_count}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{r.new_count}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {delta > 0 ? `+${delta}` : delta}
                      </td>
<td className="px-3 py-2 text-right">
                          <button
                            onClick={() => setExpanded(prev => ({ ...prev, [r.sheet]: true }))}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${
                              r.num_changes > 0 ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-slate-50 text-slate-300'
                            }`}
                          >
                            {r.num_changes}
                          </button>
                        </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`text-xs font-bold ${r.added_contracts.length ? 'text-emerald-600' : 'text-slate-300'}`}>{r.added_contracts.length}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`text-xs font-bold ${r.removed_contracts.length ? 'text-red-500' : 'text-slate-300'}`}>{r.removed_contracts.length}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {resultado.all_results.map((r) => {
            const temDetalhe = r.changes.length > 0 || r.added_contracts.length > 0 || r.removed_contracts.length > 0;
            if (!temDetalhe) return null;
            return (
              <div key={r.sheet} className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <ClipboardCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{r.sheet}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {r.changes.map((cc, i) => {
                    const partes = [];
                    if (cc.num_progresso) partes.push(`${cc.num_progresso} avanço(s)`);
                    if (cc.num_prev) partes.push(`${cc.num_prev} previsão(ões)`);
                    if (cc.num_conc) partes.push(`${cc.num_conc} conclusão(ões)`);
                    if (cc.num_status) partes.push(`${cc.num_status} status`);
                    if (cc.added_sub) partes.push(`+${cc.added_sub} sub-item`);
                    if (cc.removed_sub) partes.push(`-${cc.removed_sub} sub-item`);
                    return (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-700">{cc.contrato}</span>
                          {cc.lote && cc.lote !== '-' && <Badge>Lote {cc.lote}</Badge>}
                          {cc.empresa && <span className="text-xs text-slate-400 truncate max-w-[200px]">{cc.empresa}</span>}
                          {partes.length > 0 && <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold">{partes.join(' · ')}</span>}
                        </div>
                        {Object.keys(cc.c_diffs).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {Object.entries(cc.c_diffs).sort().map(([f, [ov, nv]]) => (
                              <div key={f} className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-600 w-24 shrink-0">{CAMPO_LABEL[f] || f}:</span>
                                <span className="text-red-500 line-through">{formatValorCampo(f, ov)}</span>
                                <ArrowRight className="w-3 h-3 text-slate-300" />
                                <span className="text-emerald-600 font-semibold">{formatValorCampo(f, nv)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {cc.pontos.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {cc.pontos.map((pt, pi) => (
                              <div key={pi} className="rounded-lg bg-slate-50 px-3 py-2">
                                <p className="text-xs font-bold text-slate-600">📌 {pt.label}</p>
                                <div className="mt-1 space-y-0.5">
                                  {pt.progressos.map(([f, ov, nv], pj) => (
                                    <p key={pj} className="text-xs text-slate-500">
                                      {f === 'avanco_fisico' ? 'Físico' : 'Financeiro'}: <span className="text-slate-600 font-medium">{fmtPercent(ov)}</span> → <span className="text-emerald-600 font-semibold">{fmtPercent(nv)}</span>
                                      {typeof ov === 'number' && typeof nv === 'number' && (
                                        <span className="text-[10px] text-slate-400"> ({nv - ov >= 0 ? '+' : ''}{(nv - ov) * 100 >= 1 ? ((nv - ov) * 100).toFixed(1) : (nv - ov) * 100 >= 0.001 ? ((nv - ov) * 100).toFixed(2) : (nv - ov) * 100 < -0.001 ? ((nv - ov) * 100).toFixed(2) : '0'} pp)</span>
                                      )}
                                    </p>
                                  ))}
                                  {pt.prev.map(([ov, nv], pj) => (
                                    <p key={pj} className="text-xs text-slate-500">⏳ Previsão: <span className="line-through text-red-500">{ov || '—'}</span> → <span className="text-amber-600 font-semibold">{nv || '—'}</span></p>
                                  ))}
                                  {pt.conc.map(([ov, nv], pj) => (
                                    <p key={pj} className="text-xs text-emerald-600 font-medium">✅ Conclusão: {nv || nv === '' ? 'Data definida' : 'removida'}</p>
                                  ))}
                                  {pt.status.map(([ov, nv], pj) => (
                                    <p key={pj} className="text-xs text-slate-500">🔄 Status: <span className="line-through text-red-500">{ov || '—'}</span> → <span className="text-blue-600 font-semibold">{nv || '—'}</span></p>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {r.added_contracts.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="text-xs font-bold text-emerald-600 mb-1.5">🆕 Contratos novos ({r.added_contracts.length})</p>
                      <div className="space-y-1">
                        {r.added_contracts.map((c, i) => (
                          <p key={i} className="text-xs text-slate-500"><span className="font-bold text-slate-600">{c.contrato}</span> — {c.empresa} <span className="text-slate-400">({c.status})</span></p>
                        ))}
                      </div>
                    </div>
                  )}
                  {r.removed_contracts.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="text-xs font-bold text-red-500 mb-1.5">🗑️ Contratos removidos ({r.removed_contracts.length})</p>
                      <div className="space-y-1">
                        {r.removed_contracts.map((c, i) => (
                          <p key={i} className="text-xs text-slate-500"><span className="font-bold text-slate-600">{c.contrato}</span> — {c.empresa} <span className="text-slate-400">({c.status})</span></p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function formatValorCampo(field, val) {
  if (val == null) return '—';
  if (field === 'valor_contrato' || field === 'valor_medicao') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  }
  return String(val);
}

function fmtPercent(val) {
  if (val == null) return '—';
  return `${(Number(val) * 100).toFixed(1)}%`;
}

export default function EPS() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contratosAbertos, setContratosAbertos] = useState(new Set());
  const [detalhes, setDetalhes] = useState({});
  const [segmentoFilter, setSegmentoFilter] = useState(null);
  const [aba, setAba] = useState('detalhes');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api.get('/eps/contratos');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleContrato(contrato) {
    const aberto = contratosAbertos.has(contrato);
    if (!aberto && !detalhes[contrato]) {
      try {
        const res = await api.get(`/eps/contratos/${encodeURIComponent(contrato)}`);
        setDetalhes(prev => ({ ...prev, [contrato]: res.data }));
      } catch (err) {
        console.error('Erro ao buscar detalhes:', err);
      }
    }
    setContratosAbertos(prev => {
      const next = new Set(prev);
      if (next.has(contrato)) next.delete(contrato);
      else next.add(contrato);
      return next;
    });
  }

  const semanas = data?.semanas || [];
  const contratosArray = data?.data || [];
  const semanaMaisRecente = semanas[semanas.length - 1];

  const segmentos = useMemo(() => {
    const set = new Set();
    for (const c of contratosArray) {
      if (c.segmento) set.add(c.segmento);
    }
    return [...set].sort();
  }, [contratosArray]);

  const filteredContratos = useMemo(() => {
    if (segmentoFilter) {
      return contratosArray.filter(c => c.segmento === segmentoFilter);
    }
    return contratosArray;
  }, [contratosArray, segmentoFilter]);

  const totais = useMemo(() => {
    let valorTotal = 0;
    let fisicoTotal = 0;
    let fisicoCount = 0;
    for (const c of contratosArray) {
      if (c.valor) valorTotal += Number(c.valor);
      const r = c.evolucao?.[semanaMaisRecente];
      if (r?.fisico != null) {
        fisicoTotal += Number(r.fisico);
        fisicoCount++;
      }
    }
    return {
      qtd: contratosArray.length,
      valor: valorTotal,
      fisicoMedio: fisicoCount > 0 ? fisicoTotal / fisicoCount : null,
      filtrados: filteredContratos.length,
    };
  }, [contratosArray, semanaMaisRecente, filteredContratos]);

  const segmentoCounts = useMemo(() => {
    const map = {};
    for (const c of contratosArray) {
      const seg = c.segmento || 'Outros';
      map[seg] = (map[seg] || 0) + 1;
    }
    return map;
  }, [contratosArray]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <Card className="text-center py-16">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 font-medium mb-1">Erro ao carregar dados</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Tentar novamente
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl shadow-sm shadow-indigo-200">
              <PieChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">EPS</h1>
              <p className="text-sm text-slate-400">Acompanhamento físico e financeiro dos contratos</p>
            </div>
          </div>
        </div>

      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 pb-px">
        <button
          onClick={() => setAba('detalhes')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors ${
            aba === 'detalhes'
              ? 'text-indigo-600 border-indigo-600 bg-indigo-50/40'
              : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" /> Detalhes
        </button>
        <button
          onClick={() => setAba('conferencia')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors ${
            aba === 'conferencia'
              ? 'text-indigo-600 border-indigo-600 bg-indigo-50/40'
              : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" /> Conferência EPS
        </button>
      </div>

      {aba === 'conferencia' ? (
        <ConferenciaEPS />
      ) : (
      <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="!p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl shrink-0">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Contratos</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">
                {totais.qtd}
                {totais.filtrados < totais.qtd && (
                  <span className="text-sm font-normal text-slate-400 ml-1">({totais.filtrados})</span>
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl shrink-0">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Valor Total</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{fmtCurrency(totais.valor)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl shrink-0">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Físico Médio</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">
                {totais.fisicoMedio != null ? fmtPct(totais.fisicoMedio) : '—'}
              </p>
            </div>
          </div>
        </Card>
        <Card className="!p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl shrink-0">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Semanas</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{semanas.length}</p>
              {semanaMaisRecente && (
                <p className="text-[11px] text-slate-400 mt-0.5">Última: {semanaMaisRecente.replace('/2026', '')}</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSegmentoFilter(null)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            !segmentoFilter
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos
        </button>
        {segmentos.map(seg => (
          <button
            key={seg}
            onClick={() => setSegmentoFilter(seg === segmentoFilter ? null : seg)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              segmentoFilter === seg
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {seg}
            <span className="ml-1 opacity-60">({segmentoCounts[seg] || 0})</span>
          </button>
        ))}
      </div>

      {filteredContratos.length === 0 ? (
        <Card className="text-center py-16">
          <div className="p-3 bg-slate-100 rounded-full w-fit mx-auto mb-4">
            <Target className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium mb-1">Nenhum contrato encontrado</p>
          <p className="text-sm text-slate-400">Nenhum contrato com o filtro selecionado</p>
          {segmentoFilter && (
            <button
              onClick={() => setSegmentoFilter(null)}
              className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-medium">
            Exibindo {filteredContratos.length} de {contratosArray.length} contratos
            {semanaMaisRecente && ` — última semana: ${semanaMaisRecente.replace('/2026', '')}`}
          </p>
          {filteredContratos.map((c, idx) => (
            <ContratoCard
              key={c.contrato}
              contrato={c}
              idx={idx}
              semanas={semanas}
              semanaMaisRecente={semanaMaisRecente}
              toggleContrato={toggleContrato}
              aberto={contratosAbertos.has(c.contrato)}
              detalhe={detalhes[c.contrato]}
            />
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}