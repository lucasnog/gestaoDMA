# -*- coding: utf-8 -*-
"""
Relatório de Auditoria de Segurança — Gestão DMA (gestaoDMA, gemoc-frontend, gemoc-backend)
Gera: docs/security-audit/relatorio-auditoria-seguranca.pdf
Uso:  python gerar_relatorio.py
"""
import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    PageBreak, KeepTogether
)

# ─── Caminhos ───────────────────────────────────────────────────────
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PDF = os.path.join(OUT_DIR, 'relatorio-auditoria-seguranca.pdf')
CHART_DIR = os.path.join(OUT_DIR, 'charts')
os.makedirs(CHART_DIR, exist_ok=True)

# ─── Paleta ─────────────────────────────────────────────────────────
PALETTE = {
    'critica': colors.HexColor('#B91C1C'),
    'alta': colors.HexColor('#EA580C'),
    'media': colors.HexColor('#D97706'),
    'baixa': colors.HexColor('#2563EB'),
    'ponto_forte': colors.HexColor('#059669'),
}

STACK = "React 19 + Vite + Tailwind v4 + Zustand (frontends: gestaoDMA, gemoc-frontend) · Node.js 22 + Fastify 5 + better-sqlite3 (SQL puro) + Redis/BullMQ (gemoc-backend) · Auth: Firebase Auth (Google) trocado por JWT (cookie HttpOnly) · Deploy: Cloudflare Pages (frontends) + Docker/VM (backend)"

# ─── Achados consolidados ───────────────────────────────────────────
ACHADOS = [
    # (severidade, categoria, arquivo:linha, titulo, descricao, impacto, correcao)
    ('critica', 'Banco sem tranca', 'backend/routes/gestores.routes.js:104,137,279,490',
     'Rotas de gestores sem autenticação expõem PII de toda a carteira',
     'GET /gestores, /gestores/stats, /gestores/por-contrato e /gestores/historico não possuem preHandler. Qualquer pessoa (não autenticada) lista nomes de gestores/fiscais, portarias, datas e contratos. Filtros de contrato/bloco livres (não restringe a 61/2023). Persiste mesmo após commits de 28/08.',
     'Exposição de dados pessoais (LGPD) e da carteira completa sem login.',
     'Adicionar preHandler [authenticate] e restringir o escopo ao contrato 61/2023.'),
    ('critica', 'Banco sem tranca', 'backend/routes/municipios.routes.js:13,118,154',
     'Rotas de municípios sem autenticação, agora expõem processo SEI via detalhado=1',
     'GET /municipios, /municipios/:nome e /municipios/filtros sem preHandler. O novo modo detalhado=1 e o filtro execucao retornam processo_sei, lote, valores e quantidades por município+contrato via endpoint público.',
     'Dados de medição/geo e processo SEI de todos os contratos acessíveis sem login.',
     'Proteger com authenticate e filtrar pelo contrato 61/2023.'),
    ('critica', 'Permissão no navegador', 'backend/routes/admin.routes.js:42-45',
     'Bull Board (filas Redis) exposto sem autenticação',
     'O dashboard de filas Bull (serverAdapter.registerPlugin) é registrado sem preHandler [authenticate, requireAdmin]. Qualquer pessoa pode gerenciar filas Redis (pausar, reenfileirar, remover jobs).',
     'Controle total de jobs/filas de produção por terceiros.',
     'Registrar o Bull Board atrás de autenticação + requireAdmin.'),
    ('critica', 'Chaves expostas', 'backend/.env.example:22,27-28,35,57 (também gemoc-backend/.env.example)',
     'JWT_SECRET, ENCRYPTION_KEY, AUTH_PASS e DEPLOY_PATH reais commitados em .env.example',
     'JWT_SECRET=daae9094... permite forjar tokens admin. ENCRYPTION_KEY=c4e405e2... quebra criptografia LGPD. AUTH_PASS="2b563d33@G0infr@" autentica como admin. DEPLOY_PATH vaza usuário real.',
     'Qualquer pessoa com acesso ao repositório pode forjar sessões admin e descriptografar dados LGPD.',
     'Rotacionar todos os segredos e substituir .env.example por placeholders (change-me).'),
    ('critica', 'Chaves expostas', 'tokenflare.txt (commitado)',
     'Token Cloudflare cfut_ commitado',
     'Arquivo tokenflare.txt com token real da API Cloudflare commitado e não coberto por .gitignore.',
     'Acesso à conta Cloudflare do projeto.',
     'Revogar token e remover do histórico (BFG/git filter-branch).'),
    ('critica', 'Chaves expostas', 'vmoracle.key (commitado)',
     'Chave privada RSA de acesso à VM commitada',
     'Arquivo contém "-----BEGIN RSA PRIVATE KEY-----". Adicionado antes do .gitignore, permanece tracked.',
     'Acesso SSH total à VM de produção.',
     'Rotacionar chave, remover do histórico e manter fora do repo.'),
    ('critica', 'Chaves expostas', 'gemoc-backend/Tools/electron/scripts/credenciais.txt',
     'Credenciais reais do SEI commitadas',
     'login=lucas.nlopes / senha=@Goinfra2026 commitados. .gitignore não cobre este caminho.',
     'Acesso às credenciais do sistema SEI.',
     'Rotacionar credenciais, remover do histórico e do repo.'),
    ('critica', 'IDOR / Auth', 'backend/routes/auth.routes.js:128-169 e middleware/auth.middleware.js:65-81',
     'ID token do Firebase decodificado sem verificação de assinatura',
     'O payload do Firebase JWT é apenas decodificado (base64) e valida-se exp/iss, sem verificação RS256 contra as chaves públicas do Google. Qualquer atacante pode forjar token com aud/firebase e exp futuro, autenticando como qualquer uid.',
     'Bypass total de autenticação — amplifica todos os demais achados de autorização.',
     'Validar assinatura do ID token (biblioteca firebase-admin ou fetch das chaves públicas).'),
    ('alta', 'Banco sem tranca', 'backend/repositories/contrato.repository.js:266-626',
     'GET /api/contratos e /api/stats/bloco retornam carteira inteira',
     'findContratos() consulta FROM STATUS sem restrição ao contrato 61/2023. Qualquer autenticado vê centenas de contratos, valores, empresas.',
     'Exposição da carteira completa além do escopo do contrato alvo.',
     'Adicionar filtro obrigatório por contrato alvo (ou RBAC por permissão).'),
    ('alta', 'Banco sem tranca', 'backend/repositories/medicao.repository.js:20-95 e routes/medicoes.routes.js:172-238',
     'Endpoints de medição retornam série/detalhe de todos os contratos; novo /medicoes/todas junta SMO + meta.json de toda a carteira',
     'getMonthlySeries/getMonthlyDetail/findByMes não filtram por contrato alvo. O novo endpoint /medicoes/todas (commit 116bd102) consolida medições de todos os contratos (autenticado e parametrizado, mas escopo amplo).',
     'Histórico de medições de toda a carteira.',
     'Restringir ao contrato 61/2023 quando servindo o gestaoDMA.'),
    ('alta', 'Banco sem tranca', 'backend/routes/documentos-contrato.routes.js:77-109',
     'Lista de documentos agora itera todos os contratos (commit 116bd102)',
     'Antes lia só 61-2023/meta.json; agora itera todos os contratos e retorna lista completa com campo contrato. Autenticado, mas escopo expandido de 1 para ~200 contratos.',
     'Exposição ampliada de documentos a qualquer usuário autenticado.',
     'Aplicar escopo conforme o frontend servido (61/2023 no gestaoDMA).'),
    ('alta', 'Banco sem tranca', 'backend/repositories/dashboard.repository.js:5-233',
     'Dashboard stats/charts/financeiro/sections sem filtro de contrato',
     'KPIs e gráficos globais de toda a carteira (contagens, valores, top pagamentos).',
     'Dados financeiros agregados de toda a carteira acessíveis a qualquer autenticado.',
     'Adicionar isolamento por contrato/permissão.'),
    ('alta', 'Banco sem tranca', 'backend/routes/export.routes.js:390-431',
     'Exportação de medições por segmento sem filtro de contrato',
     'fetchSegmentData() e download geram XLSX com dados de todos os contratos.',
     'Exportação em massa da carteira.',
     'Restringir escopo de exportação.'),
    ('alta', 'IDOR', 'backend/routes/fichas.routes.js:662-694',
     'Path traversal em /fichas/debug-date',
     'req.query.path é resolvido com path.resolve sem validação startsWith(FICHAS_DIR), permitindo ../ para ler .xlsx arbitrários do servidor; error.message vaza caminho absoluto.',
     'Leitura arbitrária de arquivos xlsx do servidor por usuário autenticado.',
     'Reutilizar safeResolve() com validação de prefixo + separador.'),
    ('alta', 'IDOR', 'backend/routes/fichas.routes.js:974-1023,1039-1063',
     'Fichas view/download por path de qualquer contrato, check fraco',
     'startswith(FICHAS_DIR) sem path.sep permite bypass por prefixo de diretório irmão. Sem verificação de posse do contrato.',
     'Acesso cross-contrato a arquivos de ficha.',
     'Usar safeResolve robusto e validar contrato.'),
    ('media', 'Chaves expostas', 'gestaoDMA/src/services/firebase.js:13-19',
     'Fallback hardcoded aponta para projeto Firebase errado (gemoc-login)',
     'Se VITE_FIREBASE_* não carregar, usa credenciais do projeto GEMOC original, redirecionando login para projeto errado.',
     'Risco de sequestro de autenticação em falha de configuração.',
     'Remover fallbacks hardcoded e exigir env configurada.'),
    ('media', 'Chaves expostas', 'gestaoDMA/.env.development',
     'Firebase API key commitada em .env.development',
     'VITE_FIREBASE_* commitados; .gitignore não cobre .env.development. Firebase Web key é pública por design, mas exposição desnecessária.',
     'Baixo risco direto; exposição de config.',
     'Adicionar .env.development ao .gitignore.'),
    ('media', 'Chaves expostas', 'backend/routes/fichas.routes.js:575; documentos-contrato.routes.js:11; medicoes.routes.js:13',
     'Fallbacks de HMAC secret públicos',
     "TOKEN_SECRET = process.env.JWT_SECRET || 'gemoc-fichas-token-fallback' (e análogos). Se JWT_SECRET ausente, qualquer um forja tokens de acesso a arquivos.",
     'Forja de tokens públicos de acesso a fichas/documentos/medições.',
     'Remover fallbacks e falhar no startup sem JWT_SECRET.'),
    ('media', 'Chaves expostas', 'backend/server.js:105',
     'frameguard desativado globalmente (clickjacking off)',
     'O commit 6b42a265 adicionou frameguard: false ao helmet para permitir PDF em iframe. Remove X-Frame-Options globalmente, abrindo vetor de clickjacking em todas as rotas HTML.',
     'Aplicação embutível em iframe de terceiros (clickjacking).',
     'Reativar X-Frame-Options e permitir iframe apenas nas rotas de preview de PDF.'),
    ('media', 'XSS', 'gestaoDMA/src/components/portfolio/SlideViewer.jsx:164 (também gemoc-frontend)',
     'dangerouslySetInnerHTML com SVG sem sanitização',
     'SVG do pptx é injetado via dangerouslySetInnerHTML. dompurify é dependência transitiva mas não é usada. Se o PPTX contiver SVG com script, executa XSS.',
     'Execução de script no contexto do usuário que visualiza o portfolio.',
     'Sanitizar com dompurify antes de injetar.'),
    ('media', 'XSS', 'gemoc-backend/backend/scripts/ficha-html.js:29-91',
     'Dados do banco interpolados em HTML sem escape',
     'Contrato, empresa, objeto, nome de gestor e observações entram no HTML da ficha sem escape (apenas substring).',
     'XSS armazenado no visualizador de ficha.',
     'Escapar saída HTML (ou usar template com auto-escaping).'),
    ('media', 'IDOR', 'backend/routes/acompanhamento.routes.js:18-31,58-71',
     'PUT/DELETE de demandas/equipe por ID sem admin ou posse',
     'DELETE /acompanhamento/demandas/:id com apenas authenticate; qualquer usuário altera/apaga qualquer demanda.',
     'Destruição/alteracão de dados por usuário comum.',
     'Adicionar requireAdmin ou validação de posse.'),
    ('media', 'IDOR', 'backend/routes/medicoes.routes.js:100-142 e documentos-contrato.routes.js:97-139',
     'Token público/download aceitam qualquer path sem escopo de contrato',
     'safeResolve bloqueia traversal (ponto forte) mas não valida que o arquivo pertence ao contrato 61/2023.',
     'Acesso cross-contrato via token público a medições/documentos.',
     'Validar que o path pertence ao contrato alvo.'),
    ('baixa', 'Chaves expostas', 'gemoc-backend/gemoc-backend/backend/server.js:76',
     'Senha padrão hardcoded no código',
     "if (process.env.AUTH_USER === 'admin' && process.env.AUTH_PASS === 'Goinfra@2026#') — senha padrão pública no repositório.",
     'Admin com senha conhecida se deploy não sobrescrever AUTH_PASS.',
     'Remover string hardcoded; exigir variável de ambiente.'),
    ('baixa', 'Chaves expostas', 'gemoc-backend/backend/_tmp_142.cjs (commitado)',
     'Script temporário com caminho absoluto da máquina commitado',
     'Arquivo _tmp_142.cjs contém caminho absoluto local (C:/Users/lucas.nlopes/...). Lixo de desenvolvimento no repo.',
     'Vazamento de estrutura de diretórios; lixo no repo.',
     'Remover do repositório.'),
    ('baixa', 'Banco sem tranca', 'backend/routes/sei.routes.js:6-13; gemocdocs.routes.js:5-9',
     'Processos SEI e tabelas GemocDocs sem escopo de contrato',
     'Acesso a todos os processos SEI e todas as tabelas GemocDocs (whitelist de tabela impede SQLi, mas não escopo).',
     'Visão ampla além do contrato alvo.',
     'Aplicar escopo ao contrato 61/2023.'),
]

# Pontos fortes verificados
PONTOS_FORTES = [
    'requireAdmin funcional (auth.middleware.js:90-108) — rotas de admin/sync/deploy/recache/documentos-DELETE corretamente protegidas.',
    'safeResolve() com prefixo+separador em medicoes, documentos-contrato e fichas (bloqueia path traversal e ../).',
    'Tokens HMAC auto-contidos (fichas, medicoes, documentos-contrato) com expiração, não forjáveis sem secret.',
    'Whitelist de tabelas no gemocdocs.repository.js (sem SQLi por tabela arbitrária) e whitelist de sortKey em gestores.',
    'Helmet + cookie JWT HttpOnly/SameSite + rate-limit no login (5/min) + delay anti-brute-force.',
    'Fail-fast no startup: valida JWT_SECRET e ENCRYPTION_KEY antes de iniciar.',
    'Error handler global não expõe stack trace em produção.',
    'Firestore fallback seguro: se indisponível, assume tipo user (nunca admin).',
    'Banco gestaodma isolado (gestaodma.database.js) já contém apenas dados do 61/2023.',
    'sheetToHtml/xlsxToHtml escapam &, <, > (fichas.routes.js:482; documentos.routes.js:236).',
    'Sem eval/new Function/document.write/javascript: URI nos 3 projetos.',
    'sei-monitor-sync com token estático dedicado para escrita.',
]

# ─── Recomendações priorizadas ─────────────────────────────────────
RECOMENDACOES = [
    ('P1', 'Rotacionar imediatamente todos os segredos expostos: JWT_SECRET, ENCRYPTION_KEY, AUTH_PASS, chave RSA (vmoracle.key), token Cloudflare, credenciais SEI.'),
    ('P1', 'Remover do repositório e do histórico git: tokenflare.txt, vmoracle.key, credenciais.txt, e valores reais de .env.example (BFG Repo-Cleaner).'),
    ('P1', 'Validar assinatura do ID token Firebase no backend (firebase-admin) — elimina o bypass de autenticação que amplifica todos os demais riscos.'),
    ('P1', 'Adicionar autenticação (authenticate) às rotas públicas: /gestores/*, /municipios/*, /documentos/view/:hash, /documentos/pdf/:hash e ao Bull Board (requireAdmin).'),
    ('P2', 'Corrigir path traversal em /fichas/debug-date e reforçar o check de prefixo em /fichas/view e /fichas/download (safeResolve + path.sep).'),
    ('P2', 'Aplicar isolamento de escopo: restringir endpoints de listagem/agregação/exportação ao contrato 61/2023 (ou RBAC por permissão).'),
    ('P2', 'Adicionar requireAdmin ou validação de posse em PUT/DELETE de acompanhamento e no acesso a arquivos (medicoes, documentos-contrato, fichas) validando o contrato.'),
    ('P3', 'Sanitizar SVG (SlideViewer) com dompurify e escapar saída HTML em ficha-html.js.'),
    ('P3', 'Remover fallbacks hardcoded de HMAC secret e de credenciais Firebase; exigir variáveis de ambiente.'),
    ('P3', 'Adicionar .env.development e tokenflare.txt ao .gitignore; remover senha padrão hardcoded de server.js.'),
]

# ─── Issues para GitHub ─────────────────────────────────────────────
ISSUES = [
    ("[Segurança] Rotas de gestores e municípios sem autenticação expõem PII da carteira",
     "Critica",
     "As rotas GET /api/gestores*, GET /api/municipios* e o Bull Board não possuem preHandler de autenticação. Qualquer pessoa não autenticada pode listar nomes de gestores/fiscais, portarias, datas e medições municipais de toda a carteira de contratos, sem restrição ao contrato alvo 61/2023.\n\nEvidência:\n- backend/routes/gestores.routes.js:100,133,275,486\n- backend/routes/municipios.routes.js:12,58,78\n- backend/routes/admin.routes.js:42-45 (Bull Board)",
     "Exposição de dados pessoais (LGPD) e da carteira completa; controle de filas de produção.",
     "Adicionar preHandler: [authenticate] em todas essas rotas e requireAdmin no Bull Board; restringir o escopo de consulta ao contrato 61/2023.",
     "- [ ] Rotas /gestores* exigem login\n- [ ] Rotas /municipios* exigem login\n- [ ] Bull Board exige admin\n- [ ] Teste manual sem token retorna 401"),
    ("[Segurança] ID token Firebase aceito sem verificação de assinatura (bypass de autenticação)",
     "Critica",
     "O backend decodifica o payload do Firebase JWT em base64 e valida apenas exp/iss, sem verificar a assinatura RS256 contra as chaves públicas do Google. Qualquer atacante pode forjar um token com aud/firebase e exp futuro, autenticando como qualquer uid.\n\nEvidência:\n- backend/routes/auth.routes.js:128-169\n- backend/middleware/auth.middleware.js:65-81",
     "Bypass total de autenticação; permite explorar todas as demais falhas de autorização.",
     "Validar a assinatura do ID token com firebase-admin (verifyIdToken) ou com as chaves públicas do projeto.",
     "- [ ] verifyIdToken usado no login\n- [ ] Token forjado rejeitado (teste)\n- [ ] exp/iss/aud validados"),
    ("[Segurança] Segredos reais commitados (JWT_SECRET, ENCRYPTION_KEY, AUTH_PASS, chave SSH, token Cloudflare, credenciais SEI)",
     "Critica",
     "Arquivos commitados contêm segredos de produção reais: backend/.env.example (JWT_SECRET, ENCRYPTION_KEY, AUTH_PASS), tokenflare.txt (token Cloudflare), vmoracle.key (chave privada SSH), Tools/electron/scripts/credenciais.txt (senha SEI).\n\nEvidência:\n- backend/.env.example:22,27-28,35,57\n- tokenflare.txt\n- vmoracle.key\n- gemoc-backend/Tools/electron/scripts/credenciais.txt",
     "Forja de tokens admin, descriptografia LGPD, acesso SSH à VM e acesso ao SEI.",
     "Rotacionar todos os segredos, removê-los do histórico (BFG), substituir .env.example por placeholders e atualizar .gitignore.",
     "- [ ] Segredos rotacionados\n- [ ] Removidos do histórico git\n- [ ] .env.example só com placeholders\n- [ ] .gitignore cobre tokenflare/credenciais"),
    ("[Segurança] Path traversal em /fichas/debug-date e check fraco em /fichas/view|download",
     "Alta",
     "A rota /fichas/debug-date resolve req.query.path com path.resolve sem validar prefixo, permitindo ../ para ler .xlsx arbitrários do servidor. As rotas view/download usam startsWith sem path.sep, permitindo bypass por diretório irmão.\n\nEvidência:\n- backend/routes/fichas.routes.js:662-694,974-1023,1039-1063",
     "Leitura arbitrária de arquivos do servidor e acesso cross-contrato.",
     "Reutilizar safeResolve() com validação de prefixo + separador e validar posse do contrato.",
     "- [ ] debug-date usa safeResolve\n- [ ] view/download validam contrato\n- [ ] Teste com ../ retorna 403"),
    ("[Segurança] Documentos servidos por hash sem autenticação (/documentos/view/:hash, /documentos/pdf/:hash)",
     "Alta",
     "As rotas de visualização e conversão de documentos não possuem preHandler. Como GET /documentos (autenticado) lista todos os hashes, um hash vazado dá acesso a arquivos de qualquer contrato sem login.\n\nEvidência:\n- backend/routes/documentos.routes.js:359,366",
     "Vazamento de documentos de todos os contratos.",
     "Adicionar authenticate e validar posse do documento pelo contrato do usuário.",
     "- [ ] view/pdf exigem login\n- [ ] Posse validada por contrato\n- [ ] Teste sem token retorna 401"),
    ("[Segurança] XSS: SVG sem sanitização (SlideViewer) e HTML de ficha sem escape (ficha-html.js)",
     "Media",
     "O SVG gerado pelo pptx é injetado via dangerouslySetInnerHTML sem sanitização (dompurify não usado). Dados de contrato/gestor/objeto entram no HTML da ficha sem escape.\n\nEvidência:\n- gestaoDMA/src/components/portfolio/SlideViewer.jsx:164 (e gemoc-frontend)\n- gemoc-backend/backend/scripts/ficha-html.js:29-91",
     "Execução de script no contexto do usuário (XSS armazenado).",
     "Sanitizar com dompurify e escapar a saída HTML da ficha.",
     "- [ ] dompurify aplicado no SVG\n- [ ] ficha-html.js escapa entradas\n- [ ] Teste com script no PPTX/dado"),
    ("[Segurança] Sem isolamento de escopo: endpoints retornam carteira inteira, não só 61/2023",
     "Media",
     "Contratos, stats, medições, dashboard, OS, portfolio e exportações retornam dados de todos os contratos. O filtro por 61/2023 é feito apenas no frontend (gestaoDMA), sem barreira no backend.\n\nEvidência:\n- backend/repositories/contrato.repository.js:266-626\n- backend/repositories/medicao.repository.js:20-95\n- backend/repositories/dashboard.repository.js:5-233\n- backend/routes/export.routes.js:390-431",
     "Exposição da carteira completa a qualquer usuário autenticado.",
     "Adicionar isolamento por contrato/permissão (RBAC) nos endpoints de leitura e exportação.",
     "- [ ] Endpoints filtram por contrato alvo\n- [ ] Exportações escopadas\n- [ ] Teste de permissão com usuário comum"),
]

# ─── Estilos ────────────────────────────────────────────────────────
styles = getSampleStyleSheet()
styles.add(ParagraphStyle('TitleCov', parent=styles['Title'], fontSize=22, leading=28, textColor=colors.HexColor('#0D6B2E'), alignment=TA_CENTER))
styles.add(ParagraphStyle('Sub', parent=styles['Normal'], fontSize=12, leading=16, alignment=TA_CENTER, textColor=colors.HexColor('#374151')))
styles.add(ParagraphStyle('H1', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#0D6B2E'), spaceAfter=8))
styles.add(ParagraphStyle('H2', parent=styles['Heading2'], fontSize=13, leading=17, textColor=colors.HexColor('#1F2937'), spaceBefore=10, spaceAfter=6))
styles.add(ParagraphStyle('Body', parent=styles['Normal'], fontSize=9.5, leading=13, alignment=TA_JUSTIFY))
styles.add(ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.HexColor('#6B7280')))
styles.add(ParagraphStyle('Mono', parent=styles['Code'], fontSize=7.5, leading=10))

SEV_LABEL = {'critica': 'Crítica', 'alta': 'Alta', 'media': 'Média', 'baixa': 'Baixa', 'ponto_forte': 'Ponto forte'}

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(colors.HexColor('#6B7280'))
    canvas.drawString(2*cm, 1.1*cm, 'Relatório de Auditoria de Segurança — Gestão DMA')
    canvas.drawRightString(A4[0]-2*cm, 1.1*cm, f'Página {doc.page}')
    canvas.setStrokeColor(colors.HexColor('#D1D5DB'))
    canvas.setLineWidth(0.5)
    canvas.line(2*cm, 1.35*cm, A4[0]-2*cm, 1.35*cm)
    canvas.restoreState()

def make_donut():
    """Gráfico de rosca por severidade (matplotlib)."""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        counts = {'critica': sum(1 for a in ACHADOS if a[0]=='critica'),
                  'alta': sum(1 for a in ACHADOS if a[0]=='alta'),
                  'media': sum(1 for a in ACHADOS if a[0]=='media'),
                  'baixa': sum(1 for a in ACHADOS if a[0]=='baixa')}
        fig, ax = plt.subplots(figsize=(4.6, 3.4))
        labels = ['Crítica', 'Alta', 'Média', 'Baixa']
        values = [counts['critica'], counts['alta'], counts['media'], counts['baixa']]
        colors_l = ['#B91C1C', '#EA580C', '#D97706', '#2563EB']
        wedges, _ = ax.pie(values, labels=labels, colors=colors_l, startangle=90,
                           wedgeprops=dict(width=0.4, edgecolor='white'))
        ax.text(0, 0, f'{sum(values)} achados', ha='center', va='center', fontsize=12, fontweight='bold')
        ax.axis('equal')
        fig.tight_layout()
        p = os.path.join(CHART_DIR, 'donut.png')
        fig.savefig(p, dpi=160, transparent=True)
        plt.close(fig)
        return p
    except Exception as e:
        print('Erro donut:', e)
        return None

def make_bars():
    """Gráfico de barras por categoria."""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        cats = {}
        for a in ACHADOS:
            cats[a[1]] = cats.get(a[1], 0) + 1
        names = list(cats.keys())
        values = list(cats.values())
        colors_l = ['#059669', '#2563EB', '#D97706', '#EA580C', '#B91C1C']
        fig, ax = plt.subplots(figsize=(5.2, 3.4))
        bars = ax.barh(names, values, color=colors_l[:len(names)])
        ax.set_xlabel('Nº de achados', fontsize=9)
        ax.tick_params(axis='y', labelsize=8)
        for b, v in zip(bars, values):
            ax.text(v + 0.05, b.get_y() + b.get_height()/2, str(v), va='center', fontsize=9, fontweight='bold')
        fig.tight_layout()
        p = os.path.join(CHART_DIR, 'barras.png')
        fig.savefig(p, dpi=160, transparent=True)
        plt.close(fig)
        return p
    except Exception as e:
        print('Erro barras:', e)
        return None

def build():
    doc = SimpleDocTemplate(OUT_PDF, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm,
                            title='Relatório de Auditoria de Segurança — Gestão DMA',
                            author='Auditoria de Segurança')
    story = []

    # ── Capa ────────────────────────────────────────────────────────
    story.append(Spacer(1, 4*cm))
    story.append(Paragraph('Relatório de Auditoria de Segurança', styles['TitleCov']))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph('Gestão DMA — contrato 61/2023', styles['Sub']))
    story.append(Spacer(1, 0.8*cm))
    story.append(Paragraph('Data: 29/08/2026', styles['Sub']))
    story.append(Spacer(1, 1.2*cm))
    story.append(Paragraph('<b>Escopo auditado</b>', styles['H2']))
    story.append(Paragraph('gestaoDMA · gemoc-frontend · gemoc-backend (backend compartilhado dos dois frontends)', styles['Body']))
    story.append(Spacer(1, 0.6*cm))
    story.append(Paragraph('<b>Nota metodológica</b>', styles['H2']))
    story.append(Paragraph(f'Stack detectada: {STACK}.', styles['Body']))
    story.append(Paragraph('Mapeamento das categorias para a stack:', styles['Body']))
    for item in [
        '1. Banco sem tranca → como não há ORM, verificamos o isolamento nas queries SQL puras (better-sqlite3) dos repositories e no escopo de contrato (61/2023).',
        '2. Permissão no navegador → cruzamos gates de papel do frontend (isAdmin/user.tipo) com os preHandler do backend (authenticate/requireAdmin).',
        '3. IDOR → percorremos todos os handlers de routes/ buscando acesso a objetos/arquivos por ID/path/hash sem verificação de posse ou contrato.',
        '4. Chaves expostas → varredura de segredos hardcoded em código, .env*, configs, scripts, gitignore e histórico git.',
        '5. Inputs sem tratamento (XSS) → innerHTML/dangerouslySetInnerHTML no frontend e interpolação sem escape no HTML gerado pelo backend.',
    ]:
        story.append(Paragraph('• ' + item, styles['Body']))
    story.append(Spacer(1, 0.8*cm))
    story.append(Paragraph('Auditoria de código estático sobre o estado atual do repositório (branch main / feature/novo-tema-azul-logo).', styles['Small']))
    story.append(PageBreak())

    # ── Resumo executivo ────────────────────────────────────────────
    story.append(Paragraph('Resumo Executivo', styles['H1']))
    counts = {'critica': sum(1 for a in ACHADOS if a[0]=='critica'),
              'alta': sum(1 for a in ACHADOS if a[0]=='alta'),
              'media': sum(1 for a in ACHADOS if a[0]=='media'),
              'baixa': sum(1 for a in ACHADOS if a[0]=='baixa')}
    total = sum(counts.values())
    story.append(Paragraph(f'Total de <b>{total}</b> achados: <b>{counts["critica"]} críticos</b>, '
                           f'<b>{counts["alta"]} altos</b>, <b>{counts["media"]} médios</b>, <b>{counts["baixa"]} baixos</b>. '
                           'Foram verificados também <b>12 pontos fortes</b> (controles que funcionam corretamente).', styles['Body']))
    story.append(Spacer(1, 0.5*cm))

    # Tabela resumo
    resumo = [['Severidade', 'Qtd', 'Cor']]
    for k, label in [('critica','Crítica'), ('alta','Alta'), ('media','Média'), ('baixa','Baixa')]:
        resumo.append([label, str(counts[k]), ''])
    rt = Table(resumo, colWidths=[4*cm, 2*cm, 2*cm])
    rt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0D6B2E')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BACKGROUND', (0,1), (0,1), PALETTE['critica']),
        ('BACKGROUND', (0,2), (0,2), PALETTE['alta']),
        ('BACKGROUND', (0,3), (0,3), PALETTE['media']),
        ('BACKGROUND', (0,4), (0,4), PALETTE['baixa']),
        ('TEXTCOLOR', (0,1), (0,4), colors.white),
        ('FONTNAME', (0,1), (0,4), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D1D5DB')),
        ('ALIGN', (1,0), (1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(rt)
    story.append(Spacer(1, 0.5*cm))

    # Gráficos
    donut = make_donut()
    bars = make_bars()
    graficos = []
    if donut and bars:
        graficos = Table([[Image(donut, width=7*cm, height=5.2*cm), Image(bars, width=7.6*cm, height=5.2*cm)]])
        graficos.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'), ('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
        story.append(graficos)
    else:
        story.append(Paragraph('Gráficos indisponíveis (matplotlib).', styles['Small']))
    story.append(PageBreak())

    # ── Pontos fortes e fracos ──────────────────────────────────────
    story.append(Paragraph('Pontos Fortes (verificados e protegidos)', styles['H1']))
    for pf in PONTOS_FORTES:
        story.append(Paragraph('✅ ' + pf, styles['Body']))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph('Riscos Centrais (pontos fracos)', styles['H1']))
    for r in [
        'Autenticação forjável: o ID token Firebase não tem assinatura validada no backend (bypass amplifica tudo).',
        'Diversas rotas públicas: gestores, municípios e documentos servem dados/PII sem login.',
        'Segredos de produção reais commitados no repositório (JWT_SECRET, chave SSH, token Cloudflare, credenciais SEI).',
        'Sem isolamento de escopo: os endpoints retornam a carteira inteira; o filtro 61/2023 só existe no frontend.',
        'Path traversal em /fichas/debug-date e acessos cross-contrato a arquivos (fichas, medições, documentos).',
    ]:
        story.append(Paragraph('• ' + r, styles['Body']))
    story.append(PageBreak())

    # ── Tabela de achados ───────────────────────────────────────────
    story.append(Paragraph('Tabela de Achados por Categoria', styles['H1']))
    for cat in ['Banco sem tranca', 'Permissão no navegador', 'IDOR', 'Chaves expostas', 'XSS']:
        ach = [a for a in ACHADOS if a[1] == cat]
        if not ach:
            continue
        story.append(Paragraph(cat, styles['H2']))
        data = [['Sev', 'Arquivo:linha', 'Descrição']]
        for sev, _cat, loc, titulo, desc, impacto, corr in ach:
            data.append([SEV_LABEL[sev], loc, f'{titulo}. {desc}'])
        t = Table(data, colWidths=[1.8*cm, 4.6*cm, 10.6*cm], repeatRows=1)
        style = [
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0D6B2E')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 8),
            ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#D1D5DB')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('FONTSIZE', (0,1), (-1,-1), 7),
            ('LEADING', (0,1), (-1,-1), 9),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]
        # cor do chip de severidade
        for i, (sev, _c, _l, _t, _d, _i, _co) in enumerate(ach, start=1):
            style.append(('BACKGROUND', (0,i), (0,i), PALETTE[sev]))
            style.append(('TEXTCOLOR', (0,i), (0,i), colors.white))
        t.setStyle(TableStyle(style))
        story.append(t)
        story.append(Spacer(1, 0.4*cm))
    story.append(PageBreak())

    # ── Recomendações ───────────────────────────────────────────────
    story.append(Paragraph('Recomendações Priorizadas', styles['H1']))
    for prio, rec in RECOMENDACOES:
        cor = PALETTE['critica'] if prio == 'P1' else (PALETTE['alta'] if prio == 'P2' else PALETTE['media'])
        p = Paragraph(f'<b><font color="#{cor.hexval()[2:]}">[{prio}]</font></b> {rec}', styles['Body'])
        story.append(p)
        story.append(Spacer(1, 0.25*cm))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph('Legenda P1: corrigir imediatamente (risco crítico). P2: corrigir em curto prazo. P3: melhorias de endurecimento.', styles['Small']))
    story.append(PageBreak())

    # ── Issues para GitHub ──────────────────────────────────────────
    story.append(Paragraph('Issues para o GitHub', styles['H1']))
    for i, (titulo, sev, problema, impacto, correcao, aceite) in enumerate(ISSUES, start=1):
        sev_cor = PALETTE['critica'] if sev == 'Critica' else PALETTE['alta']
        story.append(Paragraph(f'<b><font color="#{sev_cor.hexval()[2:]}">Issue {i} · {sev}</font></b>', styles['H2']))
        block = (
            f"--- ISSUE {i} ---\n"
            f"**Titulo:** [{titulo}]\n\n"
            f"**Labels sugeridas:** security, {sev.lower()}\n\n"
            f"**Descricao do problema:**\n{problema}\n\n"
            f"**Impacto:**\n{impacto}\n\n"
            f"**Sugestao de correcao:**\n{correcao}\n\n"
            f"**Criterios de aceite (checklist):**\n{aceite}\n"
            f"--- FIM ISSUE {i} ---"
        )
        for line in block.strip().split('\n'):
            story.append(Paragraph(line, styles['Mono']))
        story.append(Spacer(1, 0.4*cm))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print('PDF gerado:', OUT_PDF)

if __name__ == '__main__':
    build()
