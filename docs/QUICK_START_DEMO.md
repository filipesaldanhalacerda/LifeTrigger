# Passo a Passo: Demonstração Prática do LifeTrigger Engine

Este guia prático foi criado para você demonstrar rapidamente todo o poder do **LifeTrigger Engine** em tempo real para colegas, parceiros ou corretores. 

O motor já está configurado e rodando! Nós montamos o arquivo `src/LifeTrigger.Engine.Api/LifeTrigger.Engine.Api.http`, que contém todos os payloads prontos para teste. Se você estiver usando o VS Code, pode usar a extensão **REST Client** para disparar essas rotas clicando em `Send Request` diretamente dentro do arquivo.

---

## 🔁 Fluxo de Demonstração (The Happy Path)

O objetivo desta demonstração é mostrar a transição de um cliente desprotegido, a agilidade do cálculo, a proteção contra duplicatas e a auditoria matemática inquebrável.

### Passo 1: Disparar a Avaliação (A Mágica Acontece)
**O que é:** Simulamos um pai de família (35 anos, 2 dependentes), com boa renda mensal (12k), porém alavancado em dívidas (150k) e com pouco seguro atual (50k) e quase nenhuma reserva de emergência.
- **Abra o arquivo:** `src/LifeTrigger.Engine.Api/LifeTrigger.Engine.Api.http`
- **Ação:** Dispare a Request na seção **1. Criar uma nova Avaliação**.
- **O que observar na Resposta (HTTP 200 OK):**
  - `"recommendedAction": "AUMENTAR"`
  - `"riskClassification": "CRITICO"`
  - `"protectionGapPercentage": 95.84` (Ele está muito exposto!)
  - Veja o array explicativo `"regras_aplicadas"`. Ele lista *exatamente* porquê a nota dele é baixa: `RULE_PENALTY_HIGH_DEBT` e `RULE_PENALTY_LOW_COVERAGE_DEPENDENTS`. Não é um achismo humano, é matemática pura baseada nos inputs.
  - **Atenção:** Veja nos cabeçalhos (`Headers`) da resposta que o motor lhe devolveu um `X-Evaluation-Id`.

### Passo 2: Mostrar a Idempotência (Proteção Conta Cliques Duplos)
**O que é:** Imagine que o celular do corretor perdeu o sinal 3G e ele clicou o botão de "Calcular" 3 vezes repetidas.
- **Ação:** Dispare a mesma Request na seção **2. Testar Idempotência**.
- **O que observar:** A resposta é extamente a mesma e incrivelmente rápida. O sistema interceptou a chave `Idempotency-Key` no cabeçalho e recuperou do cache na memória. Isso impede que o banco de dados seja lotado de sujeira e protege o funil da corretora contra Leads duplicados.

### Passo 3: Mostrar Proteção LGPD (Barreira Legal)
**O que é:** O cliente preencheu os dados, mas um bot burlou a checkbox de *Li e Aceito a Política de Privacidade*.
- **Ação:** Dispare a Request na seção **3. Testar erro de LGPD**.
- **O que observar (HTTP 422 Unprocessable Entity):**
  - `"errorCode": "CONSENT_REQUIRED"`. O motor blinda a corretora de salvar dados não autorizados (PII). Ele corta o fluxo logo na entrada do Controller e cancela o processamento.

### Passo 4: Auditoria Criptográfica (Provando Rastreabilidade)
**O que é:** Três anos depos, a família processa a Seguradora alegando que o Corretor adulterou os dados no sistema para vender mais seguro. Como provar a verdade?
- **Ação:** O arquivo `.http` armazenou o ID gerado no Passo 1! Dispare a Request **5. Verificar Integridade Criptográfica**.
- **O que observar:**
  - O endpoint de auditoria extrai aquele registro gravado, regenera todas as fórmulas com os inputs congelados e recalcula o Hash.
  - O sistema responderá: `"status": "PASS"`. Você acabou de provar tecnicamente que aquele cálculo ocorreu daquela maneira exata (Versão: `1.0.0`, Ruleset `2026.02`), e o back-office nunca manipulou a base do SQL!

### Passo 5: Dashboard e Relatório Acumulado do Tenant (O Valor B2B)
**O que é:** O Líder de Vendas da Corretora Alpha quer saber como anda o Piloto sem ver os dados pessoais vazarem.
- **Ação:** Dispare a Request **6. Consultar Relatório do Piloto**.
- **O que observar:** O motor varre e consolida tudo deste `TenantId`. (Como nosso *Data Seeder* injetou dados fictícios assim que rodamos a aplicação, o painel mostrará a matemática acumulada pronta).
  - Vemos a contagem `"TotalEvaluations": 3` (2 do seeder + 1 que você acabou de criar!).
  - A `"ActionDistribution"` agrupa a carteira sem expor quem é o cliente (Ex: 2 pra AUMENTAR, 1 pra MANTER). O líder de vendas sabe que possui Risco Quente nas mãos da equipe comercial.

### Passo 6: Arrumando a Casa (Limpeza Isolada)
**O que é:** A corretora deseja reiniciar as estatísticas do Dashboard para testar de novo e se conectar amanhã, mas sem afetar nenhum outro Tenant real (Isolamento).
- **Ação:** Dispare a Request **8. Limpar o Ambiente Demo**.
- **O que observar:** `"RecordsRemoved": 3`. `"Ambiente Demo A1A1A1A1-A1A1... limpo com sucesso"`. O espaço deles foi resetado.

---

Bem Vindo ao **LifeTrigger Engine** em modo Operacional Integral! 🚀
