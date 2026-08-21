import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PptxRenderer } from 'pptx-svg';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

const SECAO_TO_FILE = {
    '01': '01-conserva',
    '02': '02-supervisao',
    '03': '03-gmm',
    '04': '04-gme',
    '05': '05-gmk',
    '06': '06-gmp',
    '07': '07-pmr',
    '08': '08-oaes-oacs',
    '09': '09-melhoria',
    '10': '10-implantacao',
    '11': '11-emergencial',
    '12': '12-microrevest',
    '13': '13-corte-serra',
    '14': '14-obras-diversas',
};

const SECOES = {
    '01': '01. SERVIÇOS DE MANUTENÇÃO DA MALHA RODOVIÁRIA',
    '02': '02. SUPERVISÃO DA MANUTENÇÃO RODOVIÁRIA',
    '03': '03. GMM — GOIÁS EM MOVIMENTO MUNICÍPIOS',
    '04': '04. GME — GOIÁS EM MOVIMENTO ESTRUTURAS',
    '05': '05. GMK — GOIÁS EM MOVIMENTO KALUNGAS',
    '06': '06. GMP — PATRULHAS MECÂNICAS',
    '07': '07. PMR — PROGRAMA DE MELHORAMENTO RODOVIÁRIO',
    '08': '08. OAEs, OACs',
    '09': '09. SUPERVISÃO DE MELHORIAS / MELHORIA FUNCIONAL',
    '10': '10. IMPLANTAÇÃO',
    '11': '11. EMERGENCIAL',
    '12': '12. MICRORREVESTIMENTO ASFÁLTICO',
    '13': '13. CORTE DE SERRA',
    '14': '14. AERÓDROMOS ou OBRAS DIVERSAS',
};

function getSecaoLabel(numero) {
    return SECOES[numero] || `Seção ${numero}`;
}

const SlideViewer = ({ secaoNumero, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [svg, setSvg] = useState(null);
    const [slideCount, setSlideCount] = useState(0);
    const [slideIdx, setSlideIdx] = useState(0);
    const [zoom, setZoom] = useState(0.8);
    const rendererRef = useRef(null);
    const loadingRef = useRef(false);
    const initRef = useRef(false);

    const renderSlide = useCallback((r, idx) => {
        const s = r.renderSlideSvg(idx);
        if (s.startsWith('ERROR:')) return null;
        return s;
    }, []);

    const loadPptx = useCallback(async () => {
        if (!secaoNumero || loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        setError(null);
        setSvg(null);
        setSlideIdx(0);

        const fileKey = SECAO_TO_FILE[secaoNumero];
        if (!fileKey) {
            setError('Seção sem arquivo de slide');
            setLoading(false);
            loadingRef.current = false;
            return;
        }

        try {
            const resp = await fetch(`/portfolio/${fileKey}.pptx`);
            if (!resp.ok) throw new Error('Arquivo não encontrado');
            const buf = await resp.arrayBuffer();

            if (!initRef.current) {
                const r = new PptxRenderer({ logLevel: 'error' });
                await r.init('/main.wasm');
                rendererRef.current = r;
                initRef.current = true;
            }

            const result = await rendererRef.current.loadPptx(buf);
            setSlideCount(result.slideCount);

            const svgStr = renderSlide(rendererRef.current, 0);
            if (!svgStr) throw new Error('Falha ao renderizar slide');
            setSvg(svgStr);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [secaoNumero, renderSlide]);

    useEffect(() => {
        loadPptx();
        return () => { loadingRef.current = false; };
    }, [loadPptx]);

    const goSlide = useCallback((idx) => {
        if (!rendererRef.current) return;
        const svgStr = renderSlide(rendererRef.current, idx);
        if (!svgStr) return;
        setSvg(svgStr);
        setSlideIdx(idx);
    }, [renderSlide]);

    if (!secaoNumero) return null;

    return (
        <div className="h-full flex flex-col bg-white rounded-xl border border-emerald-100/60 shadow-sm overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border-b border-emerald-100/80 shrink-0 gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-slate-800 truncate">
                        {getSecaoLabel(secaoNumero)}
                    </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(2)))}
                        className="p-1 rounded hover:bg-white/60 text-slate-500 transition-colors">
                        <ZoomOut size={14} />
                    </button>
                    <span className="text-[10px] font-semibold text-slate-500 w-8 text-center tabular-nums">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))}
                        className="p-1 rounded hover:bg-white/60 text-slate-500 transition-colors">
                        <ZoomIn size={14} />
                    </button>
                </div>
                <button onClick={onClose}
                    className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                    <X size={15} />
                </button>
            </div>

            {/* content */}
            <div className="flex-1 min-h-0 flex flex-col bg-slate-50">
                {loading && (
                    <div className="flex-1 flex items-center justify-center gap-2 text-slate-400">
                        <div className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                        <span className="text-[11px]">Carregando...</span>
                    </div>
                )}
                {error && (
                    <div className="flex-1 flex items-center justify-center text-red-400 px-4">
                        <span className="text-[11px] font-medium">{error}</span>
                    </div>
                )}
                {svg && !loading && (
                    <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center p-2">
                        <div style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: 'center center',
                        }}>
                            <div dangerouslySetInnerHTML={{ __html: svg }} />
                        </div>
                    </div>
                )}
            </div>

            {/* slide navigation */}
            {slideCount > 1 && (
                <div className="flex items-center justify-center gap-3 py-1.5 bg-white border-t border-slate-100 shrink-0">
                    <button onClick={() => goSlide(Math.max(0, slideIdx - 1))}
                        disabled={slideIdx === 0}
                        className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 transition-colors">
                        <ChevronLeft size={14} />
                    </button>
                    <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
                        {slideIdx + 1} / {slideCount}
                    </span>
                    <button onClick={() => goSlide(Math.min(slideCount - 1, slideIdx + 1))}
                        disabled={slideIdx === slideCount - 1}
                        className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 transition-colors">
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default SlideViewer;
