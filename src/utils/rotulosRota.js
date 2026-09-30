/**
 * Rótulos amigáveis para os caminhos de página registrados na auditoria.
 *
 * A auditoria grava o `path` cru (ex.: "/medicoes"). Na tela de trajetória/
 * navegação queremos o nome que o usuário reconhece.
 */
const ROTULOS = {
  '/': 'Dashboard',
  '/medicoes': 'Medições',
  '/aditivos': 'Aditivos',
  '/apostilas': 'Apostilas',
  '/os': 'Ordens de Serviço',
  '/empenhos': 'Empenhos',
  '/empresas': 'Empresas',
  '/gestores': 'Gestores',
  '/admin': 'Administração',
  '/atividade': 'Auditoria de Atividade',
  '/sobre': 'Sobre',
  '/login': 'Login',
  '/pending': 'Aguardando Aprovação',
};

/**
 * Converte um path em rótulo amigável.
 * Casas mais específicas primeiro.
 *
 * @param {string} path
 * @returns {string}
 */
export function rotuloRota(path) {
  if (!path) return '—';
  const limpo = String(path).split('?')[0].replace(/\/+$/, '') || '/';
  if (ROTULOS[limpo]) return ROTULOS[limpo];
  const chaves = Object.keys(ROTULOS)
    .filter((k) => k !== '/' && limpo.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length);
  if (chaves.length) return ROTULOS[chaves[0]];
  if (limpo.startsWith('/api/')) return limpo;
  return limpo;
}

export default rotuloRota;
