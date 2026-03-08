# LifeTrigger Engine

> **Motor de Inteligência de Proteção de Vida para Corretoras de Seguros**
> SaaS B2B que transforma dados financeiros e familiares em diagnóstico de proteção auditável — em milissegundos.

---

## Visão Geral

O **LifeTrigger Engine** é uma plataforma SaaS completa para corretoras de seguros de vida. O sistema recebe o contexto financeiro e familiar de um cliente e entrega:

- **Capital segurado ideal** calculado em 6 componentes (reposição de renda, dívidas, reserva de transição, educação, ITCMD, inventário)
- **Gap de proteção** em R$ e %
- **Ação recomendada**: `AUMENTAR`, `MANTER`, `REDUZIR` ou `REVISAR`
- **Classificação de risco**: `CRÍTICO`, `MODERADO` ou `ADEQUADO`
- **Scores bi-dimensionais**: Protection Score (0–100) e Coverage Efficiency Score (0–100)
- **Justificativas em português** para cada componente
- **AuditHash SHA-256** garantindo imutabilidade do resultado

O núcleo matemático é **100% determinístico** — mesmo input, mesmo output, sem IA, sem variância.

---

## Infraestrutura de Produção

| Serviço | Plataforma | URL |
|---------|-----------|-----|
| **Frontend** | Vercel | Deploy automático via push no `main` |
| **Engine API** | Render | `https://lifetrigger-engine.onrender.com` |
| **Auth API** | Render | `https://lifetrigger-auth.onrender.com` |
| **Banco de Dados** | Render (Oregon) | PostgreSQL gerenciado (`lifetrigger`) |

### Repositório

- **GitHub**: `filipesaldanhalacerda/LifeTrigger` (branch `main`)
- Deploy do frontend é **automático** via Vercel (conectado ao GitHub)
- Deploy dos backends no Render via **Dockerfiles** na raiz do repo

### Como o roteamento funciona em produção

O frontend (Vercel) faz proxy das chamadas de API via rewrites configurados em `frontend/vercel.json`:

```
/api/auth/*    → Auth API no Render  (/api/v1/*)
/api/engine/*  → Engine API no Render (/api/v1/*)
/(*)           → index.html (SPA fallback)
```

> **Importante**: as URLs de destino dos rewrites estão em `frontend/vercel.json`. Se trocar o domínio de algum serviço no Render, atualize esse arquivo.

### Variáveis de ambiente em produção

#### Engine API (Render)

| Variável | Descrição |
|----------|-----------|
| `ConnectionStrings__DefaultConnection` | Connection string PostgreSQL (Render) |
| `JwtConfig__Secret` | Chave HMAC-SHA256 para validar JWTs (mesma da Auth API) |
| `Cors__AllowedOrigins__0` | URL do frontend no Vercel |

#### Auth API (Render)

| Variável | Descrição |
|----------|-----------|
| `ConnectionStrings__DefaultConnection` | Connection string PostgreSQL (Render) |
| `JwtConfig__Secret` | Chave HMAC-SHA256 para assinar JWTs (mesma do Engine) |
| `Cors__AllowedOrigins__0` | URL do frontend no Vercel |

#### Frontend (Vercel)

| Variável | Descrição |
|----------|-----------|
| `VITE_AUTH_API_URL` | `/api/auth` (usa rewrites do Vercel) |
| `VITE_ENGINE_API_URL` | `/api/engine` (usa rewrites do Vercel) |

> **Regra de ouro**: `JwtConfig__Secret` deve ser **idêntica** nas duas APIs. O Engine valida tokens emitidos pela Auth usando a mesma chave.

---

## Stack Técnica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Backend Runtime | .NET 9.0 / ASP.NET Core | 9.0 |
| Frontend Framework | React | 19.0 |
| Build Tool | Vite | 6.1 |
| Estilização | Tailwind CSS (via Vite plugin) | 4.0 |
| Roteamento Frontend | React Router | 7.1 |
| Ícones | Lucide React | 0.474 |
| Banco de Dados | PostgreSQL (Render) | 14+ |
| ORM | Entity Framework Core (Npgsql) | 9.0 |
| Autenticação | JWT Bearer (HMAC-SHA256) | — |
| Documentação API | Swagger / OpenAPI (Swashbuckle) | 7.2 |
| Testes | xUnit + FluentAssertions + Golden Files | — |
| Containers | Docker (multi-stage builds) | — |
| Linguagens | TypeScript 5.7 (front) / C# 12 (back) | — |

---

## Estrutura do Projeto

```
LifeTriggerEngine/
├── src/                                        # Engine API (.NET 9)
│   ├── LifeTrigger.Engine.Domain/              #   Entidades, Enums, Contratos
│   ├── LifeTrigger.Engine.Application/         #   Motor de cálculo, Validadores
│   ├── LifeTrigger.Engine.Infrastructure/      #   EF Core, Repositórios
│   └── LifeTrigger.Engine.Api/                 #   Controllers, Middleware, Program.cs
│
├── auth-api/                                   # Auth API (.NET 9)
│   └── src/
│       ├── LifeTrigger.Auth.Domain/            #   User, Tenant, RefreshToken
│       ├── LifeTrigger.Auth.Application/       #   TokenService, Interfaces
│       ├── LifeTrigger.Auth.Infrastructure/    #   AuthDbContext, Seeder
│       └── LifeTrigger.Auth.Api/               #   Controllers, Program.cs
│
├── frontend/                                   # React SPA
│   ├── src/
│   │   ├── components/                         #   UI components, layout
│   │   ├── pages/                              #   Todas as telas do SaaS
│   │   ├── contexts/                           #   AuthContext, ThemeContext
│   │   ├── hooks/                              #   Custom hooks
│   │   └── lib/                                #   api.ts, utils
│   ├── vercel.json                             #   Rewrites de produção
│   ├── vite.config.ts                          #   Proxy de desenvolvimento
│   └── package.json
│
├── tests/
│   └── LifeTrigger.Engine.Tests/               # xUnit + Golden Files
│
├── docs/                                       # Documentação técnica e comercial
│   ├── PARTNER_API_DOCS.md                     #   Referência da API para parceiros
│   ├── INTEGRATION_SETUP.md                    #   Guia de integração
│   ├── QUICK_START_DEMO.md                     #   Demo em 5 minutos
│   ├── PILOT_GUIDE.md                          #   Guia de piloto para corretoras
│   ├── TECHNICAL_REFERENCE.md                  #   Referência técnica interna
│   ├── PITCH_DECK_SUPPORT.md                   #   Material comercial
│   ├── database_schema.sql                     #   Schema SQL de referência
│   └── openapi.yaml                            #   Especificação OpenAPI
│
├── Dockerfile                                  # Container do Engine API
├── auth-api/Dockerfile                         # Container da Auth API
├── ARCHITECTURE.md                             # Decisões arquiteturais
├── package.json                                # Orquestração dev (concurrently)
└── LifeTrigger.Engine.sln                      # Solution .NET
```

---

## Banco de Dados

O sistema usa **um banco PostgreSQL único** no Render, compartilhado pelas duas APIs (mesmo schema `public`):

### Tabelas da Auth API

```
tenants          → Corretoras cadastradas
users            → Usuários do sistema (vinculados a tenants)
refresh_tokens   → Tokens de refresh (SHA-256 hash, rotação obrigatória)
login_events     → Registro de logins (IP, UserAgent, timestamp)
```

### Tabelas do Engine API

```
Evaluations      → Avaliações de proteção (Request/Result em JSONB)
TenantSettings   → Parâmetros configuráveis por corretora
IdempotencyKeys  → Cache de idempotência para POST requests
```

### Detalhes importantes

- **Sem FKs entre tabelas das duas APIs** — `TenantId` e `CreatedByUserId` no Engine são colunas denormalizadas
- **Request e Result** são armazenados como **JSONB** na tabela `Evaluations`
- **Enums** são armazenados como **integers** no banco e retornados como **strings** na API
- **Migrations** são aplicadas **automaticamente** no startup (ambas as APIs)
- Para criar novas migrations:

```bash
# Engine API (da raiz)
dotnet ef migrations add NomeDaMigration \
  --project src/LifeTrigger.Engine.Infrastructure \
  --startup-project src/LifeTrigger.Engine.Api

# Auth API (da pasta auth-api/)
cd auth-api
dotnet ef migrations add NomeDaMigration \
  --project src/LifeTrigger.Auth.Infrastructure \
  --startup-project src/LifeTrigger.Auth.Api
```

### Limpeza da base (reset para produção)

```sql
-- Apagar todas as avaliações e caches
DELETE FROM "Evaluations";
DELETE FROM "IdempotencyKeys";
-- (Opcional) DELETE FROM "TenantSettings";
```

Não há cascading constraints — a ordem dos DELETEs não importa.

---

## Sistema de Perfis (Roles)

5 roles cumulativos — quem tem role superior herda todas as permissões inferiores:

```
SuperAdmin (5)     → Administração da plataforma inteira
  └─ TenantOwner (4) → Configurações e billing da corretora
      └─ Manager (3)    → Equipe, relatórios, auditoria, motor
          └─ Broker (2)    → Avaliações, gatilhos, clientes
              └─ Viewer (1)    → Visualização read-only
```

### Telas do frontend por perfil

| Role | Telas |
|------|-------|
| **Viewer** | Dashboard (read-only), Histórico, Guia do Sistema |
| **Broker** | + Nova Avaliação, Meus Clientes |
| **Manager** | + Equipe, Relatórios, Auditoria, Motor |
| **TenantOwner** | + Configurações, Plano & Faturamento |
| **SuperAdmin** | + Corretoras, Usuários Globais, Monitor de Acessos, Análise do Motor, Saúde da Plataforma |

---

## Endpoints da API

### Auth API (`/api/v1/auth`, `/api/v1/tenants`, `/api/v1/users`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/api/v1/auth/login` | — | Login → access token + refresh token |
| `POST` | `/api/v1/auth/refresh` | — | Renova tokens (rotação obrigatória) |
| `POST` | `/api/v1/auth/logout` | Bearer | Revoga refresh token |
| `GET` | `/api/v1/auth/me` | Bearer | Dados do usuário autenticado |
| `POST` | `/api/v1/tenants` | SuperAdmin | Cria tenant |
| `GET` | `/api/v1/tenants` | SuperAdmin | Lista tenants |
| `PATCH` | `/api/v1/tenants/{id}/status` | SuperAdmin | Ativa/desativa tenant |
| `POST` | `/api/v1/users` | TenantOwner+ | Cria usuário |
| `GET` | `/api/v1/users` | TenantOwner+ | Lista usuários |
| `PATCH` | `/api/v1/users/{id}/status` | TenantOwner+ | Ativa/desativa usuário |
| `POST` | `/api/v1/users/{id}/reset-password` | TenantOwner+ | Redefine senha |

### Engine API (`/api/v1`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/api/v1/evaluations` | Broker+ | Avaliação de proteção (requer `Idempotency-Key`) |
| `GET` | `/api/v1/evaluations/{id}` | Broker+ | Recupera avaliação |
| `PATCH` | `/api/v1/evaluations/{id}/status` | Broker+ | Altera status da avaliação |
| `GET` | `/api/v1/evaluations` | Broker+ | Lista avaliações do tenant |
| `POST` | `/api/v1/triggers` | Broker+ | Registra gatilho de vida (requer `Idempotency-Key`) |
| `GET` | `/api/v1/admin/audit/evaluations/{id}/verify` | Manager+ | Verifica integridade do AuditHash |
| `GET` | `/api/v1/admin/tenants/{tenantId}/settings` | TenantOwner+ | Lê configurações do tenant |
| `PUT` | `/api/v1/admin/tenants/{tenantId}/settings` | TenantOwner+ | Atualiza parâmetros do motor |
| `GET` | `/api/v1/engine/versions` | Qualquer | Versão do motor e ruleset |
| `GET` | `/health` | — | Health check |

---

## Conformidade e Segurança

| Mecanismo | Implementação |
|-----------|--------------|
| **LGPD** | Campo `hasExplicitActiveConsent` obrigatório — rejeita com 422 se ausente |
| **Sem PII** | Motor opera só com dados numéricos/categóricos — sem nome, CPF ou e-mail |
| **Multi-tenant** | `TenantId` extraído do JWT, sobrescreve o body (anti-spoofing) |
| **Senhas** | BCrypt (work factor 11) |
| **Access Token** | JWT HMAC-SHA256, expira em 1 hora |
| **Refresh Token** | 64 bytes aleatórios, armazenado como SHA-256, rotação obrigatória |
| **AuditHash** | SHA-256 por avaliação, verificável via endpoint dedicado |
| **Rate Limiting** | 60 req/min (Engine), 10 req/min login, 120 req/min geral |
| **Idempotência** | `Idempotency-Key` obrigatório em POST — replay retorna resposta cacheada |
| **Correlation ID** | `X-Correlation-ID` propagado em todas as respostas |
| **CORS** | Configurável via env var, restringe origens permitidas |

---

## Ambientes: Local vs Produção

> **Regra fundamental**: o banco local (Docker) e o banco de produção (Render) **nunca se misturam**. Cada ambiente é completamente isolado.

| | **Local (Development)** | **Produção** |
|---|---|---|
| **Banco de Dados** | Docker PostgreSQL 16 (`localhost:5432`) | Render PostgreSQL (Oregon) |
| **Database name** | `lifetrigger_dev` | `lifetrigger` |
| **User / Password** | `postgres` / `postgres` | Credenciais no Render Dashboard |
| **Auth API** | `http://localhost:5086` | `https://lifetrigger-auth.onrender.com` |
| **Engine API** | `http://localhost:5001` | `https://lifetrigger-engine.onrender.com` |
| **Frontend** | `http://localhost:5173` (Vite dev server) | Vercel (CDN global) |
| **Config file** | `appsettings.Development.json` | Variáveis de ambiente no Render/Vercel |
| **Dados iniciais** | `DemoDataSeeder` cria tenants e usuários no 1º boot | Dados reais de produção |
| **Migrations** | Aplicadas automaticamente no startup | Aplicadas automaticamente no startup |
| **SSL** | Não necessário | `SSL Mode=Require;Trust Server Certificate=true` |

### Como o .NET escolhe o ambiente

- `dotnet run` usa `ASPNETCORE_ENVIRONMENT=Development` por padrão → carrega `appsettings.Development.json` → **banco local**
- No Render, a variável `ConnectionStrings__DefaultConnection` é injetada como env var → **banco de produção**
- Nunca há risco de cruzamento: o código local não conhece as credenciais de produção

---

## Desenvolvimento Local

### Pré-requisitos

- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para o PostgreSQL local)
- `dotnet-ef` global: `dotnet tool install --global dotnet-ef`

### 1. Clone e instale dependências

```bash
git clone git@github.com:filipesaldanhalacerda/LifeTrigger.git
cd LifeTriggerEngine
npm install            # concurrently (orquestração)
cd frontend && npm install && cd ..
```

### 2. Suba o banco local via Docker

```bash
docker compose up -d
```

Isso cria um container PostgreSQL 16 Alpine com:
- **Host**: `localhost:5432`
- **Database**: `lifetrigger_dev`
- **User**: `postgres` / **Password**: `postgres`
- Volume persistente `pgdata` (dados sobrevivem restart do container)

Comandos úteis:
```bash
docker compose down        # para o container (dados persistem)
docker compose down -v     # para e apaga os dados (reset total)
docker compose logs -f db  # ver logs do PostgreSQL
```

### 3. Connection strings (já configuradas)

Os arquivos `appsettings.Development.json` já apontam para o Docker local:

**Engine API** (`src/LifeTrigger.Engine.Api/appsettings.Development.json`):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=lifetrigger_dev;Username=postgres;Password=postgres"
  },
  "JwtConfig": {
    "Secret": "SuperSecretKeyForLocalDevelopmentDoNotUseInProd1234!"
  }
}
```

**Auth API** (`auth-api/src/LifeTrigger.Auth.Api/appsettings.Development.json`):
```json
{
  "Urls": "http://localhost:5086",
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=lifetrigger_dev;Username=postgres;Password=postgres"
  },
  "JwtConfig": {
    "Secret": "SuperSecretKeyForLocalDevelopmentDoNotUseInProd1234!"
  }
}
```

> As duas APIs **devem** usar o mesmo `JwtConfig:Secret` e apontar para o **mesmo banco**.

### 4. Inicie tudo com um comando

```bash
npm run dev
```

Isso inicia em paralelo (via `concurrently`):
- **AUTH** — Auth API em `http://localhost:5086`
- **ENGINE** — Engine API em `http://localhost:5001`
- **FRONT** — Frontend em `http://localhost:5173`

No primeiro boot, a Auth API:
1. Aplica todas as migrations automaticamente
2. Roda o `DemoDataSeeder` criando tenants e usuários demo

O Vite faz proxy automático das chamadas — o frontend acessa tudo em `localhost:5173`.

### 5. Verificar inicialização

| Serviço | URL | Esperado |
|---------|-----|----------|
| Auth API | http://localhost:5086/swagger | Swagger UI |
| Engine API | http://localhost:5001/swagger | Swagger UI |
| Engine Health | http://localhost:5001/health | `Healthy` |
| Frontend | http://localhost:5173 | Tela de login |

### Usuários demo (criados automaticamente no 1º boot)

| Email | Senha | Role |
|-------|-------|------|
| `superadmin@lifetrigger.io` | `Super@123!` | SuperAdmin |
| `admin@alpha.demo` | `Alpha@123!` | TenantOwner |
| `broker@alpha.demo` | `Alpha@123!` | Broker |

### Resetar o banco local

Para começar do zero (recria o banco e reaplica migrations + seeder):
```bash
docker compose down -v     # apaga o volume com os dados
docker compose up -d       # recria o container limpo
npm run dev                # APIs aplicam migrations e seeder automaticamente
```

---

## Testes

```bash
dotnet test tests/LifeTrigger.Engine.Tests --configuration Release
```

A suíte inclui:
- **Testes unitários** do motor de cálculo (34+ cenários)
- **Golden Files** — pares `input.json` → `expected_output.json` para regressão determinística
- Se um resultado mudar silenciosamente, o build quebra imediatamente

---

## Design System do Frontend

| Aspecto | Detalhe |
|---------|---------|
| **Font** | Plus Jakarta Sans (wght 300–800) via Google Fonts |
| **Paleta primária** | Deep Teal (`brand-*`: #f0fdfa → #042f2e) |
| **Accent** | Warm Amber/Gold (`accent-*`: #fffbeb → #78350f) |
| **Sidebar** | Colapsável (w-64/w-20), gradiente teal-escuro, estado em `localStorage` |
| **Cards** | `rounded-2xl shadow-card` |
| **Animações** | `fadeIn`, `scaleIn`, `slideInLeft`, `pulse-brand`, `.skeleton` |
| **Glass** | `.glass`, `.glass-dark` (backdrop-blur) |
| **Tailwind** | v4 — sem `tailwind.config.js`, usa `@theme` no CSS |

---

## Documentação

| Documento | Público | Conteúdo |
|-----------|---------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Engenharia | Decisões de design, escalabilidade, segurança |
| [docs/PARTNER_API_DOCS.md](docs/PARTNER_API_DOCS.md) | Devs parceiros | Contratos de API, enums, exemplos |
| [docs/INTEGRATION_SETUP.md](docs/INTEGRATION_SETUP.md) | Devs parceiros | Setup completo de integração |
| [docs/QUICK_START_DEMO.md](docs/QUICK_START_DEMO.md) | Todos | Demo rodando em 5 minutos |
| [docs/PILOT_GUIDE.md](docs/PILOT_GUIDE.md) | Corretoras | Guia de piloto e validação |
| [docs/TECHNICAL_REFERENCE.md](docs/TECHNICAL_REFERENCE.md) | Engenharia | Referência técnica detalhada |
| [docs/PITCH_DECK_SUPPORT.md](docs/PITCH_DECK_SUPPORT.md) | Comercial | Material de apoio para reuniões |
| [docs/openapi.yaml](docs/openapi.yaml) | Devs | Especificação OpenAPI |

---

## Notas Importantes para Manutenção

### Deploy

- **Frontend**: push no `main` → Vercel detecta e faz deploy automático
- **Backend**: push no `main` → Render detecta os Dockerfiles e rebuilda os containers
- Se trocar o domínio de um serviço no Render, atualizar `frontend/vercel.json`

### Banco de dados

- Migrations são aplicadas **automaticamente** no startup de ambas as APIs
- Banco de produção: Render PostgreSQL em Oregon (`dpg-d6lbt3jh46gs73douilg-a.oregon-postgres.render.com`)
- Database name: `lifetrigger` / User: `lifetrigger`
- Connection string requer `SSL Mode=Require;Trust Server Certificate=true`
- Para acessar o banco: Render Dashboard → PostgreSQL → `lifetrigger` → Connections

### JWT

- Access token expira em **1 hora**; refresh token em **30 dias** com rotação
- A claim `role` é do tipo string simples (não URL), configurada como `RoleClaimType = "role"` em ambas APIs
- `tenantId` é extraído do JWT e **sobrescreve** qualquer valor enviado no body

### Engine

- O motor é **determinístico** — mesmo input = mesmo output, sempre
- `brokerInsights` e `CoverageEfficiencyScore` são regenerados on-the-fly no GET para registros antigos
- A API server bloqueia DLLs enquanto roda — restart necessário para carregar novo código
- Enums: **integers no banco**, **strings na API** (JsonStringEnumConverter global no Program.cs)

---

## Licença

Proprietário — todos os direitos reservados.
Desenvolvido por **AllTask Soluções Integradas** — alltasksolucoesintegradas@gmail.com
