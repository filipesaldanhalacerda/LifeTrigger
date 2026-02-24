# LifeTrigger Engine - Integration Setup for Partners

O **LifeTrigger Engine** foi desenhado para ser "Plug-and-Play". Não requer implantações massivas de meses, ETLs de bancos de dados legados ou exposição desnecessária dos dados PII de toda a carteira de segurados da sua corretora.

## Setup Mínimo Necessário (API First)

Para começar a operar no ecossistema, o seu time de tecnologia só precisará conectar o sistema web/mobile da corretora em um único endpoint transacional, orquestrado pela especificação pública.

### 1. Documentação Contratual (OpenAPI)
1. Acesse ou compile o arquivo `openapi.yaml` presente na pasta `/docs`.
2. Utilize ferramentas como **Swagger UI**, **Redoc**, ou gere clientes tipados com **OpenAPI Generator** (TypeScript, React, Python) imediatamente.
3. Não crie validações financeiras pesadas no seu front-end; deixe que todos os cálculos e Guardrails matemáticos fluam pelo Engine. Foque a interface de usuário da corretora apenas em uma boa experiência visual e coleta de campos obrigatórios.

### 2. Autenticação e Multilocação (Multi-Tenant)
O Engine isola seus dados de ponta a ponta. 
- Para consumir a API, forneça um token `Bearer (JWT)`.
- A API abstrai nativamente o fato de se tratar do `DEMO_CORRETORA_ALPHA` ou da sua produção final de acordos com o Header `Authorization` e a extração do `TenantId`.
- Para testar durante o Setup sem afetar a produção, basta que seu Front-end aponte as requisições iniciais portando a chave do seu ambiente isolado Demo de testes.

### 3. Anatomia da Chamada Vital

Para gerar os *Leads Qualificados* para seus corretores:

**Requisitar:** `POST /api/v1/evaluations`
```json
{
  "contexto_pessoal": { "idade": 35, "estado_civil": "CASADO", "risco_profissao": "BAIXO" },
  "contexto_financeiro": { "renda_mensal": { "valor_exato": 15000 }, "dividas": { "valor_total": 200000, "meses_restantes": 60 } },
  "contexto_familiar": { "quantidade_dependentes": 2 },
  "dados_operacionais": { 
      "canal_origem": "APP_CORRETORA", 
      "consentimento_ativo": true, // LGPD Mandatory
      "id_consentimento": "uuid-do-aceite-web-123" 
  }
}
```

O Engine assumirá as rédeas do cálculo e do roteamento. Se sua corretora envidar tentativas repetidas do mesmo formulário através de conexões lentas (3G), o tráfego se resolverá localmente e de graça devido à injeção do cabeçalho `Idempotency-Key` exigido na integração.

### 4. Extração de Leads (Ação)
Seu Back-end receberá do LifeTrigger Engine a exata interpretação de inteligência de negócios:

**Sua Ação:** Quando o Response devolver `acao_recomendada: "AUMENTAR"` e `classificacao_risco: "CRITICO"`, cadastre isso na fila do software de CRM do seu Corretor para que ele faça o atendimento One-to-One e monte os orçamentos concretos das seguradoras.

### 5. Auditoria a Prova de Balas
Se há alguma constestação de cliente sobre "Por que me ofereceram 1 Milhão em cobertura?", use a `X-Evaluation-Id` gerada pelo Headers da resposta para alimentar seu painel interno acessando:
- `GET /api/v1/evaluations/{id}`
- Seu time de Compliance pode verificar instantaneamente toda a árvore de `regras_aplicadas` (ex: Regra da dívida pesada) sem precisar abrir chamados de TI.
