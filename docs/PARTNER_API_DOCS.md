# Documentação da API de Parceiros - LifeTrigger Engine

Bem-vindo à documentação oficial de integração B2B do **LifeTrigger Engine**. 
Esta API foi projetada para ser consumida diretamente pelo back-end ou front-end de corretoras, plataformas de investimento e bancos parceiros, oferecendo um motor determinístico de análise de risco financeiro e necessidades de seguro de vida.

## Visão Geral técnica

*   **Arquitetura:** RESTful (JSON)
*   **Versionamento:** A API atual opera na versão `v1`. O Base URL de todos os endpoints é o host fornecido seguidos de `/api/v1`.
*   **Multilocação (Multi-Tenant):** As requisições são estritamente isoladas pelos IDs das corretoras parceiras (`tenantId`).
*   **Autenticação:** Baseada em tokens JWT (`Authorization: Bearer <seu_token>`).

---

## Estruturas Fundamentais

Antes de listar os endpoints, é crucial entender os Enums e Blocos Lógicos exigidos pela plataforma.

### Enums Base
*   **Estado Civil (`maritalStatus`)**: `SOLTEIRO`, `CASADO`, `UNIAO_ESTAVEL`, `DIVORCIADO`, `VIUVO`
*   **Risco da Profissão (`professionRiskLevel`)**: `BAIXO`, `MEDIO`, `ALTO`, `EXTREMO`
*   **Tipo de Seguro Atual (`policyType`)**: `TEMPORARIO`, `VITALICIO`
*   **Canal de Origem (`originChannel`)**: Qualquer string que identifique a fonte do Lead para relatórios internos da corretora. Ex: `"LANDING_PAGE_VIP"`, `"WHATSAPP_BOT"`, `"APP_CORRETORA"`.

---

## 🔄 Casos de Uso Suportados (Padrões de Integração)

A API é estritamente *stateless* e não possui telas, o que permite que sua equipe de engenharia a integre em **3 fluxos de parceiros distintos**:

1. **Venda Consultiva B2B Assistida (O Padrão)**: O corretor liga para o cliente, preenche os dados no CRM da corretora e o CRM consome a API para devolver o laudo matemático ao corretor.
2. **Funil Digital B2C (Lead Generation Quiz)**: A corretora cria um formulário público no seu site ("Descubra seu Gap Financeiro"). Quando o cliente preenche, o front-end consome a API e mostra o Risco em tempo real na tela do cliente, capturando-o como um Lead Quente.
3. **Enriquecimento de Base Legada (Batch Processing)**: A corretora varre sua base de dados antiga de clientes via script (Python/Node), disparando milhares de requisições sequenciais contra a API com os dados parciais que já possui para "pescar" quem está com Risco Crítico e distribuir para a equipe de vendas.

---

## 🚀 Endpoint Principal: Avaliação de Vida (Engine Core)

Este é o endpoint universal que suas aplicações devem chamar assim que o formulário do cliente final for preenchido com aceite da política de dados (LGPD).

### `POST /api/v1/evaluations`

**Cabeçalhos Exigidos (Headers):**
*   `Auterization: Bearer <TOKEN>` (Fornecido no contrato B2B)
*   `Idempotency-Key: <UUID>` **[OBRIGATÓRIO]** 
    *   *Propósito:* Previne ataques de duplo clique ou reenvios por falha de 3G/4G no mobile. Se o seu sistema enviar a mesma chave `Idempotency-Key` com o mesmo body em menos de 24 horas, o motor **não executará o cálculo novamente nem duplicará no banco**. Ele devolverá imediatamente a resposta `200 OK` gerada da primeira vez (alta performance e economia de custos).

### O Payload de Envio (Request Body)

```json
{
  "personalContext": {
    "age": 35,
    "maritalStatus": "CASADO",
    "professionRiskLevel": "MEDIO",
    "isSmoker": false
  },
  "financialContext": {
    "monthlyIncome": {
      "exactValue": 15000,
      "bracket": null
    },
    "emergencyFundMonths": 2,
    "debts": {
      "totalAmount": 200000,
      "remainingTermMonths": 60
    },
    "currentLifeInsurance": {
      "coverageAmount": 100000,
      "policyType": "TEMPORARIO"
    }
  },
  "familyContext": {
    "dependentsCount": 1,
    "dependentsAges": [2]
  },
  "operationalData": {
    "originChannel": "LANDING_PAGE",
    "hasExplicitActiveConsent": true,
    "consentId": "uuid-aceite-001",
    "tenantId": "SEU_TENANT_UUID_FORNECIDO",
    "recentLifeTrigger": false
  }
}
```

#### Dicionário de Campos do Request:

| Bloco | Campo | Tipo | Obrigatório | Descrição / Comportamento |
| :--- | :--- | :--- | :---: | :--- |
| **Personal** | `age` | `int` | **Sim** | Idade do proponente. Se < 18, retorna erro 400. |
| **Personal** | `maritalStatus` | `enum` | Não | Caso omitido, assumimos `SOLTEIRO`. |
| **Personal** | `professionRiskLevel`| `enum` | **Sim** | Risco Ocupacional. Impacta Gaps de invalidez futura. |
| **Personal** | `isSmoker` | `bool` | Não | Fator adverso (Default `false`). |
| **Financial**| `monthlyIncome.exactValue`| `decimal` | **Sim** | Salário bruto/líquido. Se for negativo, retorna erro 400. Se o cliente tiver vergonha de dizer, o Front-end deve anular o valor exato e enviar a Renda por Faixa, ou seja: `monthlyIncome.bracket: "10k_15k"`. A Engine interpola o Gap pelo teto da faixa. |
| **Financial**| `emergencyFundMonths` | `int` | Não | Falta desse valor significa "Zero Reserva". Aciona no motor as **Penalidades de Reserva Transicional** aumentando o Gap (Sugerindo apólice maior). |
| **Financial**| `debts.totalAmount` | `decimal` | Não | Falta assinala "Zero Dívidas". Valores altos são herdados pela família na falta do cliente, forçando ações de `AUMENTAR` a cobertura na saída. |
| **Financial**| `currentLifeInsurance`| `object` | Não | Omitir indica 100% de Falta de Proteção Morte. Resulta sempre num score de Risco extremo (Crítico/Aumentar). |
| **Family** | `dependentsCount` | `int` | **Sim** | Base Teto do motor. Cada dependente adiciona um extra anual no fundo de reposição de renda da família projetado pelo Motor. |
| **Family** | `dependentsAges` | `int[]`| Não | Array. Usado se o motor necessitar abater Gaps de cobertura baseadas na longevidade das crianças ate os 18-24 anos. |
| **Operacional**| `originChannel` | `string`| **Sim** | Marcador de leads de Marketing pra Corretora. |
| **Operacional**| `hasExplicitActiveConsent`| `bool` | **Sim** | **BARREIRA LGPD**. Se for enviado `false` ou omitido, todas as operações somem e o motor quebra propositalmente devolvendo um `{ "errorCode": "CONSENT_REQUIRED" }`. Protege sua empresa de processar dados acidentais. |
| **Operacional**| `consentId` | `string`| **Sim** | Referência física/URL ao PDF do termo assinado no momento da captura. |
| **Operacional**| `tenantId` | `uuid` | **Sim** | O seu Token único B2B de ambiente do LifeTrigger. |
| **Operacional**| `recentLifeTrigger` | `bool` | Não | Acionadores Vitais (Casou semana passada? Teve filho?). Se enviado `true`, engatilha overrides automáticos na matemática, transformando imediatamente a ação matemática lógica para `REVISAR`. |

> **Nota Crítica sobre Consentimento (LGPD) em fluxos B2C e Batch:** 
> - **No B2C (Quiz):** A sua tela web *deve* possuir uma checkbox "Aceito os Termos". O atributo `consentId` deve ser o IP do usuário ou um hash da sessão.
> - **No Batch (Base Legada):** Ao rodar scripts na sua base antiga, envie `hasExplicitActiveConsent: true` e use no `consentId` o Número do Contrato Original assinado da corretora com o cliente, garantindo compliance jurídico para a re-análise dos dados dele.

---

### A Resposta Recebida (Response 200 OK)

A API retornará os cálculos imutáveis. Sua aplicação fará o Puxar destas tags para engatilhar as filhas de ligação de Call Center dos Corretores ou emitir a cotação correta no app.

```json
{
  "recommendedCoverageAmount": 1340000,
  "currentCoverageAmount": 100000,
  "protectionGapAmount": 1240000,
  "protectionGapPercentage": 92.53,
  "protectionScore": 0,
  "riskClassification": "CRITICO",
  "recommendedAction": "AUMENTAR",
  "regrasAplicadas": [
    "RULE_INCOME_REPLACEMENT_WITH_DEPENDENTS",
    "RULE_PENALTY_HIGH_DEBT"
  ],
  "justificationsStructured": [
    {
      "ruleId": "RULE_PENALTY_HIGH_DEBT",
      "templateId": "RULE_PENALTY_HIGH_DEBT_V1",
      "messageKey": "rules.penalty_high_debt",
      "args": { "penaltyPoints": 10 }
    }
  ],
  "justificationsRendered": [
    "Penalidade de 10 pontos aplicada no score devido ao alto nível de endividamento (> 50% da renda anual)."
  ],
  "audit": {
    "engineVersion": "1.0.0",
    "ruleSetVersion": "2026.02",
    "ruleSetHash": "UNKNOWN_HASH",
    "appliedRules": [
       "RULE_INCOME_REPLACEMENT_WITH_DEPENDENTS",
       "RULE_PENALTY_HIGH_DEBT"
    ],
    "timestamp": "2026-02-24T23:18:28.637Z",
    "consentId": "uuid-aceite-001"
  }
}
```

#### Dicionário de Campos do Response:

*   **`recommendedCoverageAmount` (Decimal):** O montante matemático ideal apurado que a pessoa **deveria ter**. (Ex: R$ 1.340.000).
*   **`protectionGapAmount` (Decimal):** O buraco exato financeiro descoberto da família.
*   **`protectionGapPercentage` (Double):** Quantos % a família está desprotegida hoje (0 a 100%).
*   **`protectionScore` (Integer):** A nota de saúde da proteção da família (0 a 100).
*   **`riskClassification` (Enum):** A gravidade da situação. (`CRITICO`, `ATENCAO`, `ADEQUADO`).
*   **`recommendedAction` (Enum):** Ação OBRIGATÓRIA recomendada ao CRM. (`AUMENTAR`, `REVISAR`, `MANTER`, `REDUZIR`).
*   **`regrasAplicadas` (Array de Strings):** As Tags internas para o **Front-End/App**. Sua corretora deve usar este array raiz para mapear visualmente ícones na tela (Ex: Se tem `RULE_PENALTY_HIGH_DEBT`, mostrar um ícone "❌ Cuidado com seu Financiamento").
*   **`justificationsStructured`:** Estrutura detalhada de argumentos matemáticos focada para B2B e tradução de robôs (i18n).
*   **`justificationsRendered`:** Textos amigáveis e formataods (Ex: PT-BR) prontos para colar na tela do cliente explicando porque ele precisa contratar mais.

> **Importante: A Duplicação das Regras e o Bloco `audit`**
>
> Você notará que o `regrasAplicadas` se repete no `audit.appliedRules`. Isso não é um erro:
> 1. O **`regrasAplicadas` na raiz** serve para uso prático do UI/Front-End ler rapidamente e exibir na interface sem precisar quebrar objetos complexos.
> 2. O **bloco `audit` completo** (que tem cópia das regras, timestamp, consentId, e versões) serve inteiramente para o **Back-End de Integração e Compliance**. Seu sistema deve pegar a tag `audit` inteira, converter para JSON string, e jogar num banco de auditoria fria para comprovar que o motor na `version 1.0.0` processou aquelas regras exatas com o LGPD `consentId` informado.

> **Nota:** Um header `X-Evaluation-Id` (UUID) será enviado na resposta. Guarde-o no sistema de vocês em caso de eventuais necessidades de Auditoria.

---

## 🔍 Recuperando a Avaliação do Cliente (Detalhe)

Caso o sistema do seu parceiro/corretor precise detalhar o histórico completo de uma Avaliação para exibi-la.

### `GET /api/v1/evaluations/{id}`

*O `id` é o `X-Evaluation-Id` resgatado no Header do Request POST.*

**Exemplo de Resposta (Status 200):**
Retorna o encapsulamento Universal da transação. Inclui a data-hora e quais pacotes o cliente enviou e qual a inteligência deduziu (Result).

```json
{
  "id": "ae5b3762-b9e3-4d40-b6f7-418e28581e23",
  "timestamp": "2026-02-24T12:00:00Z",
  "engineVersion": "1.0.0",
  "ruleSetVersion": "2026.02",
  "request": { /* Cópia do Input original Pessoal, Financeiro e Familiar */ },
  "result": { /* Cópia exata do Output de RiskClassification e RecommendedAction gerado na época */ }
}
```

---

## 📊 Extraindo Métricas Globais (Pilot / C-Level Dashboards)

Extremamente poderoso em fases experimentais, sua liderança pode auditar o sucesso dos engajamentos gerados via motor chamando:

### `GET /api/v1/admin/reports/pilot?tenantId={SEU_TENANT_ID}&startDate={2026-01-01}&endDate={2026-02-28}`

Esta via gera métricas matematicamente puras das vulnerabilidades da base da corretora testada **Sem quebrar nenhuma lei PII (LGPD)** (não devolve nomes, nem os valores literais de salário dos requerentes, blindando 100% vazamentos de banco).

**Exemplo de Resposta:**
```json
{
  "tenantId": "A1A1A1A1-...",
  "period": { "start": "2026-01-01T00:00:00Z", "end": "2026-02-28T00:00:00Z" },
  "totalEvaluations": 134,
  "metrics": {
    "riskDistribution": {
      "CRITICO": 98,
      "ADEQUADO": 12,
      "ATENCAO": 24
    },
    "actionDistribution": {
      "AUMENTAR": 98,
      "MANTER": 12,
      "REDUZIR": 10,
      "REVISAR": 14
    },
    "evaluationsWithRecentLifeTrigger": 4
  }
}
```
*Interpretando:* Em quase 100 propostas fechadas, o motor conseguiu embasar matematicamente 98 vendas reais de *Up-sell/Cross-Sell* (`AUMENTAR`), garantindo eficiência máxima ao departamento de Operações de Venda da corretora.

---

## ⚙️ Parametrização B2B (Tenant Settings)

O Motor LifeTrigger possibilita que cada Empresa Parceira calibre o algoritmo para o seu próprio perfil de apetite de risco e modelo comercial, **sem precisar alterar o código-fonte raiz**.

### `PUT /api/v1/admin/tenants/{tenantId}/settings`

Rota restrita para o seu Back-Office injetar os seus "Pesos e Guardrails" que a API deve usar cada vez que calcular uma proposta para os seus usuários.

**Payload de Configuração (JSON):**
```json
{
  "tenantId": "A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1",
  "incomeReplacementYearsSingle": 2,          // Quantos anos de reposição para pessoas sem dependentes
  "incomeReplacementYearsWithDependents": 5,  // Base de anos de reposição para clientes com dependentes
  "emergencyFundBufferMonths": 6,             // Meses de reserva exigidos. Falta de caixa adiciona essa "gordura" na apólice recomendada.
  "minCoverageAnnualIncomeMultiplier": 2.0,   // Guardrail Inferior: Seguros recomendados nunca terão menos cobertura que X multiplicador da renda anual.
  "maxTotalCoverageMultiplier": 20.0          // Guardrail Superior (Over-insurance): Teto máximo que a Seguradora permite por apólice em relação à Renda.
}
```

Se o seu sistema nunca invocar esta rota, não se preocupe: a sua conta (TenantId) operará utilizando a matemática global (Default) mantida pelo Arquiteto de Software responsável pela plataforma.
