# LifeTrigger Engine - System Architecture & Technical Reference

Este documento serve como a **Fonte Oficial de Verdade** (Source of Truth) da arquitetura, operação e manutenção do **LifeTrigger Engine**. Ele foi redigido da perspectiva do Arquiteto Principal e destina-se ao onboarding técnico de desenvolvedores, parceiros Enterprise, CTOs de corretoras e auditores de conformidade (Compliance/LGPD).

---

## 1. Visão Geral do Sistema

O **LifeTrigger Engine** é um motor de recomendação analítica B2B2C, desenhado para transformar a venda consultiva de seguros de vida. Ao invés de empurrar produtos baseados em comissionamento, o motor utiliza uma abordagem focada em matemática financeira e **Gatilhos de Vida** (nascimento de filhos, novas dívidas, ascensão de renda) para demonstrar as vulnerabilidades financeiras (Protection Gaps) de um cliente final.

**Público-Alvo:** 
Corretoras de Seguros Enterprise, Assessorias de Investimento e Plataformas Financeiras que buscam embarcar vendas consultivas (As-a-Service) em suas jornadas via API.

**Paradigma Operacional (Stateless):** O motor suporta nativamente fluxos **B2B** (Ferramenta interna de corretores), fluxes **B2C** (Integrações diretas em Portais Web / Quizzes de Leads) e Processamento **Batch** de Bases Legadas.

**Princípios Arquiteturais Inegociáveis:**
1. **API-First:** O motor não possui telas ou acoplamento visual. Todo o poder de fogo é exposto via contratos REST estritos (OpenAPI 3.0), permitindo que os Tenants (Corretoras) criem suas próprias jornadas nativas de UI/UX.
2. **Determinismo Absoluto:** A matemática não "adivinha" e não usa redes neurais opacas. Para o mesmo payload de entrada (Input), sob a mesma versão de motor (`EngineVersion`), a saída (Output) será *idêntica* no primeiro ou no milésimo milissegundo.
3. **Explicabilidade Pragmática:** Jamais o sistema cospe uma recomendação isolada. Toda ação (`AUMENTAR`, `MANTER`) é acompanhada do array explícito de `regras_aplicadas` (Ex: `RULE_PENALTY_HIGH_DEBT`), permitindo que a corretora explique ao cliente *exatamente* o racional por trás do alerta.
4. **Auditabilidade Criptográfica:** Nenhuma avaliação é deletável em produção pelas vias da regra de negócio. Ao nascer, gera-se um hash estrutural criptográfico contendo versão, regras e canônicos, servindo como carimbo de validade contra adulterações de banco de dados por back-office.
5. **Isolamento por Tenant (Multi-Tenant):** Uma única instância da aplicação atende N corretoras simultaneamente sem risco de vazamento de leads. O particionamento garante barreiras lógicas absolutas por `TenantId`.

---

## 2. Arquitetura Geral da Solução

O sistema adota os princípios de *Clean Architecture* e *Domain-Driven Design (DDD)*, quebrando fortemente a lógica em Anéis:

* **Engine API (`LifeTrigger.Engine.Api`)**: Camada de roteamento, serialização (JSON), parse de `Idempotency-Key` e manipulação dos Códigos HTTP (400, 422, 200). Recepciona e protege as franjas do sistema.
* **Application / Services (`LifeTrigger.Engine.Application`)**: Orquestra as validações via FluentValidation (e LGPD) e faz bind do Domain com o Repositório de Auditoria. Redige a regra PII (Masking).
* **Deterministic Core (`LifeTrigger.Engine.Domain`)**: O cérebro do sistema. Sem referências a Banco de Dados ou Frameworks Web. Contém os objetos puros C#, guardrails (`MaxTotalIncomeReplacementYears`), matriz de pontos e inferência matemática pura do `LifeInsuranceCalculator`.
* **Infrastructure (`LifeTrigger.Engine.Infrastructure`)**: Resolução de dependências externas. Atualmente abriga o `InMemoryEvaluationRepository` para velocidade e escalada inicial plug-and-play, preparado inteiramente para injetar contextos SQL/Entity Framework via interfaces padrão no futuro, além do `DemoDataSeeder`.

### Fluxo de Componentes
1. Solicitação de Frontend parceiro chega no ASP.NET.
2. Interceptada pelos filtros de Idempotência.
3. Avaliada pelos Validadores (Obrigação do array de Consentimento Ativo).
4. Submetida ao Motor Determinístico, cruzando inputs vs `RuleSetVersion`.
5. Estruturação do Record Avaliativo -> Gera o Hash de Auditoria (`AuditLoggerService`).
6. Persistida pela Infraestrutura isolando o Core.
7. Disparada aos Brokers via Dashboard/Lead Export.

---

## 3. Stack de Tecnologias

A base tecnológica foi cuidadosamente selecionada para performar em micro-latência com máxima segurança corporativa (Memory-Safety).

* **Plataforma e Linguagem:** **.NET 9.0 com C# 13**. Escolhido pela alta vazão por thread, tipagem estática que previne bugs de pipeline financeiro e evolução robusta de performance no ambiente Linux multi-plataforma.
* **Framework Web:** **ASP.NET Core Minimal/Controllers**. Mapeamento flexível RESTful.
* **Autenticação e Edge:** **JWT (JSON Web Token RS256) - A implementar na malha Edge API Gateway externa**. A aplicação suporta introspecção por Header. 
* **Validação de Payloads:** **FluentValidation**. A lógica de rejeição fica apartada do Controller. Impede injeção de Dívidas Negativas ou Idades irreais (<18).
* **Idempotência e Caching:** Extensão padrão `Microsoft.Extensions.Caching.Memory` controlando requisições duplicadas (Double Submit) garantindo proteção do pipeline analítico.
* **Banco de Dados:** Interfaces Repository Pattern. Setup inicial via **Dictionary Concorrente Na-Memória** (Plug-And-Play B2B).
* **Testes e Qualidade:** Arquitetura massiva via **xUnit**, validando retornos semânticos limpos (**FluentAssertions**). Garantia do motor através do paradigma agressivo de **Golden Files** (File-system snapshot assertion byte a byte).

---

## 4. Modelo de Domínio e Conceitos-Chave

O sistema não transaciona "vendas financeiras". Ele manipula insights de risco estruturado operando nos seguintes conceitos de Domínio:

* **Evaluation (Avaliação):** O ato primário do motor. Combina todas as métricas no instante (T) e gera um output fixo bloqueado na versão atual.
* **Context (Subject/Proponente):** Agrupa os inputs de entrada fragmentados:
  * `PersonalContext`: Idade, Estado Civil, Risco Ocupacional.
  * `FinancialContext`: Renda canônica `IncomeData`, `DebtData` (passivo) e `EmergencyFundMonths` (liquidez).
  * `FamilyContext`: Quantidade estrita de dependentes, que alonga as coberturas projetadas de longevidade.
  * `OperationalData`: Canal lógico (`WEB`, `APP`), `TenantId` de correlação e validações LGPD.
* **Lead Operacional:** É o "Result" avaliativo. Denota se a necessidade do cliente indica fechamento (`AUMENTAR`), cross-sell ou mera retenção consultiva (`REVISAR`).
* **Trigger (Gatilho de Vida):** Uma alteração de status estática (Ex: Casou-se, teve filho). Engatilha `RecentLifeTrigger`, que imediatamente rebaixa a classificação da saúde para um estado de vulnerabilidade, forçando uma recomendação explícita de `REVISAR`.
* **Tenant (Proprietário/Corretor):** ID que segmenta todo o particionamento B2B. A corretora X não espiona avaliações da corretora Y.

---

## 5. Motor de Regras e Cálculo Determinístico

O `LifeInsuranceCalculator.cs` ignora flutuações de mercado e comissões. Ele obedece a um fluxograma de cálculo algorítmico rigoroso com a versão em tempo de execução: `2026.02`.

### Passo A: Substituição de Renda (Income Replacement)
Base = Garantir a subsistência do proponente e família.
* **Sem Dependentes:** Base Teto = 2 Anos de Renda Anualizada.
* **Com Dependentes:** Base Teto = 5 Anos + (1 Ano Extra * Quantidade de Dependentes).
* **Guadrail do Teto:** Nenhuma quantidade absurda de dependentes ultrapassará `MaxTotalIncomeReplacementYears` (10 Anos).

### Passo B: Reserva de Transição (Transition Reserve)
Analisa a falta bruta de Fundo de Emergência.
* Se Liquidez = nula, penalidade protetiva (Buffer) sobe para 6 Meses de renda mensal integral em cima do valor da Cobertura Geral.
* Se há Reserva, subtrai-se 9 do buffer, resultando no *Gap de buffer transicional* da pirâmide (Limitado pela base 3 meses piso).

### Passo C: Guardrails (Limites de Segurança do Motor)
Regras inquebráveis aplicadas ao montante final avaliado:
1. **Lower Guardrail (2x):** Independentemente da sub-avaliação do buffer, nenhum humano é parametrizado num seguro inferior ao limiar de 2 vezes sua Renda Anual (Cobertura Mortalidade Crítica Padrão).
2. **Upper Guardrail (20x):** Impede vendas de excesso (Over-insurance / Risco Moral). O motor capta o limite máximo no fator de enriquecimento de longo prazo (20 vezes a renda).

### Passo D: Ação Mapeada
O *Gap* Matemático puro (Recomendado - Atual) / Recomendado, determina exatamente uma constante:
* Gap > 25% → **`AUMENTAR`** (Classificação: `CRÍTICO`)
* Gap < -20% → **`REDUZIR`** (SuperSegurado - Classificação: `ATENÇÃO`)
* Extremos ideais (-20% a 25%) → **`MANTER`** (Score Máximo 100 - Classificação: `ADEQUADO`)
* *Override* absoluto se `RecentLifeTrigger` (Nascimento/Casamento) é true → Transforma forçosamente todos os fluxos para **`REVISAR`**.

Toda etapa acima insere um ID na lista `regras_aplicadas`. Ex: `RULE_GUARDRAIL_MIN_COVERAGE`.

---

## 6. Fluxo Completo de Execução

1. **Gatilho Front-end:** O End-User do corretor visita uma Landing Page isolada, preenche 5 dados simplificados, aceita a Caixa de seleção GDPR/LGPD e submete (`POST /api/v1/evaluations`).
2. **Proteção API:** O edge intercepta. Se o usuário metralhou cliques num 3G fraco, o filtro localiza o Header `Idempotency-Key`. Descarta as duplicatas reais sem corromper a inteligência de negócios. Se não houve Flag de LGPD = 422 Exception Abort.
3. **Core em Ação:** O motor mastiga o `request`. Monta os Guardrails. Calcula Scores penalizando dívidas maiores de 50% (`RULE_PENALTY_HIGH_DEBT`) e deduzindo 10 pontos de Score. Avalia as lógicas determinísticas. Emite o payload `LifeInsuranceAssessmentResult`.
4. **Persistência / Auditoria em Camadas**: O `Record` engessa o timestamp universal (UTC). O `AuditLogger` mascara o PII (`****0001`) nativamente nos servidores de log (Serilog/Splunk) e plota o Hash HASH256 com os campos determinísticos. Repo armazena do `Dictionary`/Banco de Dados atrelado unicamente sob as escotilhas do `TenantId`.
5. **Painel do Corretor:** Periodicamente ou em Webhooks, o Software CRM da Corretora resgata os relatórios anonimizados em (`GET /api/v1/admin/reports/pilot`) e direciona um corretor certificado a cruzar a ligação oferecendo uma cobertura suplementar de `AUMENTAR` na Prudential com R$ 330,000 mil reais a mais por mês embasado pelas métricas calculadas.

---

## 7. API REST - Referência Direta

*(Exemplares resumidos. Para spec plena analise o OpenAPI Contract)*

### POST /api/v1/evaluations
* **Head:** `Idempotency-Key: uuid` (Obrigatório), `Authorization: Bearer <T>`
* **Validações Strict:** Se `OriginChannel` é ausente (400) ou `HasExplicitActiveConsent` omitido (422 HTTP, Erro `CONSENT_REQUIRED`).
* **Integração:** Devolve payload de `Result` rico com `acao_recomendada` entre as enumeráveis estritas. Sem lógica acoplada no front.

### GET /api/v1/admin/audit/evaluations/{id}/verify
* Rota Exclusiva Administrativa (`Admin`).
* Regera inteiramente o algoritmo criptográfico de integridade em runtime, cruzando a cadeia local (Idade, Rendas, Payload, UTC da Avalição e Output de ação). Desemabarca um flag claro se a avaliação retida sofreu adulteração lógica: Status: `"PASS" | "FAIL"`.

### DELETE /api/v1/admin/demo-environments/tenants/{tenantId}
* Funcionalidade explícita para resetar os cenários piloto demonstrativos das corretoras sem chance de "truncar" (`DELETE FROM`) ou apagar partições ativas de produção real.

---

## 8. Segurança e Controle de Acesso

A fronteira ataca problemas complexos em três defesas de Hardening:
* **JWT Enforcing:** O Front envia uma Role Assinada. Diferencia o End-User preenchendo o formulário da Corretora X contra o Administrador que pode auditar dados do LifeTrigger Engine global;
* **Rate Limiting no Gateway:** Configuração esperada de Backpressure nas nuvens parceiras.
* **Idempotency (Replay Attacks):** A `ConcurrentDictionary` com Sliding Expiration mitigando o envio da mesma Key que corromperia o `Result` estatístico e afogaria o funil da base de leads.
* **Data Sanitization:** A FluentValidation recusa instâncias lixo injetadas na API (Negative Incomes extirpados em 5ms).

---

## 9. Auditoria, Versionamento e Compliance (LGPD First)

O Compliance foi introduzido via Arquitetura, não como complemento posterior:
1. **Consentimento Restrito**: Se `consentimento_ativo` no Payload JSON é False ou ausente, as engrenagens não processam o motor, o dado não chega sequer à variável de Application Layers (422 Abort).
2. **PII Masking Automático**: Valores monetários sensíveis geridos nos Logs em Console que alimentam Kibana ou Syslogs são trucados, preservados apenas seus ponteiros dimensionais. O Trace exibirá algo como: *"Triggering Engine Evaluation to MaskedIncome ****5000"*.
3. **Audit Hash (Unquebrável)**: O `CalculateAuditHash` cria um SHA-256 usando Variáveis Canônicas + Respostas Exatas + Versões (`Engine` e `RuleSet`) e Carimbo Unix. A mera alteração da taxa financeira por fora do API Gateway nos bancos físicos causará ruptura permanente de Hash no endpoint `/verify`. Corretoras possuem a prova irrefutável (Trustless Audit).
4. **Versionamento Imutável Engine**: Avaliações do passado rodadas na engine `1.0.0` e regra `2026.02` permanecem com estes marcadores de base, portanto uma retentativa de renderização em painel do corretor anos depois interpretará exatamente o gap gerado na época, ignorando novas métricas de 2029 que possamos evoluir na matriz de código original.

---

## 10. Startando e Executando o Back-end Localmente

O modelo foi construído livre do *Development-Hell*. Para iniciar:

**Requisitos**: Microsoft .NET 9.0 SDK instalado localmente no SO (Linux/Windows/MacOSX).

```bash
# 1. Navegue para o root do arquivo Solução (.sln) ou Projeto
cd src/LifeTrigger.Engine.Api

# 2. Restaure Pacotes Nuget
dotnet restore

# 3. Monte e Excute 
# O comando de Development habilitará a documentação auto-gerada via SwaggerUI e injetará os Tenants Demo
dotnet run --environment Development
```
* O Servidor responderá em `http://localhost:<porta>`.
* Ao iniciar, o `DemoDataSeeder.cs` injeta silenciosamente nos Tenants Virtuais `DEMO_CORRETORA_ALPHA` e `DEMO_EMPRESA_BETA` relatórios simulados estritos que fecham nos espectros matemáticos de REVISAR e AUMENTAR, prontos pro uso do front sem base real.
* Documentação Viva / Tester no navegador via Swagger na rota base principal `http://localhost:<porta>/swagger`.

---

## 11. Escopo Massivo de Validação (Fluxo de Testes)

Sendo motor financeiro de Life Insurance, Bugs Toleráveis representam perda irreparável. Escudamos:

* **Core Unit Tests**: `LifeInsuranceCalculatorTests` simula as intersecções de renda agressiva contra a lógica em micro-segundos aferindo coberturas exatas matematicamente preditas.
* **API Tests**: Integração da rede através de `EvaluationsIntegrationTests`. Executa chamadas REST complexas rodando as validações idempotentes (`Wait(delay) -> Fire (T1) -> Fire(T1)`). Afirmação exata se a falha de PII e Dívida devolve a exceção encapsulada (400, 422).
* **Golden Files Regression Suite (`TestScenarios.cs`)**: A armadura principal do projeto. O Core processa 13 objetos vitais de complexidade randômicas (Cenário: Muito endividado sem dependente x Sem seguro mas reserva máxima). O Motor cospe a serialização Bytes inteira que é avaliada rigidamente e Byte-a-Byte contra amostras `expected-*.json` embutidas no Source Control pelo Arquiteto Master. Se o Pull Request do desenvolvedor de amanhã quebrar míseros pontos nos multiplicadores percentuais base sem querer, o framework reprova o Teste automaticamente. Jamais existirá Regressão acidental no LifeTrigger Engine.

Para executar o pipeline Inteiro:
```bash
dotnet test
```

---

## 12. Padrões de Evolução e Pipeline Desenvolvimento

Se amanhã for necessário que o Brasil implante seguros em uma inflação sistêmica muito alta necessitando de 3x Teto base, o modelo será:
1. Nunca Editar o Core atual quebrando o determinismo. Criar Nova Regra no Framework de Análise associada à tag de release: (Ex `RULE_GUARDRAIL_3X_MIN_2028.01`). O `RuleSetVersion` é subido. Instâncias legadas mantém cálculo intacto pela `OldRule`.
2. O Motor aceitará acoplamentos Paralelos de IA Estatísticas, no entanto IA (LLMs/Modelos Generativos) agirão **Sempre Exclusivamente** no mapeamento de Texto para Inputs do formulário Frontal ou gerando discursos comerciais em cima da `justificativa`, **Mas O CORE de GAP Matemática Permanece Intocado e Código Puramente Escrito por Humanos e C# (Determinismo Intacto)**.

---

## 13. Boas Práticas Operacionais em Produção

* **Logging de Trilha:** Confie no ILogger gerido. Todas as exceções semânticas da base geram stack trace mas são encobertas de forma inteligente, entregando JSON controlados para o Front contendo os `{"Error": "A renda mensal não.."}` sem vazar banco.
* **Troubleshooting Administrativo**: Corretora com problema num Lead? Utilize a busca nativa pelas chaves operacionais e cheque se o `status` do Hash de `/verify` responde "PASS", o que exime instabilidade dos relatórios.
* **O Que o Sistema NUNCA Fica Incubido de Fazer**:
  - Jamais Sugere "Compre o Seguro de Vida X da Empresa Y por 10 Reais no Pix". Isso é responsabilidade do Pipeline de Underwriting (Cotação) do CRM Parceiro. Nós extraímos a **Necessidade**.
  - O Motor não armazena documentos e propostas PDF. Ele gera o cálculo referencial (O 'Laudo Médico e Previsão Algorítmica').
  - Nunca substitui o Papel do Corretor, pelo contrário, injeta clareza empírica (Leads `classificacao_risco: "CRITICO"`) na mão do Humano que concluirá o processo emocional do cliente.

*- Documento validado pelo Arquiteto Master em [2026]. Arquitetura e Engenharia Determinística Segura.*
