import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ALERTAS, sortSegmentos } from '../config/constants';
import * as apiService from '../services/api.service';
import { useAuthStore } from '../stores/auth.store';

/* â”€â”€â”€ helpers de data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* Converte "YYYY-MM-DD" â†’ Date no fuso LOCAL (evita o bug do
   new Date("2026-05-04") que interpreta como UTC, podendo
   cair no dia anterior dependendo do fuso) */
const parseISO = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d); // meia-noite local
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
    case 'day': {
      const s = startOfDay(now);
      return { start: s, end: endOfDay(now) };
    }
    case 'week': {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);                     // ultimos 7 dias (inclui hoje)
      return { start: startOfDay(s), end: endOfDay(now) };
    }
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    case 'year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    case 'custom':
      return {
        start: parseISO(customStart),
        end: customEnd ? (() => {
          const [y, m, d] = customEnd.split('-').map(Number);
          return new Date(y, m - 1, d, 23, 59, 59, 999);
        })() : null,
      };
    default:
      return { start: null, end: null };
  }
}

function pegarAno(cd) {
  var m = (cd || '').match(/(\d{4})$/);
  return m ? parseInt(m[1], 10) : null;
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

  // Filtro normal por data (so para periodos que nao sao ano completo)
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
  const [search, setSearch] = useState('');
  const [selectedBlocos, setSelectedBlocos] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedSegmentos, setSelectedSegmentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [segmentosFromGemoc, setSegmentosFromGemoc] = useState([]);

  const token = useAuthStore((s) => s.token);

  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [showBloco61, setShowBloco61] = useState(false);
  const [showBloco62, setShowBloco62] = useState(false);
  const [showBloco7, setShowBloco7] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // PADRÃO SIMPLES — igual à página de Aditivos (que NÃO tem o bug)
  // 1. Sem AbortController
  // 2. Sem generation counter
  // 3. Sem render-phase clearing
  // 4. Só um fetch direto, seta o resultado, pronto
  // ═══════════════════════════════════════════════════════════════════
  const latestSearch = useRef(search);

  useEffect(() => {
    const isSearchChange = search !== latestSearch.current;
    latestSearch.current = search;
    const hasData = contratos.length > 0;

    // Debounce só para digitação na busca
    const delay = (isSearchChange && hasData) ? 350 : 0;

    // Limpa dados imediatamente para filtro de bloco/status
    if (!isSearchChange) {
      setContratos([]);
      setStats(null);
      setLoading(true);
    } else if (hasData) {
      setLoading(true);
    }

    const filters = { search, bloco: selectedBlocos.join(','), status: selectedStatus };

    const t = setTimeout(async () => {
      try {
        const [cd, sd] = await Promise.all([
          apiService.getContratos(filters),
          apiService.getBlocoStats(filters),
        ]);
        // Só atualiza se o search ainda é o mesmo (debounce)
        if (!isSearchChange || latestSearch.current === search) {
          setContratos(cd || []);
          setStats(sd || null);
        }
      } catch(e) {
        console.error('[Dashboard]', e);
        setContratos([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedBlocos, selectedStatus, token]);

  // â•â•â• busca segmentos do GemocDocs â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiService.getGemocdocsTableData('CONTRATO', { limit: 500 });
        if (!cancelled && Array.isArray(data)) {
          const set = new Set();
          data.forEach(r => { if (r.SEGMENTO) set.add(r.SEGMENTO); });
          setSegmentosFromGemoc([...set].sort());
          // Salva raw data no sessionStorage para o mapa de fallback
          try { sessionStorage.setItem('gemoc_segmentos_raw', JSON.stringify(data)); } catch (_) {}
        }
      } catch (e) {
        if (!cancelled) setSegmentosFromGemoc([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // â•â•â• filtro de tempo client-side â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const dateRange = useMemo(
    () => buildDateRange(selectedPeriod, customDateStart, customDateEnd),
    [selectedPeriod, customDateStart, customDateEnd],
  );

  // Mapa de fallback: cd_contrato -> segmento (vindo do GemocDocs)
  // Usado no filtro quando o campo segmento não está nos contratos
  const segmentoMap = useMemo(() => {
    const map = {};
    // Pega do sessionStorage onde salvamos no fetch
    const raw = sessionStorage.getItem('gemoc_segmentos_raw');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          data.forEach(r => {
            if (r.CONTRATO && r.SEGMENTO) {
              const key = r.CONTRATO.trim();
              map[key] = r.SEGMENTO;
              const cleaned = key.replace(/^0+/, '');
              if (cleaned !== key) map[cleaned] = r.SEGMENTO;
            }
          });
        }
      } catch (_) {}
    }
    return map;
  }, [segmentosFromGemoc]);

  function aplicarFiltrosBasicos(lista) {
    if (!Array.isArray(lista) || lista.length === 0) return [];
    const seen = new Set();
    const deduped = [];
    for (const c of lista) {
      const key = c.id_bloco ?? `${c.nu_bloco}|${c.cd_contrato}`;
      if (!seen.has(key)) { seen.add(key); deduped.push(c); }
    }
    let f = deduped;
    if (selectedBlocos.length > 0) {
      const normalizeBloco = (b) => String(b || '').replace(/^0+/, '');
      const blocosNorm = selectedBlocos.map(normalizeBloco);
      f = f.filter((c) => blocosNorm.includes(normalizeBloco(c.nu_bloco)));
    }
    if (!showBloco61) f = f.filter((c) => { const b = String(c.nu_bloco || '').replace(/^0+/, ''); return b !== '6.1'; });
    if (!showBloco62) f = f.filter((c) => { const b = String(c.nu_bloco || '').replace(/^0+/, ''); return b !== '6.2'; });
    if (!showBloco7) f = f.filter((c) => { const b = String(c.nu_bloco || '').replace(/^0+/, ''); return b !== '7'; });
    if (selectedSegmentos.length > 0) {
      f = f.filter((c) => {
        const seg = c.segmento || segmentoMap[c.cd_contrato] || segmentoMap[c.cd_contrato?.replace(/^0+/, '')] || '';
        return selectedSegmentos.includes(seg);
      });
    }
    return f;
  }

  // Contratos ANTES do filtro de data/ano (para calcular anos disponiveis)
  const contratosSemData = useMemo(() => aplicarFiltrosBasicos(contratos), [contratos, selectedBlocos, selectedSegmentos, segmentoMap, showBloco61, showBloco62, showBloco7]);

  const anosDisponiveis = useMemo(() => {
    var anos = new Set();
    for (var c of contratosSemData) {
      if (c.anos_medicao) {
        c.anos_medicao.split(',').forEach(function(a) { 
          a = a.trim(); 
          if (a) anos.add(a); 
        });
      }
    }
    return [...anos].sort().reverse();
  }, [contratosSemData]);

  const contratosFiltrados = useMemo(
    () => {
      return aplicarFiltrosBasicos(contratos)
        .filter((c) => contratoIntersectRange(c, dateRange))
        .sort((a, b) => {
          const blocoA = parseInt(a.nu_bloco, 10) || 0;
          const blocoB = parseInt(b.nu_bloco, 10) || 0;
          if (blocoA !== blocoB) return blocoA - blocoB;
          const contratoA = a.cd_contrato || '';
          const contratoB = b.cd_contrato || '';
          return contratoA.localeCompare(contratoB, undefined, { numeric: true });
        });
    },
    [contratos, dateRange, selectedBlocos, selectedSegmentos, segmentoMap, showBloco61, showBloco62, showBloco7],
  );

  // â•â•â• contratos crÃ­ticos â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const contratosCriticos = useMemo(
    () =>
      contratosFiltrados.filter((c) => {
        const s = c.situacao_atual?.toLowerCase() || '';
        if (['concluído', 'finalizado', 'rescindido', 'trp', 'trd'].includes(s)) return false;

        const percPago = parseFloat(c.perc_pago || 0);
        const diasRest = parseInt(c.dias_restantes);
        const diasExecRest = parseInt(c.dias_exec_restantes);

        if (percPago >= 70) return true;
        if (!isNaN(diasRest) && diasRest > 0 && diasRest <= 60) return true;
        if (!isNaN(diasRest) && diasRest < 0) return true;
        if (!isNaN(diasExecRest) && diasExecRest > 0 && diasExecRest <= 60) return true;
        if (!isNaN(diasExecRest) && diasExecRest < 0) return true;
        if (c.observacoes && c.observacoes.trim()) return true;

        return false;
      }),
    [contratosFiltrados],
  );

  // â•â•â• setters â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const setPeriod = useCallback((period) => {
    setSelectedPeriod(period);
    if (period !== 'custom') {
      setCustomDateStart('');
      setCustomDateEnd('');
    }
  }, []);

  const toggleBloco = useCallback(
    (bloco) => setSelectedBlocos((prev) =>
      prev.includes(bloco) ? prev.filter((b) => b !== bloco) : [...prev, bloco]
    ),
    [],
  );

  /* Quando seleciona "Personalizado", jÃ¡ inicia com o mÃªs atual */
  const activateCustomPeriod = useCallback(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setCustomDateStart(first.toISOString().slice(0, 10));
    setCustomDateEnd(last.toISOString().slice(0, 10));
    setSelectedPeriod('custom');
  }, []);

  // Lista de segmentos distintos (baseada nos contratos filtrados por bloco e visibilidade)
  const segmentosList = useMemo(() => {
    const set = new Set();
    const source = Array.isArray(contratos) ? contratos : [];
    let candidates = source;

    // Filtra pelos blocos selecionados
    if (selectedBlocos.length > 0) {
      const norm = (b) => String(b || '').replace(/^0+/, '');
      const blocosNorm = selectedBlocos.map(norm);
      candidates = source.filter((c) => blocosNorm.includes(norm(c.nu_bloco)));
    }

    // Filtra pelos toggles de visibilidade (6.1, 6.2, 7)
    candidates = candidates.filter((c) => {
      const bloco = String(c.nu_bloco || '').replace(/^0+/, '');
      if (bloco === '6.1' && !showBloco61) return false;
      if (bloco === '6.2' && !showBloco62) return false;
      if (bloco === '7' && !showBloco7) return false;
      return true;
    });

    candidates.forEach((c) => { if (c.segmento) set.add(c.segmento); });
    return sortSegmentos([...set]);
  }, [contratos, selectedBlocos, showBloco61, showBloco62, showBloco7]);

  // Lista de blocos disponíveis (exclui 6.1, 6.2 e/ou 7 conforme toggle)
  const blocosDisponiveis = useMemo(() => {
    const todos = ['1', '2', '3', '4', '5', '6.1', '6.2', '6.3', '7'];
    return todos.filter(b => {
      if (b === '6.1' && !showBloco61) return false;
      if (b === '6.2' && !showBloco62) return false;
      if (b === '7' && !showBloco7) return false;
      return true;
    });
  }, [showBloco61, showBloco62, showBloco7]);

  return {
    search, setSearch,
    selectedBlocos, setSelectedBlocos, toggleBloco,
    selectedStatus, setSelectedStatus,
    selectedSegmentos, setSelectedSegmentos,
    segmentosList,
    blocosDisponiveis,
    showBloco61, setShowBloco61,
    showBloco62, setShowBloco62,
    showBloco7, setShowBloco7,
    contratos: contratosFiltrados,
    contratosRaw: contratos,
    stats, loading,
    contratosCriticos,
    anosDisponiveis,
    /* expõe estado do tempo */
    selectedPeriod, setPeriod,
    customDateStart, setCustomDateStart,
    customDateEnd, setCustomDateEnd,
    activateCustomPeriod,
  };
};
