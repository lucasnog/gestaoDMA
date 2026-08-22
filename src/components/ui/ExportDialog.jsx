import React, { useState, useMemo } from 'react';
import { X, ChevronUp, ChevronDown, Download, FileSpreadsheet } from 'lucide-react';

/**
 * Dialog de exportação de dados para CSV/XLSX.
 *
 * Props:
 *   open        - boolean
 *   onClose     - () => void
 *   data        - array de objetos (linhas)
 *   columns     - [{ key, label }] - colunas disponíveis
 *   formatters  - { [columnKey]: (value) => string } - funções de formatação opcionais
 *   filename    - string (sem extensão)
 *   title       - string (título do dialog)
 */
const ExportDialog = ({ open, onClose, data, columns, formatters = {}, filename = 'export', title = 'Exportar Dados', onExtraDownload }) => {
  const [selectedColumns, setSelectedColumns] = useState(columns.map(c => c.key));
  const [orderedColumns, setOrderedColumns] = useState(columns.map(c => c.key));

  const visibleColumns = useMemo(
    () => orderedColumns.filter(k => selectedColumns.includes(k)),
    [orderedColumns, selectedColumns]
  );

  const toggleColumn = (key) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const moveUp = (key) => {
    setOrderedColumns(prev => {
      const idx = prev.indexOf(key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (key) => {
    setOrderedColumns(prev => {
      const idx = prev.indexOf(key);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const exportCSV = () => {
    if (!data?.length || !visibleColumns.length) return;
    const headers = visibleColumns.map(k => columns.find(c => c.key === k)?.label || k);
    const rows = data.map(item =>
      visibleColumns.map(k => {
        const fmt = formatters[k];
        const val = fmt ? fmt(item[k]) : item[k];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape CSV: wrap in quotes if contains comma, quote, or newline
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      })
    );
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = async () => {
    if (!data?.length || !visibleColumns.length) return;

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Gestão DMA Analytics';
    wb.created = new Date();
    const ws = wb.addWorksheet('Dados');

    const headers = visibleColumns.map(k => columns.find(c => c.key === k)?.label || k);
    const rowsData = data.map(item =>
      visibleColumns.map(k => {
        const fmt = formatters[k];
        return fmt ? fmt(item[k]) : (item[k] ?? '');
      })
    );

    // Cores Goinfra (formato ARGB com alpha FF)
    const GREEN_DARK = 'FF0D6B2E';
    const GREEN_LIGHT = 'FFE8F5E9';
    const WHITE = 'FFFFFFFF';
    const GRAY = 'FFD0D0D0';
    const TEXT_DARK = 'FF333333';
    const GREEN_MEDIUM = 'FF1B8C3E';

    // ── Cabeçalho ──────────────────────────────────────────────
    const headerRow = ws.addRow(headers);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_DARK } };
      cell.font = { color: { argb: WHITE }, bold: true, size: 11, name: 'Calibri' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: GREEN_DARK } },
        bottom: { style: 'medium', color: { argb: GREEN_MEDIUM } },
        left: { style: 'thin', color: { argb: GREEN_DARK } },
        right: { style: 'thin', color: { argb: GREEN_DARK } },
      };
    });

    // ── Linhas de dados ────────────────────────────────────────
    rowsData.forEach((rowData, idx) => {
      const row = ws.addRow(rowData);
      row.height = 22;
      const isEven = idx % 2 === 0;
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? WHITE : GREEN_LIGHT } };
        cell.font = { color: { argb: TEXT_DARK }, size: 10, name: 'Calibri' };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: GRAY } },
          bottom: { style: 'thin', color: { argb: GRAY } },
          left: { style: 'thin', color: { argb: GRAY } },
          right: { style: 'thin', color: { argb: GRAY } },
        };
      });
    });

    // ── Largura das colunas ────────────────────────────────────
    visibleColumns.forEach((k, i) => {
      const label = columns.find(c => c.key === k)?.label || k;
      const maxData = rowsData.reduce((max, r) => Math.max(max, String(r[i] ?? '').length), 0);
      ws.getColumn(i + 1).width = Math.max(label.length, maxData, 12) + 3;
    });

    // ── Download ───────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100/60 w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet size={18} className="text-emerald-600" strokeWidth={2} />
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={16} className="text-slate-400" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-[11px] text-slate-500">
            Selecione as colunas e ajuste a ordem para exportação.
            <br />
            <span className="text-slate-400">{data?.length || 0} registros selecionados</span>
          </p>

          {/* Column list */}
          <div className="space-y-1 max-h-60 overflow-y-auto border border-emerald-100/30 rounded-xl p-1">
            {orderedColumns.map((key) => {
              const col = columns.find(c => c.key === key);
              if (!col) return null;
              const isSelected = selectedColumns.includes(key);
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-emerald-50/50 transition-colors group"
                >
                  {/* Checkbox */}
                  <label
                    onClick={() => toggleColumn(key)}
                    className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white fill-current">
                          <path d="M10.28 2.22a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 0 1 1.06-1.06L3.75 7.69l5.47-5.47a.75.75 0 0 1 1.06 0z" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[12px] font-medium text-slate-700 truncate">{col.label}</span>
                  </label>

                  {/* Reorder buttons */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveUp(key); }}
                      className="p-0.5 rounded hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Mover para cima"
                    >
                      <ChevronUp size={14} strokeWidth={2} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveDown(key); }}
                      className="p-0.5 rounded hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Mover para baixo"
                    >
                      <ChevronDown size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-emerald-100/30 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={exportCSV}
            disabled={!data?.length || visibleColumns.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            CSV
          </button>
          <button
            onClick={exportXLSX}
            disabled={!data?.length || visibleColumns.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} strokeWidth={2} />
            XLSX
          </button>
          {onExtraDownload && (
            <button
              onClick={onExtraDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Download size={14} strokeWidth={2} />
              Planilha por Segmento
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
