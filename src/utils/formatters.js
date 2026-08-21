/**
 * Formata valor monetário em Real (BRL)
 * Ex: 1234567.89 → "R$ 1.234.567,89"
 *     null → "R$ 0,00"
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formata valor monetário ABREVIADO (milhões / bilhões)
 * Ex: 1234567.89 → "R$ 1,2 mi"
 *     1200000000 → "R$ 1,2 bi"
 * Útil para cards onde o valor completo é extenso
 */
export const formatCurrencyShort = (value) => {
  if (!value || isNaN(value)) return 'R$ 0';
  const abs = Math.abs(value);
  const fmt = (v, d) => v.toFixed(d).replace('.', ',');
  if (abs >= 1e9) return `R$ ${fmt(value / 1e9, 3)} bi`;
  if (abs >= 1e6) return `R$ ${fmt(value / 1e6, 3)} mi`;
  if (abs >= 1e3) return `R$ ${fmt(value / 1e3, 1)} mil`;
  return formatCurrency(value);
};

/**
 * Formata data ISO para o padrão brasileiro
 * Ex: "2024-01-15" → "15/01/2024"
 */
export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    // Converte "YYYY-MM-DD" para Date no fuso LOCAL (evita bug do UTC)
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch {
    return '—';
  }
};

/**
 * Formata data ISO para formato extenso
 * Ex: "2024-01-15" → "15 de janeiro de 2024"
 */
export const formatDateLong = (dateString) => {
  if (!dateString) return '—';
  try {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return '—';
  }
};

/**
 * Formata valor como percentual
 * Ex: 75.3 → "75,3%"
 */
export const formatPercent = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0,0%';
  return `${num.toFixed(1).replace('.', ',')}%`;
};

/**
 * Formata CNPJ (removido por LGPD)
 */
// export const formatCnpj = (cnpj) => { ... }

/**
 * Remove sufixo ".0" de valores que vieram como número decimal
 * Ex: "94.0" → "94" | "202500036020460.0" → "202500036020460"
 */
export const cleanNumberSuffix = (value) => {
  if (value === null || value === undefined) return value;
  return String(value).replace(/\.0$/, '');
};

/**
 * Formata número de dias para texto relativo
 * Ex: 90 → "90 dias" | -5 → "Vencido há 5 dias" | 0 → "Hoje"
 */
export const formatDays = (days) => {
  const d = parseInt(days);
  if (isNaN(d)) return '—';
  if (d === 0) return 'Hoje';
  if (d < 0) return `Vencido há ${Math.abs(d)} dias`;
  if (d === 1) return '1 dia';
  return `${d} dias`;
};
