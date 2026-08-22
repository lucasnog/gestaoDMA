/* ============================================================
   Gestão DMA — Config & Constants
   ============================================================ */

// ─── CONTRATO ALVO ─────────────────────────────────────────────
// Todo o sistema trabalha com um único contrato: 61/2023 (Gestão DMA / gerenciadora)
export const CONTRATO_ALVO = {
  cd: '61/2023',
  id: 'bl1-61/2023',
  label: 'Contrato 61/2023',
  empresa: 'DYNATEST ENGENHARIA LTDA',
};

// ─── API ───────────────────────────────────────────────────────
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://api.gemoc-analytics.workers.dev/api');
export const PDF_URL = import.meta.env.VITE_PDF_URL || 'http://localhost:8000';


// ÔöÇÔöÇÔöÇ BLOCOS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
export const BLOCOS_DISPONIVEIS = ['1', '2', '3', '4', '5', '6.1', '6.2', '6.3', '7'];

// ÔöÇÔöÇÔöÇ STATUS (apenas valores do GemocDocs STATUS_CONTRATO) ÔöÇÔöÇÔöÇÔöÇÔöÇ
export const STATUS_OPTIONS = [
  { value: 'Todos', label: 'Todos os Status' },
  { value: 'Andamento', label: 'Em Andamento' },
  { value: 'Conclu├¡do', label: 'Conclu├¡do' },
  { value: 'Finalizado', label: 'Finalizado' },
  { value: 'Paralisado', label: 'Paralisado' },
  { value: 'Rescindido', label: 'Rescindido' },
  { value: 'TRP', label: 'TRP' },
  { value: 'TRD', label: 'TRD' },
];

// ÔöÇÔöÇÔöÇ PERFIS DE USU├üRIO ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
export const PERFIS = {
  PLANEJAMENTO: 'planejamento',
  ORGANIZACAO: 'organizacao',
  PRODUCAO: 'producao',
};

export const PERFIL_LABELS = {
  [PERFIS.PLANEJAMENTO]: 'Planejamento',
  [PERFIS.ORGANIZACAO]: 'Organiza├º├úo',
  [PERFIS.PRODUCAO]: 'Produ├º├úo',
};

// ÔöÇÔöÇÔöÇ ROTAS DO FRONTEND ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
export const ROTAS = {
  DASHBOARD: '/',
  CONTRATOS: '/contratos',
  FINANCEIRO: '/financeiro',
  MEDICOES: '/medicoes',
  EMPRESAS: '/empresas',
  RELATORIOS: '/relatorios',
};

// ÔöÇÔöÇÔöÇ MENU DE NAVEGA├ç├âO ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
export const MENU_PRINCIPAL = [
  { path: ROTAS.DASHBOARD, label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: ROTAS.CONTRATOS, label: 'Contratos', icon: 'FileText' },
  { path: ROTAS.FINANCEIRO, label: 'Financeiro', icon: 'TrendingUp' },
  { path: ROTAS.MEDICOES, label: 'Medi├º├Áes', icon: 'BarChart3' },
];

export const MENU_SUPORTE = [
  { path: ROTAS.EMPRESAS, label: 'Empresas', icon: 'Building2' },
  { path: ROTAS.RELATORIOS, label: 'Relat├│rios', icon: 'ShieldCheck' },
];

// ÔöÇÔöÇÔöÇ THRESHOLDS DE ALERTA ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
export const ALERTAS = {
  SALDO_CRITICO_PERC: 90,       // % de saldo pago que dispara alerta
  PRAZO_ATENCAO_DIAS: 60,       // dias restantes para alerta de prazo
  PRAZO_CRITICO_DIAS: 15,       // dias restantes para alerta cr├¡tico
};

// ÔöÇÔöÇÔöÇ PER├ìODOS DE TEMPO ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
export const PERIODOS = [
  { value: 'all',    label: 'Todo Per├¡odo' },
  { value: 'day',    label: 'Dia' },
  { value: 'week',   label: 'Semana' },
  { value: 'month',  label: 'M├¬s' },
  { value: 'year',   label: 'Ano' },
  { value: 'custom', label: 'Personalizado' },
];

// ÔöÇÔöÇÔöÇ PAGINA├ç├âO ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
export const MODULOS_DISPONIVEIS = [
  { path: '/', label: 'Dashboard', abrev: 'Dash' },
  { path: '/contratos', label: 'Contratos', abrev: 'Contr' },
  { path: '/medicoes', label: 'Medicoes', abrev: 'Medic' },
  { path: '/aditivos', label: 'Aditivos', abrev: 'Adit' },
  { path: '/apostilas', label: 'Apostilas', abrev: 'Apost' },
  { path: '/os', label: 'Ordens de Servico', abrev: 'OS' },
  { path: '/empresas', label: 'Empresas', abrev: 'Emp' },
  { path: '/gestores', label: 'Gestores', abrev: 'Gest' },
];

export const PAGINACAO = {
  ITENS_POR_PAGINA: 50,
  MAX_PAGINAS_VISIVEIS: 7,
};

export const SEGMENT_ORDER = [
  'CONSERVA 2016', 'SUPERVISÃO CONSERVA 2016',
  'CONSERVA 2021', 'SUPERVISORA 2021',
  'CONSERVA 2023', 'SUPERVISORA 2024',
  'SUPERVISÃO CONSERVA 2022', 'SUPERVISÃO CONSERVA 2024', 'SUPERVISÃO CONSERVA 2025',
  'SUPERVISÃO CONSERVA 2026', 'SUPERVISÃO CONSERVA 2027', 'SUPERVISÃO CONSERVA 2028',
  'SUPERVISÃO CONSERVA 2029', 'SUPERVISÃO CONSERVA 2030', 'SUPERVISÃO CONSERVA 2031',
  'SUPERVISÃO CONSERVA 2032', 'SUPERVISÃO CONSERVA 2033',
  'GMM', 'GMM - ETAPA 1', 'GMM - ETAPA 2', 'GMM - ETAPA 3', 'GMM - ETAPA 4', 'GMM - ETAPA 5', 'GMM - ETAPA 6', 'GMM (COMPLETO)',
  'GME',
  'GMK - OAC', 'GMK - PROJ', 'GMPK',
  'GMP', 'GMP - ENTORNO', 'GMP - ETAPA I', 'GMP - ETAPA II', 'GMP (COMPLETO)',
  'PMR', 'PMR - ETAPA I', 'PMR - ETAPA III', 'PMR (COMPLETO)', 'PROGRAMA RECONSTRUÇÃO RODOVIDA (GRUPO III)', 'PROGRAMA RODOVIDA - MANUTENÇÃO', 'RODOVIDA',
  'OBRA RODOVIARIA - OAE', 'OBRA DE ARTE ESPECIAL',
  'MELHORIA FUNCIONAL', 'SUPERVISÃO MELHORIA FUNCIONAL',
  'IMPLANTAÇÃO', 'OBRA DIRETA RODOVIÁRIA', 'OBRA RODOVIARIA - PROJETOS',
  'EMERGENCIAL',
  'MICROREVESTIMENTO', 'SUPERVISÃO MICRORREVESTIMENTO',
  'CORTE SERRA',
  'OBRA RODOVIÁRIA - SUPERVISÃO MANUTENÇÃO',
  'OBRA RODOVIÁRIA - DIVERSOS',
  'OBRA RODOVIÁRIA - CONSERVAÇÃO',
  'CONTRATO - ORDEM DE FORNECIMENTO', 'PRESTAÇÃO DE SERVIÇOS',
  'ROBO DOG',
  'GERENCIAMENTO',
];

export function sortSegmentos(segmentos) {
  const orderMap = {};
  SEGMENT_ORDER.forEach((name, idx) => { orderMap[name] = idx; });
  return [...segmentos].sort((a, b) => {
    const sa = typeof a === 'string' ? a : a.segmento || a;
    const sb = typeof b === 'string' ? b : b.segmento || b;
    const pa = orderMap[sa] ?? 999;
    const pb = orderMap[sb] ?? 999;
    if (pa !== pb) return pa - pb;
    return sa.localeCompare(sb);
  });
}
