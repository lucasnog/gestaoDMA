# ────────────────────────────────────────────────────────────────
# SMO Consulta — Frontend (React + Vite + Nginx)
# Build context: raiz do projeto (.)
# ────────────────────────────────────────────────────────────────

# ─── 1. BUILD ─────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ─── 2. SERVE ─────────────────────────────────────────────────
FROM nginx:stable-alpine AS runner

RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html
COPY infra/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
