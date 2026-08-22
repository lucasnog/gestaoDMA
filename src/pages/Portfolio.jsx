import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    FileText,
    Building2,
    DollarSign,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    Layers,
    Search,
    X,
    ChevronDown,
    ChevronUp,
    MapPin,
    Activity,
    Clock,
    Copy,
    PieChart,
    List,
    BarChart3,
    Filter,
    Download,
    Upload,
    Edit3,
    Save,
    CheckCircle,
    XCircle,
    ExternalLink,
    Presentation,
} from 'lucide-react';
import { formatCurrency, formatDate, formatCurrencyShort } from '../utils/formatters';
import * as apiService from '../services/api.service';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import ContractDetail from '../components/contract/ContractDetail';
import SlideViewer from '../components/portfolio/SlideViewer';
import JSZip from 'jszip';

const STATUS_CORES = {
    'Andamento': 'bg-blue-100 text-blue-700 border-blue-200',
    'Concluído': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Paralisado': 'bg-amber-100 text-amber-700 border-amber-200',
    'Finalizado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Rescindido': 'bg-rose-100 text-rose-700 border-rose-200',
    'TRP': 'bg-purple-100 text-purple-700 border-purple-200',
    'TRD': 'bg-purple-100 text-purple-700 border-purple-200',
    'Em Licitação': 'bg-violet-100 text-violet-700 border-violet-200',
    'Suspenso': 'bg-orange-100 text-orange-700 border-orange-200',
};

const STATUS_ORDEM = [
    'Andamento', 'Paralisado', 'Suspenso', 'Em Licitação',
    'Concluído', 'Finalizado', 'Rescindido', 'TRP', 'TRD'
];

// ─── Mapeamento de Segmentos → Seções do Portfolio ─────────
// Usado para agrupar contratos nas seções corretas da comparação
const SECOES_PROGRAMA = [
    {
        id: 'conserva',
        numero: '01',
        label: '01. SERVIÇOS DE MANUTENÇÃO DA MALHA RODOVIÁRIA',
        sigla: 'CONSERVA',
        keywords: ['conserva', 'manutenção', 'manutencao', 'conservação', 'conservacao']
    },
    {
        id: 'supervisora',
        numero: '02',
        label: '02. SUPERVISÃO DA MANUTENÇÃO RODOVIÁRIA',
        sigla: 'SUPERVISORA',
        keywords: ['supervisora', 'supervisão', 'supervisao', 'gerenciadora', 'gerenciamento']
    },
    {
        id: 'gmm',
        numero: '03',
        label: '03. GMM — GOIÁS EM MOVIMENTO MUNICÍPIOS',
        sigla: 'GMM',
        keywords: ['gmm']
    },
    {
        id: 'gme',
        numero: '04',
        label: '04. GME — GOIÁS EM MOVIMENTO ESTRUTURAS',
        sigla: 'GME',
        keywords: ['gme']
    },
    {
        id: 'gmk',
        numero: '05',
        label: '05. GMK — GOIÁS EM MOVIMENTO KALUNGAS',
        sigla: 'GMK',
        keywords: ['gmk', 'kalunga', 'patrulha kalunga', 'projeto kalungas']
    },
    {
        id: 'gmp',
        numero: '06',
        label: '06. GMP — PATRULHAS MECÂNICAS',
        sigla: 'GMP',
        keywords: ['gmp']
    },
    {
        id: 'pmr',
        numero: '07',
        label: '07. PMR — PROGRAMA DE MELHORAMENTO RODOVIÁRIO',
        sigla: 'PMR',
        keywords: ['pmr', 'melhoramento', 'reconstrução', 'reconstrucao', 'rodovida']
    },
    {
        id: 'oaes_oacs',
        numero: '08',
        label: '08. OAEs, OACs',
        sigla: 'OAE/OAC',
        keywords: ['oae', 'oac', 'obra de arte especial']
    },
    {
        id: 'supervisao_melhorias',
        numero: '09',
        label: '09. SUPERVISÃO DE MELHORIAS / MELHORIA FUNCIONAL',
        sigla: 'MELHORIA',
        keywords: ['melhoria funcional', 'supervisão melhoria', 'supervisao melhoria']
    },
    {
        id: 'implantacao',
        numero: '10',
        label: '10. IMPLANTAÇÃO',
        sigla: 'IMPLANTAÇÃO',
        keywords: ['implantação', 'implantacao', 'obra direta rodoviária', 'obra rodoviaria']
    },
    {
        id: 'emergencial',
        numero: '11',
        label: '11. EMERGENCIAL',
        sigla: 'EMERGENCIAL',
        keywords: ['emergencial']
    },
    {
        id: 'microrrevest',
        numero: '12',
        label: '12. MICRORREVESTIMENTO ASFÁLTICO',
        sigla: 'MICRORREV',
        keywords: ['microrrevestimento', 'micro revestimento']
    },
    {
        id: 'corte_serra',
        numero: '13',
        label: '13. CORTE DE SERRA',
        sigla: 'CORTE',
        keywords: ['corte de serra', 'sinalização', 'sinalizacao']
    },
    {
        id: 'aerodromos',
        numero: '14',
        label: '14. AERÓDROMOS',
        sigla: 'AERÓDROMOS',
        keywords: ['aeródromo', 'aerodromo', 'aeroporto']
    },
    {
        id: 'diversos',
        numero: '15',
        label: '15. OBRAS DIVERSAS',
        sigla: 'DIVERSOS',
        keywords: ['diversos', 'diversas', 'prestação de serviços', 'prestacao de servicos', 'aquisição']
    },
];

/**
 * Mapeia um segmento do banco para a seção do portfolio
 */
function segmentoParaSecao(segmento) {
    if (!segmento) return null;
    const seg = segmento.toLowerCase();
    for (const secao of SECOES_PROGRAMA) {
        if (secao.keywords.some(kw => seg.includes(kw))) {
            return secao;
        }
    }
    return null;
}

// ══════════════════════════════════════════════════════════════
// Utilitários para parse de PPTX no navegador
// ══════════════════════════════════════════════════════════════

function normalizeStatus(s) {
    if (!s) return 'Indefinido';
    const lower = s.toLowerCase().trim();
    if (lower.includes('andamento') || lower === 'em execução' || lower === 'em execucao') return 'Andamento';
    if (lower.includes('concluído') || lower.includes('concluido') || lower.includes('executado')) return 'Concluído';
    if (lower.includes('paralisado')) return 'Paralisado';
    if (lower.includes('finalizado')) return 'Finalizado';
    if (lower.includes('rescindido')) return 'Rescindido';
    if (lower.includes('suspenso')) return 'Suspenso';
    if (lower.includes('licitação') || lower.includes('licitacao')) return 'Em Licitação';
    if (lower === 'trp') return 'TRP';
    if (lower === 'trd') return 'TRD';
    return s;
}

function parseCurrency(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

/**
 * Extrai contratos de um arquivo PPTX usando JSZip no navegador.
 * Usa paragrafos do slide (<a:p>) como unidades de linha.
 */
async function extractContractsFromPptx(buffer) {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = [];
    zip.forEach((path) => { if (path.match(/^ppt\/slides\/slide\d+\.xml$/)) slideFiles.push(path); });
    slideFiles.sort();

    const contracts = [];
    const seen = new Set();
    let secaoAtual = 'Geral';

    for (const slidePath of slideFiles) {
        const xml = await zip.file(slidePath).async('string');

        // Texto bruto do slide (para identificar secao)
        const rawText = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        // Identifica secao: procura numeracao seguida de texto maiusculo
        // Ex: "01. SERVIÇOS DE MANUTENÇÃO DA MALHA RODOVIÁRIA"
        // Ex: "02. SUPERVISÃO DA MANUTENÇÃO RODOVIÁRIA"
        const sec = rawText.match(/(\d{2})[\.\s]\s*([A-Z][A-ZÀ-Ü\s\-\(\),]{10,}?)(?:\s+\d{1,4}\/\d{4}|\s*$)/);
        if (sec) {
            const numero = sec[1].trim();
            const nome = sec[2].trim();
            secaoAtual = numero + '. ' + nome;
        }

        // Extrai LINHAS DE TABELA (<a:tr>)
        const rows = xml.match(/<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g);
        if (!rows || rows.length < 2) continue;

        for (const row of rows) {
            const cells = row.match(/<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g);
            if (!cells || cells.length < 2) continue;

            // Texto de cada celula
            const textos = cells.map(c =>
                c.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
            ).filter(Boolean);

            if (textos.length < 2) continue;

            // Procura contrato no texto da primeira celula
            const cm = textos[0].match(/\b(\d{1,4}\/\d{4})\b/);
            if (!cm) continue;

            const contrato = cm[1];
            const num = parseInt(contrato.split('/')[0], 10);
            if (num < 1 || num > 9999) continue;
            if (seen.has(contrato)) continue;
            seen.add(contrato);

            // Busca status em todas as celulas
            let status = 'Indefinido';
            for (const t of textos) {
                const st = t.match(/(Andamento|Conclu[ií]do|Paralisado|Finalizado|Rescindido|Suspenso|Em Licita[cç][aã]o|TRP|TRD)/i);
                if (st) { status = normalizeStatus(st[1]); break; }
            }

            // Busca valor em todas as celulas (maior valor = valor do contrato)
            let valor = 0;
            for (const t of textos) {
                const nums = t.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g);
                if (nums) {
                    for (const n of nums) {
                        const v = parseCurrency(n);
                        if (v > valor) valor = v;
                    }
                }
            }

            // Pula linhas sem valor significativo (header, sumario)
            if (valor === 0 && status === 'Indefinido' && textos.length <= 3) continue;

            contracts.push({ contrato, status, valor, progresso: 0, divisao: secaoAtual, slide: slidePath });
        }
    }

    return contracts;
}

/**
 * Compara contratos extraídos do PPTX com dados do portfolio (da API)
 * Agrupa contratos por seção do portfolio (baseado no segmento do banco)
 */
function compareWithDb(pptxContracts, dbContratos) {
    // Cria lookup da base de dados (por contrato e por contrato+valor)
    const dbMap = new Map();
    const dbMapByValor = new Map();
    for (const c of dbContratos) {
        dbMap.set(c.cd_contrato, c);
        const valorKey = c.cd_contrato + '|' + Math.round(c.vl_total || 0);
        dbMapByValor.set(valorKey, c);
    }

    // Agrupa por divisão (vem do slide do PPTX)
    const divisoes = {};
    let totalDiscrepancias = 0;
    let presentNoDb = 0;
    let ausentesNoDb = 0;

    for (const pc of pptxContracts) {
        // Tenta match por contrato+valor (desambigua 142/2024 em múltiplos blocos)
        const banco = dbMapByValor.get(pc.contrato + '|' + Math.round(pc.valor))
                || dbMap.get(pc.contrato)
                || null;

        if (banco) presentNoDb++;
        else ausentesNoDb++;

        const discrepancias = [];
        if (banco) {
            // Considera Concluído, Finalizado, TRP, TRD como equivalentes
            const statusPptx = normalizeStatus(pc.status);
            const statusBanco = normalizeStatus(banco.situacao_atual);
            const terminais = ['Concluído', 'Finalizado', 'TRP', 'TRD'];
            const statusMatch = statusPptx === statusBanco ||
                (terminais.includes(statusPptx) && terminais.includes(statusBanco));
            if (!statusMatch) {
                discrepancias.push({
                    campo: 'status',
                    portfolio: pc.status,
                    banco: banco.situacao_atual,
                });
            }
            if (Math.abs(pc.valor - banco.vl_total) > 0.01 && pc.valor > 0) {
                discrepancias.push({
                    campo: 'valor',
                    portfolio: pc.valor,
                    banco: banco.vl_total,
                });
            }
        }

        if (discrepancias.length > 0) totalDiscrepancias++;

        const divKey = pc.divisao || 'Geral';
        if (!divisoes[divKey]) {
            divisoes[divKey] = {
                divisao: divKey,
                total_portfolio: 0,
                presentes_db: 0,
                ausentes_db: [],
                contratos: [],
            };
        }
        divisoes[divKey].total_portfolio++;
        if (banco) divisoes[divKey].presentes_db++;
        else divisoes[divKey].ausentes_db.push(pc.contrato);

        divisoes[divKey].contratos.push({
            contrato: pc.contrato,
            portfolio: { status: pc.status, valor: pc.valor, progresso: pc.progresso },
            banco: banco ? {
                bloco: banco.nu_bloco ? `Bloco ${banco.nu_bloco}` : null,
                lote: banco.nu_lote || null,
                status: banco.situacao_atual,
                objeto: banco.objeto || '',
                valor: banco.vl_total || 0,
                segmento: banco.segmento || '',
            } : null,
            no_banco: !!banco,
            discrepancias,
        });
    }

    return {
        stats: {
            total_portfolio_contratos: pptxContracts.length,
            total_db_contratos: presentNoDb + ausentesNoDb,
            presentes_no_db: presentNoDb,
            ausentes_no_db: ausentesNoDb,
            total_discrepancias: totalDiscrepancias,
        },
        divisoes: Object.values(divisoes),
    };
}

// ══════════════════════════════════════════════════════════════
// Componente Principal
// ══════════════════════════════════════════════════════════════

const Portfolio = () => {
    const [portfolio, setPortfolio] = useState(null);
    const [comparacao, setComparacao] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Download
    const [baixando, setBaixando] = useState(false);

    // Upload
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    // Contrato Detail
    const [selectedContratoId, setSelectedContratoId] = useState(null);

    // Copiar texto
    const [expandidoId, setExpandidoId] = useState(null);
    const [copiado, setCopiado] = useState(null);

    // Slide viewer
    const [slideSecao, setSlideSecao] = useState(null);

    // ─── Extrai contratos do PPTX na ordem dos slides ──
    const [slideOrders, setSlideOrders] = useState({});
    const extractedRef = useRef(new Set());
    useEffect(() => {
        const FILE_KEY_MAP = {
            '01': '01-conserva', '02': '02-supervisao', '03': '03-gmm', '04': '04-gme',
            '05': '05-gmk', '06': '06-gmp', '07': '07-pmr', '08': '08-oaes-oacs',
            '09': '09-melhoria', '10': '10-implantacao', '11': '11-emergencial',
            '12': '12-microrevest', '13': '13-corte-serra', '14': '14-obras-diversas',
        };
        const toExtract = new Set();
        if (slideSecao && FILE_KEY_MAP[slideSecao]) toExtract.add(slideSecao);
        if (expandidoId?.startsWith('prog-')) {
            const progId = expandidoId.replace('prog-', '');
            const secao = SECOES_PROGRAMA.find(s => s.id === progId);
            if (secao && FILE_KEY_MAP[secao.numero]) toExtract.add(secao.numero);
        }
        for (const targetNumero of toExtract) {
            if (extractedRef.current.has(targetNumero)) continue;
            extractedRef.current.add(targetNumero);
            const fileKey = FILE_KEY_MAP[targetNumero];
            (async () => {
                try {
                    const resp = await fetch(`/portfolio/${fileKey}.pptx`);
                    if (!resp.ok) throw new Error('PPTX não encontrado');
                    const buf = await resp.arrayBuffer();
                    const zip = await JSZip.loadAsync(buf);
                    const slides = [];
                    zip.forEach((p) => { if (p.match(/^ppt\/slides\/slide\d+\.xml$/)) slides.push(p); });
                    slides.sort((a, b) => {
                        const na = parseInt(a.match(/\d+/)[0], 10);
                        const nb = parseInt(b.match(/\d+/)[0], 10);
                        return na - nb;
                    });
                    // Extrai números de contrato de cada slide (texto solto, sem tabelas)
                    const rawOrder = [];
                    const seenRaw = new Set();
                    for (const sp of slides) {
                        const xml = await zip.file(sp).async('string');
                        const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                        // Captura "CONTRATO NNNN/AAAA" ou "CONTRATO NNNN/AAAA/AAAA" (ano duplicado)
                        const m = text.match(/CONTRATO\s+(\d{1,4}\/\d{4}(?:\/\d{4})?)/);
                        if (m) {
                            const fullKey = m[1];
                            // Só remove zero-padding pra dedup, preserva ano duplicado
                            const dedupKey = fullKey.replace(/^0+(\d)/, '$1');
                            if (!seenRaw.has(dedupKey)) { seenRaw.add(dedupKey); rawOrder.push(fullKey); }
                        }
                    }
                    // DB lookup — indexa pela chave exata (preserva ano duplicado)
                    const dbMap = new Map();
                    if (portfolio?.byStatus) for (const g of portfolio.byStatus)
                        for (const c of g.contratos) {
                            const raw = (c.cd_contrato || '').replace(/^0+/, '');
                            dbMap.set(raw, c);
                        }
                    // Monta na ordem do PPTX
                    const ordered = rawOrder.map(key => {
                        const cleaned = key.replace(/^0+(\d)/, '$1');
                        const db = dbMap.get(cleaned);
                        return {
                            cd_contrato: key,
                            lote: db?.lote || '',
                            status: db?.situacao_atual || '',
                            objeto: db?.objeto || '',
                            vl_total: db?.vl_total || 0,
                            vl_total_medido: db?.vl_total_medido || 0,
                        };
                    });
                    console.log(`[Portfolio] Ordem PPTX seção ${targetNumero}:`, ordered.map(c => c.cd_contrato));
                    setSlideOrders(prev => ({ ...prev, [targetNumero]: ordered }));
                } catch (e) { console.error(`[Portfolio] Erro PPTX seção ${targetNumero}:`, e); }
            })();
        }
    }, [slideSecao, expandidoId, portfolio]);

    // ─── Carrega dados do portfolio e comparação ──────────────
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                // 1. Sempre carrega os dados principais do banco (com byStatus)
                const data = await apiService.getPortfolio({});
                setPortfolio(data);

                // 2. Tenta carregar comparação com PPTX (se disponível)
                try {
                    const cmp = await apiService.compararPortfolio();
                    setComparacao(cmp);
                } catch (e) {
                    console.warn('[Portfolio] Comparação indisponível:', e.message);
                    setComparacao({ stats: null, divisoes: [] });
                }

                setError(null);
            } catch (e) {
                console.error('[Portfolio]', e);
                setError('Erro ao carregar dados do portfolio.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ─── Download do Portfolio ─────────────────────────────────
    const handleDownload = async () => {
        setBaixando(true);
        try {
            const blob = await apiService.downloadPortfolio();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'portfolio.pptx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('[Portfolio] Erro ao baixar:', e);
        } finally {
            setBaixando(false);
        }
    };

    // ─── Upload do Portfolio ───────────────────────────────────
    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            await apiService.uploadPortfolio(file);
            window.location.reload();
        } catch (err) {
            console.error('[Portfolio] Upload error:', err);
            alert('Erro ao enviar arquivo: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };


    // ─── Agrupamento por Situação ───────────────────────────────
    const statusOrdenado = useMemo(() => {
        if (!portfolio?.byStatus) return [];
        const map = new Map(portfolio.byStatus.map(s => [s.status, s]));
        const ordenados = [];
        const adicionados = new Set();
        for (const st of STATUS_ORDEM) {
            if (map.has(st)) {
                ordenados.push(map.get(st));
                adicionados.add(st);
            }
        }
        for (const [st, grupo] of map) {
            if (!adicionados.has(st)) ordenados.push(grupo);
        }
        return ordenados;
    }, [portfolio]);

    // ─── Agrupamento por Programa (seguindo PPT) ────────────────
    const programasAgrupados = useMemo(() => {
        if (!portfolio?.byStatus) return [];

        // Junta todos os contratos de todos os status
        const todosContratos = [];
        for (const grupo of portfolio.byStatus) {
            for (const c of grupo.contratos) {
                todosContratos.push({ ...c, _status: grupo.status });
            }
        }

        // Marca contratos já alocados
        const alocados = new Set();

        // Agrupa por segmento/sigla
        const resultado = SECOES_PROGRAMA.map(secao => {
            const contracts = todosContratos.filter(c => {
                const seg = (c.segmento || '').toLowerCase();
                const match = secao.keywords.some(kw => seg.includes(kw));
                if (match) alocados.add(c.cd_contrato + '|' + c.nu_bloco);
                return match;
            });

            const totalValor = contracts.reduce((acc, c) => acc + c.vl_total, 0);
            const totalMedido = contracts.reduce((acc, c) => acc + c.vl_total_medido, 0);
            const byStatus = {};
            for (const c of contracts) {
                const s = c._status || 'Sem status';
                if (!byStatus[s]) byStatus[s] = { status: s, contratos: [], totalValor: 0, count: 0 };
                byStatus[s].contratos.push(c);
                byStatus[s].totalValor += c.vl_total;
                byStatus[s].count++;
            }

            return {
                ...secao,
                contratos: contracts,
                count: contracts.length,
                totalValor,
                totalMedido,
                byStatus: Object.values(byStatus).sort((a, b) => STATUS_ORDEM.indexOf(a.status) - STATUS_ORDEM.indexOf(b.status)),
            };
        });

        // Contratos não alocados em nenhuma seção → "Outros"
        const outros = todosContratos.filter(c => !alocados.has(c.cd_contrato + '|' + c.nu_bloco));
        if (outros.length > 0) {
            const totalValor = outros.reduce((acc, c) => acc + c.vl_total, 0);
            const totalMedido = outros.reduce((acc, c) => acc + c.vl_total_medido, 0);
            const byStatus = {};
            for (const c of outros) {
                const s = c._status || 'Sem status';
                if (!byStatus[s]) byStatus[s] = { status: s, contratos: [], totalValor: 0, count: 0 };
                byStatus[s].contratos.push(c);
                byStatus[s].totalValor += c.vl_total;
                byStatus[s].count++;
            }
            resultado.push({
                id: 'outros',
                label: 'OUTROS — DEMAIS CONTRATOS',
                sigla: 'OUTROS',
                keywords: [],
                contratos: outros,
                count: outros.length,
                totalValor,
                totalMedido,
                byStatus: Object.values(byStatus).sort((a, b) => STATUS_ORDEM.indexOf(a.status) - STATUS_ORDEM.indexOf(b.status)),
            });
        }

        // Filtra só programas com contratos
        return resultado.filter(p => p.count > 0);
    }, [portfolio]);

    const copiar = (texto, id) => {
        navigator.clipboard.writeText(texto).then(() => {
            setCopiado(id);
            setTimeout(() => setCopiado(null), 2000);
        });
    };

    const getStatusColor = (s) => STATUS_CORES[s] || 'bg-slate-100 text-slate-700 border-slate-200';

    // ─── Ordenação da tabela de upload ─────────────────────────
    const handleUpSort = (key) => {
        setUpSortConfig(prev => {
            if (prev.key !== key) return { key, direction: 'asc' };
            if (prev.direction === 'asc') return { key, direction: 'desc' };
            return { key: null, direction: null };
        });
    };
    const toggleExpandir = (id) => setExpandidoId(prev => prev === id ? null : id);

    // ─── Loading ───────────────────────────────────────────────
    if (loading && !portfolio) {
        return (
            <div className="space-y-5">
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96 mb-6" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <Skeleton className="h-48 rounded-xl" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle size={48} className="text-amber-400 mb-4" strokeWidth={1.5} />
                <h2 className="text-lg font-semibold text-slate-700 mb-2">Portfolio Indisponível</h2>
                <p className="text-sm text-slate-400 text-center max-w-md">{error}</p>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════
    return (
        <div className="space-y-6">
            {/* ─── Detail Panel ────────────────────────────────── */}
            {selectedContratoId && (
                <ContractDetail
                    contratoId={selectedContratoId}
                    onClose={() => setSelectedContratoId(null)}
                />
            )}

            {/* ─── Header ─────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Portfolio de Contratos
                        </h1>
                        {portfolio?.ultimaAtualizacao && (
                            <Badge variant="info" size="sm" className="text-[10px]">
                                <Clock size={10} className="mr-1" />
                                {formatDate(portfolio.ultimaAtualizacao?.split('T')[0])}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400">
                        Portfolio completo de obras — DMA
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={handleDownload} disabled={baixando}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold transition-all shadow-sm shrink-0">
                        <Download size={14} />
                        {baixando ? 'Baixando...' : 'Baixar (.pptx)'}
                    </button>
                </div>
            </div>

            {/* ─── Comparação: PPTX vs Banco ───────────────────── */}
            {comparacao ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <Card className="p-3 sm:p-5 border border-slate-100/80">
                            <p className="text-[8px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">No Portfolio</p>
                            <p className="text-lg sm:text-2xl font-bold text-slate-900">{comparacao.stats?.total_portfolio_contratos || 0}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">contratos extraídos do PPTX</p>
                        </Card>
                        <Card className="p-3 sm:p-5 border border-slate-100/80">
                            <p className="text-[8px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider">No Banco</p>
                            <p className="text-lg sm:text-2xl font-bold text-slate-900">{comparacao.stats?.total_db_contratos || 0}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">contratos na base de dados</p>
                        </Card>
                        <Card className="p-3 sm:p-5 border border-emerald-100/50">
                            <p className="text-[8px] sm:text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Presentes</p>
                            <p className="text-lg sm:text-2xl font-bold text-emerald-700">{comparacao.stats?.presentes_no_db || 0}</p>
                            <p className="text-[9px] text-emerald-500 mt-0.5">contratos encontrados na base</p>
                        </Card>
                        <Card className="p-3 sm:p-5 border border-amber-100/50">
                            <p className="text-[8px] sm:text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Ausentes</p>
                            <p className="text-lg sm:text-2xl font-bold text-amber-700">{comparacao.stats?.ausentes_no_db || 0}</p>
                            <p className="text-[9px] text-amber-500 mt-0.5">contratos NÃO encontrados na base</p>
                        </Card>
                    </div>

                    {comparacao.stats?.total_discrepancias > 0 && (
                        <Card className="p-4 border border-amber-100/80 bg-amber-50/30">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={16} className="text-amber-500 shrink-0" />
                                <p className="text-xs font-semibold text-amber-700">
                                    {comparacao.stats.total_discrepancias} contratos com discrepâncias detectadas
                                </p>
                            </div>
                        </Card>
                    )}

                    <div className="space-y-3">
                        {comparacao.divisoes?.map((div) => {
                            const exp = expandidoId === 'cmp-' + div.divisao;
                            const totalDisc = div.contratos.reduce((a, c) => a + (c.discrepancias?.length || 0), 0);
                            return (
                                <Card key={div.divisao} className="border border-slate-100/80 overflow-hidden">
                                    <div className="p-4 sm:p-5 cursor-pointer" onClick={() => setExpandidoId(exp ? null : 'cmp-' + div.divisao)}>
                                        <div className="flex items-start justify-between flex-wrap gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-slate-800 truncate">{div.divisao}</p>
                                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                    <span className="text-xs font-semibold text-slate-500">{div.total_portfolio} itens</span>
                                                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                                        <CheckCircle size={12} />{div.presentes_db} na base
                                                    </span>
                                                    {div.ausentes_db?.length > 0 && (
                                                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                                                            <XCircle size={12} />{div.ausentes_db.length} ausentes
                                                        </span>
                                                    )}
                                                    {totalDisc > 0 && (
                                                        <span className="flex items-center gap-1 text-xs font-semibold text-rose-500">
                                                            <AlertCircle size={12} />{totalDisc} discrep.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {exp ? <ChevronUp size={18} className="text-emerald-500 shrink-0" /> : <ChevronDown size={18} className="text-slate-300 shrink-0" />}
                                        </div>
                                        <div className="mt-3 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: Math.min((div.presentes_db / Math.max(div.total_portfolio, 1)) * 100, 100) + '%',
                                                    backgroundColor: div.total_portfolio === div.presentes_db ? '#10b981' : '#f59e0b'
                                                }} />
                                        </div>
                                    </div>

                                    {exp && (
                                        <div className="border-t border-slate-100">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-[11px]">
                                                    <thead>
                                                        <tr className="bg-slate-50/80">
                                                            <th className="text-left px-4 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Contrato</th>
                                                            <th className="text-left px-4 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Lote</th>
                                                            <th className="text-left px-4 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Status PPTX</th>
                                                            <th className="text-left px-4 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Status Base</th>
                                                            <th className="text-right px-4 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Valor PPTX</th>
                                                            <th className="text-right px-4 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Valor Base</th>
                                                            <th className="text-center px-4 py-2.5 font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {(() => {
                                                            const resumos = div.contratos.filter(c => c.tipo === 'resumo');
                                                            const linhas = [];
                                                            // Agrupa primeiro por segmento (ordenado), depois por status
                                                            const segmentos = {};
                                                            for (const c of div.contratos) {
                                                                if (c.tipo === 'resumo') continue;
                                                                const seg = c._segmento || c.banco?.segmento || 'Outros';
                                                                if (!segmentos[seg]) segmentos[seg] = { nome: seg, ordem: c._ordemSeg ?? 99, andamento: [], concluido: [] };
                                                                if (c._grupoStatus === 'Concluído' || c._grupoStatus === 'Concluido') {
                                                                    segmentos[seg].concluido.push(c);
                                                                } else {
                                                                    segmentos[seg].andamento.push(c);
                                                                }
                                                            }
                                                            // Ordena segmentos por ordem
                                                            const segOrdenados = Object.values(segmentos).sort((a, b) => a.ordem - b.ordem);
                                                            // Ordena contratos dentro de cada status por lote (numerico)
                                                            const sortLote = (arr) => arr.sort((x, y) => {
                                                                const lx = parseInt(x.banco?.lote, 10) || 999;
                                                                const ly = parseInt(y.banco?.lote, 10) || 999;
                                                                return lx - ly;
                                                            });
                                                            for (const s of segOrdenados) { sortLote(s.andamento); sortLote(s.concluido); }
                                                            for (const seg of segOrdenados) {
                                                                // Sub-header do segmento
                                                                linhas.push(
                                                                    <tr key={`seg-${seg.nome}`} className="bg-emerald-100/40">
                                                                        <td colSpan={7} className="px-4 py-2">
                                                                            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                                                                                {seg.nome} — {seg.andamento.length + seg.concluido.length} contratos
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                                for (const grupo of ['andamento', 'concluido']) {
                                                                    const lista = seg[grupo];
                                                                    if (!lista?.length) continue;
                                                                    const label = grupo === 'andamento' ? 'Andamento' : 'Concluído';
                                                                    linhas.push(
                                                                        <tr key={`seg-${seg.nome}-${grupo}`} className="bg-slate-100/60">
                                                                            <td colSpan={7} className="px-4 py-1.5">
                                                                                <span className={'text-[10px] font-bold uppercase tracking-wider ' + (grupo === 'andamento' ? 'text-blue-600' : 'text-emerald-600')}>
                                                                                    {label} — {lista.length} contrato{(lista.length > 1 ? 's' : '')}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                    for (const c of lista) {
                                                                        const temDisc = c.discrepancias?.length > 0;
                                                                    const normStatus = (s) => {
                                                                        if (!s) return '';
                                                                        const lower = s.toLowerCase().trim();
                                                                        if (lower.includes('concluído') || lower.includes('concluido') || lower.includes('finalizado') || lower.includes('executado')) return 'terminal';
                                                                        if (lower === 'trp' || lower === 'trd') return 'terminal';
                                                                        return s;
                                                                    };
                                                                    const statusMatch = !c.banco || normStatus(c.portfolio?.status) === normStatus(c.banco?.status);
                                                                    const valorMatch = !c.banco || Math.abs((c.portfolio?.valor || 0) - (c.banco?.valor || 0)) < 0.01;
                                                                    linhas.push(
                                                                        <tr key={c.contrato} className={'transition-colors ' + (temDisc ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50/30')}>
                                                                            <td className="px-4 py-2.5">
                                                                                <div className="flex items-center gap-2">
                                                                                    {!c.no_banco ? <XCircle size={12} className="text-amber-400 shrink-0" />
                                                                                        : temDisc ? <AlertCircle size={12} className="text-rose-400 shrink-0" />
                                                                                        : <CheckCircle size={12} className="text-emerald-500 shrink-0" />}
                                                                                    <button onClick={() => setSelectedContratoId(c.contrato)}
                                                                                        className={'font-semibold underline decoration-dotted underline-offset-2 hover:text-emerald-600 transition-colors ' + (!c.banco ? 'text-amber-600' : temDisc ? 'text-rose-700' : 'text-slate-800')}>
                                                                                        {c.contrato}
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-2.5">
                                                                                <span className="text-[11px] text-slate-600 font-medium">
                                                                                    {c.banco?.lote || '—'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-2.5">
                                                                                <Badge className={'text-[9px] ' + (STATUS_CORES[c.portfolio?.status] || 'bg-slate-100 text-slate-700')}>
                                                                                    {c.portfolio?.status || '---'}
                                                                                </Badge>
                                                                            </td>
                                                                            <td className="px-4 py-2.5">
                                                                                {c.banco ? (
                                                                                    <Badge className={'text-[9px] ' + (STATUS_CORES[c.banco.status] || 'bg-slate-100 text-slate-700')}>
                                                                                        {c.banco.status}
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge className="text-[9px] bg-amber-50 text-amber-600 border-amber-200">Ausente</Badge>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                                                                                {c.portfolio ? formatCurrency(c.portfolio.valor) : '---'}
                                                                            </td>
                                                                            <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                                                                                {c.banco ? formatCurrency(c.banco.valor) : '---'}
                                                                            </td>
                                                                            <td className="px-4 py-2.5 text-center">
                                                                                {!c.banco ? (
                                                                                    <Badge className="text-[9px] bg-amber-50 text-amber-600 border-amber-200">Ausente</Badge>
                                                                                ) : temDisc ? (
                                                                                    <div className="flex flex-wrap gap-1 justify-center">
                                                                                        {!statusMatch && <Badge className="text-[8px] bg-amber-50 text-amber-700 border-amber-200">Status ≠</Badge>}
                                                                                        {!valorMatch && <Badge className="text-[8px] bg-rose-50 text-rose-700 border-rose-200">Valor ≠</Badge>}
                                                                                    </div>
                                                                                ) : (
                                                                                    <Badge className="text-[9px] bg-emerald-50 text-emerald-600 border-emerald-200">OK</Badge>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                }
                                                            }
                                                            }
                                                            // Resumos por ultimo
                                                            for (const c of resumos) {
                                                                linhas.push(
                                                                    <tr key={c.titulo || Math.random()} className="bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors">
                                                                        <td colSpan={7} className="px-4 py-3">
                                                                            <div className="flex items-start gap-3">
                                                                                <Layers size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-xs font-bold text-emerald-800">
                                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase mr-1.5">Resumo do Slide</span>
                                                                                        {c.titulo || 'Resumo'}
                                                                                    </p>
                                                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-600">
                                                                                        {c.lotes && <span><span className="font-semibold text-slate-500">Lotes:</span> {c.lotes.replace(/^LOTES:\s*/i, '')}</span>}
                                                                                        {c.municipios && <span className="text-emerald-600">{c.municipios}</span>}
                                                                                        {c.extensao && <span>{c.extensao}</span>}
                                                                                        {c.valor > 0 && <span className="font-semibold text-emerald-700">{formatCurrency(c.valor)}</span>}
                                                                                    </div>
                                                                                </div>
                                                                                <Badge className={'text-[9px] shrink-0 ' + (STATUS_CORES[c.status] || 'bg-slate-100 text-slate-700')}>
                                                                                    {c.status || '---'}
                                                                                </Badge>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }
                                                            return linhas;
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </>
            ) : null}

            {/* ─── Split layout: portfolio + slide ───── */}
            <div className={`flex flex-col-reverse lg:flex-row ${slideSecao ? 'lg:gap-4' : ''}`}>
                <div className={slideSecao ? 'w-full lg:w-[42%] min-w-0' : 'w-full'}>
                    {/* ─── Programas: seções do portfolio ───── */}
                    {portfolio && programasAgrupados.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-6 rounded-full bg-emerald-600" />
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Portfolio por Seções</h2>
                            </div>
                            {programasAgrupados.map((prog) => {
                        const isExpanded = expandidoId === 'prog-' + prog.id;
                        return (
                            <Card key={prog.id} className="border border-slate-100/80 overflow-hidden">
                                <div className="p-4 sm:p-5 cursor-pointer" onClick={() => setExpandidoId(isExpanded ? null : 'prog-' + prog.id)}>
                                    <div className="flex items-start justify-between flex-wrap gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {prog.numero && (
                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold">{prog.numero}</span>
                                                )}
                                                <p className="text-sm font-bold text-slate-800">{prog.label}</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                                                <span className="text-xs font-semibold text-slate-500">{prog.count} contratos</span>
                                                <span className="text-xs text-slate-500">
                                                    Total: <span className="font-semibold text-emerald-600">{formatCurrencyShort(prog.totalValor)}</span>
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    Medido: <span className="font-semibold text-blue-600">{formatCurrencyShort(prog.totalMedido)}</span>
                                                </span>
                                                {prog.totalValor > 0 && (
                                                    <span className="text-xs font-semibold text-slate-500">
                                                        {((prog.totalMedido / prog.totalValor) * 100).toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {prog.byStatus.map(s => (
                                                    <Badge key={s.status} className={getStatusColor(s.status)}>
                                                        {s.status}: {s.count}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSlideSecao(slideSecao === prog.numero ? null : prog.numero); setExpandidoId('prog-' + prog.id); }}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                                                    slideSecao === prog.numero
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                                                }`}
                                            >
                                                <Presentation size={14} />
                                                {slideSecao === prog.numero ? 'Fechar Slide' : 'Ver Slide'}
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-medium text-slate-400">Expandir</span>
                                                {isExpanded ? <ChevronUp size={18} className="text-emerald-500" /> : <ChevronDown size={18} className="text-slate-300" />}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700 ease-out"
                                            style={{
                                                width: Math.min((prog.totalMedido / Math.max(prog.totalValor, 1)) * 100, 100) + '%',
                                                background: 'linear-gradient(90deg, #10b981, #34d399)'
                                            }}
                                        />
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-slate-100">
                                        {slideOrders[prog.numero] ? (
                                            <div className="divide-y divide-slate-50">
                                                {slideOrders[prog.numero].map((c) => (
                                                    <div key={c.cd_contrato}
                                                        className="px-4 sm:px-5 py-3 hover:bg-slate-50/50 transition-colors">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <button onClick={() => setSelectedContratoId(c.cd_contrato)}
                                                                        className="text-xs font-bold text-emerald-700 hover:text-emerald-600 underline decoration-dotted underline-offset-2 transition-colors">
                                                                        {c.cd_contrato}
                                                                    </button>
                                                                    {c.lote && (
                                                                        <span className="text-[10px] font-medium text-slate-400">Lote {c.lote}</span>
                                                                    )}
                                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getStatusColor(c.status)}`}>
                                                                        {c.status || '---'}
                                                                    </span>
                                                                </div>
                                                                {c.objeto && (
                                                                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{c.objeto}</p>
                                                                )}
                                                            </div>
                                                            <div className="text-right shrink-0 min-w-[140px]">
                                                                <div className="flex items-center justify-end mb-1">
                                                                    <span className="text-xs font-semibold text-slate-700">{formatCurrency(c.vl_total)}</span>
                                                                </div>
                                                                {c.vl_total > 0 && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div className="h-full rounded-full transition-all duration-500"
                                                                                style={{
                                                                                    width: Math.min((c.vl_total_medido / c.vl_total) * 100, 100) + '%',
                                                                                    backgroundColor: (c.vl_total_medido / c.vl_total) > 0.8 ? '#10b981' : (c.vl_total_medido / c.vl_total) > 0.4 ? '#f59e0b' : '#ef4444'
                                                                                }} />
                                                                        </div>
                                                                        <span className="text-[9px] font-semibold text-slate-500">
                                                                            {((c.vl_total_medido / c.vl_total) * 100).toFixed(1)}%
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            prog.byStatus.map((grupo) => (
                                                <div key={grupo.status}>
                                                    <div className="px-4 sm:px-5 py-2 bg-slate-50/80 border-b border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${grupo.status === 'Andamento' ? 'bg-blue-500' : grupo.status === 'Concluído' || grupo.status === 'Finalizado' ? 'bg-emerald-500' : grupo.status === 'Paralisado' ? 'bg-amber-500' : grupo.status === 'Rescindido' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{grupo.status}</span>
                                                            <span className="text-xs text-slate-400">— {grupo.count} contrato{grupo.count !== 1 ? 's' : ''}</span>
                                                            <span className="text-xs font-semibold text-emerald-600 ml-auto">{formatCurrencyShort(grupo.totalValor)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="divide-y divide-slate-50">
                                                        {grupo.contratos.map((c) => (
                                                            <div key={c.cd_contrato + '|' + c.nu_bloco}
                                                                className="px-4 sm:px-5 py-3 hover:bg-slate-50/50 transition-colors">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <button onClick={() => setSelectedContratoId(c.cd_contrato)}
                                                                                className="text-xs font-bold text-emerald-700 hover:text-emerald-600 underline decoration-dotted underline-offset-2 transition-colors">
                                                                                {c.cd_contrato}
                                                                            </button>
                                                                            {c.lote && (
                                                                                <span className="text-[10px] font-medium text-slate-400">Lote {c.lote}</span>
                                                                            )}
                                                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getStatusColor(c._status || c.status)}`}>
                                                                                {c._status || c.status || '---'}
                                                                            </span>
                                                                        </div>
                                                                        {c.objeto && (
                                                                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{c.objeto}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right shrink-0 min-w-[140px]">
                                                                        <div className="flex items-center justify-end mb-1">
                                                                            <span className="text-xs font-semibold text-slate-700">{formatCurrency(c.vl_total)}</span>
                                                                        </div>
                                                                        {c.vl_total > 0 && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                    <div className="h-full rounded-full transition-all duration-500"
                                                                                        style={{
                                                                                            width: Math.min((c.vl_total_medido / c.vl_total) * 100, 100) + '%',
                                                                                            backgroundColor: (c.vl_total_medido / c.vl_total) > 0.8 ? '#10b981' : (c.vl_total_medido / c.vl_total) > 0.4 ? '#f59e0b' : '#ef4444'
                                                                                        }} />
                                                                                </div>
                                                                                <span className="text-[9px] font-semibold text-slate-500">
                                                                                    {((c.vl_total_medido / c.vl_total) * 100).toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                        </div>
                    )}
                </div>

                {slideSecao && (
                    <div className="w-full lg:w-[58%] shrink-0">
                        <div className="lg:sticky lg:top-4" style={{ height: 'clamp(400px, 70vh, 90vh)' }}>
                            <SlideViewer
                                secaoNumero={slideSecao}
                                onClose={() => setSlideSecao(null)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Portfolio;
