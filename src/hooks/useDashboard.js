import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ALERTAS, sortSegmentos, CONTRATO_ALVO } from '../config/constants';
import * as apiService from '../services/api.service';
import { useAuthStore } from '../stores/auth.store';

/* helpers de data */
const parseISO = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function buildDateRange(period, customStart, customEnd) {
  const now = new Date();
  switch (period) {
    case 'day': { const s = startOfDay(now); return { start: s, end: endOfDay(now) }; }
    case 'week': { const s = new Date(now); s.setDate(s.getDate() - 6); return { start: startOfDay(s), end: endOfDay(now) }; }
    case 'month': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
    case 'year': return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
    case 'custom': return { start: parseISO(customStart), end: customEnd ? new Date(...customEnd.split('-').map(Number).reverse(), 23, 59, 59, 999) : null };
    default: return { start: null, end: null };
  }
}

function contratoIntersectRange(c, range) {
  if (!range.start && !range.end) return true;
  var isFullYear = range.start && range.end
    && range.start.getMonth() === 0 && range.start.getDate() === 1
    && range.end.getMonth() === 11 && range.end.getDate() === 31;
  if (isFullYear) {
    var sy = range.start.getFullYear();
    var ey = range.end.getFullYear();
    if (c.anos_medicao) {
      var anos = c.anos_medicao.split(',');
      for (var i = 0; i < anos.length; i++) {
        var a = parseInt(anos[i].trim(), 10);
        if (a >= sy && a <= ey) return true;
      }
    }
    return false;
  }
  const osDate = parseISO(c.dt_os_inicio);
  if (osDate) {
    if (range.start && osDate < range.start) return false;
    if (range.end   && osDate > range.end)   return false;
    return true;
  }
  const cs = parseISO(c.dt_vigencia_inicio);
  const ce = parseISO(c.dt_vigencia_fim);
  if (!cs) return false;
  const cEnd = ce || new Date(9999, 11, 31);
  if (range.start && cEnd < range.start) return false;
  if (range.end   && cs    > range.end)   return false;
  return true;
}

export const useDashboard = () => {
  const [search, setSearch] = useState(CONTRATO_ALVO.cd);
  const [contratos, setContratos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((s) => s.token);

  const latestSearch = useRef(search);

  useEffect(() => {
    const isSearchChange = search !== latestSearch.current;
    latestSearch.current = search;

    if (!isSearchChange && contratos.length > 0) {
      setLoading(false);
      return;
    }

    const delay = isSearchChange ? 300 : 0;

    const t = setTimeout(async () => {
      try {
        const [cd, sd] = await Promise.all([
          apiService.getContratos({ search: CONTRATO_ALVO.cd }),
          apiService.getBlocoStats({ search: CONTRATO_ALVO.cd }),
        ]);
        setContratos(cd || []);
        setStats(sd || null);
      } catch(e) {
        console.error('[Dashboard]', e);
        setContratos([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(t);
  }, [search, token]);

  return {
    search, setSearch,
    contratos,
    contratosFiltrados: contratos,
    stats,
    loading,
    /* contratista fixo: 61/2023 */
    contratoAlvo: CONTRATO_ALVO,
  };
};