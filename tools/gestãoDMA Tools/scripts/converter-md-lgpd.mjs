#!/usr/bin/env node
/**
 * Gestão DMA Tools — converter-md-lgpd.mjs
 *
 * Converte arquivos de texto para Markdown, removendo/mascarando dados
 * pessoais protegidos pela LGPD (Lei 13.709/2018).
 *
 * Uso:
 *   node converter-md-lgpd.mjs <arquivo.txt|pasta> [--saida <pasta|arquivo.md>] [--mascarar] [--dry]
 *
 * Opções:
 *   --saida <caminho>  Pasta (quando entrada é pasta) ou arquivo .md de saída
 *   --mascarar         Mascara os dados ([***]) em vez de remover a linha
 *   --dry              Não escreve arquivos; só gera o relatório de remoções
 *
 * Dados removidos por padrão (regex):
 *   - CPF (formatado ou só dígitos)
 *   - CNPJ
 *   - RG / Carteira de Identidade
 *   - CNS (Cartão Nacional de Saúde)
 *   - PIS/PASEP
 *   - CNH
 *   - Título de eleitor
 *   - E-mail
 *   - Telefone fixo/celular
 *   - CEP
 *   - Placa de veículo (padrão Mercosul)
 *   - Número de conta/agência bancária (contexto "conta"/"agência")
 *   - Linhas de campos sensíveis (nome, endereço, dados bancários, etc.)
 */

import fs from 'fs';
import path from 'path';

// ─── Configuração ─────────────────────────────────────────

const PATTERNS = [
  // CPF: 123.456.789-09 ou 12345678909
  { nome: 'CPF', regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, mascarar: (m) => m.slice(0, 3) + '.***.***-' + m.slice(-2) },
  // CNPJ: 12.345.678/0001-90 ou 12345678000190
  { nome: 'CNPJ', regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, mascarar: (m) => m.slice(0, 2) + '.***.***/****-' + m.slice(-2) },
  // RG: 12.345.678-9 ou 123456789
  { nome: 'RG', regex: /\b\d{1,2}\.?\d{3}\.?\d{3}-?\d\b/g, mascarar: (m) => '***.***.***-' + m.slice(-1) },
  // CNS: 123 4567 8901 2345 (14 dígitos)
  { nome: 'CNS', regex: /\b\d{3}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, mascarar: (m) => '*** *** **** ' + m.slice(-4) },
  // PIS/PASEP: 123.45678.90-1 (11 dígitos)
  { nome: 'PIS/PASEP', regex: /\b\d{3}\.?\d{5}\.?\d{2}-?\d\b/g, mascarar: (m) => '***.***.***-' + m.slice(-1) },
  // CNH (11 dígitos, precedido de contexto)
  { nome: 'CNH', regex: /(?:(?:CNH|HABILITA[ÇC][A-Z]O)\s*[:.-]?\s*)(\d{9,11})/gi, mascarar: (m) => m.replace(/\d/g, 'x') },
  // Título de eleitor: 123456789012 (12 dígitos)
  { nome: 'Título de Eleitor', regex: /(?:(?:T[IÍ]TULO)\s*[:.-]?\s*)(\d{12})/gi, mascarar: (m) => m.replace(/\d/g, 'x') },
  // E-mail
  { nome: 'E-mail', regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, mascarar: () => '[email removido]' },
  // Telefone: (62) 91234-5678, 62912345678, 99999-9999
  { nome: 'Telefone', regex: /\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, mascarar: (m) => '(' + m.slice(-8, -6) + ') ****-****' },
  // CEP: 74000-000
  { nome: 'CEP', regex: /\b\d{5}-?\d{3}\b/g, mascarar: (m) => m.slice(0, 5) + '-***' },
  // Placa Mercosul: ABC1D23 ou ABC1234
  { nome: 'Placa de Veículo', regex: /\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/g, mascarar: () => '***-****' },
  // Agência/Conta bancária (contexto)
  { nome: 'Agência/Conta', regex: /(ag[eê]ncia\s*(?:banc[aá]ria)?\s*[:.-]?\s*)(\d{2,5})(\s*[-/]\s*)(\d{1,3})?/gi, mascarar: (m) => m.replace(/[0-9]/g, 'x') },
  // Cartão de crédito: 16 dígitos (4 grupos)
  { nome: 'Cartão de Crédito', regex: /\b(?:\d[ -]?){13,19}\b/g, mascarar: () => '**** **** **** ****' },
];

// Linhas inteiras com campos sensíveis — a linha é removida/obscurecida
const SENSITIVE_FIELDS = [
  'cpf', 'cnpj', 'rg ', 'cart[aã]o de identidade', 'cns', 'nis', 'pis', 'pasep',
  'cnh', 'habilit', 't[íi]tulo de eleitor', 'passaporte', 'e-?mail', 'endere[çc]o',
  'rua ', 'logradouro', 'bairro', 'cidade', 'telefone', 'celular', 'whatsapp',
  'data de nascimento', 'nascimento', 'nome da m[ãa]e', 'nome do pai', 'nome completo',
  'estado civil', 'nacionalidade', 'naturalidade', 'foto', 'assinatura',
  'conta banc[aá]ria', 'ag[eê]ncia', 'banco ', 'renda', 'sal[aá]rio', 'remunera[çc][aã]o',
  'vale-transporte', 'voucher', 'matr[íi]cula', 'registro geral', 'gabinete', 'biometria',
  'participantes', 'presentes', 'participou', 'participaram', 'membros da comiss[aã]o',
  'comiss[aã]o de licita[çc][aã]o', 'presidente da comiss[aã]o', 'coordenador',
  'fiscal do contrato', 'gestor do contrato', 'respons[aá]vel t[ée]cnico', 'solicitante',
  'requerente', 'benefici[aá]rio', 'titular', 'declarante',
];

// Campos que devem ter o conteúdo da linha apagado (mas mantém o rótulo mascarado)
const MASK_FIELD_VALUE = /[:=]\s*$/i;

// ─── Utilitários ──────────────────────────────────────────

function sanitizar(texto) {
  const removidos = [];
  let conteudo = texto;

  // 1) Aplica regex de padrões pontuais
  for (const p of PATTERNS) {
    conteudo = conteudo.replace(p.regex, (match, ..._rest) => {
      const alvo = typeof p.mascarar === 'function' ? p.mascarar(match) : p.mascarar;
      removidos.push({ tipo: p.nome, trecho: match });
      return alvo;
    });
  }

  // 2) Remove/mascara linhas inteiras com campos sensíveis
  const sensRegex = new RegExp(SENSITIVE_FIELDS.join('|'), 'i');
  conteudo = conteudo.split('\n').map((linha) => {
    if (sensRegex.test(linha)) {
      const rotulo = linha.trim().replace(/[0-9a-zA-Z]/g, 'x').slice(0, 30);
      removidos.push({ tipo: 'Campo sensível', trecho: linha.trim().slice(0, 120) });
      return linha.trim() === '' ? '' : `> ⚠️ ${rotulo} [dado removido — LGPD]`;
    }
    return linha;
  }).join('\n');

  return { conteudo, removidos };
}

function converterParaMarkdown(texto) {
  const linhas = texto.split(/\r?\n/);
  const out = [];

  for (const linha of linhas) {
    const t = linha.trim();
    if (t === '') { out.push(''); continue; }
    if (/^#{1,6}\s/.test(t)) { out.push(t); continue; }
    if (/^[-*]\s/.test(t) || /^\d+\.\s/.test(t)) { out.push(t); continue; }
    if (/^[|].*[|]$/.test(t)) { out.push(t); continue; }
    if (/^={3,}$/.test(t) || /^-{3,}$/.test(t)) { continue; }
    if (/^[A-Z][A-Za-zÀ-ú0-9 ]{2,}:/.test(t) && t.length < 80) {
      const idx = t.indexOf(':');
      out.push(`**${t.slice(0, idx)}:** ${t.slice(idx + 1).trim()}`);
      continue;
    }
    out.push(linha);
  }
  return out.join('\n');
}

function processarArquivo(arquivo, saida, mascarar) {
  const texto = fs.readFileSync(arquivo, 'utf-8');
  const { conteudo, removidos } = sanitizar(texto);
  const md = converterParaMarkdown(conteudo);

  const nomeBase = path.basename(arquivo, path.extname(arquivo));
  const arquivoSaida = saida.endsWith('.md')
    ? saida
    : path.join(saida, nomeBase + '.md');

  fs.writeFileSync(arquivoSaida, md, 'utf-8');
  return { arquivo, arquivoSaida, removidos };
}

// ─── Main ─────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const alvo = args[0];
  const idxSaida = args.indexOf('--saida');
  const saida = idxSaida !== -1 ? args[idxSaida + 1] : null;
  const dry = args.includes('--dry');

  if (!alvo) {
    console.error('Uso: node converter-md-lgpd.mjs <arquivo.txt|pasta> [--saida <pasta|arquivo.md>] [--dry]');
    process.exit(1);
  }

  const stat = fs.statSync(alvo);
  const arquivos = stat.isDirectory()
    ? fs.readdirSync(alvo).filter((f) => f.endsWith('.txt')).map((f) => path.join(alvo, f))
    : [alvo];

  const pastaSaida = saida && !saida.endsWith('.md') ? saida : path.dirname(alvo);
  if (!dry) fs.mkdirSync(pastaSaida, { recursive: true });

  let totalRemovidos = 0;
  for (const arq of arquivos) {
    const { arquivoSaida, removidos } = processarArquivo(arq, saida || pastaSaida);
    totalRemovidos += removidos.length;
    if (dry) {
      console.log(`\n[DRY] ${arq}`);
    } else {
      console.log(`\n✔ ${arq} → ${arquivoSaida}`);
    }
    console.log(`   Dados sensíveis encontrados e ${dry ? 'identificados' : 'removidos'}: ${removidos.length}`);
    const agrupados = {};
    removidos.forEach((r) => { agrupados[r.tipo] = (agrupados[r.tipo] || 0) + 1; });
    for (const [tipo, qtd] of Object.entries(agrupados)) {
      console.log(`   - ${tipo}: ${qtd}`);
    }
  }

  console.log(`\nConcluído. Total de ocorrências: ${totalRemovidos}`);
  if (dry) console.log('Modo --dry: nenhum arquivo foi escrito.');
}

main();
