# LifeTrigger Engine - Technical Architecture Specification

A **LifeTrigger Engine** foi desenhada obedecendo o padrão **API-first** com clara separação entre *Domínio*, *Aplicação* e *Infraestrutura*. O sistema garante transparência, reprodutibilidade, segurança multi-tenant baseada em tokens, e isolamento extremo do núcleo matemático.

## 1. Modular Monolith & Microservices Readiness
A aplicação nasce como um serviço REST stateless ("Engine API"), capaz de ser escalada horizontalmente atrás de um Load Balancer. Para possibilitar sua evolução futura sem reescrita de código core, adota-se internamente a estrutura de um **Monolito Modular** preparado para os seguintes microserviços futuros:
- **Evaluation Service**: Recebe a requisição, formata os inputs e engatilha o cálculo. Responsável pelos métodos GET e POST do `/evaluations`.
- **Trigger Service**: Ponto de ingestão reativa para registrar eventos externos (casamento, nova renda) e orquestrar recálculos integrando via filas/tópicos se necessário.
- **Audit Service**: Responsável exclusivo pela leitura e verificação transacional de trilhas passadas, garantindo não-repúdio.
- **Admin Service**: Portal isolado (potencialmente apenas acesso VPM interno) para versionamento do motor e inserção de novos *Rulesets*.

## 2. Deterministic Core
O núcleo central financeiro é isolado dentro do domínio puramente matemático (Deterministic Core).
- **Zero I/O**: Não acessa banco de dados, não realiza requisições de rede HTTP e não depende de recursos operacionais do SO (hora do sistema deve vir por context paramérico).
- **Sem IA (Zero Heurística)**: Nenhuma parte do core toma decisões baseadas em Modelos Preditivos de IA. Qualquer eventual módulo de IA explicativa do ecossistema deve ser plugável *externamente* e facilmente desligável sem alterar o output financeiro determinístico.
- **Inputs Necessários**: Uma chamada ao core exige exclusivamente dois contratos para operar:
  1. O *Input Contract Validado* (Dados formatados do cliente em tela).
  2. O *Parameters Snapshot versionado* (As regras e tabelas da vigente versão da engine, via `Ruleset Provider`).
- **Verificabilidade**: O Deterministic Core pode (e deve) possuir garantias via testes unitários estáticos rodando contra `Golden Files` (cenários de JSON pré-validados para regressão visual).

## 3. Reprodutibilidade, Versionamento e Auditoria
- **Ruleset Provider**: Módulo responsável por resgatar no PostgreSQL o conjunto transacional ativo do `ruleset_version` por *tenant*. Ele injeta o `parameters_snapshot` versionado (*max_debt_time*, *multipliers*) exato na memória, o que permite rodar uma avaliação do ano passado empregando as regras do ano passado.
- **Audit Writer & Reader**: A gravação de outputs exige operações atômicas (commit no EF Core) inserindo os registros na *evaluations*, *audit_logs* e *triggers*. 
- **Audit Hash**: Antes de gravar, o *Audit Writer* estampa a avaliação com um Hash Criptográfico validável gerado combinando o `input_snapshot`, `parameters_snapshot` e `output_snapshot`, coibindo assim a fraude dos dados do sistema.

## 4. Multi-tenancy e Segurança (SaaS)
O motor atua nativamente em formato SaaS isolando domínios (Corretoras/Empresas).
- O header de autorização `Bearer Token (JWT)` é obrigatório.
- Um *Middleware* extrai programaticamente o `tenant_id` atrelado ao emissor do JWT.
- Toda operação de I/O em banco herda implícita ou explicitamente o filtro SQL por `tenant_id`. Nenhuma avaliação permite visualização cruzada de Tenants.

## 5. Escalabilidade, API e HTTP Contracts
- O motor não possui sessão vinculada no backend (100% Stateless), liberando escala irrestrita das pods Kubernetes da API.
- Os retornos transitam estritamente por Códigos HTTP previsíveis e testáveis:
  - **200 OK**: Transações processadas validamente e idempotentes.
  - **400 Bad Request**: Payload irregular ou tipagem incorreta originada de `FluentValidation`.
  - **401 Unauthorized**: Falta de Token JWT ou assinatura revogada/expirada.
  - **422 Unprocessable Entity**: Tratamento de Regras de Negócio cruciais (Exemplo: Consentimento Expresso negado, `consentimento_ativo` ausente).
  - **500 Internal Server Error**: Exceção não mapeada pelo Handler Principal.

## 6. Observability
Todo processo submetido para `POST /evaluations` ou `POST /triggers` adota o princípio de Rastreabilidade Distribuída (`Distributed Tracing`).
- O Client deve enviar (ou a API fortelecerá nativamente) um **correlation_id** e **request_id**. Eles serão injetados nos logs estruturados do *AuditLoggerService* para monitoramento de infra (Datadog, Kibana).
- Tais cabeçalhos deverão ser devolvidos intactos em toda Request Response Header para auxiliar troubleshootings do Frontend ao longo da sua persistência em tela.

## 7. Idempotency (Post Transactions)
De forma a mitigar duplicidade nas rotas cruciais (`POST /evaluations` e `POST /triggers`):
- O header `Idempotency-Key` atua lado a lado com o `tenant_id`.
- Requisições repetidas via retry policies (Timeout no Load Balancer, click-duplo) em posse do exato `Idempotency-Key` interceptam a memória ou cache (Redis/Local) e não chamam o *Deterministic Core* duas vezes, muito menos disparam inserts na base de dados, retornando elegantemente a resposta espelhada que já havia sido processada outrora, ou status conflict se o payload interno diferir com a mesma chave.

---

## 8. Privacy, LGPD Compliance & Consent Management
Para proteger os PIIs recolhidos através do front-end e cumprir estritamente regulamentações (ex: LGPD / GDPR):
- **Data Minimization:** O Motor calcula outputs estritamente com dados numéricos. Nenhum dado de saúde bruto, extrato bancário listado ou PII desnecessário será retido.
- **Strict Active Consent (422):** O campo de payload determinístico de `consentimento_ativo` age como disjuntor de ingestão. Caso o payload marque falso ou esteja ausente nas rotas de `/evaluations` ou `/triggers`, o pipeline recusa prosseguir imediatamente lançando um "422 Unprocessable Entity" padronizado com `CONSENT_REQUIRED`.
- **Anonymization & Retention Strategy:** Um Cronjob independente baseado em políticas regulatórias do Tenant irá purgar ligações via `subject_id` em intervalos expirados (Direito ao Esquecimento). A avaliação numérica em *evaluations* passa a ser estatística, preservando `audit_hash` sem PII explícito e preservando as lógicas transacionais do negócio.
- **Consent Revocation Architecture:** Consentimentos retirados via Admin geram bloqueios automáticos temporários daquele `subject_id` para rotas originárias.
- **Deep Log Redaction:** Além do JSON mascarado contido em DB, nenhum dado econômico de alto risco de ataque (ex: *renda_mensal*, *dividas_total*, *cobertura_atual*) trafegará de forma visível ou logável em `Console`, Splunk ou Kibana gerados pelos Middlewares nativos e Application Handlers. Esses valores serão inteiramente disfarçados ou omitidos pelo _AuditLoggerService_ na serialização estruturada de terminal (apenas hashes numéricos ou classificadores boolean "Provided: True").

## 9. Rate Limiting & Abuse Defense
- Middlewares interceptarão o par (`tenant_id`, `client_id` / IP) e proverão buckets fixos de consumo (Rate Limit) prevenindo que APIs abertas do cliente (mesmo tokenizadas) executem raspagem massiva contra a Engine para derivar por força bruta as multiplicações do Deterministic Core ou onerar Custos de Infraestrutura e Banco de Dados transacional subjacente.

---

## 10. Automated Testing & Golden Files (Acceptance Criteria)
A estabilidade contínua e a auditoria perpétua das decisões exigem critérios de testes rigorosos sem paralelos estocásticos.

### Golden Files (Regression Suite)
Para garantir que o core determinístico não sofra derivação silenciosa:
- Cria-se uma suite de testes alimentado por `Golden Files` (pares imutáveis de `Input.json` + `Rules.json` --> `ExpectedOutput.json`).
- O teste interage apenas em memória. Se um byte divirgite (ex: score de 95 mudar para 94, ou um texto justificar alterado sem bump na `ruleset_version`), o build quebra impedindo o deploy (Fail-Fast).
- Os cenários oficiais de Golden Files englobam toda a modelagem de borda, incluindo fundos restritos, superávits de cobertura (REDUZIR) e estouros de limites de guardrail.

### Integração & Idempotency
- **Teste de Idempotência:** Duas chamadas seguidas do POST HTTP com a mesma `Idempotency-Key` atestam que a persistência em Base Relacional e geração de Auditoria ocorreram **somente uma vez**.
- **Teste de Segurança do Consentimento:** Garante falhas estruturadas (`422 CONSENT_REQUIRED`) no caso de ausências ativas, interceptando a conexão transacional e não manchando as Sequence Tables operacionais.

### Admin Integrity Check (The Watcher)
Como corrimão de sistema, o Audit Server possuirá rotas ativas (`/admin/audit/evaluations/{id}/verify`) que testam de read-only a saúde imutável do sistema, regerando Criptograficamente o HASH em tempo real comparando ao armazenado na linha daquela avaliação, atestando a pureza e ausência de edição de base de dados pós-evento.
