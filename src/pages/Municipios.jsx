import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MapPin, DollarSign, Download, X,
  Maximize2, Minimize2,
  ChevronDown, ChevronRight, ExternalLink
} from 'lucide-react';
import {
  MapContainer, TileLayer, ZoomControl, useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { formatCurrency } from '../utils/formatters';
import api from '../services/api.service';
import { useDashboardContext } from '../layouts/DashboardLayout';
import MUNICIPIO_COORDS from '../data/municipio-coords';
import Card from '../components/ui/Card';
import ContractDetail from '../components/contract/ContractDetail';

const CORES = [
  '#059669', '#0d9488', '#0891b2', '#0284c7', '#5865f2',
  '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48',
  '#ea580c', '#ca8a04', '#65a30d', '#16a34a', '#14b8a6'
];

function getCor(segmento) {
  if (!segmento) return '#94a3b8';
  let hash = 0;
  for (let i = 0; i < segmento.length; i++) hash = segmento.charCodeAt(i) + ((hash << 5) - hash);
  return CORES[Math.abs(hash) % CORES.length];
}

function criarIcone(cor) {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${cor}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`,
    className: 'municipio-marker',
    iconSize: [24, 36],
    iconAnchor: [12, 36]
  });
}

const GOIAS_BOUNDS = L.latLngBounds([-20.0, -53.5], [-11.9, -45.5]);

function findCoords(nome) {
  let c = MUNICIPIO_COORDS[nome];
  if (c) return c;
  const semNumero = nome.replace(/\s+\d+[\d,.]*$/, '').trim();
  c = MUNICIPIO_COORDS[semNumero];
  if (c) return c;
  const semAcento = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  c = MUNICIPIO_COORDS[semAcento];
  if (c) return c;
  const baseSemAcento = semNumero.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  c = MUNICIPIO_COORDS[baseSemAcento];
  if (c) return c;
  return null;
}

function PanToHandler({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.panTo(coords, { animate: true, duration: 0.4 });
  }, [coords, map]);
  return null;
}

function criarIconeCluster(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 50 ? 44 : 54;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:rgba(5,150,105,0.15);
      border:3px solid #059669;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${count < 100 ? 13 : 11}px;
      font-weight:700;color:#059669;
      box-shadow:0 2px 8px rgba(5,150,105,0.3);
    ">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapMarkers({ marcadores, onSelect }) {
  const map = useMap();
  const layerRef = useRef(null);
  const marcadoresRef = useRef(marcadores);
  const onSelectRef = useRef(onSelect);
  marcadoresRef.current = marcadores;
  onSelectRef.current = onSelect;

  function renderizar(camada) {
    if (!camada) return;
    camada.clearLayers();
    const validos = marcadoresRef.current.filter(d => d.pos && Array.isArray(d.pos) && d.pos.length === 2);
    validos.forEach((d) => {
      const marker = L.marker(d.pos, { icon: criarIcone('#059669') });
      marker.bindTooltip(
        `<div style="font-size:12px;font-weight:500">
            <p style="font-weight:700;font-size:14px;margin:0 0 2px">${d.municipio}</p>
            <p style="color:#059669;font-weight:600;margin:0">${formatCurrency(d.valor_total)}</p>
            <p style="color:#94a3b8;margin:0">${d.qtd_contratos} contrato(s)</p>
          </div>`,
        { direction: 'top', offset: [0, -10], className: 'rounded-lg shadow-xl border-0' }
      );
      marker.on('click', () => onSelectRef.current(d.municipio));
      camada.addLayer(marker);
    });
  }

  useEffect(() => {
    const camada = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 11,
      iconCreateFunction: criarIconeCluster,
    });
    camada.addTo(map);
    layerRef.current = camada;
    renderizar(camada);
    return () => { map.removeLayer(camada); };
  }, []);

  useEffect(() => {
    renderizar(layerRef.current);
  }, [marcadores]);

  return null;
}

function MapBoundsTracker({ onBoundsChange }) {
  const map = useMap();

  useEffect(() => {
    const handle = () => { onBoundsChange(map.getBounds()); };
    map.on('moveend', handle);
    handle();
    return () => { map.off('moveend', handle); };
  }, [map, onBoundsChange]);

  return null;
}

function dentroBounds(pos, bounds) {
  if (!bounds || !pos) return true;
  return bounds.contains(pos);
}

function groupMedicoes(medicoes) {
  const grupos = {};
  for (const m of medicoes) {
    const seg = m.segmento || 'Sem segmento';
    if (!grupos[seg]) grupos[seg] = {};
    if (!grupos[seg][m.contrato]) grupos[seg][m.contrato] = { medicoes: [], total: 0, count: 0 };
    grupos[seg][m.contrato].medicoes.push(m);
    grupos[seg][m.contrato].total += m.valor_municipio;
    grupos[seg][m.contrato].count++;
  }
  return Object.entries(grupos).map(([segmento, contratos]) => ({
    segmento,
    total: Object.values(contratos).reduce((s, c) => s + c.total, 0),
    count: Object.values(contratos).reduce((s, c) => s + c.count, 0),
    qtd_contratos: Object.keys(contratos).length,
    contratos: Object.entries(contratos).map(([contrato, data]) => ({
      contrato,
      total: data.total,
      count: data.count,
      medicoes: data.medicoes.sort((a, b) => (a.periodo_inicio || '').localeCompare(b.periodo_inicio || '')),
    })).sort((a, b) => b.total - a.total),
  })).sort((a, b) => b.total - a.total);
}

function SegmentoAccordion({ segmento, onContratoDetail }) {
  const [aberto, setAberto] = useState(true);
  const [contratoAberto, setContratoAberto] = useState(null);
  const corSeg = getCor(segmento.segmento);

  return (
    <div>
      <button onClick={() => setAberto(!aberto)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
        <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: corSeg }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 truncate flex-1">{segmento.segmento}</span>
            <span className="text-sm font-bold text-emerald-700 shrink-0">{formatCurrency(segmento.total)}</span>
            {aberto ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
          </div>
          <span className="text-xs text-slate-400">{segmento.qtd_contratos} contratos · {segmento.count} medições</span>
        </div>
      </button>
      {aberto && (
        <div className="border-t border-slate-100">
          {segmento.contratos.map((c) => (
              <div key={c.contrato}>
              <div onClick={() => setContratoAberto(contratoAberto === c.contrato ? null : c.contrato)}
                className="w-full flex items-center gap-3 pl-10 pr-4 py-2 cursor-pointer hover:bg-emerald-50/50 transition-colors">
                {contratoAberto === c.contrato
                  ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0 self-start mt-1" />
                  : <ChevronRight size={14} className="text-slate-400 flex-shrink-0 self-start mt-1" />}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-slate-700 truncate block">{c.contrato}</span>
                  <span className="text-xs text-slate-400">{c.count} medições · {formatCurrency(c.total)}</span>
                </div>
                <span onClick={(e) => { e.stopPropagation(); onContratoDetail?.(c.contrato); }}
                  className="ml-2 p-1 rounded hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors inline-flex items-center justify-center cursor-pointer shrink-0 self-start mt-1" title="Ver detalhe do contrato">
                  <ExternalLink size={14} />
                </span>
              </div>
              {contratoAberto === c.contrato && (
                <div className="bg-slate-50/50 overflow-x-auto pl-10 pr-4">
                  <table className="w-full text-xs" style={{minWidth:'700px'}}>
                    <thead>
                      <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="text-left py-2 pr-2">Período</th>
                        <th className="text-center py-2 px-2">Nº Medição</th>
                        <th className="text-right py-2 px-2">Valor Medição</th>
                        <th className="text-right py-2 px-2">%</th>
                        <th className="text-right py-2 px-2">Valor Município</th>
                        <th className="text-left py-2 pl-2">NF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.medicoes.map((m, i) => (
                        <tr key={i} className="border-b border-slate-100/80 hover:bg-white transition-colors">
                          <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">{m.periodo_inicio} — {m.periodo_fim}</td>
                          <td className="py-2 px-2 text-center text-slate-400">{m.nr_medicao}</td>
                          <td className="py-2 px-2 text-right font-medium text-slate-600 whitespace-nowrap">{formatCurrency(m.valor_total_medicao)}</td>
                          <td className="py-2 px-2 text-right text-slate-400 whitespace-nowrap">{m.percentual_municipio ? (m.percentual_municipio * 100).toFixed(1) + '%' : '-'}</td>
                          <td className="py-2 px-2 text-right font-semibold text-emerald-700 whitespace-nowrap">{formatCurrency(m.valor_municipio)}</td>
                          <td className="py-2 pl-2 text-slate-400">{m.nf || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Municipios() {
  const { selectedBlocos, selectedSegmentos, search } = useDashboardContext();
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [municipioSel, setMunicipioSel] = useState(null);
  const [detalhes, setDetalhes] = useState(null);
  const [mapFull, setMapFull] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const [panTo, setPanTo] = useState(null);
  const [contratoDetailId, setContratoDetailId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBlocos?.length > 0) params.bloco = selectedBlocos.join(',');
      if (selectedSegmentos?.length > 0) params.segmento = selectedSegmentos.join(',');
      if (search) params.busca = search;
      const { data } = await api.get('/municipios', { params });
      setDados(data.data);
    } catch (e) {
      console.error('Erro ao carregar municipios:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedBlocos, selectedSegmentos, search]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSelectMunicipio = useCallback(async (nome) => {
    setMunicipioSel(nome);
    const coords = findCoords(nome);
    if (coords) setPanTo(coords);
    try {
      const { data } = await api.get(`/municipios/${encodeURIComponent(nome)}`);
      setDetalhes(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleExport = () => {
    const headers = ['Municipio', 'Valor Total', 'Contratos', 'Segmentos', 'Periodo Inicio', 'Periodo Fim'];
    const csv = [headers.join(';'),
      ...dados.map(d => [
        `"${d.municipio}"`, d.valor_total, d.qtd_contratos, `"${d.segmentos}"`,
        d.periodo_inicio_min, d.periodo_fim_max
      ].join(';'))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'municipios.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const marcadores = useMemo(() => {
    return dados.map(d => ({ ...d, pos: findCoords(d.municipio) || [-15.8 + (Math.random() - 0.5) * 1.5, -49.3 + (Math.random() - 0.5) * 1.5], cor: getCor(d.segmentos?.split(',')[0]) }));
  }, [dados]);

  const dadosVisiveis = useMemo(() => {
    if (!mapBounds) return marcadores;
    return marcadores.filter(d => dentroBounds(d.pos, mapBounds));
  }, [marcadores, mapBounds]);

  const maxValor = useMemo(() => Math.max(...dadosVisiveis.map(d => d.valor_total), 1), [dadosVisiveis]);

  const gruposDetalhes = useMemo(() => {
    if (!detalhes?.medicoes) return [];
    return groupMedicoes(detalhes.medicoes);
  }, [detalhes]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <MapPin className="text-emerald-600" size={28} strokeWidth={2.5} />
            Dados por Município
          </h1>
          <button
            onClick={handleExport}
            disabled={loading || dados.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </button>
        </div>
        <p className="text-sm text-slate-500 font-medium mt-1">Levantamento valores medidos por município — DMA</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${mapFull ? 'lg:col-span-3' : 'lg:col-span-2'} transition-all`}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MapPin size={16} className="text-emerald-600" /> Mapa de Goiás
              </h2>
              <button onClick={() => setMapFull(!mapFull)}
                className="text-slate-400 hover:text-slate-600 transition-colors">
                {mapFull ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
            <div className="h-[500px] rounded-lg overflow-hidden border border-slate-200">
              {typeof window !== 'undefined' && (
                <MapContainer
                  center={[-15.8, -49.3]} zoom={6.5} maxZoom={14}
                  maxBounds={GOIAS_BOUNDS}
                  maxBoundsViscosity={0.5}
                  minZoom={6.5}
                  zoomSnap={0.5}
                  zoomControl={false}
                  className="h-full w-full"
                  scrollWheelZoom={true}
                >
                  <ZoomControl position="bottomright" />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapMarkers marcadores={marcadores} onSelect={handleSelectMunicipio} />
                  <MapBoundsTracker onBoundsChange={setMapBounds} />
                  <PanToHandler coords={panTo} />
                </MapContainer>
              )}
            </div>
          </Card>
        </div>

        <div className={mapFull ? 'hidden' : ''}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-600" /> Municípios
              </h2>
              <span className="text-xs font-medium text-slate-400">
                {mapBounds ? `${dadosVisiveis.length} de ` : ''}{dados.length} registros
              </span>
            </div>
            <div className="space-y-2 max-h-[440px] overflow-y-auto no-scrollbar pr-1">
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-8">Carregando municípios...</p>
              ) : dadosVisiveis.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhum município encontrado</p>
              ) : (
                dadosVisiveis.map((d) => (
                  <button key={d.municipio} onClick={() => handleSelectMunicipio(d.municipio)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-left border
                      ${municipioSel === d.municipio
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{d.municipio}</p>
                      <p className="text-xs text-slate-500">
                        {d.qtd_contratos} contrato{d.qtd_contratos !== 1 ? 's' : ''}
                        {d.segmentos && <span> · {d.segmentos.split(',').slice(0, 2).join(', ')}{d.segmentos.split(',').length > 2 ? '...' : ''}</span>}
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-bold text-slate-700">{formatCurrency(d.valor_total)}</p>
                      <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${(d.valor_total / maxValor) * 100}%` }} />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {detalhes && municipioSel && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin size={20} className="text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-800">{municipioSel}</h2>
            </div>
            <button onClick={() => { setMunicipioSel(null); setDetalhes(null); }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 text-xs font-medium transition-all">
              <X size={14} className="inline mr-1" /> Fechar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Total</p>
              <p className="text-lg sm:text-xl font-bold text-emerald-700 mt-1 break-words">{formatCurrency(detalhes.municipio?.valor_total || 0)}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Contratos</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{detalhes.municipio?.qtd_contratos || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Medições</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{detalhes.municipio?.qtd_medicoes || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Período</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {detalhes.municipio?.periodo_inicio_min || '?'} — {detalhes.municipio?.periodo_fim_max || '?'}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-200">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>{gruposDetalhes.length} segmentos</span>
              <span>{detalhes.medicoes?.length || 0} medições</span>
            </div>
            {gruposDetalhes.map((seg) => (
              <SegmentoAccordion key={seg.segmento} segmento={seg} onContratoDetail={setContratoDetailId} />
            ))}
          </div>
        </Card>
      )}

      {contratoDetailId && (
        <ContractDetail
          contratoId={contratoDetailId}
          onClose={() => setContratoDetailId(null)}
        />
      )}
    </div>
  );
}

export default Municipios;
