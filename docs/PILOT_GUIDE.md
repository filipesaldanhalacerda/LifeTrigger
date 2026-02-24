# LifeTrigger Engine - Pilot Operations Guide

Este documento define a estratégia operacional recomendada para corretoras parceiras que desejam validar o **LifeTrigger Engine** em um ambiente real (Piloto) com uma base controlada de clientes (20 a 50 usuários).

## Objetivo do Piloto

O Piloto não visa substituir sistemas legados de imediato, mas provar o valor de conversão da **Abordagem Orientada a Gatilhos de Vida**. O motor analisa a saúde financeira e aciona leads quentes e matematicamente embasados de volta para o corretor.

## Princípios (LGPD e Confiança)

1. **Invitation-Only (Sem Importação de Base)**: A corretora **não deve** fazer upload massivo de planilhas de clientes via API. A abordagem é passiva: o corretor envia um link seguro para o cliente.
2. **Consentimento Ativo**: O cliente preenche seus próprios dados num formulário white-label da corretora e marca a checkbox de Consentimento Ativo e Específico (`consentimento_ativo: true`). Sem isso, o Engine rejeita o tráfego com `422 Unprocessable Entity - CONSENT_REQUIRED`.
3. **Black-box Determinística**: O corretor confia no log do motor. O motor não "escolhe produtos" de seguradoras específicas. Ele devolve uma matemática exata: Risco (`CRITICO`, `ATENCAO`, `ADEQUADO`) e Ação (`AUMENTAR`, `MANTER`, `REDUZIR`, `REVISAR`).

## Roteiro de Piloto Recomendado

### Semana 1: Setup e Configuração
1. **Provisionamento do Tenant**: A corretora recebe um `TenantId` e chaves JWT únicas para o ambiente em nuvem ou provisiona a imagem Docker on-premises.
2. **Integração Front-end**: O time técnico da corretora consome o OpenAPI e cria uma tela web fluida coletando: Estado Civil, Dependentes, Renda de Gatilho, Reserva e Dívidas.
3. **Testes no Ambiente Demo**: A corretora treina seus corretores-foco em como ler as saídas do Tenant `DEMO_CORRETORA_ALPHA` utilizando os Leads Fictícios previamente populados pelo nosso Data Seeder.

### Semana 2 e 3: Disparo e Coleta
1. **Seleção de Clientes Pivotais**: Os corretores selecionam de 20 a 50 clientes que:
    - Acabaram de ter filhos (Gatilho: `NASCEU_FILHO`).
    - Compraram imóveis recentemente (Gatilho: `FINANCIAMENTO_NOVO`).
    - Clientes VIP antigos (Gatilho: `REVISAO_ANUAL`).
2. **Abordagem Humana**: O corretor envia o link do formulário da Corretora pelo WhatsApp ou E-mail com a narrativa de: *"Estou atualizando seu portfólio para proteger a reserva financeira da sua família contra inflação. Pode preencher esse check-up de 1 minuto?"*.
3. **Geração de Leads Oculta**: Assim que o cliente submete os dados com consentimento, o Front-End atinge a API `/api/v1/evaluations`. O Motor calcula o _Gap_ matematicamente e devolve a `acao_recomendada`. O sistema da corretora notifica internamente o Corretor.

### Semana 4: Colheita (Apresentação Prática)
1. **Análise de Portfólio**: O corretor entra na área logada do sistema da corretora e visualiza o Lead gerado: *"Cliente João, Risco CRÍTICO, Ação Recomendada: AUMENTAR (Faltam R$ 300.000 em cobertura por conta do Financiamento)."*
2. **Oferta Comercial**: Apenas neste estágio o corretor mapeia produtos reais das seguradoras parceiras (Prudential, MAG, Icatu) e envia a cotação ao cliente. Como a necessidade matemática já foi extraída pelo LifeTrigger, a objeção de vendas do cliente cai substancialmente.

## Mensuração de Sucesso (KPIs)

Ao final do Piloto, a corretora deve avaliar a eficácia extraindo os relatórios agregados no endpoint `/api/v1/admin/reports/pilot`.

Métricas a acompanhar:
- **Taxa de Conclusão**: Quantos links enviados resultaram em um `200 OK` na API (indicando que não houve desistência e o consentimento foi preenchido).
- **Conversão de Lead Quente**: Proporção de clientes classificados como `CRITICO` + `AUMENTAR` versus a carteira pacificada.
- **Enriquecimento Auditing**: Capacidade de extrair a Integridade Criptográfica dos leads caso o setor de Compliance da Corretora exija provas de cálculo.
