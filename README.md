# LifeTrigger Engine

> **Motor de Inteligência de Proteção de Vida para Corretoras de Seguros**
> API SaaS B2B que transforma dados financeiros e familiares em diagnóstico de proteção auditável — em milissegundos.

---

## O que é

O **LifeTrigger Engine** é um motor determinístico de análise de necessidade de seguro de vida. Ele recebe o contexto financeiro e familiar de um cliente e devolve:

- O **capital segurado ideal** (calculado em 6 componentes: reposição de renda, liquidação de dívidas, reserva de transição, custos de educação, ITCMD e custos de inventário)
- O **gap de proteção** em R$ e %
- Uma **ação recomendada**: `AUMENTAR`, `MANTER`, `REDUZIR` ou `REVISAR`
- Uma **classificação de risco**: `CRÍTICO`, `MODERADO` ou `ADEQUADO`
- **Justificativas em português** para cada componente do cálculo
- Um **AuditHash SHA-256** garantindo imutabilidade do resultado

O núcleo matemático é **100% determinístico** — o mesmo input sempre produz o mesmo output, sem heurística, sem IA, sem variância. Isso é essencial para compliance regulatório e defesa em sinistros.

---

## Para quem serve

| Caso de Uso | Como o motor resolve |
|-------------|----------------------|
| **Prospecção ativa** | Fornece diagnóstico técnico imediato para o corretor abrir a conversa com dados, não com feeling |
| **Análise de carteira** | Identifica quais clientes estão em CRÍTICO ou com cobertura desatualizada para priorizar contatos |
| **Eventos de vida** | Detecta casamento, filho, imóvel via `/triggers` e recalcula o gap automaticamente |
| **Quiz no site/WhatsApp** | A corretora conecta o endpoint diretamente num formulário B2C — o cliente vê o próprio risco em tempo real |
| **Conformidade** | Audit hash criptográfico prova que a recomendação foi feita com matemática, não com interesse comercial |

---

## Capacidades do Motor

### Cálculo de Cobertura Recomendada
O motor soma 6 componentes configuráveis:

```
Cobertura = Reposição de Renda + Liquidação de Dívidas + Reserva de Transição + Custos de Educação + ITCMD + Custos de Inventário
```

- **Reposição de renda**: 2 anos (sem dependentes) até 8+ anos (com dependentes), ajustável por corretora
- **Liquidação de dívidas**: valor total da dívida ativa do cliente
- **Reserva de transição**: meses de renda para manter o padrão de vida — calculado com base no fundo de emergência existente
- **Custos de educação**: valor estimado total de educação dos dependentes (opcional)
- **ITCMD (imposto de herança)**: calculado sobre o patrimônio total com alíquota variável por estado (2–8%)
- **Custos de inventário**: honorários e custos legais de inventário (padrão 10% do patrimônio)

### Scores Bi-dimensionais

| Score | O que mede | Faixa |
|-------|-----------|-------|
| **Protection Score** | Qualidade da proteção atual vs. necessidade calculada | 0–100 |
| **Coverage Efficiency Score** | Eficiência do capital alocado (penaliza super-seguro e capital ocioso) | 0–100 |

### Guardrails por Corretora
Cada corretora (tenant) configura os próprios limites via API Admin:

```json
{
  "incomeReplacementYearsSingle": 2,
  "incomeReplacementYearsWithDependents": 5,
  "emergencyFundBufferMonths": 6,
  "maxTotalCoverageMultiplier": 20,
  "minCoverageAnnualIncomeMultiplier": 2
}
```

### Life Triggers (Gatilhos de Vida)
O endpoint `/api/v1/triggers` recebe eventos de vida e força a ação `REVISAR`:

```json
{
  "triggerType": "NovoFilho",
  "description": "Nascimento do segundo filho",
  "eventDate": "2026-02-15T00:00:00Z",
  "baseRequest": { ... }
}
```

Tipos suportados: `Casamento`, `NovoFilho`, `Imovel`, `Aumento_Salario`, e qualquer string personalizada.

---

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/v1/evaluations` | Avaliação principal — retorna diagnóstico completo |
| `GET` | `/api/v1/evaluations/{id}` | Recupera avaliação histórica |
| `GET` | `/api/v1/admin/audit/evaluations/{id}/verify` | Verifica integridade do AuditHash |
| `GET` | `/api/v1/evaluations/admin/reports/pilot` | Relatório agregado sem PII |
| `DELETE` | `/api/v1/evaluations/admin/demo-environments/tenants/{tenantId}` | Limpa dados de demo |
| `POST` | `/api/v1/triggers` | Registra evento de vida e recalcula |
| `GET` | `/api/v1/admin/tenants/{tenantId}/settings` | Lê configurações do tenant |
| `PUT` | `/api/v1/admin/tenants/{tenantId}/settings` | Atualiza parâmetros do tenant |
| `GET` | `/api/v1/engine/versions` | Versão do motor e do ruleset |
| `POST` | `/api/v1/auth/mock-token` | Gera JWT de desenvolvimento |
| `GET` | `/health` | Health check da aplicação |

Todos os endpoints (exceto `/health` e `/auth/mock-token`) exigem `Authorization: Bearer <token>`.
Os endpoints de `POST /evaluations` e `POST /triggers` exigem o header `Idempotency-Key`.

---

## Conformidade e Segurança

- **LGPD nativa**: campo `hasExplicitActiveConsent` obrigatório — se ausente, retorna `422 CONSENT_REQUIRED`
- **Sem PII na API**: o motor opera apenas com dados numéricos e categóricos. Nome, CPF, e-mail nunca trafegam
- **Multi-tenant estrito**: isolamento por `tenant_id` extraído do JWT em todas as operações de I/O
- **AuditHash SHA-256**: cada avaliação recebe um hash imutável verificável a qualquer momento
- **Rate Limiting**: 60 req/min por IP (fixed window) nos endpoints de avaliação
- **Idempotência**: requisições repetidas com o mesmo `Idempotency-Key` não reprocessam o core nem reinserem no banco
- **Correlation ID**: header `X-Correlation-ID` propagado em todas as respostas para rastreabilidade distribuída

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Runtime | .NET 9.0 / ASP.NET Core |
| Banco de dados | PostgreSQL (via Npgsql + EF Core 9) |
| Autenticação | JWT Bearer |
| Documentação | Swagger/OpenAPI (Swashbuckle) |
| Testes | xUnit + FluentAssertions + Golden Files |
| Arquitetura | Clean Architecture / DDD (Domain, Application, Infrastructure, Api) |

---

## Estrutura do Projeto

```
LifeTriggerEngine/
├── src/
│   ├── LifeTrigger.Engine.Domain/          # Entidades, Enums, Contratos de Request/Response
│   ├── LifeTrigger.Engine.Application/     # Motor de cálculo, Interfaces, Validadores
│   ├── LifeTrigger.Engine.Infrastructure/  # EF Core, Repositórios, Serviços de infraestrutura
│   └── LifeTrigger.Engine.Api/             # Controllers, Middlewares, Filters, Program.cs
├── tests/
│   └── LifeTrigger.Engine.Tests/           # Testes unitários + Golden Files de regressão
├── docs/
│   ├── PARTNER_API_DOCS.md                 # Referência completa da API para parceiros
│   ├── INTEGRATION_SETUP.md               # Guia de integração passo a passo
│   ├── QUICK_START_DEMO.md                # Rodando o demo em 5 minutos
│   ├── PILOT_GUIDE.md                     # Guia de piloto para corretoras
│   ├── TECHNICAL_REFERENCE.md             # Referência técnica interna
│   └── PITCH_DECK_SUPPORT.md              # Material de apoio comercial
└── ARCHITECTURE.md                         # Decisões arquiteturais e design do sistema
```

---

## Quick Start

### Pré-requisitos
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- PostgreSQL rodando localmente (ou Docker)

### 1. Clone e configure

```bash
git clone <repo-url>
cd LifeTriggerEngine
```

Edite `src/LifeTrigger.Engine.Api/appsettings.json` com sua connection string:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=LifeTriggerDb;Username=postgres;Password=sua_senha"
  }
}
```

### 2. Execute

```bash
dotnet run --project src/LifeTrigger.Engine.Api
```

O motor aplica as migrations automaticamente no boot. Em `Development`, dados de demo são inseridos automaticamente.

### 3. Acesse o Swagger

```
https://localhost:5001/swagger
```

### 4. Obtenha um JWT de desenvolvimento

```bash
curl -X POST https://localhost:5001/api/v1/auth/mock-token \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1"}'
```

### 5. Execute uma avaliação

```bash
curl -X POST https://localhost:5001/api/v1/evaluations \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: demo-001" \
  -H "Content-Type: application/json" \
  -d '{
    "personalContext": { "age": 35, "professionRiskLevel": "BAIXO", "isSmoker": false },
    "financialContext": {
      "monthlyIncome": { "exactValue": 15000 },
      "debts": { "totalAmount": 200000, "remainingTermMonths": 120 },
      "emergencyFundMonths": 2,
      "educationCosts": { "totalEstimatedCost": 120000 },
      "estate": { "totalEstateValue": 800000, "state": "SP" }
    },
    "familyContext": { "dependentsCount": 2, "dependentsAges": [5, 8] },
    "operationalData": {
      "originChannel": "API",
      "hasExplicitActiveConsent": true,
      "consentId": "consent-demo-001",
      "tenantId": "A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1"
    }
  }'
```

---

## Testes

```bash
dotnet test tests/LifeTrigger.Engine.Tests --configuration Release
```

A suíte inclui:
- **Testes unitários** do motor de cálculo (34 cenários)
- **Golden Files** — pares `input.json` → `expected_output.json` para regressão determinística
- Se um resultado mudar silenciosamente (score, ação, justificativa), o build quebra imediatamente

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

---

## Configuração de Variáveis de Ambiente (Produção)

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `ConnectionStrings__DefaultConnection` | Connection string do PostgreSQL | Sim |
| `JwtConfig__Secret` | Chave secreta para assinar JWTs | Sim |

> **Nunca use a chave padrão de desenvolvimento em produção.**

---

## Licença

Proprietário — todos os direitos reservados. Para licenciamento comercial, entre em contato.
