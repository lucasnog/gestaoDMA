import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatDays,
  cleanNumberSuffix,
} from "./formatters";

const BLUE_500 = [59, 130, 246];
const BLUE_600 = [37, 99, 235];
const BLUE_700 = [29, 78, 216];
const BLUE_800 = [30, 64, 175];
const BLUE_50 = [239, 246, 255];
const BLUE_100 = [219, 234, 254];
const SLATE_DARK = [15, 23, 42];
const SLATE = [71, 85, 105];
const SLATE_LIGHT = [148, 163, 184];
const WHITE = [255, 255, 255];
const BG_LIGHT = [248, 250, 252];
const LINE = [203, 213, 225];
const SKY = [14, 165, 233];
const INDIGO = [99, 102, 241];

const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 280;

const v = (x) =>
  x === null || x === undefined || x === "" ? "—" : x;

/**
 * Extrai apenas o número da OS do SEI (ex: "94/2023 (48712027)" → "94/2023").
 */
function numeroOsSei(sei) {
  const idx = String(sei || "").indexOf(" - ");
  const parte = idx >= 0 ? String(sei).substring(0, idx) : String(sei || "");
  return v(parte.trim());
}

/**
 * Detalhe específico de uma OS: trecho após " - " no OS_SEI
 * (ex: "69/2024 (66606166) - Paralisação do Produto 4" → "Paralisação do Produto 4").
 * Sem detalhe no SEI, usa o OBJETO completo (sem truncar).
 */
function osDetalhe(os) {
  const sei = String(os.OS_SEI || "");
  const idx = sei.indexOf(" - ");
  if (idx >= 0) {
    const det = sei.substring(idx + 3).trim();
    if (det) return det;
  }
  return v((os.OBJETO || "").trim());
}

/**
 * Agrupa gestores/fiscais por portaria, retornando [portaria, nomes[]].
 */
function gruposPorPortaria(lista) {
  const grupos = new Map();
  for (const p of lista) {
    if (!p?.NOME) continue;
    const port = v(p.PORTARIA_SEI);
    if (!grupos.has(port)) grupos.set(port, []);
    if (!grupos.get(port).includes(p.NOME)) grupos.get(port).push(p.NOME);
  }
  return [...grupos.entries()];
}

/**
 * Gera o rótulo do gestor/fiscal com a portaria na frente.
 * Ex: "Gestor (portaria 145/2026 91231238)".
 */
function portariaLabel(tipo, port) {
  const s = String(port || "");
  const num = (s.match(/(\d+\/\d+)/) || [])[1];
  const sei = (s.match(/\((\d+)\)/) || [])[1];
  const base = `Portaria ${num || "—"}`;
  return `${tipo} (${sei ? `${base} ${sei}` : base})`;
}

/**
 * Normaliza rótulos de status para o padrão exibido nas tabelas:
 * "Andamento" → "EM ANDAMENTO", "Paralisado" → "PARALISADO".
 */
function normStatus(val) {
  const s = String(val || "").trim();
  if (!s) return "—";
  const lower = s.toLowerCase();
  if (lower.includes("andament")) return "EM ANDAMENTO";
  if (lower.includes("paralis")) return "PARALISADO";
  if (lower.includes("conclu")) return "CONCLUÍDO";
  return s;
}

function ensurePage(doc, y, needed = 20) {
  if (y + needed > FOOTER_Y) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function gradientRect(doc, x, y, w, h, top, bottom, steps = 16) {
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const c = [
      Math.round(top[0] + (bottom[0] - top[0]) * t),
      Math.round(top[1] + (bottom[1] - top[1]) * t),
      Math.round(top[2] + (bottom[2] - top[2]) * t),
    ];
    doc.setFillColor(...c);
    doc.rect(x, y + (h / steps) * i, w, h / steps + 0.1, "F");
  }
}

function loadLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/Logo de gestão financeira..png";
  });
}

/**
 * Recorta a logo no bounding box real do conteúdo (remove padding transparente)
 * e aplica uma sombra branca que contorna o formato da logo (drop-shadow),
 * igual ao efeito usado na Sidebar. Retorna um canvas + dimensões em pixels.
 */
function prepareLogo(img) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const cw = maxX - minX;
  const chh = maxY - minY;
  const pad = 14; // folga ao redor para a sombra não ser cortada
  const crop = document.createElement("canvas");
  crop.width = cw + pad * 2;
  crop.height = chh + pad * 2;
  const cropCtx = crop.getContext("2d");
  // sombra contornando a logo: sombra profunda em tom azul (profundidade) + glow branco
  cropCtx.filter = [
    "drop-shadow(1.5px 2.5px 3px rgba(15, 23, 42, 0.55))",
    "drop-shadow(0 0 1px rgba(255,255,255,0.95))",
    "drop-shadow(0 0 2px rgba(255,255,255,0.9))",
    "drop-shadow(0 0 3px rgba(255,255,255,0.85))",
    "drop-shadow(0 0 4px rgba(255,255,255,0.7))",
  ].join(" ");
  cropCtx.drawImage(img, minX, minY, cw, chh, pad, pad, cw, chh);
  cropCtx.filter = "none";
  return { canvas: crop, w: crop.width, h: crop.height };
}

async function drawHeader(doc, logo, geradoEm) {
  const H = 34;
  // fundo azul escuro sólido
  doc.setFillColor(...BLUE_700);
  doc.rect(0, 0, PAGE_W, H, "F");
  // linha de destaque na base do header
  doc.setFillColor(...BLUE_100);
  doc.rect(0, H, PAGE_W, 0.8, "F");

  let tx = MARGIN;
  if (logo) {
    const prep = await prepareLogo(logo);
    if (prep) {
      const aspect = prep.w / prep.h;
      let logoH = 18;
      let logoW = logoH * aspect;
      if (logoW > 46) {
        logoW = 46;
        logoH = logoW / aspect;
      }
      const lx = 16;
      const ly = (H - logoH) / 2;
      doc.addImage(prep.canvas, "PNG", lx, ly, logoW, logoH);
      tx = lx + logoW + 12;
    }
  }

  // Bloco de texto centralizado verticalmente em relação à logo (meio do header)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text("Gestão DMA Analytics", tx, 15.7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Relatório de Detalhes do Contrato", tx, 21.7);
}

function sectionTitle(doc, y, title) {
  y = ensurePage(doc, y, 18);
  doc.setFillColor(...BLUE_600);
  doc.rect(MARGIN, y, 2.2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLUE_700);
  doc.text(title.toUpperCase(), MARGIN + 5, y + 5.1);
  return y + 11;
}

function paragraph(doc, y, text, size = 9) {
  const lines = doc.splitTextToSize(text || "", CONTENT_W);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(...SLATE_DARK);
  let yy = y;
  for (const line of lines) {
    yy = ensurePage(doc, yy, 6);
    doc.text(line, MARGIN, yy);
    yy += 4.4;
  }
  return yy + 2;
}

function renderTable(doc, startY, { head, body, columnStyles = {}, didParseCell }) {
  autoTable(doc, {
    startY,
    head,
    body,
    theme: "striped",
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: BLUE_600,
      textColor: WHITE,
      fontSize: 8,
      fontStyle: "bold",
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: SLATE_DARK,
      lineColor: LINE,
      lineWidth: 0.2,
      valign: "middle",
    },
    alternateRowStyles: { fillColor: BG_LIGHT },
    columnStyles,
    didParseCell,
  });
  return doc.lastAutoTable.finalY;
}

function kvTable(doc, y, rows) {
  return renderTable(doc, y, {
    head: [["Campo", "Valor"]],
    body: rows.map(([label, value]) => [label, v(value)]),
    columnStyles: {
      0: { cellWidth: 62, fontStyle: "bold", textColor: SLATE },
      1: { textColor: SLATE_DARK },
    },
  });
}

function cardsRow(doc, y, cards) {
  const gap = 4;
  const cardW = (CONTENT_W - gap * 2) / 3;
  const cardH = 22;
  y = ensurePage(doc, y, cardH + 8);
  doc.setLineWidth(0.3);
  cards.forEach((card, i) => {
    const x = MARGIN + i * (cardW + gap);
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...BLUE_100);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, "FD");

    doc.setFillColor(...card.accent);
    doc.circle(x + 4.5, y + 5, 1.3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE);
    doc.text(card.label.toUpperCase(), x + 8, y + 6.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...SLATE_DARK);
    doc.text(doc.splitTextToSize(card.value, cardW - 9), x + 4.5, y + 13);

    if (card.foot) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...SLATE_LIGHT);
      doc.text(doc.splitTextToSize(card.foot, cardW - 9), x + 4.5, y + cardH - 4.5);
    }
  });
  return y + cardH + 8;
}

function progressBar(doc, y, pct) {
  y = ensurePage(doc, y, 14);
  const p = Math.max(0, Math.min(100, parseFloat(pct) || 0));
  const barW = CONTENT_W;
  const barH = 4.5;
  const barY = y + 1;

  doc.setFillColor(...BLUE_100);
  doc.roundedRect(MARGIN, barY, barW, barH, 2.2, 2.2, "F");
  if (p > 0) {
    const fw = Math.max((barW * p) / 100, 2.2);
    gradientRect(doc, MARGIN, barY, fw, barH, BLUE_500, BLUE_700, 6);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLUE_600);
  doc.text(`${p.toFixed(1).replace(".", ",")}%`, PAGE_W - MARGIN, y, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_DARK);
  doc.text("Avanço Financeiro", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...SLATE_LIGHT);
  doc.text("Progresso do valor medido em relação ao valor total do contrato", MARGIN, y + 3.2);
  return y + barH + 8;
}

export async function exportContratoPdf({ details, gemocdocs, municipiosGmp }) {
  const gc = { ...(gemocdocs?.contrato || {}), ...(gemocdocs?.principal || {}) };
  const gs = gemocdocs?.status;
  const statusPorCidade = (gemocdocs?.statusRows || []).filter((r) => r.CIDADE);

  const contratoNum = details?.cd_contrato || gc?.CONTRATO || "";
  const lote = gc?.LOTE;
  const status = gs?.STATUS_CONTRATO || details?.situacao_atual || "";
  const segmento = gc?.SEGMENTO || details?.segmento || "";
  const processo = cleanNumberSuffix(gc?.PROCESSO_CONTRATO) || "";
  const empresa = details?.razao_social || gc?.EMPRESA || "";
  const objeto = details?.objeto || gc?.OBJETO || "";
  const obs = gs?.OBSERVACOES || "";

  const logo = await loadLogo();

  const geradoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Cabeçalho com logo ─────────────────────────────────────
  await drawHeader(doc, logo, geradoEm);

  // ── Identificação do contrato ──────────────────────────────
  let y = 34 + 0.8 + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...SLATE_DARK);
  const titulo = `Contrato ${contratoNum}${lote ? ` — Lote ${lote}` : ""}`;
  const tituloLines = doc.splitTextToSize(titulo, CONTENT_W);
  doc.text(tituloLines, MARGIN, y);
  y += tituloLines.length * 5.5 + 2;

  if (status) {
    const statusLabel = normStatus(status);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLUE_700);
    doc.text(statusLabel, MARGIN, y);
    y += 5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  if (segmento) {
    doc.text(`Segmento: ${segmento}`, MARGIN, y);
    y += 4.6;
  }
  if (processo) {
    doc.text(`Processo: ${processo}`, MARGIN, y);
    y += 4.6;
  }
  if (empresa) {
    doc.text(empresa, MARGIN, y);
    y += 4.6;
  }
  y += 4;

  // ── Objeto ─────────────────────────────────────────────────
  if (objeto) {
    y = sectionTitle(doc, y, "Objeto do Contrato");
    y = paragraph(doc, y, objeto);
    y += 4;
  }

  // ── Informações do Contrato (SMO) ──────────────────────────
  y = sectionTitle(doc, y, "Informações do Contrato");
  y = kvTable(doc, y, [
    ["Empresa", details?.razao_social],
    ["Valor Inicial", formatCurrency(details?.vl_contrato)],
    ["Início Vigência", formatDate(details?.dt_vigencia_inicio)],
    ["Fim Vigência", formatDate(details?.dt_vigencia_fim)],
    ["Início Execução", formatDate(details?.dt_execucao_inicio)],
    ["Fim Execução", formatDate(details?.dt_execucao_fim)],
  ]);
  y += 6;

  // ── Cards financeiros ──────────────────────────────────────
  y = cardsRow(doc, y, [
    {
      label: "Investimento Total",
      value: formatCurrency(details?.vl_total),
      foot: "Valor atualizado",
      accent: BLUE_600,
    },
    {
      label: "Prazo Restante",
      value: formatDays(details?.dias_restantes),
      foot: `Vigência: ${formatDate(details?.dt_vigencia_fim)}`,
      accent: SKY,
    },
    {
      label: "Total Medido",
      value: formatCurrency(details?.vl_total_medido),
      foot: `Avanço: ${formatPercent(details?.perc_pago)}`,
      accent: INDIGO,
    },
  ]);

  // ── Avanço Financeiro ──────────────────────────────────────
  y = sectionTitle(doc, y, "Avanço Financeiro");
  y = progressBar(doc, y, details?.perc_pago);
  y = kvTable(doc, y, [
    ["Avanço", formatPercent(details?.perc_pago)],
    ["Valor Total", formatCurrency(details?.vl_total)],
    ["Valor Medido", formatCurrency(details?.vl_total_medido)],
    [
      "Saldo a Medir",
      formatCurrency((details?.vl_total || 0) - (details?.vl_total_medido || 0)),
    ],
  ]);
  y += 6;

  // ── Períodos ───────────────────────────────────────────────
  y = sectionTitle(doc, y, "Períodos");
  y = kvTable(doc, y, [
    [
      "Publicação",
      formatDate(gc?.PUBLICACAO_PNCP || gc?.PUBLICACAO_DOE || details?.dt_vigencia_inicio),
    ],
    ["OS", formatDate(details?.dt_os_inicio)],
    [
      "Início Vigência",
      formatDate(details?.dt_vigencia_inicio || gc?.INICIO__VIGENCIA_SMO || gc?.INICIO__VIGENCIA_PNCP),
    ],
    [
      "Fim Vigência",
      formatDate(details?.dt_vigencia_fim || gc?.FIM__VIGENCIA_SMO || gc?.FIM__VIGENCIA_PNCP),
    ],
    [
      "Início Execução",
      formatDate(details?.dt_execucao_inicio || gs?.INICIO_EXECUCAO_DO_CONTRATO),
    ],
    [
      "Fim Execução",
      formatDate(details?.dt_execucao_fim || gs?.FIM_EXECUCAO_DO_CONTRATO),
    ],
    ["Prazo Restante", formatDays(details?.dias_restantes)],
  ]);
  y += 6;

  // ── Valores de Contrato e Medição ──────────────────────────
  y = sectionTitle(doc, y, "Valores");
  y = renderTable(doc, y, {
    head: [["Item", "Valor"]],
    body: [
      ["(A) Contrato", formatCurrency(details?.vl_contrato)],
      ["(B) Aditivo", formatCurrency(details?.vl_aditivo)],
      ["(C) Apostila", formatCurrency(details?.vl_apostila)],
      ["(D) Total (A+B+C)", formatCurrency(details?.vl_total)],
      ["(E) Medição a PI", formatCurrency(details?.vl_medicao_pi)],
      ["(F) Reajuste", formatCurrency(details?.vl_reajuste)],
      ["(G) Total medido (E+F)", formatCurrency(details?.vl_total_medido)],
      ["(H) Saldo a medir (A+B-E)", formatCurrency(details?.vl_saldo_medir)],
      ["(I) Saldo de apostila (C-F)", formatCurrency(details?.vl_saldo_apostila)],
    ],
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && (data.row.index === 3 || data.row.index === 6)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = BLUE_600;
      }
    },
  });
  y += 6;

  // ── Status ─────────────────────────────────────────────────
  if (gs) {
    y = sectionTitle(doc, y, "Status");
    y = kvTable(doc, y, [
      ["Situação Vigência", cleanNumberSuffix(gs?.STATUS_VIGENCIA)],
      ["Situação Execução", cleanNumberSuffix(gs?.STATUS_EXECUCAO)],
      ["Situação Contrato", normStatus(gs?.STATUS_CONTRATO)],
      ...(gs?.DIAS_PARALISADOS && cleanNumberSuffix(gs.DIAS_PARALISADOS) !== "0"
        ? [["Dias Paralisados", `${cleanNumberSuffix(gs.DIAS_PARALISADOS)} dias`]]
        : []),
    ]);
    y += 6;
  }

  // ── Gestão do Contrato ─────────────────────────────────────
  // Apenas gestores/fiscais ativos (ou últimos ativos quando o contrato já finalizou)
  const gestores = gemocdocs?.gestores || [];
  const hoje = new Date().toISOString().split("T")[0];
  const ativos =
    gestores.filter(
      (g) => !g.DATA_FINAL || g.DATA_FINAL.trim() === "" || g.DATA_FINAL >= hoje,
    ) || [];
  let gestoresExibir = ativos;
  if (ativos.length === 0 && gestores.length > 0) {
    const maxDate = gestores.reduce(
      (max, g) => ((g.DATA_INICIAL || "") > max ? g.DATA_INICIAL || "" : max),
      "",
    );
    gestoresExibir = gestores.filter((g) => (g.DATA_INICIAL || "") === maxDate);
  }
  const pessoasGestores = gestoresExibir.filter((g) =>
    (g.TIPO || "").toLowerCase().includes("gestor"),
  );
  const pessoasFiscais = gestoresExibir.filter((g) =>
    (g.TIPO || "").toLowerCase().includes("fiscal"),
  );

  const linhasGestores = gruposPorPortaria(pessoasGestores).map(
    ([port, nomes]) => [portariaLabel("Gestor", port), nomes.join(", ")],
  );
  const linhasFiscais = gruposPorPortaria(pessoasFiscais).map(
    ([port, nomes]) => [portariaLabel("Fiscal Técnico", port), nomes.join(", ")],
  );

  y = sectionTitle(doc, y, "Gestão do Contrato");
  y = kvTable(doc, y, [
    ["Total Pago (SMO)", formatCurrency(details?.vl_total_pago)],
    ["Total Empenhado (SMO)", formatCurrency(details?.vl_total_empenhado)],
    ["Doc. SEI", gc?.DOCUMENTO_SEI_CONTRATO],
    ["Segmento", gc?.SEGMENTO],
    ["Gerência", gc?.GERENCIA],
    ["Lote", gc?.LOTE],
    ["Valor Inicial", formatCurrency(gc?.VALOR_INICIAL_DO_CONTRATO)],
    ["OS Início", formatDate(details?.dt_os_inicio)],
    ...linhasGestores,
    ...linhasFiscais,
  ]);
  y += 6;

  // ── Status por Cidade ──────────────────────────────────────
  const cidadeMap = new Map();
  for (const row of statusPorCidade) {
    const cidade = row.CIDADE?.trim();
    if (cidade) {
      if (!cidadeMap.has(cidade)) cidadeMap.set(cidade, []);
      cidadeMap.get(cidade).push(row);
    }
  }
  if (cidadeMap.size > 0) {
    y = sectionTitle(doc, y, "Status por Cidade");
    y = renderTable(doc, y, {
      head: [["Cidade", "Status", "TRP/TRD", "Observações"]],
      body: [...cidadeMap.entries()].map(([cidade, rows]) => {
        const r = rows[0];
        const trpTrd = r.TRP_DATA || r.TRD_DATA || null;
        return [
          cidade,
          normStatus(r.STATUS_CONTRATO),
          trpTrd ? formatDate(trpTrd) : "—",
          r.OBSERVACOES || "—",
        ];
      }),
      columnStyles: {
        0: { cellWidth: 30, fontStyle: "bold" },
        1: { cellWidth: 22 },
        2: { cellWidth: 28 },
      },
    });
    y += 6;
  }

  // ── Observações ────────────────────────────────────────────
  if (obs) {
    y = sectionTitle(doc, y, "Observações");
    y = paragraph(doc, y, obs);
    y += 4;
  }

  // ── Municípios GMP ─────────────────────────────────────────
  if (municipiosGmp && municipiosGmp.length > 0) {
    y = sectionTitle(doc, y, "Municípios GMP");
    y = renderTable(doc, y, {
      head: [["Município", "Status"]],
      body: municipiosGmp.map((m) => [v(m.MUNICIPIO), normStatus(m.STATUS)]),
      columnStyles: { 0: { cellWidth: 120 } },
    });
    y += 6;
  }

  // ── Aditivos & Apostilas ───────────────────────────────────
  const aditivos = gemocdocs?.aditivos || [];
  if (aditivos.length > 0) {
    y = sectionTitle(doc, y, "Aditivos & Apostilas");
    y = renderTable(doc, y, {
      head: [["Nº", "Tipo", "Assinatura", "Vigência", "Valor"]],
      body: aditivos.map((a) => [
        v(a.N_DO_ADITIVO),
        v(a.TIPO_DO_ADITIVO),
        formatDate(a.DATA_DA_ASSINATURA),
        formatDate(a.DATA_DE_VIGENCIA),
        formatCurrency(a.VALOR_DO_ADITIVO),
      ]),
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 40 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { halign: "right", fontStyle: "bold" },
      },
    });
    y += 6;
  }

  // ── Ordens de Serviço ──────────────────────────────────────
  const ordensServico = gemocdocs?.ordensServico || [];
  if (ordensServico.length > 0) {
    y = sectionTitle(doc, y, "Ordens de Serviço");
    y = renderTable(doc, y, {
      head: [["Tipo", "SEI", "Data", "Detalhe"]],
      body: ordensServico.map((os) => [
        v(os.TIPO_DE_OS),
        numeroOsSei(os.OS_SEI),
        formatDate(os.DATA_OS),
        osDetalhe(os),
      ]),
      columnStyles: {
        0: { cellWidth: 28, fontStyle: "bold" },
        1: { cellWidth: 32 },
        2: { cellWidth: 28 },
      },
    });
    y += 6;
  }

  // ── Histórico de Medições ──────────────────────────────────
  const medicoes = details?.medicoes || [];
  if (medicoes.length > 0) {
    y = sectionTitle(doc, y, "Histórico de Medições");
    y = renderTable(doc, y, {
      head: [["Descrição", "Medido", "Período", "PI", "RA", "Total"]],
      body: medicoes.map((m) => {
        const pi = parseFloat(m.vl_pi || 0);
        const ra = parseFloat(m.vl_ra || 0);
        return [
          v(m.descricao),
          formatDate(m.dt_medicao),
          m.dt_periodo_inicio && m.dt_periodo_fim
            ? `De ${formatDate(m.dt_periodo_inicio)} até ${formatDate(m.dt_periodo_fim)}`
            : "—",
          formatCurrency(pi),
          ra > 0 ? formatCurrency(ra) : "—",
          formatCurrency(pi + ra),
        ];
      }),
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { cellWidth: 20 },
        2: { cellWidth: 36 },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 30, halign: "right", fontStyle: "bold" },
      },
    });
  }

  // ── Rodapé / numeração ─────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.line(MARGIN, 290, PAGE_W - MARGIN, 290);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(
      `Gestão DMA Analytics — Detalhes do Contrato — Gerado em ${geradoEm}`,
      MARGIN,
      293.5,
    );
    doc.text(`Página ${i} de ${pages}`, PAGE_W - MARGIN, 293.5, { align: "right" });
  }

  const filename = `contrato-${String(contratoNum).replace(/[\\/:*?"<>|]/g, "_")}-detalhes.pdf`;
  doc.save(filename);
}
