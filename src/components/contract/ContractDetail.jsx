import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FileText,
  TrendingUp,
  History,
  Building2,
  Clock,
  DollarSign,
  GitCompare,
  AlertTriangle,
  FileEdit,
  PieChart,
  BarChart3,
  Copy,
  Check,
  Download,
  File,
  Loader2,
  Calendar,
  ExternalLink,
  FileDown,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatDays,
  cleanNumberSuffix,
} from "../../utils/formatters";
import * as apiService from "../../services/api.service";
import { API_URL } from "../../config/constants";
import Card from "../ui/Card";
import CollapsibleCard from "../ui/CollapsibleCard";
import ProgressBar from "../ui/ProgressBar";
import Badge from "../ui/Badge";
import Skeleton from "../ui/Skeleton";
import ExpandableText from "../ui/ExpandableText";
import HistoricGestoresAccordion from "./HistoricGestoresAccordion";
import Pagination from "../ui/Pagination";

const ContractDetail = ({ contratoId, onClose }) => {
  const [details, setDetails] = useState(null);
  const [gemocdocs, setGemocdocs] = useState(null);
  const [municipiosGmp, setMunicipiosGmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aditivosPage, setAditivosPage] = useState(1);
  const [medicoesPage, setMedicoesPage] = useState(1);
  const [copiedField, setCopiedField] = useState(null); // 'contrato' | 'processo' | null
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('[ContractDetail] Erro ao copiar:', err);
    }
  }, []);

  const handleExportPdf = async () => {
    if (loading || exportingPdf || (!details && !gc)) return;
    setExportingPdf(true);
    try {
      const mod = await import("../../utils/exportContratoPdf");
      await mod.exportContratoPdf({ details, gemocdocs, municipiosGmp });
    } catch (err) {
      console.error("[ContractDetail] Erro ao exportar PDF:", err);
    } finally {
      setExportingPdf(false);
    }
  };

  // Remove sufixo ".0" de números de processo (ex: "202500036020460.0" -> "202500036020460")
  // Obs: cleanNumberSuffix é usado para os status; cleanProc mantido por semântica
  const cleanProc = (v) => cleanNumberSuffix(v);

  // Reset pagination when contract changes
  useEffect(() => {
    setAditivosPage(1);
  }, [contratoId]);

  useEffect(() => {
    setAditivosPage(1);
    setMedicoesPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    if (!contratoId) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [contratoId, onClose]);

  useEffect(() => {
    if (!contratoId) {
      setDetails(null);
      setGemocdocs(null);
      setMunicipiosGmp(null);
      return;
    }
    const fetchDetails = async () => {
      setLoading(true);
      setMunicipiosGmp(null);
      try {
        const data = await apiService.getContratoDetails(contratoId);
        setDetails(data);

        // Also fetch gemocdocs data for comparison
        if (data?.cd_contrato) {
          const cd = data.cd_contrato;

          // Fetch each gemocdocs table independently (404 em uma não quebra as outras)
          const fetchGemocdocs = async () => {
            let contrato = null,
              status = null,
              gestores = [],
              aditivos = [],
              principal = null,
              ordensServico = [];

            try {
              const res = await apiService.getGemocdocsByContrato(
                "CONTRATO",
                cd,
              );
              contrato = res?.data?.[0] || null;
            } catch (e) {
              /* gemocdocs sem CONTRATO */
            }

            try {
              const res = await apiService.getGemocdocsByContrato("STATUS", cd);
              status = res?.data || [];
            } catch (e) {
              /* gemocdocs sem STATUS */
            }

            try {
              const res = await apiService.getGemocdocsByContrato(
                "GESTORES",
                cd,
              );
              gestores = res?.data || [];
            } catch (e) {
              /* gemocdocs sem GESTORES */
            }

            try {
              const res = await apiService.getGemocdocsByContrato(
                "ADITIVOS",
                cd,
              );
              aditivos = res?.data || [];
            } catch (e) {
              /* gemocdocs sem ADITIVOS */
            }

            try {
              const res = await apiService.getGemocdocsByContrato(
                "PRINCIPAL",
                cd,
              );
              principal = res?.data?.[0] || null;
            } catch (e) {
              /* gemocdocs sem PRINCIPAL */
            }

            try {
              const res = await apiService.getOrdensByContrato(cd);
              ordensServico = res?.data || [];
            } catch (e) {
              /* sem OS para este contrato */
            }

            // Identify gestor and fiscal from GESTORES (respecting date ranges)
            const hoje = new Date().toISOString().split("T")[0];

            const ativos = gestores.filter(
              (g) =>
                !g.DATA_FINAL ||
                g.DATA_FINAL.trim() === "" ||
                g.DATA_FINAL >= hoje,
            );

            // Fallback: quando não há ativos, pega TODOS os gestores da data mais recente
            // (resolve o caso em que gestor e fiscal são pessoas diferentes e ambos expiraram)
            const fallback =
              gestores.length > 0
                ? (() => {
                    const maxDate = gestores.reduce((max, g) => {
                      const d = g.DATA_INICIAL || "";
                      return d > max ? d : max;
                    }, "");
                    return gestores.filter(
                      (g) => (g.DATA_INICIAL || "") === maxDate,
                    );
                  })()
                : [];

            const ativosOuFallback = ativos.length > 0 ? ativos : fallback;

            const gestor = ativosOuFallback.find((g) =>
              g.TIPO?.toLowerCase().includes("gestor"),
            );
            // Fiscal: quem é "Fiscal do contrato" OU "Gestor e Fiscal do Contrato"
            const fiscal = ativosOuFallback.find((g) =>
              g.TIPO?.toLowerCase().includes("fiscal"),
            );

            // Sort aditivos by date
            aditivos.sort((a, b) =>
              (a.DATA_DA_ASSINATURA || "") > (b.DATA_DA_ASSINATURA || "")
                ? 1
                : -1,
            );

            setGemocdocs({
              contrato,
              status: Array.isArray(status) ? status[0] || null : status,
              statusRows: Array.isArray(status) ? status : [],
              gestores,
              aditivos,
              principal,
              ordensServico,
              fiscalNome: fiscal?.NOME || null,
              gestorNome: gestor?.NOME || null,
            });
          };

          fetchGemocdocs();

          // Fetch MUNICIPIOS PARALISADOS GMP for GMP contracts
          if (cd) {
            try {
              const res = await apiService.getGemocdocsByContrato(
                "MUNICIPIOS PARALISADOS GMP",
                cd,
              );
              if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
                setMunicipiosGmp(res.data);
              }
            } catch (e) {
              /* sem dados GMP para este contrato */
            }
          }
        }
      } catch (error) {
        console.error("[ContractDetail] Erro ao buscar detalhes:", error);
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [contratoId]);

  if (!contratoId) return null;

  // Merge CONTRATO + PRINCIPAL (ex: LOTE está em PRINCIPAL)
  const gc = { ...(gemocdocs?.contrato || {}), ...(gemocdocs?.principal || {}) };
  const gs = gemocdocs?.status;
  const statusPorCidade = (gemocdocs?.statusRows || []).filter(r => r.CIDADE);

  // Agrupa observacoes por cidade (se existirem)
  const cidadeMap = new Map();
  for (const row of statusPorCidade) {
    const cidade = row.CIDADE?.trim();
    if (cidade) {
      if (!cidadeMap.has(cidade)) cidadeMap.set(cidade, []);
      cidadeMap.get(cidade).push(row);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
        {/* Header */}
        <header className="shrink-0 px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-emerald-100/50 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/15 shrink-0">
              <FileText size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-0.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[160px] sm:max-w-none">
                  {loading
                    ? "Carregando..."
                    : `Contrato ${details?.cd_contrato || gc?.CONTRATO || ""}${gc?.LOTE ? ` — Lote ${gc.LOTE}` : ""}${details?.nu_bloco ? ` — Bloco ${details.nu_bloco}` : ""}`}
                </h2>
                {!loading && (details?.cd_contrato || gc?.CONTRATO) && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(details?.cd_contrato || gc?.CONTRATO, 'contrato'); }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200/50 transition-all duration-200"
                      title="Copiar número do contrato"
                    >
                      {copiedField === 'contrato' ? (
                        <><Check size={11} className="text-emerald-500" strokeWidth={2.5} /> Copiado!</>
                      ) : (
                        <><Copy size={11} strokeWidth={2} /> Copiar</>
                      )}
                    </button>
                    {gemocdocs?.principal?.NUMERO_SMO && (
                      <button
                        onClick={() => {
                          const url = `https://sider.goinfra.go.gov.br/ctosmo/abrirVisualizacaoContrato.do?nuTitulo=${gemocdocs.principal.NUMERO_SMO}&mostraSaldosMensais=false&sistemaOrigem=SMO&acaoSelecionar=`;
                          const w = 1000, h = 750;
                          const x = (screen.width - w) / 2;
                          const y = (screen.height - h) / 2;
                          window.open(url, 'SIDER', `width=${w},height=${h},left=${x},top=${y},menubar=no,toolbar=yes,location=yes,status=yes,resizable=yes`);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-blue-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200/50 transition-all duration-200"
                        title="Abrir no SIDER"
                      >
                        <ExternalLink size={11} strokeWidth={2} /> Visualizar SMO
                      </button>
                    )}
                  </>
                )}
                {!loading &&
                  (details?.situacao_atual || gs?.STATUS_CONTRATO) && (
                    <Badge
                      variant={
                        details?.situacao_atual === "Rescindido" ||
                        gs?.STATUS_CONTRATO === "Rescindido"
                          ? "danger"
                          : ["Finalizado", "Concluído", "TRP", "TRD"].includes(
                                details?.situacao_atual,
                              ) ||
                              [
                                "Finalizado",
                                "Concluído",
                                "TRP",
                                "TRD",
                              ].includes(gs?.STATUS_CONTRATO) ||
                              details?.situacao_atual
                                ?.toLowerCase()
                                .includes("concluída")
                            ? "neutral"
                            : "success"
                      }
                      size="sm"
                    >
                      {gs?.STATUS_CONTRATO || details?.situacao_atual}
                    </Badge>
                  )}
              </div>
              {!loading && (gc?.SEGMENTO || details?.segmento) && (
                <p className="text-xs font-semibold text-emerald-600 mt-0.5 mb-0.5 truncate max-w-[260px] sm:max-w-none">
                  {gc?.SEGMENTO || details?.segmento}
                </p>
              )}
              {!loading && gc?.PROCESSO_CONTRATO && (
                <p
                  onClick={() => handleCopy(cleanProc(gc.PROCESSO_CONTRATO), 'processo')}
                  className="text-xs font-medium text-slate-500 font-mono mt-0.5 mb-0.5 truncate max-w-[260px] sm:max-w-none cursor-pointer hover:text-emerald-600 transition-colors duration-200 flex items-center gap-1.5"
                  title="Clique para copiar o número do processo"
                >
                  <span className="text-slate-300 text-[10px] font-semibold uppercase tracking-wider shrink-0">
                    Processo:
                  </span>
                  <span className="truncate">{cleanProc(gc.PROCESSO_CONTRATO)}</span>
                  {copiedField === 'processo' ? (
                    <Check size={11} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
                  ) : (
                    <Copy size={11} className="text-slate-300 shrink-0" strokeWidth={2} />
                  )}
                </p>
              )}
              {!loading && (
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-400 truncate max-w-[200px] sm:max-w-none">
                    {details?.razao_social || gc?.EMPRESA || "—"}
                  </p>
                </div>
              )}
            </div>
          </div>
          {!loading && (details || gc) && (
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100/60 hover:bg-emerald-100 transition-all duration-200 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              title="Exportar detalhes do contrato em PDF"
            >
              {exportingPdf ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileDown size={13} />
              )}
              <span className="hidden sm:inline">
                {exportingPdf ? "Gerando..." : "PDF"}
              </span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-slate-400 hover:bg-emerald-100 hover:text-slate-600 transition-all duration-200 shrink-0"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
              <div className="w-10 h-10 rounded-full border-[3px] border-emerald-200 border-t-emerald-600 animate-spin" />
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-slate-500">Carregando...</p>
                <p className="text-xs text-slate-400">Buscando dados do contrato</p>
              </div>
            </div>
          ) : details || gc ? (
            <>
              {/* ─── Objeto do Contrato ──────────────────────────── */}
              {(details?.objeto || gc?.OBJETO) && (
                <Card className="p-4 border border-emerald-100/80 bg-white shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Objeto do Contrato</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {details?.objeto || gc?.OBJETO}
                  </p>
                </Card>
              )}

              {/* ─── Comparativo SMO vs GemocDocs ─────────────── */}
              {gc && (
                <CollapsibleCard
                  icon={GitCompare}
                  title="Comparativo de Fontes"
                  summary={gc?.EMPRESA || ""}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '100px' }} />
                        <col />
                        <col />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-emerald-100/30">
                          <th className="pb-2 pr-4 text-[10px] font-semibold text-slate-400 uppercase">
                            Campo
                          </th>
                          <th className="pb-2 pr-4 text-[10px] font-semibold text-indigo-500 uppercase">
                            GemocDocs
                          </th>
                          <th className="pb-2 text-[10px] font-semibold text-emerald-600 uppercase">
                            SMO
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100/20">
                        <tr>
                          <td className="py-2 pr-4 font-medium text-slate-500">
                            Empresa
                          </td>
                          <td className="py-2 pr-4 font-medium text-slate-900">
                            {gc?.EMPRESA || "—"}
                          </td>
                          <td className="py-2 font-medium text-slate-900">
                            {details?.razao_social || "—"}
                          </td>
                        </tr>
                        {/* CNPJ removido por LGPD */}
                        <tr>
                          <td className="py-2 pr-4 font-medium text-slate-500">
                            Valor Inicial
                          </td>
                          <td className="py-2 pr-4 font-semibold text-emerald-600">
                            {formatCurrency(gc?.VALOR_INICIAL_DO_CONTRATO)}
                          </td>
                          <td className="py-2 font-semibold text-slate-900">
                            {formatCurrency(details?.vl_contrato)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-medium text-slate-500 align-top">
                            Objeto
                          </td>
                          <td className="py-2 pr-4 align-top" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                            <ExpandableText
                              text={gc?.OBJETO}
                              maxLines={2}
                              className="text-slate-900 text-xs"
                            />
                          </td>
                          <td className="py-2 align-top" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                            <ExpandableText
                              text={details?.objeto}
                              maxLines={2}
                              className="text-slate-900 text-xs"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-medium text-slate-500">
                            Início Vigência
                          </td>
                          <td className="py-2 pr-4 text-slate-900">
                            {formatDate(
                              gc?.INICIO__VIGENCIA_SMO ||
                                gc?.INICIO__VIGENCIA_PNCP,
                            )}
                          </td>
                          <td className="py-2 text-slate-900">
                            {formatDate(details?.dt_vigencia_inicio)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-medium text-slate-500">
                            Fim Vigência
                          </td>
                          <td className="py-2 pr-4 text-slate-900">
                            {formatDate(
                              gc?.FIM__VIGENCIA_SMO || gc?.FIM__VIGENCIA_PNCP,
                            )}
                          </td>
                          <td className="py-2 text-slate-900">
                            {formatDate(details?.dt_vigencia_fim)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-medium text-slate-500">
                            Início Execução
                          </td>
                          <td className="py-2 pr-4 text-slate-900">
                            {formatDate(gc?.INICIO__EXECUCAO_SMO)}
                          </td>
                          <td className="py-2 text-slate-900">
                            {formatDate(details?.dt_execucao_inicio)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-medium text-slate-500">
                            Fim Execução
                          </td>
                          <td className="py-2 pr-4 text-slate-900">
                            {formatDate(gc?.FIM__EXECUCAO_SMO)}
                          </td>
                          <td className="py-2 text-slate-900">
                            {formatDate(details?.dt_execucao_fim)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CollapsibleCard>
              )}

              {/* ─── Financial Overview ────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card padding="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign
                      size={15}
                      className="text-emerald-600 shrink-0"
                      strokeWidth={2}
                    />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Investimento Total
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight break-words">
                    {formatCurrency(
                      details?.vl_total || gc?.VALOR_INICIAL_DO_CONTRATO,
                    )}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span className="text-[10px] font-medium text-slate-400">
                      Valor atualizado
                    </span>
                  </div>
                </Card>

                <Card padding="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock
                      size={15}
                      className="text-amber-500 shrink-0"
                      strokeWidth={2}
                    />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Prazo Restante
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    {formatDays(details?.dias_restantes)}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${details?.dias_restantes !== null && details?.dias_restantes !== undefined && details?.dias_restantes <= 60 ? "bg-amber-500" : "bg-emerald-400"}`}
                    />
                    <span className="text-[10px] font-medium text-slate-400 truncate">
                      Vigência: {formatDate(details?.dt_vigencia_fim)}
                    </span>
                  </div>
                </Card>

                <Card padding="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock
                      size={15}
                      className="text-sky-500 shrink-0"
                      strokeWidth={2}
                    />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Períodos
                    </span>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Publicação:</span>
                      <span className="font-semibold text-slate-800 text-right truncate">
                        {formatDate(gc?.PUBLICACAO_PNCP || gc?.PUBLICACAO_DOE || details?.dt_vigencia_inicio) || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 shrink-0">OS:</span>
                      <span className="font-semibold text-sky-600 text-right truncate">
                        {formatDate(details?.dt_os_inicio) || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Vigência:</span>
                      <span className="font-semibold text-slate-800 text-right truncate">
                        {formatDate(details?.dt_vigencia_inicio || gc?.INICIO__VIGENCIA_SMO || gc?.INICIO__VIGENCIA_PNCP) || '—'}
                        {" → "}
                        {formatDate(details?.dt_vigencia_fim || gc?.FIM__VIGENCIA_SMO || gc?.FIM__VIGENCIA_PNCP) || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Execução:</span>
                      <span className="font-semibold text-slate-800 text-right truncate">
                        {formatDate(details?.dt_execucao_inicio || gs?.INICIO_EXECUCAO_DO_CONTRATO) || '—'}
                        {" → "}
                        {formatDate(details?.dt_execucao_fim || gs?.FIM_EXECUCAO_DO_CONTRATO) || '—'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ─── Observações ────────────────────────────────────── */}
              {gs?.OBSERVACOES && (
                <div className="mb-4">
                  <Card className="p-4 border border-slate-100/80 bg-amber-50/30 shadow-sm">
                    <div className="flex items-start gap-3">
                      <FileText size={16} className="text-slate-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div className="min-w-0">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Observações
                        </span>
                        <p className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {gs.OBSERVACOES}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* ─── Municipios GMP ────────────────────────────────── */}
              {municipiosGmp && municipiosGmp.length > 0 && (
                <div className="mb-4">
                  <Card className="p-4 border border-slate-100/80 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 size={14} className="text-slate-500 shrink-0" strokeWidth={1.5} />
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        Municipios GMP
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {municipiosGmp.filter(m => m.STATUS === 'EM ANDAMENTO').length} andamento · {municipiosGmp.filter(m => m.STATUS === 'PARALISADO').length} paralisados
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                      {municipiosGmp.map((m, idx) => (
                        <div
                          key={idx}
                          className={'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] ' + (
                            m.STATUS === 'EM ANDAMENTO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50'
                              : m.STATUS === 'PARALISADO'
                                ? 'bg-red-50 text-red-700 border border-red-100/50'
                                : 'bg-slate-50 text-slate-600 border border-slate-100/50'
                          )}
                        >
                          <span className={'w-1.5 h-1.5 rounded-full shrink-0 ' + (
                            m.STATUS === 'EM ANDAMENTO'
                              ? 'bg-emerald-500'
                              : m.STATUS === 'PARALISADO'
                                ? 'bg-red-500'
                                : 'bg-slate-400'
                          )} />
                          <span className="truncate">{m.MUNICIPIO}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* ─── Dashboard de Planejamento e Controle ─────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Card: Progresso Financeiro */}
                <div className="sm:col-span-2 p-4 rounded-xl border border-emerald-100/50 bg-white shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp
                      size={14}
                      className="text-emerald-600 shrink-0"
                      strokeWidth={2}
                    />
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                      Avanço Financeiro
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                    <span className="text-xl sm:text-2xl font-bold text-slate-900">
                      {formatPercent(details?.perc_pago)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      medido de{" "}
                      <strong className="text-slate-600">
                        {formatCurrency(details?.vl_total)}
                      </strong>
                    </span>
                  </div>
                  <ProgressBar progress={details?.perc_pago} />
                  <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 gap-2 flex-wrap">
                    <span className="truncate">Medido: {formatCurrency(details?.vl_total_medido)}</span>
                    <span className="truncate">
                      Saldo: {formatCurrency((details?.vl_total || 0) - (details?.vl_total_medido || 0))}
                    </span>
                  </div>
                </div>

                {/* Card: Linha do Tempo */}
                <div className="sm:col-span-2 p-4 rounded-xl border border-emerald-100/50 bg-white shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock
                      size={14}
                      className="text-amber-500 shrink-0"
                      strokeWidth={2}
                    />
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                      Linha do Tempo
                    </span>
                  </div>
                  {details?.dt_os_inicio && (
                    <div className="flex items-center gap-1.5 mb-2 text-[11px]">
                      <span className="text-slate-400 shrink-0">OS Início:</span>
                      <span className="font-semibold text-sky-600 truncate">
                        {formatDate(details.dt_os_inicio)}
                      </span>
                    </div>
                  )}

                  {/* ── Vigência ── */}
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Vigência
                  </div>
                  <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                    <span className="font-medium text-slate-600 truncate">
                      {formatDate(details?.dt_vigencia_inicio)}
                    </span>
                    <span className="text-slate-400 shrink-0">→</span>
                    <span className="font-medium text-slate-600 truncate">
                      {formatDate(details?.dt_vigencia_fim)}
                    </span>
                  </div>
                  {(() => {
                    const inicio = new Date(
                      details?.dt_vigencia_inicio,
                    ).getTime();
                    const fim = new Date(details?.dt_vigencia_fim).getTime();
                    const hoje = Date.now();
                    const total = fim - inicio;
                    const decorrido = hoje - inicio;
                    const pct =
                      total > 0
                        ? Math.min(Math.max((decorrido / total) * 100, 0), 100)
                        : 0;
                    const diasRestantes = details?.dias_restantes;
                    return (
                      <div className="mb-2">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background:
                                diasRestantes !== null &&
                                diasRestantes !== undefined &&
                                diasRestantes <= 60
                                  ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                                  : "linear-gradient(90deg, #10b981, #059669)",
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5 text-[9px] text-slate-400">
                          <span>{Math.round(pct)}% decorrido</span>
                          <span
                            className={
                              diasRestantes !== null &&
                              diasRestantes !== undefined &&
                              diasRestantes <= 60
                                ? "text-amber-600 font-semibold"
                                : ""
                            }
                          >
                            {diasRestantes !== null &&
                            diasRestantes !== undefined
                              ? diasRestantes > 0
                                ? `${diasRestantes} dias restantes`
                                : "Vencido"
                              : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Execução ── */}
                  {details?.dt_execucao_inicio && (() => {
                    const eInicio = new Date(details.dt_execucao_inicio).getTime();
                    const eFim = details?.dt_execucao_fim
                      ? new Date(details.dt_execucao_fim).getTime()
                      : null;
                    const hoje = Date.now();
                    const eTotal = eFim ? eFim - eInicio : 0;
                    const eDecorrido = eFim ? hoje - eInicio : 0;
                    const ePct = eTotal > 0
                      ? Math.min(Math.max((eDecorrido / eTotal) * 100, 0), 100)
                      : 0;
                    const eDiasRestantes = eFim
                      ? Math.max(0, Math.round((eFim - hoje) / 86400000))
                      : null;
                    return (
                      <>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 mt-3">
                          Execução
                        </div>
                        <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                          <span className="font-medium text-slate-600 truncate">
                            {formatDate(details.dt_execucao_inicio)}
                          </span>
                          <span className="text-slate-400 shrink-0">→</span>
                          <span className="font-medium text-slate-600 truncate">
                            {formatDate(details?.dt_execucao_fim) || "—"}
                          </span>
                        </div>
                        {eFim && (
                          <>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${ePct}%`,
                                  background:
                                    eDiasRestantes !== null && eDiasRestantes <= 60
                                      ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                                      : "linear-gradient(90deg, #06b6d4, #0891b2)",
                                }}
                              />
                            </div>
                            <div className="flex justify-between mt-0.5 text-[9px] text-slate-400">
                              <span>{Math.round(ePct)}% decorrido</span>
                              <span
                                className={
                                  eDiasRestantes !== null && eDiasRestantes <= 60
                                    ? "text-amber-600 font-semibold"
                                    : ""
                                }
                              >
                                {eDiasRestantes !== null
                                  ? eDiasRestantes > 0
                                    ? `${eDiasRestantes} dias restantes`
                                    : "Vencido"
                                  : "—"}
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Card: Status por Cidade (Bloco 5) */}
                {cidadeMap.size > 0 && (
                  <div className="sm:col-span-2 lg:col-span-4 p-4 rounded-xl border border-emerald-100/50 bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2
                        size={14}
                        className="text-slate-400 shrink-0"
                        strokeWidth={2}
                      />
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        Status por Cidade
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100">
                            <th className="py-1.5 pr-3 font-semibold">Cidade</th>
                            <th className="py-1.5 pr-3 font-semibold">Status</th>
                            <th className="py-1.5 font-semibold">TRP/TRD</th>
                            <th className="py-1.5 pl-3 font-semibold">Observações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...cidadeMap.entries()].map(([cidade, rows]) => {
                            const row = rows[0];
                            const trpTrdData = row.TRP_DATA || row.TRD_DATA || null;
                            const trpTrdLabel = row.TRP_SEI ? 'TRP' : row.TRD_SEI ? 'TRD' : null;
                            return (
                              <tr key={cidade} className="border-b border-slate-50 last:border-0">
                                <td className="py-1.5 pr-3 font-medium text-slate-700">{cidade}</td>
                                <td className="py-1.5 pr-3">
                                  <Badge
                                    variant={
                                      row.STATUS_CONTRATO === "Ativo"
                                        ? "success"
                                        : row.STATUS_CONTRATO === "Paralisado"
                                          ? "warning"
                                          : ["Finalizado", "Concluído", "Rescindido", "TRP", "TRD"].includes(row.STATUS_CONTRATO)
                                            ? "neutral"
                                            : "success"
                                    }
                                    size="sm"
                                  >
                                    {row.STATUS_CONTRATO || "—"}
                                  </Badge>
                                </td>
                                <td className="py-1.5 text-slate-600">
                                  {trpTrdData ? (
                                    <span className="inline-flex items-center gap-1">
                                      {trpTrdLabel && (
                                        <span className="text-[9px] font-semibold text-slate-400 uppercase">{trpTrdLabel}</span>
                                      )}
                                      <span className="font-medium">{formatDate(trpTrdData) || trpTrdData}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="py-1.5 pl-3 text-slate-500 max-w-[200px] truncate" title={row.OBSERVACOES || ''}>
                                  {row.OBSERVACOES || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Card: Status Consolidado */}
                {gs && (
                  <div className="sm:col-span-2 p-4 rounded-xl border border-emerald-100/50 bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2
                        size={14}
                        className="text-slate-400 shrink-0"
                        strokeWidth={2}
                      />
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        Status Consolidado
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={
                          cleanNumberSuffix(gs?.STATUS_VIGENCIA) === "Vigente"
                            ? "success"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {cleanNumberSuffix(gs?.STATUS_VIGENCIA) || "—"}
                      </Badge>
                      <Badge
                        variant={
                          cleanNumberSuffix(gs?.STATUS_EXECUCAO) ===
                          "Em Execução"
                            ? "success"
                            : "warning"
                        }
                        size="sm"
                      >
                        {cleanNumberSuffix(gs?.STATUS_EXECUCAO) || "—"}
                      </Badge>
                      <Badge
                        variant={
                          gs?.STATUS_CONTRATO === "Ativo"
                            ? "success"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {gs?.STATUS_CONTRATO || "—"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {gemocdocs?.gestorNome && (
                        <div>
                          <span className="text-slate-400">Gestor:</span>
                          <span className="font-medium text-slate-700 ml-1">
                            {gemocdocs.gestorNome}
                          </span>
                        </div>
                      )}
                      {gemocdocs?.fiscalNome && (
                        <div>
                          <span className="text-slate-400">Fiscal:</span>
                          <span className="font-medium text-slate-700 ml-1">
                            {gemocdocs.fiscalNome}
                          </span>
                        </div>
                      )}
                      {gs?.DIAS_PARALISADOS &&
                        cleanNumberSuffix(gs?.DIAS_PARALISADOS) !== "0" && (
                          <div className="sm:col-span-2">
                            <span className="text-red-400 font-semibold">
                              ⏸ {cleanNumberSuffix(gs.DIAS_PARALISADOS)} dias
                              paralisados
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Card: Alertas e Indicadores */}
                <div className="sm:col-span-2 p-4 rounded-xl border border-emerald-100/50 bg-white shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle
                      size={14}
                      className="text-amber-500 shrink-0"
                      strokeWidth={2}
                    />
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                      Alertas
                    </span>
                  </div>
                  {(() => {
                    const alerts = [];
                    if (
                      details?.dias_restantes !== null &&
                      details?.dias_restantes !== undefined &&
                      details?.dias_restantes <= 60 &&
                      details?.dias_restantes > 0
                    )
                      alerts.push({
                        type: "warning",
                        text: `Contrato vence em ${details.dias_restantes} dias`,
                      });
                    if (
                      details?.dias_restantes !== null &&
                      details?.dias_restantes !== undefined &&
                      details?.dias_restantes <= 0
                    )
                      alerts.push({ type: "danger", text: "Contrato vencido" });
                    if (details?.vl_divida > 0)
                      alerts.push({
                        type: "danger",
                        text: `Dívida de ${formatCurrency(details.vl_divida)}`,
                      });
                    if (
                      gs?.VALOR_DA_ULTIMA_MEDICAO &&
                      details?.medicoes?.length > 0
                    ) {
                      const lastVal = parseFloat(
                        gs.VALOR_DA_ULTIMA_MEDICAO || 0,
                      );
                      const lastMed = details.medicoes[0];
                      const smoVal =
                        parseFloat(lastMed?.vl_pi || 0) +
                        parseFloat(lastMed?.vl_ra || 0);
                      if (Math.abs(smoVal - lastVal) > 0.01)
                        alerts.push({
                          type: "warning",
                          text: "Divergência na última medição SMO vs GemocDocs",
                        });
                    }
                    if (
                      gs?.DIAS_PARALISADOS &&
                      cleanNumberSuffix(gs?.DIAS_PARALISADOS) !== "0"
                    )
                      alerts.push({
                        type: "warning",
                        text: `${cleanNumberSuffix(gs.DIAS_PARALISADOS)} dias paralisados`,
                      });
                    if (alerts.length === 0)
                      alerts.push({
                        type: "ok",
                        text: "Nenhum alerta identificado",
                      });
                    return (
                      <div className="space-y-1.5">
                        {alerts.map((a, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${
                              a.type === "danger"
                                ? "bg-red-50 text-red-700"
                                : a.type === "warning"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                a.type === "danger"
                                  ? "bg-red-500"
                                  : a.type === "warning"
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              }`}
                            />
                            {a.text}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ─── Valores de Contrato (SMO) ──────────────────── */}
              <CollapsibleCard
                icon={PieChart}
                title="Valores de Contrato"
                summary={formatCurrency(details?.vl_total)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-emerald-50/30 rounded-lg border border-emerald-100/30">
                    <span className="text-xs font-semibold text-slate-500">
                      (A) Contrato
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(details?.vl_contrato)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-blue-50/30 rounded-lg border border-blue-100/30">
                    <span className="text-xs font-semibold text-slate-500">
                      (B) Aditivo
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(details?.vl_aditivo)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-purple-50/30 rounded-lg border border-purple-100/30">
                    <span className="text-xs font-semibold text-slate-500">
                      (C) Apostila
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(details?.vl_apostila)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 px-3 bg-emerald-600/10 rounded-lg border border-emerald-600/30">
                    <span className="text-xs font-bold text-slate-600">
                      (D) Total (A+B+C)
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency(details?.vl_total)}
                    </span>
                  </div>
                </div>
              </CollapsibleCard>

              {/* ─── Valores de Medição (SMO) ────────────────────── */}
              <CollapsibleCard
                icon={BarChart3}
                title="Valores de Medição"
                summary={formatCurrency(details?.vl_total_medido)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-amber-50/30 rounded-lg border border-amber-100/30">
                    <span className="text-xs font-semibold text-slate-500">
                      (E) Medição a PI
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(details?.vl_medicao_pi)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-rose-50/30 rounded-lg border border-rose-100/30">
                    <span className="text-xs font-semibold text-slate-500">
                      (F) Reajuste
                    </span>
                    <span
                      className={`text-sm font-bold ${details?.vl_reajuste < 0 ? "text-rose-600" : "text-slate-900"}`}
                    >
                      {formatCurrency(details?.vl_reajuste)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-emerald-50/30 rounded-lg border border-emerald-100/30">
                    <span className="text-xs font-semibold text-slate-500">
                      (G) Total medido (E+F)
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatCurrency(details?.vl_total_medido)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-sky-50/30 rounded-lg border border-sky-100/30">
                    <span className="text-xs font-semibold text-slate-500">
                      (H) Saldo a medir (A+B-E)
                    </span>
                    <span className="text-sm font-bold text-sky-700">
                      {formatCurrency(details?.vl_saldo_medir)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-indigo-50/30 rounded-lg border border-indigo-100/30">
                    <span className="text-xs font-semibold text-slate-500">
                      (I) Saldo de apostila (C-F)
                    </span>
                    <span className="text-sm font-bold text-indigo-700">
                      {formatCurrency(details?.vl_saldo_apostila)}
                    </span>
                  </div>
                </div>
              </CollapsibleCard>

              {/* ─── Status da GemocDocs ───────────────────────── */}
              {gs && (
                <CollapsibleCard
                  icon={Building2}
                  title="Status"
                  summary={
                    cleanNumberSuffix(gs?.STATUS_VIGENCIA) +
                    " · " +
                    cleanNumberSuffix(gs?.STATUS_EXECUCAO) +
                    " · " +
                    (gs?.STATUS_CONTRATO || "")
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                        Situação Vigência
                      </span>
                      <Badge
                        variant={
                          cleanNumberSuffix(gs?.STATUS_VIGENCIA) === "Vigente"
                            ? "success"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {cleanNumberSuffix(gs?.STATUS_VIGENCIA) || "—"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                        Situação Execução
                      </span>
                      <Badge
                        variant={
                          cleanNumberSuffix(gs?.STATUS_EXECUCAO) ===
                          "Em Execução"
                            ? "success"
                            : "warning"
                        }
                        size="sm"
                      >
                        {cleanNumberSuffix(gs?.STATUS_EXECUCAO) || "—"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                        Situação Contrato
                      </span>
                      <Badge
                        variant={
                          gs?.STATUS_CONTRATO === "Ativo"
                            ? "success"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {gs?.STATUS_CONTRATO || "—"}
                      </Badge>
                    </div>
                    {gs?.DIAS_PARALISADOS &&
                      cleanNumberSuffix(gs?.DIAS_PARALISADOS) !== "0" && (
                        <div className="sm:col-span-3">
                          <span className="text-[10px] font-semibold text-red-400 uppercase block mb-1">
                            Dias Paralisados
                          </span>
                          <span className="font-semibold text-red-500">
                            {cleanNumberSuffix(gs.DIAS_PARALISADOS)} dias
                          </span>
                        </div>
                      )}
                  </div>
                </CollapsibleCard>
              )}

              {/* ─── Informações do Contrato (SMO vs GemocDocs) ── */}
              <CollapsibleCard
                icon={Building2}
                title="Gestão do Contrato"
                summary={
                  [gemocdocs?.gestorNome, gemocdocs?.fiscalNome]
                    .filter(Boolean)
                    .join(" | ") || ""
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {gemocdocs?.gestorNome && (
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                        Gestor
                      </span>
                      <span className="font-bold text-emerald-600 block text-sm break-words">
                        {gemocdocs.gestorNome}
                      </span>
                    </div>
                  )}
                  {gemocdocs?.fiscalNome && (
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                        Fiscal Técnico
                      </span>
                      <span className="font-bold text-emerald-600 block text-sm break-words">
                        {gemocdocs.fiscalNome}
                      </span>
                    </div>
                  )}

                  {/* ─── Histórico de Gestores (accordion) ─────────── */}
                  {gemocdocs?.gestores?.length > 0 && (
                    <div className="sm:col-span-2 border-t border-emerald-100/30 pt-3 mt-1">
                      <HistoricGestoresAccordion
                        gestores={gemocdocs.gestores}
                      />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                      Total Pago (SMO)
                    </span>
                    <span className="font-semibold text-emerald-600 break-words">
                      {formatCurrency(details?.vl_total_pago)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                      Total Empenhado (SMO)
                    </span>
                    <span className="font-semibold text-amber-600 break-words">
                      {formatCurrency(details?.vl_total_empenhado)}
                    </span>
                  </div>
                  <div className="sm:col-span-2 border-t border-emerald-100/30 pt-3 mt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-2">
                      Detalhes Adicionais
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {gc?.DOCUMENTO_SEI_CONTRATO && (
                        <div>
                          <span className="text-slate-400">Doc. SEI:</span>
                          <span className="font-medium text-slate-700 ml-1">
                            {gc.DOCUMENTO_SEI_CONTRATO}
                          </span>
                        </div>
                      )}
                      {gc?.SEGMENTO && (
                        <div>
                          <span className="text-slate-400">Segmento:</span>
                          <span className="font-medium text-slate-700 ml-1">
                            {gc.SEGMENTO}
                          </span>
                        </div>
                      )}
                      {gc?.GERENCIA && (
                        <div>
                          <span className="text-slate-400">Gerência:</span>
                          <span className="font-medium text-slate-700 ml-1">
                            {gc.GERENCIA}
                          </span>
                        </div>
                      )}
                      {gc?.LOTE && (
                        <div>
                          <span className="text-slate-400">Lote:</span>
                          <span className="font-medium text-slate-700 ml-1">
                            {gc.LOTE}
                          </span>
                        </div>
                      )}
                      {gc?.VALOR_INICIAL_DO_CONTRATO && (
                        <div>
                          <span className="text-slate-400">Valor Inicial:</span>
                          <span className="font-medium text-slate-700 ml-1 break-words">
                            {formatCurrency(gc.VALOR_INICIAL_DO_CONTRATO)}
                          </span>
                        </div>
                      )}
                      {details?.dt_os_inicio && (
                        <div>
                          <span className="text-slate-400">OS Início:</span>
                          <span className="font-medium text-sky-600 ml-1">
                            {formatDate(details.dt_os_inicio)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleCard>

              {/* ─── Comparativo de Medições ───────────────────── */}
              {gs?.VALOR_DA_ULTIMA_MEDICAO && details?.medicoes?.length > 0 && (
                <CollapsibleCard
                  icon={GitCompare}
                  title="Comparativo de Medições"
                  summary={(() => {
                    try {
                      const t = details.medicoes.reduce(
                        (a, m) =>
                          a +
                          parseFloat(m.vl_pi || 0) +
                          parseFloat(m.vl_ra || 0),
                        0,
                      );
                      const g = parseFloat(gs.VALOR_DA_ULTIMA_MEDICAO || 0);
                      return formatCurrency(t) + " vs " + formatCurrency(g);
                    } catch (e) {
                      return "";
                    }
                  })()}
                >
                  <div className="text-xs space-y-1.5">
                    {/* SMO total measured */}
                    {(() => {
                      const totalSmo = details.medicoes.reduce(
                        (acc, m) =>
                          acc +
                          parseFloat(m.vl_pi || 0) +
                          parseFloat(m.vl_ra || 0),
                        0,
                      );
                      const totalSmoFmt = formatCurrency(totalSmo);
                      const gemocLastVal = parseFloat(
                        gs.VALOR_DA_ULTIMA_MEDICAO || 0,
                      );
                      const gemocLastValFmt = formatCurrency(gemocLastVal);
                      const lastMedSmo = details.medicoes[0];
                      const lastValSmo =
                        parseFloat(lastMedSmo?.vl_pi || 0) +
                        parseFloat(lastMedSmo?.vl_ra || 0);
                      const lastValSmoFmt = formatCurrency(lastValSmo);
                      const diff = Math.abs(lastValSmo - gemocLastVal) > 0.01;

                      return (
                        <>
                          <div className="flex items-center justify-between gap-2 py-1.5 px-3 bg-white rounded-lg border border-amber-100/50">
                            <span className="font-medium text-slate-500 shrink-0">
                              Total Medido (SMO)
                            </span>
                            <span className="font-bold text-slate-900 text-right break-words">
                              {totalSmoFmt}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 py-1.5 px-3 bg-white rounded-lg border border-amber-100/50">
                            <span className="font-medium text-slate-500 shrink-0">
                              Última Medição (SMO)
                            </span>
                            <span className="font-bold text-slate-900 text-right break-words">
                              {lastValSmoFmt}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 py-1.5 px-3 bg-white rounded-lg border border-amber-100/50">
                            <span className="font-medium text-slate-500 shrink-0">
                              Última Medição (GemocDocs)
                            </span>
                            <span className="font-bold text-slate-900 text-right break-words">
                              {gemocLastValFmt}
                            </span>
                          </div>
                          {diff && (
                            <div className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-red-50 border border-red-200/60">
                              <AlertTriangle
                                size={13}
                                className="text-red-500 shrink-0"
                                strokeWidth={2}
                              />
                              <span className="text-red-600 font-medium break-words">
                                Diferença detectada: SMO {lastValSmoFmt} vs
                                GemocDocs {gemocLastValFmt}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </CollapsibleCard>
              )}

              {/* ─── Anexos (Documentos) ──────────────────────────── */}
              {contratoId && (
                <AnexosSection contratoId={contratoId} />
              )}

              {/* ─── Aditivos / Apostilas ──────────────────────── */}
              {gemocdocs?.aditivos?.length > 0 && (
                <CollapsibleCard
                  icon={FileEdit}
                  title="Aditivos & Apostilas"
                  summary={gemocdocs.aditivos.length + " registros"}
                >
                  <div className="divide-y divide-emerald-100/20">
                    {gemocdocs.aditivos
                      .slice(
                        (aditivosPage - 1) * itemsPerPage,
                        aditivosPage * itemsPerPage,
                      )
                      .map((a, idx) => {
                        const isPrazo =
                          (a.TIPO_DO_ADITIVO || "")
                            .toLowerCase()
                            .includes("prazo") ||
                          (a.TIPO_DO_ADITIVO || "")
                            .toLowerCase()
                            .includes("prorroga");
                        const isValor =
                          a.VALOR_DO_ADITIVO &&
                          parseFloat(a.VALOR_DO_ADITIVO) !== 0;
                        return (
                          <div
                            key={idx}
                            className="px-4 sm:px-5 py-3 hover:bg-emerald-50/20 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-800">
                                  {a.N_DO_ADITIVO ||
                                    `Aditivo ${idx + 1 + (aditivosPage - 1) * itemsPerPage}`}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                                    isPrazo
                                      ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                      : isValor
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        : 'bg-slate-50 text-slate-500 border border-slate-100'
                                  }`}
                                >
                                  {a.TIPO_DO_ADITIVO || "—"}
                                </span>
                              </div>
                              {a.DATA_DA_ASSINATURA && (
                                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                  {formatDate(a.DATA_DA_ASSINATURA)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                              {a.DATA_DE_VIGENCIA && (
                                <span
                                  className={`inline-flex items-center gap-1 ${isPrazo ? "text-blue-600 font-medium" : ""}`}
                                >
                                  <Clock size={11} strokeWidth={2} />
                                  Vigência: {formatDate(a.DATA_DE_VIGENCIA)}
                                </span>
                              )}
                              {a.VALOR_DO_ADITIVO &&
                                parseFloat(a.VALOR_DO_ADITIVO) !== 0 && (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                    <DollarSign size={11} strokeWidth={2} />
                                    {formatCurrency(a.VALOR_DO_ADITIVO)}
                                  </span>
                                )}
                              {a.ACRESCIMO_R &&
                                parseFloat(a.ACRESCIMO_R) !== 0 && (
                                  <span className="text-emerald-600">
                                    +{formatCurrency(a.ACRESCIMO_R)}
                                  </span>
                                )}
                              {a.SUPRESSAO_R &&
                                parseFloat(a.SUPRESSAO_R) !== 0 && (
                                  <span className="text-red-500">
                                    -{formatCurrency(a.SUPRESSAO_R)}
                                  </span>
                                )}
                            </div>
                            {a.OBSERVACOES && (
                              <p className="text-[10px] text-slate-400 mt-1 italic">
                                {a.OBSERVACOES}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  <Pagination
                    page={aditivosPage}
                    totalPages={Math.ceil(
                      gemocdocs.aditivos.length / itemsPerPage,
                    )}
                    onChange={setAditivosPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </CollapsibleCard>
              )}

              {/* ─── Ordens de Serviço ──────────────────────── */}
              {gemocdocs?.ordensServico?.length > 0 && (
                <CollapsibleCard
                  icon={FileText}
                  title="Ordens de Serviço"
                  summary={gemocdocs.ordensServico.length + " registros"}
                >
                  <div className="divide-y divide-emerald-100/20">
                    {gemocdocs.ordensServico.map((os, idx) => (
                      <div
                        key={idx}
                        className="px-4 sm:px-5 py-3 hover:bg-emerald-50/20 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-[9px] font-semibold">
                              {os.TIPO_DE_OS || 'OS'}
                            </span>
                            <span className="text-[11px] sm:text-sm font-semibold text-slate-800">
                              {os.DATA_OS ? formatDate(os.DATA_OS) : '—'}
                            </span>
                          </div>
                          {os.OBJETO && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[180px] ml-2">
                              {os.OBJETO}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleCard>
              )}

              {/* ─── Measurements History ──────────────────────── */}
              <CollapsibleCard
                icon={History}
                title="Histórico de Medições"
                summary={(details?.medicoes?.length || 0) + " registros — Total: " + formatCurrency(details?.medicoes?.reduce((acc, m) => acc + parseFloat(m.vl_pi || 0) + parseFloat(m.vl_ra || 0), 0) || 0)}
              >
                {details?.medicoes?.length > 0 ? (
                  <div className="divide-y divide-emerald-100/20">
                    {details.medicoes
                      .slice(
                        (medicoesPage - 1) * itemsPerPage,
                        medicoesPage * itemsPerPage,
                      )
                      .map((m, idx) => {
                        const pi = parseFloat(m.vl_pi || 0);
                        const ra = parseFloat(m.vl_ra || 0);
                        return (
                          <div
                            key={idx}
                            className="px-4 sm:px-5 py-4 hover:bg-emerald-50/20 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs font-bold text-slate-800">
                                  {m.descricao}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Medido: {formatDate(m.dt_medicao)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {m.dt_periodo_inicio && m.dt_periodo_fim ? `Periodo: De ${formatDate(m.dt_periodo_inicio)} até ${formatDate(m.dt_periodo_fim)}` : ''}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100/50 text-[11px]">
                                <span className="font-semibold text-emerald-600">
                                  PI
                                </span>
                                <span className="font-bold text-slate-800">
                                  {formatCurrency(pi)}
                                </span>
                              </span>
                              {ra > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-100/50 text-[11px]">
                                  <span className="font-semibold text-amber-600">
                                    RA
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {formatCurrency(ra)}
                                  </span>
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 ml-auto">
                                Total:{" "}
                                <span className="font-semibold text-emerald-600">
                                  {formatCurrency(pi + ra)}
                                </span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p className="text-xs font-medium text-slate-400">
                      Nenhuma medição registrada
                    </p>
                  </div>
                )}
                  <Pagination
                    page={medicoesPage}
                    totalPages={Math.ceil(
                      (details?.medicoes?.length || 0) / itemsPerPage,
                    )}
                    onChange={setMedicoesPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
              </CollapsibleCard>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText
                size={40}
                className="text-emerald-200 mb-3"
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium text-slate-400">
                Contrato não encontrado
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Os dados podem não estar disponíveis
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
};

// ─── Anexos Section ─────────────────────────────────────
function AnexosSection({ contratoId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const anexosOrigin = API_URL.replace(/\/api$/, '');

  useEffect(() => {
    if (!contratoId) return;
    setLoading(true);
    apiService.getDocumentosPorContrato(contratoId)
      .then(data => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [contratoId]);

  if (loading) return (
    <CollapsibleCard icon={File} title="Anexos" summary="Carregando...">
      <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin text-emerald-600" /></div>
    </CollapsibleCard>
  );

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'Z');
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <CollapsibleCard icon={File} title="Anexos" summary={docs.length > 0 ? `${docs.length} arquivo(s)` : 'Sem anexos'}>
      {docs.length === 0 ? (
        <div className="py-6 text-center">
          <File size={32} className="mx-auto text-slate-200 mb-2" strokeWidth={1.5} />
          <p className="text-xs text-slate-400">Nenhum anexo para este contrato</p>
        </div>
      ) : (
        <div className="space-y-1">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">{doc.nome_original}</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar size={9} /> {formatDate(doc.created_at)}
                  {doc.tamanho_formatado && <><span>·</span><span>{doc.tamanho_formatado}</span></>}
                </p>
              </div>
              <a href={anexosOrigin + doc.download_url} target="_blank" rel="noopener"
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-0 group-hover:opacity-100" title="Download">
                <Download size={14} />
              </a>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}

export default ContractDetail;
