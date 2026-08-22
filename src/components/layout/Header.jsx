import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Menu,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  DollarSign,
  Building2,
  Layers,
  LogOut,
  User,
  X
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuthStore } from '../../stores/auth.store';
import { formatCurrency, formatDate } from '../../utils/formatters';
import * as apiService from '../../services/api.service';
import ContractDetail from '../contract/ContractDetail';

// ─── Header Principal ─────────────────────────────────────────
const Header = ({ onMenuToggle = () => {}, contratoAlvo }) => {
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [showFullDrawer, setShowFullDrawer] = useState(false);
  const [details, setDetails] = useState(null);
  const [gemocdocs, setGemocdocs] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const contratoCode = contratoAlvo?.cd || '61/2023';

  useEffect(() => {
    let isMounted = true;
    const fetchContractData = async () => {
      try {
        const [detRes, principalRes] = await Promise.allSettled([
          apiService.getContratoDetails(contratoCode),
          apiService.getGemocdocsByContrato('PRINCIPAL', contratoCode),
        ]);
        if (isMounted) {
          if (detRes.status === 'fulfilled') setDetails(detRes.value);
          const principal = principalRes.status === 'fulfilled' && Array.isArray(principalRes.value?.data)
            ? principalRes.value.data[0]
            : null;
          setGemocdocs({ principal });
        }
      } catch (err) {
        console.error('[Header] Erro ao carregar dados do contrato:', err);
      }
    };
    fetchContractData();
    return () => { isMounted = false; };
  }, [contratoCode]);

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {}
  }, []);

  // Dados calculados
  const dtInicio = details?.dt_vigencia_inicio || '2023-06-13';
  const dtFim = details?.dt_vigencia_fim || '2027-05-23';
  const totalDays = Math.max(1, Math.round((new Date(dtFim) - new Date(dtInicio)) / 86400000));
  const elapsedDays = Math.max(0, Math.round((new Date() - new Date(dtInicio)) / 86400000));
  const remainingDays = Math.max(0, Math.round((new Date(dtFim) - new Date()) / 86400000));
  const percTime = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  const valorTotal = parseFloat(details?.vl_total || 105609645.64);
  const valorMedido = parseFloat(details?.vl_total_medido || 67609541.17);
  const saldo = Math.max(0, valorTotal - valorMedido);
  const percFinanceiro = valorTotal > 0 ? (valorMedido / valorTotal) * 100 : 0;

  const numSmo = gemocdocs?.principal?.NUMERO_SMO || details?.numero_smo;
  const numProcesso = details?.nu_processo || details?.nu_processo_sei || '202300036001241';
  const empresaNome = details?.razao_social || 'DYNATEST ENGENHARIA LTDA';
  const dsObjeto = details?.objeto_resumido || details?.ds_objeto || 'Prestação de serviços técnicos especializados de gerenciamento no âmbito da Diretoria de Manutenção (DMA).';
  const modalidade = details?.ds_modalidade || 'Concorrência Pública';

  return (
    <header className="relative z-[999]">
      {/* ── Mobile Layout: botão compacto com toggle ── */}
      <div className="flex lg:hidden items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-xl bg-emerald-50 border border-emerald-100/60 text-emerald-600 hover:bg-emerald-100 transition-colors shrink-0"
            aria-label="Abrir menu"
          >
            <Menu size={20} strokeWidth={2} />
          </button>
          <button
            onClick={() => setAccordionOpen(!accordionOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border bg-emerald-700 text-white border-emerald-600 shadow-sm min-w-0"
          >
            <span className="text-xs font-bold truncate">Contrato {contratoCode}</span>
            {accordionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {/* Mobile Accordion */}
      {accordionOpen && (
        <div className="lg:hidden mt-2 rounded-xl border border-emerald-200/80 shadow-lg overflow-hidden">
          <BannerContent
            contratoCode={contratoCode}
            empresaNome={empresaNome}
            dsObjeto={dsObjeto}
            numSmo={numSmo}
            onViewFull={() => setShowFullDrawer(true)}
            onClose={() => setAccordionOpen(false)}
          />
          <AccordionDetails
            numProcesso={numProcesso}
            empresaNome={empresaNome}
            modalidade={modalidade}
            dtInicio={dtInicio}
            dtFim={dtFim}
            remainingDays={remainingDays}
            percTime={percTime}
            valorTotal={valorTotal}
            valorMedido={valorMedido}
            saldo={saldo}
            percFinanceiro={percFinanceiro}
            copiedField={copiedField}
            handleCopy={handleCopy}
          />
        </div>
      )}

      {/* ── Desktop Layout: Banner sempre visível + Acordeon ── */}
      <div className="hidden lg:block">
        <div className="flex items-start justify-between gap-4">
          {/* Banner Azul Sempre Aberto */}
          <div className="flex-1 min-w-0">
            <BannerContent
              contratoCode={contratoCode}
              empresaNome={empresaNome}
              dsObjeto={dsObjeto}
              numSmo={numSmo}
              onViewFull={() => setShowFullDrawer(true)}
              onClose={null}
              accordionOpen={accordionOpen}
              onToggleAccordion={() => setAccordionOpen(!accordionOpen)}
            />
          </div>
          {/* Notif + User */}
          <div className="flex items-center gap-3 shrink-0 mt-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </div>

        {/* Acordeon de Detalhes — Desktop */}
        {accordionOpen && (
          <div className="mt-2 rounded-xl border border-emerald-200/60 shadow-lg overflow-hidden">
            <AccordionDetails
              numProcesso={numProcesso}
              empresaNome={empresaNome}
              modalidade={modalidade}
              dtInicio={dtInicio}
              dtFim={dtFim}
              remainingDays={remainingDays}
              percTime={percTime}
              valorTotal={valorTotal}
              valorMedido={valorMedido}
              saldo={saldo}
              percFinanceiro={percFinanceiro}
              copiedField={copiedField}
              handleCopy={handleCopy}
            />
          </div>
        )}
      </div>

      {/* Drawer completo sob demanda */}
      <ContractDetail
        contratoId={showFullDrawer ? contratoCode : null}
        onClose={() => setShowFullDrawer(false)}
      />
    </header>
  );
};

// ─── Banner do Contrato — Design Limpo ───────────────────────
const BannerContent = ({ contratoCode, empresaNome, dsObjeto, numSmo, onViewFull, onClose, accordionOpen, onToggleAccordion }) => (
  <div className="flex items-center gap-3 min-w-0 py-1">
    {/* Accent bar */}
    <div className="w-[3px] h-10 rounded-full bg-emerald-500 shrink-0" />

    <div className="min-w-0 flex-1">
      {/* Linha 1: número · label · botões */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-emerald-600">
          {contratoCode}
        </span>
        <span className="w-0.5 h-3 rounded-full bg-slate-200 shrink-0" />
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
          Gerenciamento DMA
        </span>

        {/* Separador visual */}
        <span className="w-0.5 h-3 rounded-full bg-slate-200 shrink-0" />

        {/* Botões inline */}
        {numSmo && (
          <button
            onClick={() => {
              const url = `https://sider.goinfra.go.gov.br/ctosmo/abrirVisualizacaoContrato.do?nuTitulo=${numSmo}&mostraSaldosMensais=false&sistemaOrigem=SMO&acaoSelecionar=`;
              const w = 1000, h = 750;
              window.open(url, 'SIDER', `width=${w},height=${h},left=${(screen.width-w)/2},top=${(screen.height-h)/2},menubar=no,toolbar=yes,location=yes,status=yes,resizable=yes`);
            }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 text-[10px] font-semibold transition-all"
            title={`Abrir SMO ${numSmo}`}
          >
            <ExternalLink size={11} strokeWidth={2} />
            SMO {numSmo}
          </button>
        )}

        <button
          onClick={onViewFull}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 text-[10px] font-semibold transition-all"
        >
          <Layers size={11} strokeWidth={2} />
          Ficha
        </button>

        {onToggleAccordion && (
          <button
            onClick={onToggleAccordion}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
              accordionOpen
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {accordionOpen ? <ChevronUp size={11} strokeWidth={2.5} /> : <ChevronDown size={11} strokeWidth={2.5} />}
            Detalhes
          </button>
        )}

        {onClose && (
          <button onClick={onClose} className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-1">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Linha 2: empresa */}
      <p className="text-sm font-semibold text-slate-800 leading-snug truncate mt-0.5">
        {empresaNome}
      </p>

      {/* Linha 3: objeto — só desktop largo */}
      <p className="hidden lg:block text-[11px] text-slate-400 mt-0 line-clamp-1">
        {dsObjeto}
      </p>
    </div>
  </div>
);



// ─── Conteúdo do Acordeon de Detalhes ────────────────────────
const AccordionDetails = ({
  numProcesso, empresaNome, modalidade,
  dtInicio, dtFim, remainingDays, percTime,
  valorTotal, valorMedido, saldo, percFinanceiro,
  copiedField, handleCopy
}) => (
  <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/60">
    {/* Identificação & Processo */}
    <div className="bg-white rounded-xl p-4 border border-emerald-100/60 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
        <Building2 size={14} className="text-emerald-600" />
        Identificação & Processo
      </div>
      <div className="space-y-2.5 text-xs">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Processo SEI</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono font-bold text-slate-800">{numProcesso}</span>
            <button
              onClick={() => handleCopy(numProcesso, 'proc')}
              className="p-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
              title="Copiar"
            >
              {copiedField === 'proc' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Contratada</span>
          <p className="font-semibold text-slate-800 mt-0.5">{empresaNome}</p>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Modalidade</span>
          <p className="text-slate-600">{modalidade}</p>
        </div>
      </div>
    </div>

    {/* Prazos & Vigência */}
    <div className="bg-white rounded-xl p-4 border border-emerald-100/60 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
        <Calendar size={14} className="text-emerald-600" />
        Prazos & Vigência
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Início:</span>
          <span className="font-semibold text-slate-800">{formatDate(dtInicio)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Término:</span>
          <span className="font-bold text-emerald-700">{formatDate(dtFim)}</span>
        </div>
        <div className="pt-1">
          <div className="flex justify-between text-[11px] font-semibold mb-1.5">
            <span className="text-slate-500">{remainingDays} dias restantes</span>
            <span className="text-slate-700">{percTime.toFixed(0)}% decorrido</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
              style={{ width: `${percTime}%` }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* Resumo Financeiro */}
    <div className="bg-white rounded-xl p-4 border border-emerald-100/60 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
        <DollarSign size={14} className="text-emerald-600" />
        Resumo Financeiro
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Valor Atualizado:</span>
          <span className="font-bold text-slate-900">{formatCurrency(valorTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Total Medido:</span>
          <span className="font-bold text-blue-600">{formatCurrency(valorMedido)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Saldo a Executar:</span>
          <span className="font-semibold text-slate-700">{formatCurrency(saldo)}</span>
        </div>
        <div className="pt-1">
          <div className="flex justify-between text-[11px] font-semibold mb-1.5">
            <span className="text-slate-500">Avanço Financeiro</span>
            <span className="text-blue-600">{percFinanceiro.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              style={{ width: `${Math.min(100, percFinanceiro)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── User Menu ────────────────────────────────────────────────
const UserMenu = () => {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-100/60 transition-all"
      >
        {user.foto ? (
          <img src={user.foto} alt="" className="w-8 h-8 rounded-full ring-2 ring-emerald-100" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        )}
        <span className="hidden sm:block text-xs font-semibold text-slate-600 max-w-[100px] truncate">
          {user.nome?.split(' ')[0]}
        </span>
        <ChevronDown size={12} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-emerald-100/60 overflow-hidden z-[9999]">
          <div className="px-4 py-3 border-b border-emerald-100/30 bg-emerald-50/30">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.nome}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { logout(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default Header;
