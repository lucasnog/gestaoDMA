# Gestão DMA — Instruções para Agentes

**Responda sempre em português brasileiro.**

## O que é este projeto

Frontend dedicado ao **contrato da empresa gerenciadora (Gestão DMA)** — contrato **61/2023**.

- É uma **cópia do frontend do GEMOC Analytics** (branch `feature/novo-tema-azul-logo` — tema azul com logo de gestão financeira).
- Roda **em paralelo** com o `gemoc-frontend` (não o substitui).
- Usa **o mesmo backend** do GEMOC Analytics (`gemoc-backend`). Não tem backend próprio.
- Enquanto o `gemoc-frontend` mostra a carteira completa de contratos, aqui o foco é **um único contrato**: o **61/2023** (Gestão DMA / gerenciadora).

## Repositório / origem

| Item | Valor |
|---|---|
| Diretório atual | `C:\projetos\Projeto GOINFRA\gestaoDMA\` |
| Fonte da cópia | `C:\projetos\Projeto GOINFRA\GEMOC-ANALYTICS1\gemoc-frontend\` (branch `feature/novo-tema-azul-logo`) |
| Tema | Azul (Sidebar, Dashboard, Login, `index.css` com classes do tema azul, logo de gestão financeira) |
| Refs auxiliares | `C:\projetos\Projeto GOINFRA\GEMOC-ANALYTICS1\AGENTS.md` (contexto geral do GEMOC) |

> **Atenção:** este diretório não é um repositório git (foi copiado sem `.git`). Nada de `git push` aqui sem o usuário pedir explicitamente.

## Stack

React 19 + Vite + Tailwind v4 + Zustand + Recharts (mesma do `gemoc-frontend`).

## Como rodar

```bash
npm install
npm run dev        # Vite, porta 5173 (proxy /api → backend)
```

- O `.env` / `.env.development` aponta a API para o mesmo backend do GEMOC.
- Requer o backend rodando (`cd backend && npm run dev`, porta 3000 — ver `GEMOC-ANALYTICS1\AGENTS.md`).
- `npm run build` para build de produção → `dist/`.

## Contrato alvo: 61/2023 (Gestão DMA)

- **Foco do projeto:** exibir/gerenciar apenas as informações do contrato 61/2023.
- Endpoints do backend relevantes (ver `gemoc-backend/backend/routes/contrato.routes.js`):
  - `GET /api/contratos` (com filtros de busca)
  - `GET /api/contratos/:id/detalhes`
  - `GET /api/stats/bloco`
  - `GET /api/medicoes/mensal` e `/medicoes/mensal/detalhe`
  - `GET /api/medicoes/contratos`
  - `GET /api/gestores/por-contrato` (`gemoc-backend/backend/routes/gestores.routes.js`)
- **Ajuste importante:** como aqui só existe um contrato, as páginas/consultas devem ser **filtradas/restritas ao 61/2023** em vez de listar a carteira inteira (KPIs de carteira, mapa de municípios, estatísticas globais etc.).

## Observações

- Sem testes automatizados, sem lint/typecheck configurado (igual ao GEMOC).
- O que for alterado aqui **não** deve ser sincronizado de volta automaticamente para o `gemoc-frontend` — projetos são independentes.
- Se precisar de contexto sobre o backend (rotas, banco, deploy), consultar `C:\projetos\Projeto GOINFRA\GEMOC-ANALYTICS1\AGENTS.md`.
