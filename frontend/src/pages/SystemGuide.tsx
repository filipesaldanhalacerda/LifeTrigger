import { useState } from 'react'
import {
  BookOpen, Target, Shield, TrendingUp, Users, Zap, BarChart3,
  Cpu, CheckCircle, ArrowRight, ChevronDown, ChevronUp,
  Lightbulb, DollarSign, ClipboardCheck, Activity, Eye,
  UserCheck, Settings, CreditCard, Building2, Globe,
  Lock, Hash, Layers, GitBranch, ShieldCheck, Database,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'

// ── Accordion ───────────────────────────────────────────────────
function Accordion({ id, title, icon: Icon, children, openId, onToggle }: {
  id: string
  title: string
  icon: React.ElementType
  children: React.ReactNode
  openId: string | null
  onToggle: (id: string) => void
}) {
  const open = openId === id
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
          <Icon className="h-4.5 w-4.5 text-brand-600" />
        </div>
        <span className="flex-1 text-sm font-semibold text-slate-900">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div className="border-t border-slate-100 px-6 py-5">{children}</div>}
    </div>
  )
}

// ── Feature Card ────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, color }: {
  icon: React.ElementType; title: string; desc: string; color: string
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Step ────────────────────────────────────────────────────────
function Step({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
        {number}
      </div>
      <div className="pt-0.5">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Screen Reference ────────────────────────────────────────────
function ScreenRef({ icon: Icon, name, path, desc }: {
  icon: React.ElementType; name: string; path: string; desc: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{name}</p>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{path}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Role Badge ──────────────────────────────────────────────────
function RoleBadge({ role, color, desc }: { role: string; color: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 inline-block rounded-full px-2.5 py-1 text-xs font-bold text-white ${color}`}>{role}</span>
      <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────
export default function SystemGuide() {
  const [openId, setOpenId] = useState<string | null>('what')
  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id)

  return (
    <div>
      <TopBar title="Guia do Sistema" subtitle="Entenda o que o LifeTrigger faz e como usar cada funcionalidade" />

      <div className="p-6 space-y-5 animate-fadeIn max-w-4xl">

        {/* ── Hero ── */}
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-900/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">LifeTrigger Engine</h1>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Motor inteligente de avaliacao de seguro de vida para corretoras. O LifeTrigger analisa
                o perfil de cada cliente — idade, renda, dependentes, dividas e cobertura atual — e entrega
                em segundos um diagnostico completo: score de protecao, gap de cobertura, recomendacao
                de acao e insights prontos para usar na conversa com o cliente.
              </p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                O objetivo e simples: <strong className="text-brand-700">ajudar corretores a vender mais e melhor</strong>,
                com dados concretos e argumentacao tecnica que transforma uma conversa de vendas em uma
                consultoria de protecao.
              </p>
            </div>
          </div>
        </div>

        {/* ── O que o sistema faz ── */}
        <Accordion id="what" title="O que o LifeTrigger faz?" icon={Target} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              O LifeTrigger e um <strong>motor de inteligencia de protecao de vida</strong> desenhado para corretoras de seguros.
              Ele recebe os dados do cliente e devolve uma analise completa em milissegundos, sem nenhuma intervencao humana.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FeatureCard
                icon={Shield}
                title="Score de Protecao (0–100)"
                desc="Nota unica que resume o quao protegido o cliente esta. Quanto maior, melhor a cobertura em relacao a necessidade real."
                color="bg-brand-600"
              />
              <FeatureCard
                icon={DollarSign}
                title="Gap de Cobertura"
                desc="Diferenca exata entre a cobertura atual e a cobertura recomendada, em reais e em percentual. Mostra o 'buraco' na protecao."
                color="bg-red-500"
              />
              <FeatureCard
                icon={TrendingUp}
                title="Recomendacao de Acao"
                desc="AUMENTAR, MANTER, REDUZIR ou REVISAR — uma diretriz clara para o corretor saber o que fazer com cada cliente."
                color="bg-amber-500"
              />
              <FeatureCard
                icon={BarChart3}
                title="Classificacao de Risco"
                desc="CRITICO, MODERADO ou ADEQUADO — o motor cruza idade, profissao, fumante e dependentes para classificar o risco."
                color="bg-violet-500"
              />
              <FeatureCard
                icon={Lightbulb}
                title="Insights para o Corretor"
                desc="5 insights prontos: abertura de conversa, argumento principal, objecao prevista, produto sugerido e proximo passo."
                color="bg-sky-500"
              />
              <FeatureCard
                icon={Zap}
                title="Gatilhos de Vida"
                desc="Casamento, filho, promocao, divorcio — eventos que mudam a necessidade de protecao. O motor recalcula automaticamente."
                color="bg-emerald-500"
              />
            </div>
          </div>
        </Accordion>

        {/* ── Como funciona ── */}
        <Accordion id="how" title="Como funciona na pratica?" icon={ClipboardCheck} openId={openId} onToggle={toggle}>
          <div className="space-y-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              O fluxo de trabalho do corretor com o LifeTrigger segue 4 passos simples:
            </p>

            <div className="space-y-4">
              <Step
                number={1}
                title="Coleta dos dados do cliente"
                desc="Na tela 'Nova Avaliacao', o corretor preenche um formulario guiado em 4 etapas: dados pessoais (idade, profissao, fumante), financeiros (renda, cobertura atual, dividas), familiares (dependentes e idades) e operacionais (canal, consentimento LGPD). O formulario valida tudo em tempo real e formata valores automaticamente."
              />
              <Step
                number={2}
                title="Motor processa a avaliacao"
                desc="Ao enviar, o motor LifeTrigger cruza mais de 30 regras deterministicas em milissegundos. Nao usa IA nem heuristica — mesmo input sempre gera o mesmo resultado. Calcula a cobertura recomendada, o gap, o score de protecao, a eficiencia e gera os insights para o corretor."
              />
              <Step
                number={3}
                title="Resultado completo em tela"
                desc="O corretor recebe imediatamente o resultado com: score em anel visual, gap em barra de progresso, acao recomendada com explicacao, todas as justificativas do motor, e 5 insights prontos para usar na conversa com o cliente (abertura, argumento, objecao, produto e proximo passo)."
              />
              <Step
                number={4}
                title="Historico e acompanhamento"
                desc="Todas as avaliacoes ficam salvas com hash de auditoria imutavel. O corretor pode consultar qualquer avaliacao passada, acompanhar a evolucao dos clientes, e o gestor tem dashboard com visao consolidada da carteira (distribuicao de risco, acoes e saude geral)."
              />
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Gatilhos de Vida</p>
                  <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                    Alem da avaliacao padrao, o corretor pode registrar <strong>eventos de vida</strong> (casamento, nascimento de filho,
                    promocao, divorcio, aposentadoria). O motor recalcula a protecao com base no evento e gera uma nova recomendacao.
                    Isso permite abordagens proativas — o corretor liga para o cliente no momento certo, com dados concretos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Accordion>

        {/* ── Potencia do motor ── */}
        <Accordion id="engine-power" title="A potencia do motor: determinismo, complexidade e auditoria" icon={Cpu} openId={openId} onToggle={toggle}>
          <div className="space-y-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              O LifeTrigger nao e um calculador simples. E um <strong>motor de regras deterministico de alta complexidade</strong>,
              projetado para entregar diagnosticos de grau institucional — com a robustez que seguradoras, auditorias e orgaos reguladores exigem.
            </p>

            {/* Determinismo */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-600">Motor 100% Deterministico</p>
              <div className="space-y-3">
                <div className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Zero aleatoriedade</p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      O motor nao usa inteligencia artificial, machine learning, modelos estatisticos nem heuristicas probabilisticas.
                      Cada resultado e produzido por <strong>regras deterministicas puras</strong>: dado o mesmo input, o motor gera exatamente
                      o mesmo output — sempre, em qualquer momento, em qualquer servidor. Isso significa reprodutibilidade total
                      e previsibilidade absoluta, um requisito critico para mercados regulados.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Regras versionadas e rastreadas</p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Cada avaliacao registra a versao exata do motor (<code className="text-brand-600 bg-slate-100 px-1 rounded">engineVersion</code>)
                      e do conjunto de regras (<code className="text-brand-600 bg-slate-100 px-1 rounded">ruleSetVersion</code> + <code className="text-brand-600 bg-slate-100 px-1 rounded">ruleSetHash</code>).
                      Se as regras mudarem no futuro, voce ainda pode verificar com qual versao cada diagnostico foi produzido.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Complexidade de calculo */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-600">Complexidade do Calculo</p>
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800 mb-3">O motor executa um pipeline de 6 fases para cada avaliacao:</p>
                  <div className="space-y-2">
                    <div className="flex gap-3 items-start">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">1</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Substituicao de Renda</p>
                        <p className="text-[11px] text-slate-500">Calcula quantos anos de renda a familia precisa em caso de falecimento. Varia de 2 a 10 anos, com bonificacao progressiva por dependente (ate +3 anos), limitada por teto configuravel por corretora.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">2</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Quitacao de Dividas</p>
                        <p className="text-[11px] text-slate-500">Soma o saldo total de dividas do cliente para garantir que a cobertura cubra 100% dos debitos pendentes. Evita que a familia herde dividas.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">3</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Reserva de Transicao</p>
                        <p className="text-[11px] text-slate-500">Adiciona colchao de seguranca (3 a 9 meses de renda), descontando reserva de emergencia existente. Clampeado por limites rigidos para evitar manipulacao.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">4</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Guardrails (Teto e Piso)</p>
                        <p className="text-[11px] text-slate-500">Aplica limites de seguranca: a cobertura recomendada nunca fica abaixo de 2x a renda anual nem acima de 20x (configuravel). Evita recomendacoes absurdas.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">5</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Score + Penalidades</p>
                        <p className="text-[11px] text-slate-500">Calcula Protection Score (razao cobertura/necessidade) e aplica 3 penalidades independentes: baixa cobertura com dependentes (-10), divida alta acima de 50% da renda (-10), e ausencia de reserva de emergencia (-10). Score e eficiencia sao clampeados entre 0 e 100.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">6</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Overrides de Acao + Insights</p>
                        <p className="text-[11px] text-slate-500">Verifica 3 condicoes especiais (revisao {'>'} 12 meses, dados nao confirmados, gatilho recente) que forcam acao REVISAR. Por fim, gera 5 insights personalizados para o corretor baseados no resultado completo.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>13 regras catalogadas</strong> em enum fortemente tipado (<code className="text-brand-600 bg-white px-1 rounded">EngineRuleId</code>),
                    cada uma com template de justificativa, argumentos primitivos e rastreabilidade completa.
                    Nenhuma regra opera como "string magica" — tudo e validado em tempo de compilacao.
                  </p>
                </div>
              </div>
            </div>

            {/* Auditoria */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-600">Auditoria e Integridade</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FeatureCard
                  icon={Hash}
                  title="Hash SHA-256 Imutavel"
                  desc="Cada avaliacao recebe um hash criptografico no momento da criacao. Qualquer alteracao posterior (mesmo 1 byte) invalida o hash. Verificavel a qualquer momento na tela de Auditoria."
                  color="bg-violet-600"
                />
                <FeatureCard
                  icon={Layers}
                  title="Snapshot Completo"
                  desc="O motor congela um snapshot com todas as regras aplicadas, justificativas estruturadas, versao do motor e timestamp. Esse snapshot e a 'foto' juridica do momento da avaliacao."
                  color="bg-brand-600"
                />
                <FeatureCard
                  icon={Lock}
                  title="Imutabilidade por Design"
                  desc="Avaliacoes salvas NUNCA sao alteradas. Se os parametros mudarem, as avaliacoes anteriores mantem o resultado original. Isso garante integridade historica e rastreabilidade regulatoria."
                  color="bg-red-500"
                />
                <FeatureCard
                  icon={Database}
                  title="Isolamento Multi-Tenant"
                  desc="Cada corretora opera em silo isolado via tenant_id no JWT. Impossivel que dados de uma corretora vazem para outra. Segregacao enforced no nivel do banco de dados."
                  color="bg-sky-600"
                />
              </div>
            </div>

            {/* Seguranca */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-600">Seguranca em Camadas</p>
              <div className="space-y-2">
                <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <strong>Autenticacao JWT com refresh automatico:</strong> tokens de curta duracao com renovacao transparente.
                    Toda requisicao e autenticada e autorizada por role cumulativo (5 niveis). Sem token valido, a API recusa 100% das chamadas.
                  </p>
                </div>
                <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <strong>Zero dados pessoais na API:</strong> o motor nao recebe nome, CPF, email ou qualquer PII.
                    Opera exclusivamente com dados demograficos anonimizados (idade, faixa de renda, quantidade de dependentes).
                    Conformidade LGPD by design — nao ha dados pessoais para vazar.
                  </p>
                </div>
                <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <strong>Consentimento obrigatorio enforced:</strong> toda avaliacao exige <code className="bg-emerald-100 px-1 rounded">hasExplicitActiveConsent=true</code> e
                    um <code className="bg-emerald-100 px-1 rounded">consentId</code> valido. A API rejeita qualquer request sem consentimento — nao ha bypass.
                  </p>
                </div>
                <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <strong>Guardrails contra manipulacao:</strong> parametros configurados pelo tenant sao clampeados por limites rigidos
                    definidos no codigo-fonte. Mesmo que um TenantOwner tente definir valores extremos, o motor aplica teto e piso de seguranca.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>Em resumo:</strong> o LifeTrigger combina a <strong>precisao de um motor deterministico</strong> com a
                <strong> rastreabilidade de um sistema de auditoria</strong> e a <strong>seguranca de uma arquitetura zero-trust</strong>.
                Cada avaliacao e reproduzivel, verificavel, imutavel e segregada — exatamente o que o mercado segurador exige.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ── Telas do sistema ── */}
        <Accordion id="screens" title="Telas do sistema" icon={Eye} openId={openId} onToggle={toggle}>
          <div className="space-y-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              Cada perfil de usuario ve um conjunto diferente de telas. Abaixo esta o mapa completo:
            </p>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-600">Area Principal</p>
              <div className="space-y-2">
                <ScreenRef
                  icon={BarChart3}
                  name="Dashboard"
                  path="/"
                  desc="Visao consolidada da carteira: saude geral (score 0–100), distribuicao de risco e acoes recomendadas, barra de protecao da carteira, ultimas avaliacoes e acoes rapidas. Viewers veem em modo leitura."
                />
                <ScreenRef
                  icon={ClipboardCheck}
                  name="Nova Avaliacao"
                  path="/evaluations/new"
                  desc="Formulario guiado em 4 etapas (Pessoal, Financeiro, Familia, Operacional) com validacao em tempo real, formatacao BRL automatica e indicador de progresso. Ao enviar, redireciona para o resultado completo."
                />
                <ScreenRef
                  icon={Zap}
                  name="Gatilhos de Vida"
                  path="/triggers/new"
                  desc="Registro de eventos de vida (casamento, filho, promocao, etc.) vinculados a uma avaliacao base. O motor recalcula a protecao considerando o impacto do evento."
                />
                <ScreenRef
                  icon={BookOpen}
                  name="Historico de Avaliacoes"
                  path="/evaluations"
                  desc="Lista paginada de todas as avaliacoes realizadas, com filtros por data. Cada linha mostra acao, risco, score e gap. Clique para ver o resultado completo."
                />
                <ScreenRef
                  icon={UserCheck}
                  name="Meus Clientes"
                  path="/clients"
                  desc="Visao agrupada por cliente (consentId), mostrando o historico de avaliacoes de cada pessoa. Permite acompanhar a evolucao do cliente ao longo do tempo."
                />
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-600">Administracao</p>
              <div className="space-y-2">
                <ScreenRef
                  icon={Users}
                  name="Gestao de Equipe"
                  path="/team"
                  desc="Criar, ativar/desativar usuarios e alterar perfis de acesso. Cada usuario tem um role que define o que pode ver e fazer no sistema."
                />
                <ScreenRef
                  icon={BarChart3}
                  name="Relatorios"
                  path="/reports"
                  desc="Relatorio agregado da operacao: total de avaliacoes, distribuicao por risco e acao, quantidade de gatilhos disparados. Util para reunioes de gestao."
                />
                <ScreenRef
                  icon={Shield}
                  name="Auditoria"
                  path="/audit"
                  desc="Verificacao de integridade de qualquer avaliacao. Compara o hash armazenado com o hash recalculado — garante que nenhum resultado foi adulterado."
                />
                <ScreenRef
                  icon={Cpu}
                  name="Motor"
                  path="/engine"
                  desc="Status do motor (saude, versao, versao do ruleset). Mostra a arquitetura tecnica do sistema e os endpoints disponiveis."
                />
                <ScreenRef
                  icon={Settings}
                  name="Configuracoes"
                  path="/settings"
                  desc="Parametros do motor para sua corretora: multiplicadores de renda, meses de reserva de emergencia, limite maximo de cobertura. Cada corretora pode personalizar as formulas."
                />
                <ScreenRef
                  icon={CreditCard}
                  name="Plano e Faturamento"
                  path="/billing"
                  desc="Informacoes sobre o plano contratado, uso da plataforma e gestao de assinatura."
                />
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-600">Plataforma (SuperAdmin)</p>
              <div className="space-y-2">
                <ScreenRef
                  icon={Building2}
                  name="Corretoras"
                  path="/admin/tenants"
                  desc="Gestao de todas as corretoras cadastradas na plataforma. Criar, ativar ou desativar tenants."
                />
                <ScreenRef
                  icon={Globe}
                  name="Plataforma"
                  path="/admin/platform"
                  desc="Visao geral da plataforma: metricas globais, status dos servicos e monitoramento."
                />
                <ScreenRef
                  icon={Users}
                  name="Usuarios Globais"
                  path="/admin/users"
                  desc="Gestao de todos os usuarios de todas as corretoras. Busca, filtragem e acoes administrativas."
                />
              </div>
            </div>
          </div>
        </Accordion>

        {/* ── Perfis de acesso ── */}
        <Accordion id="roles" title="Perfis de acesso (Roles)" icon={Users} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              O LifeTrigger tem 5 perfis de acesso <strong>cumulativos</strong> — cada perfil inclui todas as
              permissoes dos perfis abaixo dele. Isso significa que um Manager pode fazer tudo o que um Broker faz, e mais.
            </p>

            <div className="space-y-3">
              <RoleBadge
                role="Viewer"
                color="bg-slate-500"
                desc="Visualizacao apenas. Ve o Dashboard (sem acoes rapidas), historico de avaliacoes e seu perfil. Nao pode criar avaliacoes nem acessar areas administrativas. Ideal para auditores ou acompanhamento externo."
              />
              <RoleBadge
                role="Broker"
                color="bg-emerald-600"
                desc="Corretor operacional. Tudo do Viewer, mais: criar avaliacoes, registrar gatilhos de vida, consultar clientes. Ve apenas suas proprias avaliacoes (filtro por usuario). E o perfil padrao para corretores no dia a dia."
              />
              <RoleBadge
                role="Manager"
                color="bg-blue-600"
                desc="Gestor da equipe. Tudo do Broker, mais: gestao de equipe, relatorios agregados, auditoria de integridade e acesso ao motor/sistema. Ve todas as avaliacoes da corretora, nao apenas as proprias."
              />
              <RoleBadge
                role="TenantOwner"
                color="bg-purple-600"
                desc="Dono da corretora. Tudo do Manager, mais: configuracoes do motor (formulas e multiplicadores) e plano/faturamento. Controle total sobre a operacao da corretora na plataforma."
              />
              <RoleBadge
                role="SuperAdmin"
                color="bg-red-600"
                desc="Administrador da plataforma LifeTrigger. Gerencia todas as corretoras, todos os usuarios, visao global da plataforma. Pode selecionar qualquer corretora para operar como se fosse parte dela."
              />
            </div>

            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Hierarquia cumulativa:</strong> SuperAdmin (5) {'>'} TenantOwner (4) {'>'} Manager (3) {'>'} Broker (2) {'>'} Viewer (1).
                Um usuario com role Manager pode acessar tudo o que Broker e Viewer acessam. Nao e preciso atribuir multiplos roles.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ── Resultado da avaliacao ── */}
        <Accordion id="result" title="Entendendo o resultado da avaliacao" icon={CheckCircle} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Quando o corretor envia uma avaliacao, o motor retorna um conjunto completo de informacoes.
              Aqui esta o que cada campo significa:
            </p>

            <div className="space-y-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Score de Protecao (0–100)</p>
                <p className="mt-1 text-xs text-slate-500">Nota que resume a adequacao da cobertura. Acima de 70 e saudavel. Abaixo de 45 requer atencao. Calculado cruzando cobertura atual, renda, dependentes e dividas.</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Eficiencia de Cobertura (0–100)</p>
                <p className="mt-1 text-xs text-slate-500">Mede o quao bem a cobertura atual se aproxima da ideal. 100 = perfeitamente coberto. Acima de 100 = sobresegurado (pagando mais do que precisa).</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Gap de Protecao (R$ e %)</p>
                <p className="mt-1 text-xs text-slate-500">Diferenca entre a cobertura recomendada e a atual. Valor positivo = subprotegido (precisa de mais). Valor negativo = sobresegurado (pode otimizar).</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Acao Recomendada</p>
                <p className="mt-1 text-xs text-slate-500">
                  <strong>AUMENTAR:</strong> cobertura insuficiente, recomende ao cliente ampliar a apolice. <br/>
                  <strong>MANTER:</strong> cobertura adequada, programe revisao periodica. <br/>
                  <strong>REDUZIR:</strong> cobertura excessiva, otimize o premio sem perder protecao. <br/>
                  <strong>REVISAR:</strong> dados incompletos ou situacao atipica, revisao manual necessaria.
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Classificacao de Risco</p>
                <p className="mt-1 text-xs text-slate-500">
                  <strong>CRITICO:</strong> cliente em situacao de alta vulnerabilidade. <br/>
                  <strong>MODERADO:</strong> protecao parcial, melhorias recomendadas. <br/>
                  <strong>ADEQUADO:</strong> proteção alinhada com o perfil.
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Insights para o Corretor</p>
                <p className="mt-1 text-xs text-slate-500">
                  5 insights gerados automaticamente para cada avaliacao: <br/>
                  <strong>Abertura:</strong> frase para iniciar a conversa. <br/>
                  <strong>Argumento Principal:</strong> dado mais forte para convencer. <br/>
                  <strong>Objecao Prevista:</strong> o que o cliente pode questionar e como responder. <br/>
                  <strong>Produto Sugerido:</strong> tipo de apolice mais indicado. <br/>
                  <strong>Proximo Passo:</strong> acao concreta apos a conversa.
                </p>
              </div>
            </div>
          </div>
        </Accordion>

        {/* ── Configuracoes do motor ── */}
        <Accordion id="settings" title="Configuracoes personalizaveis" icon={Settings} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Cada corretora pode personalizar as formulas do motor na tela de Configuracoes. Isso permite
              adaptar o LifeTrigger a estrategia comercial de cada operacao:
            </p>

            <div className="space-y-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Multiplicador de Renda (Solteiro)</p>
                <p className="mt-1 text-xs text-slate-500">Quantos anos de renda a cobertura deve cobrir para uma pessoa sem dependentes. Padrao: 5 anos.</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Multiplicador de Renda (Com Dependentes)</p>
                <p className="mt-1 text-xs text-slate-500">Quantos anos de renda para quem tem dependentes. Padrao: 10 anos. Aumentar esse valor gera recomendacoes mais conservadoras (coberturas maiores).</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Buffer de Reserva de Emergencia</p>
                <p className="mt-1 text-xs text-slate-500">Meses de renda adicionados a cobertura como colchao de seguranca. Padrao: 6 meses.</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Limite Maximo de Cobertura</p>
                <p className="mt-1 text-xs text-slate-500">Teto maximo em multiplos de renda anual. Evita recomendacoes irreais para perfis de alta renda. Padrao: 25x.</p>
              </div>
            </div>

            <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-xs text-brand-800 leading-relaxed">
                <strong>Dica:</strong> alterar essas configuracoes impacta todas as avaliacoes futuras da sua corretora.
                Avaliacoes ja realizadas mantem o resultado original (imutavel por design).
                Use a simulacao ao vivo na tela de Configuracoes para testar antes de salvar.
              </p>
            </div>
          </div>
        </Accordion>

        {/* ── Seguranca e conformidade ── */}
        <Accordion id="security" title="Seguranca, LGPD e Auditoria" icon={Shield} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              O LifeTrigger foi projetado com seguranca e conformidade desde o primeiro dia:
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FeatureCard
                icon={Shield}
                title="Sem Dados Pessoais na API"
                desc="A API nao recebe nome, CPF ou qualquer dado pessoal identificavel. Apenas perfil demografico anonimizado (idade, renda, dependentes)."
                color="bg-brand-600"
              />
              <FeatureCard
                icon={CheckCircle}
                title="Consentimento Obrigatorio"
                desc="Toda avaliacao exige consentimento ativo (hasExplicitActiveConsent=true + consentId). Sem consentimento, a API recusa o request."
                color="bg-emerald-500"
              />
              <FeatureCard
                icon={Shield}
                title="Audit Hash Imutavel"
                desc="Cada avaliacao recebe um hash SHA-256 no momento da criacao. Qualquer alteracao posterior quebra o hash — detectavel na tela de Auditoria."
                color="bg-violet-500"
              />
              <FeatureCard
                icon={Users}
                title="Isolamento Multi-tenant"
                desc="Cada corretora opera em isolamento total. Avaliacoes, usuarios e configuracoes sao segregados por tenant_id via JWT."
                color="bg-sky-500"
              />
            </div>
          </div>
        </Accordion>

        {/* ── Dicas pro corretor ── */}
        <Accordion id="tips" title="Dicas para tirar o maximo do LifeTrigger" icon={Lightbulb} openId={openId} onToggle={toggle}>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <strong>Preencha todos os campos:</strong> quanto mais dados, mais preciso o diagnostico. Um campo de divida
                  zerado vs. vazio muda a recomendacao. Dados incompletos geram acao REVISAR.
                </p>
              </div>
              <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <strong>Use os Insights na conversa:</strong> os 5 insights sao gerados especificamente para o perfil do cliente.
                  A "Abertura" e ideal para iniciar a conversa. A "Objecao Prevista" prepara voce para a resistencia mais provavel.
                </p>
              </div>
              <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <strong>Registre Gatilhos de Vida:</strong> quando um cliente casar, tiver um filho ou for promovido, registre o
                  evento. Isso gera um novo diagnostico e uma oportunidade natural de contato — o cliente percebe que voce
                  acompanha a vida dele, nao so a apolice.
                </p>
              </div>
              <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <strong>Acompanhe o Dashboard:</strong> a barra de saude da carteira e o melhor termometro da sua operacao.
                  Se o score medio esta caindo, e hora de revisitar os clientes com recomendacao AUMENTAR.
                </p>
              </div>
              <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <strong>Mostre o resultado ao cliente:</strong> o Score de Protecao e visual e facil de entender. Mostre o anel
                  de score e a barra de gap — dados concretos vendem mais que argumentos abstratos.
                </p>
              </div>
            </div>
          </div>
        </Accordion>

        {/* Footer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card text-center">
          <p className="text-sm font-semibold text-slate-700">LifeTrigger Engine v1.0.0</p>
          <p className="mt-1 text-xs text-slate-400">Motor de Inteligencia de Protecao de Vida · B2B SaaS</p>
        </div>
      </div>
    </div>
  )
}
