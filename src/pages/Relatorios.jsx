import React, { useState } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FilePieChart,
  Printer,
  Building2,
  Calendar,
  Filter,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useDashboardContext } from '../layouts/DashboardLayout';
import { formatDate } from '../utils/formatters';

const reportTypes = [
  {
    id: 'carteira',
    label: 'Carteira de Contratos',
    description: 'Relatório completo com todos os contratos, valores e prazos',
    icon: FileText,
    color: 'from-emerald-600 to-emerald-700',
    shadow: 'shadow-emerald-500/20',
    formats: ['PDF', 'XLSX', 'CSV'],
  },
  {
    id: 'financeiro',
    label: 'Relatório Financeiro',
    description: 'Resumo financeiro com totais investidos, pagos e empenhados',
    icon: FilePieChart,
    color: 'from-emerald-600 to-emerald-500',
    shadow: 'shadow-emerald-500/25',
    formats: ['PDF', 'XLSX'],
  },
  {
    id: 'medicoes',
    label: 'Relatório de Medições',
    description: 'Histórico de medições por contrato e por bloco',
    icon: FileSpreadsheet,
    color: 'from-teal-500 to-emerald-600',
    shadow: 'shadow-teal-500/20',
    formats: ['PDF', 'CSV'],
  },
  {
    id: 'criticos',
    label: 'Alertas Críticos',
    description: 'Contratos com saldo crítico ou prazo próximo do vencimento',
    icon: AlertTriangle,
    color: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/20',
    formats: ['PDF'],
  },
  {
    id: 'empresas',
    label: 'Relatório de Empresas',
    description: 'Fornecedoras contratadas com valores e contratos vinculados',
    icon: Building2,
    color: 'from-sky-500 to-blue-600',
    shadow: 'shadow-sky-500/20',
    formats: ['PDF', 'XLSX'],
  },
];

const Relatorios = () => {
  const { contratos, selectedBloco, contratosCriticos } = useDashboardContext();
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('');

  const handleGenerate = (reportId, format) => {
    // Em produção, chamaria o microsserviço Python de PDF
    console.log(`[Relatorios] Gerando ${reportId} em ${format}...`);
    console.log(`[Relatorios] Bloco filtrado: ${selectedBloco || 'Todos'}`);
    console.log(`[Relatorios] Total contratos: ${contratos.length}`);
    // Simular download
    setSelectedReport(reportId);
    setSelectedFormat(format);
    setTimeout(() => {
      setSelectedReport(null);
      setSelectedFormat('');
    }, 2000);
  };

  const isGenerating = (id) => selectedReport === id;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Relatórios</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
          Geração de relatórios gerenciais
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        <Card className="p-3 sm:p-4 lg:p-5 border border-emerald-100/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100/50 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-emerald-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold text-slate-900">{reportTypes.length}</p>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-400">Tipos de relatório</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 lg:p-5 border border-emerald-100/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100/50 flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-emerald-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold text-slate-900">{contratos.length}</p>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-400">Contratos na base</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 lg:p-5 border border-emerald-100/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100/50 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-amber-500" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold text-slate-900">{contratosCriticos.length}</p>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-400">Alertas ativos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Report Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const generating = isGenerating(report.id);

          return (
            <Card
              key={report.id}
              className={`p-4 sm:p-5 lg:p-6 border border-emerald-100/50 hover:shadow-card transition-all duration-200 ${
                generating ? 'ring-2 ring-emerald-600/30' : ''
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center shadow-sm ${report.shadow} shrink-0`}>
                  <Icon size={18} className="text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">{report.label}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{report.description}</p>

                  {selectedBloco && (
                    <Badge variant="success" size="sm" className="mt-2 inline-flex">
                      <Building2 size={10} strokeWidth={2.5} />
                      <span className="ml-1">Bloco {selectedBloco}</span>
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-emerald-100/30">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Formatos disponíveis
                </p>
                <div className="flex items-center gap-2">
                  {report.formats.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleGenerate(report.id, fmt)}
                      disabled={generating}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        generating && selectedFormat === fmt
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-emerald-50 text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 border border-emerald-100/50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {generating && selectedFormat === fmt ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Download size={13} strokeWidth={2} />
                          {fmt}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Informações adicionais */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100/50 flex items-center justify-center">
            <Calendar size={18} className="text-emerald-600" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">
              Os relatórios refletem os filtros ativos (bloco, status)
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Dados atualizados em tempo real • Formatos: PDF para visualização, XLSX/CSV para análise
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Relatorios;
