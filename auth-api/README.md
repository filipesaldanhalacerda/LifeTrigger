# LifeTrigger Auth API

Camada de identidade enterprise para o ecossistema LifeTriggerEngine. Responsável por gerenciamento de usuários, controle de tenants e emissão de tokens JWT compatíveis com o Engine de cálculo.

---

## Visão Geral — Arquitetura de Comunicação

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Frontend)                           │
│                       http://localhost:5173                          │
│                                                                      │
│  api.ts → login()  ──────────────────────────────────────────────┐  │
│  api.ts → postEvaluation() ─────────────────────────────────┐    │  │
└───────────────────────────────────────────────────────────────|────|─┘
                                                               │    │
           Vite Proxy (vite.config.ts)                         │    │
           ┌────────────────────────────────────────────────── │ ───│─┐
           │  /api/v1/auth    ──────────────────────────────── │ ───┘ │
           │  /api/v1/tenants ─────────────────────────────────│──┐   │
           │  /api/v1/users   ─────────────────────────────────│──┤   │
           │  /api/*          ─────────────────────────────────┘  │   │
           └───────────────────────────────────────────────────────│──┘
                                                                   │
              ┌────────────────────────┐    ┌─────────────────────┐│
              │    Auth API            │    │   Engine API        ││
              │  localhost:5086        │    │  localhost:5086     ││
              │                        │    │                     ││
              │ POST /auth/login       │    │ POST /evaluations ←─┘│
              │ POST /auth/refresh     │    │ POST /triggers        │
              │ GET  /auth/me          │    │ GET  /evaluations/{id}│
              │ POST /tenants          │    │                       │
              │ POST /users            │    │ Valida JWT via        │
              │                        │    │ JwtConfig:Secret      │
              │ Emite JWT com claims:  │    │                       │
              │  • sub (userId)        │    │ Extrai tenantId       │
              │  • tenantId            │───▶│ do JWT → injeta no   │
              │  • role                │    │ request (anti-spoof)  │
              │  • email               │    │                       │
              └──────────┬─────────────┘    └───────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │      Supabase        │
              │    PostgreSQL        │
              │  tenants             │
              │  users               │
              │  refresh_tokens      │
              └──────────────────────┘
```

### Por que os tokens funcionam diretamente no Engine

| Configuração | Auth API | Engine |
|-------------|----------|--------|
| `JwtConfig:Secret` | Mesma string | Mesma string |
| `ValidateIssuer` | — | `false` |
| `ValidateAudience` | — | `false` |
| Claim `tenantId` | Emite | Lê e injeta no request |
| Claim `role` | Emite | Aceita (futuro RBAC) |

O Engine não valida issuer nem audience — qualquer token assinado com a mesma secret é aceito. Isso permite usar tanto tokens da Auth API quanto tokens mock do Engine em desenvolvimento.

---

## Isolamento de Tenant (Anti-Spoofing)

Um dos benefícios centrais da integração Auth API → Engine é a **garantia de isolamento de tenant via JWT**, implementada nos controllers do Engine.

**Fluxo de enforcement:**

```
JWT: { tenantId: "A1A1..." }
          │
          ▼
EvaluationsController.GetTenantIdFromJwt()
          │
          ▼
request.OperationalData.TenantId = jwtTenantId  ← sobrescreve o body
          │
          ▼
Avaliação salva com TenantId correto no banco
```

**Sem Auth API (mock token):** O tenant do request body é respeitado (comportamento legado).
**Com Auth API:** O `tenantId` do JWT sempre prevalece — o cliente **não pode** falsificar o tenant mesmo passando outro valor no body.

---

## Estrutura do Projeto

```
auth-api/
├── src/
│   ├── LifeTrigger.Auth.Api/            # Camada HTTP (Controllers, Middleware, Program.cs)
│   ├── LifeTrigger.Auth.Application/   # Regras de negócio (Interfaces, TokenService)
│   ├── LifeTrigger.Auth.Domain/        # Entidades de domínio (User, Tenant, RefreshToken)
│   └── LifeTrigger.Auth.Infrastructure/ # Persistência (EF Core, Repositórios, Seeder)
├── .gitignore
├── LifeTrigger.Auth.sln
└── README.md
```

### Dependências entre camadas (Clean Architecture)

```
Api → Application → Domain
Api → Infrastructure → Application
```

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|-----------|--------------|
| .NET SDK | 9.0 |
| dotnet-ef | 9.x |
| Conta Supabase | — |

```bash
dotnet tool install --global dotnet-ef
```

---

## Configuração

### 1. Variáveis de ambiente / appsettings

| Arquivo | Finalidade | Commitar? |
|---------|-----------|-----------|
| `appsettings.json` | Valores padrão (sem segredos) | ✅ Sim |
| `appsettings.Development.json` | Credenciais locais | ❌ Não (no .gitignore) |

### 2. Configurar `appsettings.Development.json`

Arquivo em `src/LifeTrigger.Auth.Api/appsettings.Development.json`:

```json
{
  "Urls": "https://localhost:5086",
  "ConnectionStrings": {
    "DefaultConnection": "Host=db.oknwgyllflfbwvcekawh.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=<SUPABASE_DB_PASSWORD>;SSL Mode=Require;Trust Server Certificate=true"
  },
  "JwtConfig": {
    "Secret": "SuperSecretKeyForLocalDevelopmentDoNotUseInProd1234!"
  }
}
```

> ⚠️ O `JwtConfig:Secret` **deve ser idêntico** ao configurado no Engine (`LifeTriggerEngine/src/LifeTrigger.Engine.Api/appsettings.Development.json`). Os dois projetos já estão sincronizados com o mesmo valor padrão de desenvolvimento.

### 3. Onde encontrar a Database Password no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Project Settings → Database**
4. Seção **"Connection string"** → modo **URI** → copie a senha
5. Ou clique em **"Reset database password"** para gerar uma nova

### 4. Diferença entre as credenciais Supabase

| Credencial | Onde usar | Onde NÃO usar |
|-----------|-----------|--------------|
| Publishable API Key (`sb_publishable_...`) | SDK JavaScript, REST API do Supabase | Npgsql / EF Core |
| Database Password | `appsettings.*.json` (conexão PostgreSQL direta) | Frontend / SDK |

> Em produção, injete a secret via variável de ambiente (`JWTCONFIG__SECRET`) ou secrets manager — **nunca** commite valores de produção.

---

## Migrations (banco de dados)

As migrations são gerenciadas pelo EF Core e aplicadas **automaticamente** no startup em Development. Em outros ambientes, aplique manualmente.

### Criar a migration inicial

```bash
# Execute a partir da pasta auth-api/
dotnet ef migrations add InitialCreate \
  --project src/LifeTrigger.Auth.Infrastructure \
  --startup-project src/LifeTrigger.Auth.Api
```

### Aplicar no banco (Supabase)

```bash
dotnet ef database update \
  --project src/LifeTrigger.Auth.Infrastructure \
  --startup-project src/LifeTrigger.Auth.Api
```

### Outros comandos úteis

```bash
# Reverter para uma migration específica
dotnet ef database update <NomeDaMigrationAnterior> \
  --project src/LifeTrigger.Auth.Infrastructure \
  --startup-project src/LifeTrigger.Auth.Api

# Remover a última migration (somente se ainda não foi aplicada)
dotnet ef migrations remove \
  --project src/LifeTrigger.Auth.Infrastructure \
  --startup-project src/LifeTrigger.Auth.Api

# Listar todas as migrations
dotnet ef migrations list \
  --project src/LifeTrigger.Auth.Infrastructure \
  --startup-project src/LifeTrigger.Auth.Api
```

> Todos os comandos `dotnet ef` devem ser executados a partir da pasta `auth-api/`.

---

## Rodando o ecossistema completo

### Comando único (recomendado)

A raiz do repositório possui um `package.json` configurado com `concurrently`. Um único comando inicia os três serviços em paralelo com output colorido por serviço:

```bash
# Na raiz do repositório (LifeTriggerEngine/)
npm run dev
```

Output esperado:
```
[AUTH]   info: Now listening on: https://localhost:5086
[ENGINE] info: Now listening on: https://localhost:5086
[FRONT]  VITE v6.x  ➜  Local: http://localhost:5173
```

### Comandos individuais

Caso precise iniciar apenas um serviço:

```bash
npm run dev:auth    # Auth API
npm run dev:engine  # Engine API
npm run dev:front   # Frontend (Vite)
```

### Terminais separados (alternativa manual)

```bash
# Terminal 1 — Auth API
cd auth-api
dotnet run --project src/LifeTrigger.Auth.Api

# Terminal 2 — Engine API
cd src/LifeTrigger.Engine.Api
dotnet run

# Terminal 3 — Frontend
cd frontend
npm run dev
```

### Verificar inicialização

| Serviço | URL de verificação | Esperado |
|---------|-------------------|---------|
| Auth API | https://localhost:5086/swagger | Swagger UI |
| Engine API | https://localhost:5086/health | `{"status":"Healthy"}` |
| Frontend | http://localhost:5173 | Tela de login → Dashboard SaaS |

### Usuários demo (criados automaticamente no 1º boot)

| Email | Senha | Role | Tenant |
|-------|-------|------|--------|
| `superadmin@lifetrigger.io` | `Super@123!` | SuperAdmin | — |
| `admin@alpha.demo` | `Alpha@123!` | TenantAdmin | DEMO_CORRETORA_ALPHA |
| `partner@alpha.demo` | `Alpha@123!` | Partner | DEMO_CORRETORA_ALPHA |
| `admin@beta.demo` | `Beta@123!` | TenantAdmin | DEMO_EMPRESA_BETA |
| `partner@beta.demo` | `Beta@123!` | Partner | DEMO_EMPRESA_BETA |

---

## Fluxo de autenticação ponta a ponta

```
╔══════════════════════════════════════════════════════════════════╗
║  PASSO 1 — Login na Auth API                                     ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  POST https://localhost:5086/api/v1/auth/login                   ║
║  Body: { "email": "partner@alpha.demo",                          ║
║           "password": "Alpha@123!" }                             ║
║                                                                  ║
║  Response: {                                                     ║
║    "accessToken":  "eyJ...",  ← JWT válido por 1 hora           ║
║    "refreshToken": "abc...",  ← válido por 30 dias              ║
║    "expiresIn": 3600,                                            ║
║    "user": { "role": "Partner",                                  ║
║              "tenantId": "A1A1A1A1-..." }                        ║
║  }                                                               ║
╠══════════════════════════════════════════════════════════════════╣
║  PASSO 2 — Usar o accessToken no Engine                          ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  POST https://localhost:5086/api/v1/evaluations                  ║
║  Authorization: Bearer eyJ...                                    ║
║  Idempotency-Key: <uuid>                                         ║
║                                                                  ║
║  O Engine extrai "tenantId" do JWT e injeta no request           ║
║  → o campo OperationalData.TenantId do body é ignorado          ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  PASSO 3 — Renovar token antes de expirar                        ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  POST https://localhost:5086/api/v1/auth/refresh                 ║
║  Body: { "refreshToken": "abc..." }                              ║
║                                                                  ║
║  Response: novo accessToken + novo refreshToken (rotação)        ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Integração com o Frontend (frontend/src/lib/api.ts)

O frontend já está integrado. As funções disponíveis são:

```typescript
// Login — chama Auth API, armazena access + refresh token
await login('partner@alpha.demo', 'Alpha@123!')

// Todas as chamadas ao Engine usam o token automaticamente
await postEvaluation(request, idempotencyKey)
await postTrigger(event, idempotencyKey)

// Renovar token expirado
await refreshAccessToken()

// Encerrar sessão (revoga refresh token na Auth API)
await logout()

// Dados do usuário logado
const me = await getMe()

// Fallback de desenvolvimento (sem Auth API rodando)
await fetchDemoToken('A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1')
```

### Proxy Vite (vite.config.ts)

O Vite roteia as chamadas para o serviço correto com base no path — **ordem importa** (first match wins):

```
/api/v1/auth    → Auth API  :5086
/api/v1/tenants → Auth API  :5086
/api/v1/users   → Auth API  :5086
/api/*          → Engine    :5086
/health         → Engine    :5086
```

---

## Endpoints disponíveis

### Auth API — Autenticação (`/api/v1/auth`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/login` | — | Login com email/senha → access token + refresh token |
| `POST` | `/refresh` | — | Troca refresh token → novo access token (rotação) |
| `POST` | `/logout` | Bearer | Revoga o refresh token |
| `GET` | `/me` | Bearer | Dados do usuário autenticado |

### Auth API — Tenants (`/api/v1/tenants`)

| Método | Rota | Policy | Descrição |
|--------|------|--------|-----------|
| `POST` | `/` | SuperAdmin | Cria novo tenant |
| `GET` | `/` | SuperAdmin | Lista todos os tenants |
| `GET` | `/{id}` | TenantAdmin | Detalhe de tenant (admin vê só o seu) |
| `PATCH` | `/{id}/status` | SuperAdmin | Ativa ou desativa tenant |

### Auth API — Usuários (`/api/v1/users`)

| Método | Rota | Policy | Descrição |
|--------|------|--------|-----------|
| `POST` | `/` | TenantAdmin | Cria usuário (SuperAdmin: qualquer; TenantAdmin: só o seu) |
| `GET` | `/` | TenantAdmin | Lista usuários filtrados por escopo |
| `GET` | `/{id}` | TenantAdmin | Detalhe de usuário |
| `PATCH` | `/{id}` | TenantAdmin | Atualiza role |
| `PATCH` | `/{id}/status` | TenantAdmin | Ativa ou desativa |
| `POST` | `/{id}/reset-password` | TenantAdmin | Redefine senha e revoga todos os refresh tokens |

### Engine API — protegido por tokens da Auth API

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/v1/evaluations` | Calcula gap de proteção |
| `GET` | `/api/v1/evaluations/{id}` | Recupera avaliação |
| `POST` | `/api/v1/triggers` | Registra gatilho de vida |
| `GET` | `/api/v1/engine/versions` | Versão do motor |
| `GET` | `/health` | Status do serviço |

---

## Roles e permissões

```
SuperAdmin
├── Acesso total ao sistema
├── Gerencia todos os tenants (criar, ativar/desativar)
├── Gerencia usuários de qualquer tenant
└── Pode atribuir qualquer role

TenantAdmin
├── Gerencia usuários do próprio tenant apenas
├── Não pode criar SuperAdmin
└── Não pode ver outros tenants

Partner
└── Emite tokens que o Engine aceita (POST /evaluations, /triggers)
    O tenantId é extraído do JWT — o tenant no body é ignorado

ReadOnly
└── Autenticado no Engine mas sem permissão de escrita (futuro RBAC)
```

---

## Segurança implementada

| Mecanismo | Implementação |
|-----------|--------------|
| Senha | BCrypt (work factor 11) |
| Access Token | JWT HMAC-SHA256, expira em 1 hora |
| Refresh Token | 64 bytes aleatórios via `RandomNumberGenerator`, armazenado como SHA-256 |
| Rotação de refresh | Token antigo revogado a cada uso — impede replay attacks |
| Anti-spoofing de tenant | Engine sobrescreve `OperationalData.TenantId` com o claim do JWT |
| Rate limiting login | 10 req/min por IP (brute-force protection) |
| Rate limiting geral | 120 req/min por IP |
| CORS Auth API | Autoriza apenas `localhost:5173` em desenvolvimento |
| CORS Engine | Autoriza `localhost:5173`, expõe `X-Evaluation-Id` e `X-Correlation-ID` |

---

## Tabelas criadas no Supabase

```sql
tenants
├── id          UUID  PK  DEFAULT gen_random_uuid()
├── name        VARCHAR(255)  NOT NULL
├── slug        VARCHAR(100)  UNIQUE NOT NULL
├── is_active   BOOLEAN  NOT NULL  DEFAULT true
└── created_at  TIMESTAMPTZ  NOT NULL

users
├── id            UUID  PK  DEFAULT gen_random_uuid()
├── email         VARCHAR(255)  UNIQUE NOT NULL
├── password_hash VARCHAR(255)  NOT NULL
├── role          VARCHAR(50)   NOT NULL  -- SuperAdmin | TenantAdmin | Partner | ReadOnly
├── tenant_id     UUID  FK → tenants(id)  NULLABLE  (NULL = SuperAdmin global)
├── is_active     BOOLEAN  NOT NULL  DEFAULT true
├── created_at    TIMESTAMPTZ  NOT NULL
└── last_login_at TIMESTAMPTZ  NULLABLE

refresh_tokens
├── id          UUID  PK  DEFAULT gen_random_uuid()
├── user_id     UUID  FK → users(id)  ON DELETE CASCADE
├── token_hash  VARCHAR(128)  UNIQUE NOT NULL
├── expires_at  TIMESTAMPTZ  NOT NULL
├── revoked_at  TIMESTAMPTZ  NULLABLE
├── created_at  TIMESTAMPTZ  NOT NULL
└── ip_address  VARCHAR(45)  NULLABLE
```

---

## Checklist de primeiro uso

```
[ ] 1. Instalar dotnet-ef globalmente
        dotnet tool install --global dotnet-ef

[ ] 2. Configurar a Database Password do Supabase
        Editar: auth-api/src/LifeTrigger.Auth.Api/appsettings.Development.json
        Substituir: <SUPABASE_DB_PASSWORD>

[ ] 3. Gerar e aplicar migrations
        cd auth-api
        dotnet ef migrations add InitialCreate --project src/LifeTrigger.Auth.Infrastructure --startup-project src/LifeTrigger.Auth.Api
        dotnet ef database update --project src/LifeTrigger.Auth.Infrastructure --startup-project src/LifeTrigger.Auth.Api

[ ] 4. Iniciar os três serviços com um único comando
        Na raiz do repositório:
        npm run dev
        (Auth API + Engine API + Frontend em paralelo)

[ ] 5. Verificar Auth API
        Acessar: https://localhost:5086/swagger
        Testar: POST /api/v1/auth/login  →  { email: "partner@alpha.demo", password: "Alpha@123!" }

[ ] 6. Usar o accessToken retornado no Engine
        POST https://localhost:5086/api/v1/evaluations
        Authorization: Bearer <accessToken>
        → O Engine valida o token e extrai o tenantId automaticamente

[ ] 7. Testar pelo Frontend
        Acessar: http://localhost:5173
        Será redirecionado para /login → autenticar com credenciais demo
        O frontend chama Auth API → obtém token → usa no Engine via Vite proxy
```
