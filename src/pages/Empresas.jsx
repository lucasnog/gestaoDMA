import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  FileText,
  ArrowRight,
  Briefcase,
  ChevronDown,
  Download,
  LayoutGrid,
  List
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Pagination from '../components/ui/Pagination';
import ContractDetail from '../components/contract/ContractDetail';
import ExportDialog from '../components/ui/ExportDialog';
import { useDashboardContext } from '../layouts/DashboardLayout';

const Empresas = () => {
  const { contratos, loading, search } = useDashboardContext();
  const [selectedContratoId, setSelectedContratoId] = useState(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [tablePage, setTablePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Agrupar contratos por empresa
  const empresasMap = useMemo(() => {
    const map = {};
    contratos.forEach((c) => {
      const key = c.razao_social || 'Não informada';
      if (!map[key]) {
        map[key] = {
          razao_social: key,
          contratos: [],
          totalInvestido: 0,
          totalPago: 0,
        };
      }
      map[key].contratos.push(c);
      map[key].totalInvestido += parseFloat(c.vl_total || 0);
      map[key].totalPago += parseFloat(c.vl_total_pago || 0);
    });
    return map;
  }, [contratos]);

  const empresasList = useMemo(() => {
    let list = Object.values(empresasMap);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        e.razao_social.toLowerCase().includes(s) ||
        e.contratos.some(c =>
          String(c.cd_contrato || '').toLowerCase().includes(s) ||
          String(c.objeto || '').toLowerCase().includes(s) ||
          String(c.nu_bloco || '').toLowerCase().includes(s)
        )
      );
    }
    return list.sort((a, b) => b.totalInvestido - a.totalInvestido);
  }, [empresasMap, search]);

  const totalEmpresas = empresasList.length;
  const totalContratos = empresasList.reduce((acc, e) => acc + e.contratos.length, 0);

  // Flat contracts list (one row per contract with company name)
  const flatContratos = useMemo(() => {
    const rows = [];
    empresasList.forEach(e => {
      e.contratos.forEach(c => {
        rows.push({ ...c, razao_social: e.razao_social });
      });
    });
    return rows;
  }, [empresasList]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
    setTablePage(1);
  };

  useEffect(() => { setTablePage(1); }, [itemsPerPage]);

  const sortedFlat = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return flatContratos;
    return [...flatContratos].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      return sortConfig.direction === 'asc'
        ? aVal.localeCompare(bVal, 'pt-BR')
        : bVal.localeCompare(aVal, 'pt-BR');
    });
  }, [flatContratos, sortConfig]);

  const totalTablePages = Math.max(1, Math.ceil(sortedFlat.length / itemsPerPage));
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const pagedFlat = sortedFlat.slice((safeTablePage - 1) * itemsPerPage, safeTablePage * itemsPerPage);

  // Export
  const exportColumns = useMemo(() => [
    { key: 'razao_social', label: 'Empresa' },
    { key: 'nu_bloco', label: 'Bloco' },
    { key: 'cd_contrato', label: 'Contrato' },
    { key: 'lote', label: 'Lote' },
    { key: 'objeto', label: 'Objeto' },
    { key: 'segmento', label: 'Segmento' },
    { key: 'situacao_atual', label: 'Status' },
    { key: 'vl_total', label: 'Valor do Contrato' },
    { key: 'vl_total_medido', label: 'Total Medido' },
    { key: 'perc_pago', label: 'Avanço Financeiro' },
  ], []);

  const exportData = useMemo(() => {
    return flatContratos.map(c => {
      const perc = parseFloat(c.vl_total || 0) > 0
        ? ((parseFloat(c.vl_total_medido || 0) / parseFloat(c.vl_total || 0)) * 100).toFixed(1) + '%'
        : '0%';
      return {
        razao_social: c.razao_social,
        nu_bloco: c.nu_bloco || '',
        cd_contrato: c.cd_contrato || '',
        lote: c.lote || '',
        objeto: c.objeto || '',
        segmento: c.segmento || '',
        situacao_atual: c.situacao_atual || '',
        vl_total: c.vl_total || 0,
        vl_total_medido: c.vl_total_medido || 0,
        perc_pago: perc,
      };
    });
  }, [flatContratos]);

  function sortArrow(key) {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  }

  const kpiCards = [
    {
      label: 'Empresas Contratadas',
      value: totalEmpresas,
      icon: Building2,
      color: 'from-emerald-600 to-emerald-700',
      shadow: 'shadow-emerald-500/20',
    },
    {
      label: 'Total de Contratos',
      value: totalContratos,
      icon: FileText,
      color: 'from-emerald-600 to-emerald-500',
      shadow: 'shadow-emerald-500/25',
    },
    {
      label: 'Média por Empresa',
      value: totalEmpresas > 0 ? (totalContratos / totalEmpresas).toFixed(1) : '0',
      icon: Briefcase,
      color: 'from-teal-500 to-emerald-600',
      shadow: 'shadow-teal-500/20',
      sub: 'contratos/empresa',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Empresas</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            Fornecedoras e contratadas da carteira
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
            {viewMode === 'cards' ? `${totalEmpresas} empresas · ${totalContratos} contratos` : `${sortedFlat.length} contratos`}
          </span>
          <button
            onClick={() => setExportOpen(true)}
            disabled={loading || exportData.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        {kpiCards.map((kpi, idx) => (
          <Card key={idx} className="p-3 sm:p-4 lg:p-5 border border-emerald-100/50 shadow-sm hover:shadow-card transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm ${kpi.shadow} group-hover:scale-110 transition-transform duration-300`}>
                <kpi.icon size={14} className="text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">{kpi.value}</p>
            {kpi.sub && <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1">{kpi.sub}</p>}
          </Card>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              viewMode === 'cards' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Cards</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              viewMode === 'table' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Tabela</span>
          </button>
        </div>
      </div>

      {loading ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4 sm:p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-40" />
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4">
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-full" />
          </Card>
        )
      ) : flatContratos.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <Building2 size={36} className="mx-auto text-emerald-200 mb-4" strokeWidth={1.5} />
          <p className="text-sm font-medium text-slate-400">
            {search ? 'Nenhum resultado encontrado' : 'Nenhuma empresa disponível'}
          </p>
        </Card>
      ) : viewMode === 'cards' ? (
        /* ─── CARDS VIEW ──────MESMA COISA QUE ANTES───────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
          {empresasList.map((empresa) => {
            const percPago = empresa.totalInvestido > 0
              ? (empresa.totalPago / empresa.totalInvestido) * 100
              : 0;
            return (
              <Card
                key={empresa.razao_social}
                className={`p-4 sm:p-5 lg:p-6 border border-emerald-100/50 hover:shadow-card transition-all duration-200 cursor-pointer ${
                  selectedEmpresa === empresa.razao_social ? 'ring-2 ring-emerald-600/30 border-emerald-600/40' : ''
                }`}
                onClick={() => setSelectedEmpresa(
                  selectedEmpresa === empresa.razao_social ? null : empresa.razao_social
                )}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-emerald-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{empresa.razao_social}</h3>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 mt-1 transition-transform duration-200 shrink-0 ${
                      selectedEmpresa === empresa.razao_social ? 'rotate-180' : ''
                    }`}
                    strokeWidth={2}
                  />
                </div>

                <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[11px] sm:text-xs min-w-0">
                  <div className="flex items-center gap-1.5">
                    <FileText size={12} className="text-slate-400" strokeWidth={2} />
                    <span className="font-medium text-slate-600">{empresa.contratos.length} contratos</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-slate-900 truncate">{formatCurrency(empresa.totalInvestido)}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">Execução</span>
                    <span className="text-[10px] font-semibold text-slate-600">{percPago.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-emerald-100/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, percPago)}%` }}
                    />
                  </div>
                </div>

                {selectedEmpresa === empresa.razao_social && (
                  <div className="mt-4 pt-4 border-t border-emerald-100/30 space-y-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Contratos</p>
                    {empresa.contratos.map((c) => {
                      const percContrato = parseFloat(c.vl_total || 0) > 0
                        ? ((parseFloat(c.vl_total_pago || 0) / parseFloat(c.vl_total || 0)) * 100).toFixed(1)
                        : 0;
                      return (
                        <div
                          key={c.id_bloco}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContratoId(c.id_bloco);
                          }}
                          className="p-3 rounded-lg bg-emerald-50/40 hover:bg-emerald-100/40 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="success" size="sm">{c.nu_bloco}</Badge>
                              <span className="text-xs font-semibold text-slate-700">{c.cd_contrato}</span>
                              {c.lote && <span className="text-[10px] font-medium text-slate-400">· Lote {c.lote}</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalhes</span>
                              <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-600 transition-colors" strokeWidth={2} />
                            </div>
                          </div>
                          {c.objeto && (
                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 mb-1.5">{c.objeto}</p>
                          )}
                          <div className="flex items-center gap-3 text-[10px] text-slate-500">
                            <span className="font-medium text-slate-700">{formatCurrency(c.vl_total)}</span>
                            <span>Medido: {formatCurrency(c.vl_total_medido)}</span>
                            <span>Execução: {percContrato}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* ─── TABLE VIEW ────────────────────────────────────── */
        <Card padding="p-0" className="overflow-hidden">

          {/* ─── Desktop: tabela ──────────────────────── */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-emerald-100/30 bg-emerald-50/30">
                  <th onClick={() => handleSort('razao_social')} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap">Empresa{sortArrow('razao_social')}</th>
                  <th onClick={() => handleSort('nu_bloco')} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap">Bloco{sortArrow('nu_bloco')}</th>
                  <th onClick={() => handleSort('cd_contrato')} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap">Contrato{sortArrow('cd_contrato')}</th>
                  <th onClick={() => handleSort('lote')} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap">Lote{sortArrow('lote')}</th>
                  <th onClick={() => handleSort('objeto')} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none">Objeto{sortArrow('objeto')}</th>
                  <th onClick={() => handleSort('segmento')} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap">Segmento{sortArrow('segmento')}</th>
                  <th onClick={() => handleSort('situacao_atual')} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap">Status{sortArrow('situacao_atual')}</th>
                  <th onClick={() => handleSort('vl_total')} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap text-right">Valor do Contrato{sortArrow('vl_total')}</th>
                  <th onClick={() => handleSort('vl_total_medido')} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap text-right">Medido{sortArrow('vl_total_medido')}</th>
                  <th onClick={() => handleSort('perc_pago')} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 select-none whitespace-nowrap text-right">% Exec.{sortArrow('perc_pago')}</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/20">
                {pagedFlat.map((c) => {
                  const perc = parseFloat(c.vl_total || 0) > 0
                    ? ((parseFloat(c.vl_total_pago || 0) / parseFloat(c.vl_total || 0)) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <tr
                      key={c.id_bloco}
                      onClick={() => { setSelectedContratoId(c.id_bloco); setSelectedEmpresa(null); }}
                      className="text-[12px] text-slate-600 hover:bg-emerald-50/60 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{c.razao_social}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{c.nu_bloco}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{c.cd_contrato}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{c.lote || '-'}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{c.objeto}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{c.segmento}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={c.situacao_atual === 'Em Andamento' ? 'success' : c.situacao_atual === 'Rescindido' ? 'danger' : 'warning'} size="sm">
                          {c.situacao_atual || '-'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-800">{formatCurrency(c.vl_total)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(c.vl_total_medido)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{perc}%</td>
                      <td className="px-4 py-3 text-right">
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-600 transition-colors inline" strokeWidth={2} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            <Pagination page={safeTablePage} totalPages={totalTablePages} onChange={setTablePage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} />
        </Card>
      )}

      <ContractDetail
        contratoId={selectedContratoId}
        onClose={() => setSelectedContratoId(null)}
      />
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        data={exportData}
        columns={exportColumns}
        formatters={{
          vl_total: formatCurrency,
          vl_total_medido: formatCurrency,
        }}
        filename="empresas-contratos"
        title="Exportar Contratos por Empresa"
      />
    </div>
  );
};

export default Empresas;
