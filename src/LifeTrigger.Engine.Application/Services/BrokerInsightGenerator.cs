using System;
using System.Collections.Generic;
using System.Globalization;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Application.Services;

/// <summary>
/// Generates five broker insights per evaluation, personalized from the combination of
/// risk classification, coverage gap, demographics, financial context, and which penalty
/// rules fired. All text is in pt-BR.
/// </summary>
public sealed class BrokerInsightGenerator : IBrokerInsightGenerator
{
    private static readonly CultureInfo PtBr = new("pt-BR");

    public IReadOnlyList<BrokerInsight> Generate(
        LifeInsuranceAssessmentResult result,
        LifeInsuranceAssessmentRequest request)
    {
        return new List<BrokerInsight>
        {
            BuildAbertura(result, request),
            BuildArgumentoPrincipal(result, request),
            BuildObjecaoPrevista(result, request),
            BuildProdutoSugerido(result, request),
            BuildProximoPasso(result, request),
        }.AsReadOnly();
    }

    // ─────────────────────────────────────────────────────────────────────
    // 1. ABERTURA — How to open the conversation
    // ─────────────────────────────────────────────────────────────────────
    private static BrokerInsight BuildAbertura(
        LifeInsuranceAssessmentResult result,
        LifeInsuranceAssessmentRequest request)
    {
        var action    = result.RecommendedAction;
        var risk      = result.RiskClassification;
        var gap       = Math.Abs(result.ProtectionGapAmount);
        var deps      = request.FamilyContext.DependentsCount;
        var profRisk  = request.PersonalContext.ProfessionRiskLevel;
        var hasDebt   = (request.FinancialContext.Debts?.TotalAmount ?? 0m) > 0m;
        var recentTrigger       = request.OperationalData.RecentLifeTrigger;
        var hasUnconfirmedData  = request.OperationalData.HasUnconfirmedData;

        var priority = risk switch
        {
            RiskClassification.CRITICO  => InsightPriority.ALTA,
            RiskClassification.MODERADO => InsightPriority.MEDIA,
            _                           => InsightPriority.BAIXA,
        };

        string headline, body;

        switch (action)
        {
            // ── AUMENTAR ──────────────────────────────────────────────────
            case RecommendedAction.AUMENTAR when deps > 0 && risk == RiskClassification.CRITICO:
                headline = "Abra com o impacto real na família";
                body =
                    $"O motor calculou um déficit de {Brl(gap)} para proteger " +
                    $"{deps} dependente{(deps > 1 ? "s" : "")}. " +
                    $"Inicie a conversa com esse número antes de mencionar qualquer produto: " +
                    $"'Se algo acontecesse com você hoje, sua família ficaria {Brl(gap)} aquém " +
                    $"do necessário para manter o padrão de vida atual.' " +
                    $"Pessoas com filhos respondem muito mais a valores concretos do que " +
                    $"a conceitos abstratos de proteção — o número cria urgência real sem parecer pressão comercial.";
                break;

            case RecommendedAction.AUMENTAR
                when profRisk is ProfessionRiskLevel.ALTO or ProfessionRiskLevel.MUITO_ALTO:
                headline = "Destaque o risco profissional antes do produto";
                body =
                    $"O cliente exerce atividade de risco elevado com cobertura insuficiente " +
                    $"— déficit de {Brl(gap)}. " +
                    $"Nunca abra pelo produto. Comece pela vulnerabilidade da profissão: " +
                    $"'Em caso de afastamento por acidente de trabalho ou invalidez, " +
                    $"por quantos meses suas despesas estariam cobertas sem sua renda?' " +
                    $"Essa pergunta cria consciência de risco genuíno e posiciona você " +
                    $"como especialista, não como vendedor.";
                break;

            case RecommendedAction.AUMENTAR when hasDebt && risk == RiskClassification.CRITICO:
                headline = "Use o 'cenário do dia seguinte' como abertura";
                body =
                    $"Além do gap de {Brl(gap)}, o cliente carrega dívidas " +
                    $"que podem recair sobre o patrimônio familiar em caso de sinistro. " +
                    $"Abra com esse cenário concreto: " +
                    $"'Você já parou para pensar em quem pagaria suas obrigações financeiras " +
                    $"se algo acontecesse com você amanhã?' " +
                    $"Esse enquadramento gera urgência genuína. Só depois que o cliente " +
                    $"processar essa pergunta é que você apresenta os números do motor.";
                break;

            case RecommendedAction.AUMENTAR:
                headline = "Comece pelo número, não pelo produto";
                body =
                    $"Gap de {Brl(gap)} identificado. " +
                    $"Abra a conversa com uma pergunta que leve o cliente a calcular: " +
                    $"'Você sabe de quanto sua família precisaria para manter o padrão de vida " +
                    $"por {(deps > 0 ? "vários" : "2 a 3")} anos sem a sua renda?' " +
                    $"Em seguida apresente o resultado do motor como a resposta técnica a essa pergunta — " +
                    $"não como proposta comercial, mas como diagnóstico. " +
                    $"Isso reduz a resistência inicial e abre espaço para a conversa de produto.";
                break;

            // ── MANTER ────────────────────────────────────────────────────
            case RecommendedAction.MANTER:
                headline = "Valorize a decisão antes de qualquer outra conversa";
                body =
                    "Cobertura adequada para o perfil atual. " +
                    "Use este contato para fortalecer o relacionamento, não para vender. " +
                    "Comece reconhecendo explicitamente: " +
                    "'Analisei sua situação com o motor de avaliação e você está bem protegido " +
                    "— o que não é o caso da maioria dos perfis que analiso.' " +
                    "Clientes que se sentem validados por um diagnóstico técnico imparcial " +
                    "desenvolvem confiança genuína no corretor e indicam ativamente.";
                break;

            // ── REDUZIR ───────────────────────────────────────────────────
            case RecommendedAction.REDUZIR:
                var overPct = Math.Abs(result.ProtectionGapPercentage);
                headline = "Apresente como otimização financeira, nunca como corte";
                body =
                    $"Sobecobertura de {overPct:F1}% identificada. " +
                    $"Nunca use as palavras 'reduzir' ou 'cancelar' na abertura. " +
                    $"Apresente como oportunidade: " +
                    $"'Identifiquei que sua cobertura atual excede em {overPct:F1}% o que o motor calculou " +
                    $"como necessário para o seu perfil. Há espaço para reduzir o prêmio mensal " +
                    $"sem perder proteção real — e redirecionar esse capital para algo que trabalhe para você.' " +
                    $"Isso transforma uma conversa de redução em uma proposta de otimização.";
                break;

            // ── REVISAR ───────────────────────────────────────────────────
            case RecommendedAction.REVISAR when recentTrigger:
                headline = "Reconheça a mudança de vida antes de qualquer análise";
                body =
                    "O cliente passou por um evento de vida recente que provavelmente alterou " +
                    "sua necessidade de proteção. " +
                    "Abra reconhecendo a transição sem expor incerteza técnica: " +
                    "'Após um evento como esse, as necessidades de proteção mudam. " +
                    "Quero garantir que a análise reflita exatamente onde você está hoje.' " +
                    "Nunca mencione que os dados podem estar desatualizados — " +
                    "enquadre como cuidado proativo, não como limitação do sistema.";
                break;

            case RecommendedAction.REVISAR when hasUnconfirmedData:
                headline = "Enquadre a revisão como diligência de qualidade";
                body =
                    "A avaliação requer confirmação de dados para gerar recomendação precisa. " +
                    "Não exponha isso como limitação — apresente como padrão de qualidade: " +
                    "'Para que a análise seja realmente personalizada para a sua situação, " +
                    "preciso confirmar algumas informações com você. São poucos minutos e " +
                    "fazem toda a diferença na qualidade da recomendação.' " +
                    "Colete os dados na reunião. Só avance com proposta após nova avaliação " +
                    "com os dados completos.";
                break;

            default: // REVISAR — revisão antiga
                headline = "Ancore na inevitável evolução do perfil em 12 meses";
                body =
                    "Última revisão há mais de 12 meses. " +
                    "Em um ano, renda, dívidas, família e patrimônio podem ter mudado substancialmente. " +
                    "Abra com urgência de atualização sem pressão: " +
                    "'Em 12 meses muita coisa pode ter mudado na sua vida. " +
                    "Quero garantir que a cobertura ainda faz sentido para onde você está hoje " +
                    "— não para onde estava no ano passado.' " +
                    "Isso posiciona a revisão como serviço contínuo, não como tentativa de venda.";
                break;
        }

        return new BrokerInsight
        {
            Category = InsightCategory.ABERTURA,
            Priority = priority,
            Headline = headline,
            Body     = body,
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. ARGUMENTO PRINCIPAL — Central argument to develop
    // ─────────────────────────────────────────────────────────────────────
    private static BrokerInsight BuildArgumentoPrincipal(
        LifeInsuranceAssessmentResult result,
        LifeInsuranceAssessmentRequest request)
    {
        var action      = result.RecommendedAction;
        var risk        = result.RiskClassification;
        var gap         = Math.Abs(result.ProtectionGapAmount);
        var gapPct      = Math.Abs(result.ProtectionGapPercentage);
        var deps        = request.FamilyContext.DependentsCount;
        var age         = request.PersonalContext.Age;
        var debt        = request.FinancialContext.Debts?.TotalAmount ?? 0m;
        var recommended = result.RecommendedCoverageAmount;
        var current     = result.CurrentCoverageAmount;
        var monthly     = request.FinancialContext.MonthlyIncome.ExactValue ?? 0m;

        var hasPenaltyDeps  = result.RegrasAplicadas.Contains("RULE_PENALTY_LOW_COVERAGE_DEPENDENTS");
        var hasPenaltyDebt  = result.RegrasAplicadas.Contains("RULE_PENALTY_HIGH_DEBT");
        var hasPenaltyFund  = result.RegrasAplicadas.Contains("RULE_PENALTY_NO_EMERGENCY_FUND");

        var priority = (risk == RiskClassification.CRITICO || action == RecommendedAction.AUMENTAR)
            ? InsightPriority.ALTA
            : InsightPriority.MEDIA;

        string headline, body;

        if (action == RecommendedAction.MANTER)
        {
            headline = "Credibilidade técnica como argumento de relacionamento";
            body =
                "O principal argumento aqui não é sobre produto — é sobre confiança. " +
                "Mostre que você trouxe um diagnóstico técnico imparcial e que o resultado foi positivo: " +
                "'O motor de avaliação confirmou que sua cobertura está calibrada corretamente para seu perfil.' " +
                "Isso constrói credibilidade real para futuras conversas sobre outros produtos " +
                "e torna o cliente um promotor ativo da sua carteira.";
        }
        else if (action == RecommendedAction.REDUZIR)
        {
            headline = "Mostre o custo real da sobecobertura em prêmio mensal";
            body =
                $"O argumento central é eficiência financeira. " +
                $"A cobertura atual ({Brl(current)}) supera em {gapPct:F1}% o necessário ({Brl(recommended)}). " +
                $"Quantifique o que isso representa em prêmio mensal sendo 'desperdiçado' " +
                $"e proponha a realocação desse capital para previdência ou acumulação. " +
                $"Frase de impacto: 'Você está protegido. A questão é se quer continuar " +
                $"pagando por mais do que precisa ou preferir usar esse recurso de forma mais inteligente.'";
        }
        else if (action == RecommendedAction.REVISAR)
        {
            headline = "A precisão da análise depende da qualidade dos dados";
            body =
                "O argumento mais eficaz para obter os dados é a transparência técnica: " +
                "'O motor de avaliação é tão preciso quanto as informações que recebe. " +
                "Com os dados corretos, ele gera uma recomendação exata para o seu perfil. " +
                "Com dados incompletos, a recomendação pode ser muito conservadora ou muito liberal — " +
                "e nenhuma das duas é boa para você.' " +
                "Isso cria motivação genuína para que o cliente forneça informações corretas.";
        }
        else if (hasPenaltyDeps && deps > 0 && risk == RiskClassification.CRITICO)
        {
            headline = "Combine impacto emocional e argumento racional";
            body =
                $"Fórmula de maior conversão para clientes com filhos: " +
                $"'Se algo acontecesse com você hoje, sua família tem {Brl(current)} em cobertura. " +
                $"O motor calculou que ela precisaria de {Brl(recommended)} para manter o padrão de vida " +
                $"durante os anos críticos de dependência. " +
                $"A diferença de {Brl(gap)} não é teórica — é o valor que faltaria " +
                $"no primeiro mês após o sinistro.' " +
                $"Deixe o cliente processar esse número antes de apresentar o produto.";
        }
        else if (hasPenaltyDebt && debt > 0)
        {
            headline = "Quem herda as dívidas? O argumento patrimonial";
            body =
                $"O argumento central é a transferência de risco: " +
                $"'O seguro de vida é o único instrumento que liquida obrigações no dia do sinistro. " +
                $"Sem ele, as dívidas de {Brl(debt)} integram o espólio e comprometem " +
                $"diretamente o patrimônio que você construiu ao longo da vida.' " +
                $"Esse argumento é especialmente poderoso para clientes com " +
                $"financiamento imobiliário, empréstimos consignados ou dívidas empresariais.";
        }
        else if (result.EducationCostsAmount > 0 && deps > 0)
        {
            headline = "Educação dos filhos: o compromisso que não pode falhar";
            body =
                $"O motor incluiu {Brl(result.EducationCostsAmount)} em custos de educação na cobertura recomendada. " +
                $"Argumento central: 'Se algo acontecesse com você, quem garantiria a educação " +
                $"dos seus {deps} filho{(deps > 1 ? "s" : "")}? " +
                $"O seguro de vida cobre exatamente esse compromisso — escola, faculdade, formação completa — " +
                $"sem que a família precise abrir mão de nada.' " +
                $"Esse é o argumento mais emocional e eficaz para pais com filhos em idade escolar.";
        }
        else if (hasPenaltyFund)
        {
            headline = "Sem reserva de emergência, o seguro é a primeira linha de defesa";
            body =
                "O cliente não tem reserva de emergência mínima, o que amplifica o impacto " +
                "de qualquer sinistro de forma exponencial. " +
                "Argumento central: 'Sem um colchão financeiro, a família dependeria " +
                "inteiramente do seguro de vida como única proteção imediata. " +
                "Não é um produto complementar — é a fundação de qualquer planejamento financeiro." +
                "Construir investimentos sobre uma base desprotegida é o erro mais comum que vejo.'";
        }
        else if (age < 35)
        {
            headline = "O prêmio mais barato da vida está disponível agora";
            body =
                $"Para um cliente de {age} anos, o argumento temporal é irrefutável: " +
                $"saúde e idade são os dois maiores fatores de precificação atuarial. " +
                $"Cada ano que passa aumenta o prêmio entre 5% e 15% para a mesma cobertura — " +
                $"e condições preexistentes surgidas até lá podem reduzir a cobertura ou inviabilizá-la. " +
                $"Frase de impacto: 'A tarifa que você paga hoje é a mais baixa que vai encontrar " +
                $"em toda a sua vida. Em 10 anos, o mesmo seguro custará entre 60% e 150% a mais.'";
        }
        else if (result.ItcmdCostAmount > 0 || result.InventoryCostAmount > 0)
        {
            var estateCosts = result.ItcmdCostAmount + result.InventoryCostAmount;
            headline = "Custos sucessórios: o argumento patrimonial definitivo";
            body =
                $"O motor calculou que a família precisaria de {Brl(estateCosts)} " +
                $"apenas para cobrir ITCMD ({Brl(result.ItcmdCostAmount)}) e custos de inventário " +
                $"({Brl(result.InventoryCostAmount)}), sem contar a substituição de renda. " +
                $"Sem seguro, esses custos saem do patrimônio familiar ou exigem venda de bens sob pressão. " +
                $"Frase de impacto: 'Sabia que sua família precisaria desembolsar {Brl(estateCosts)} " +
                $"só para receber a herança? O seguro de vida paga esses custos no dia seguinte ao sinistro, " +
                $"sem precisar vender nenhum bem.'";
        }
        else if (age > 55)
        {
            headline = "Liquidez no inventário: o argumento de legado";
            body =
                $"Para um cliente de {age} anos, o argumento mais relevante é o planejamento sucessório. " +
                $"O seguro de vida oferece liquidez imediata — recurso disponível no dia seguinte ao sinistro, " +
                $"sem aguardar o bloqueio de bens ou o processo de inventário. " +
                $"Frase de impacto: 'Para quem está planejando o futuro, o seguro garante que " +
                $"a família não precisará de anos de inventário para ter acesso ao patrimônio necessário.' " +
                $"Conecte com planejamento patrimonial e testamento sempre que possível.";
        }
        else if (gapPct > 50)
        {
            headline = "Gap acima de 50%: proteção real vs. proteção ilusória";
            body =
                $"Com um gap de {gapPct:F1}%, a cobertura atual representa menos da metade " +
                $"da necessidade calculada. " +
                $"O argumento central remove a objeção 'já tenho seguro': " +
                $"'Você tem um seguro — mas a cobertura cobre menos de 50% do que sua família " +
                $"realmente precisaria. A diferença é de {Brl(gap)}. " +
                $"Não é sobre melhorar a proteção, é sobre ter proteção de verdade.' " +
                $"Esse enquadramento é especialmente eficaz quando o cliente se sente 'coberto'.";
        }
        else
        {
            var coveragePct = recommended > 0 ? (current / recommended * 100m) : 0m;
            headline = "Substituição de renda: o número técnico que convence";
            body =
                $"O motor calculou que seriam necessários {Brl(recommended)} para substituir " +
                $"a renda e proteger o perfil adequadamente. " +
                $"A cobertura atual de {Brl(current)} cobre {coveragePct:F0}% dessa necessidade — " +
                $"um déficit de {Brl(gap)}. " +
                $"Apresente como diagnóstico técnico: 'Não é minha opinião — é o resultado " +
                $"de um motor de avaliação baseado em renda, dependentes e obrigações financeiras. " +
                $"O cálculo é objetivo.'";
        }

        return new BrokerInsight
        {
            Category = InsightCategory.ARGUMENTO_PRINCIPAL,
            Priority = priority,
            Headline = headline,
            Body     = body,
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. OBJEÇÃO PREVISTA — Most likely pushback + counter-argument
    // ─────────────────────────────────────────────────────────────────────
    private static BrokerInsight BuildObjecaoPrevista(
        LifeInsuranceAssessmentResult result,
        LifeInsuranceAssessmentRequest request)
    {
        var action   = result.RecommendedAction;
        var age      = request.PersonalContext.Age;
        var deps     = request.FamilyContext.DependentsCount;
        var profRisk = request.PersonalContext.ProfessionRiskLevel;
        var monthly  = request.FinancialContext.MonthlyIncome.ExactValue ?? 0m;
        var status   = result.CoverageStatus;

        string headline, body;

        if (status == CoverageStatus.SOBRESEGURADO || action == RecommendedAction.REDUZIR)
        {
            headline = "'Tenho esse seguro há anos — não vejo motivo para mudar'";
            body =
                "Resistência natural a alterar uma apólice estabelecida. " +
                "Contra-argumento: 'Exatamente — o seguro cumpriu seu papel até aqui. " +
                "O que estamos propondo não é cancelar a proteção, é ajustá-la para quem você é hoje. " +
                "Sua vida mudou desde que contratou; faz sentido que a apólice acompanhe essa evolução. " +
                "E o resultado é uma cobertura mais precisa pagando menos.' " +
                "Nunca use a palavra 'reduzir' — sempre 'otimizar' ou 'ajustar'.";
        }
        else if (action == RecommendedAction.MANTER)
        {
            headline = "'Se está tudo certo, por que você está me contatando?'";
            body =
                "Ceticismo legítimo quando não há urgência comercial aparente. " +
                "Contra-argumento: 'Justamente porque está tudo certo que vale a pena manter assim. " +
                "Meu trabalho não é só vender — é garantir que você continue protegido " +
                "conforme sua vida evolui. Uma revisão anual evita surpresas desagradáveis. " +
                "E aproveito para perguntar: houve alguma mudança relevante na sua vida " +
                "nos últimos meses que eu deveria considerar na próxima análise?'";
        }
        else if (age < 32 && deps == 0)
        {
            headline = "'Sou jovem e saudável — isso não é prioridade agora'";
            body =
                "Objeção mais comum em perfis jovens sem dependentes. " +
                "Contra-argumento: 'Exatamente por ser jovem e saudável que o prêmio hoje " +
                "é o mais competitivo que vai encontrar em toda a sua vida. " +
                "Quando tiver filhos ou mais responsabilidades, a saúde pode ter mudado " +
                "e o prêmio será 60% a 150% mais caro — se houver aceitação. " +
                "Contratar agora é a decisão mais racional do ponto de vista financeiro.'";
        }
        else if (action == RecommendedAction.AUMENTAR && deps == 0)
        {
            headline = "'Não tenho filhos — seguro de vida não faz sentido para mim'";
            body =
                "Objeção frequente em perfis sem dependentes. " +
                "Contra-argumento: 'O seguro de vida cobre muito mais do que filhos: " +
                "quita dívidas que não passam para o espólio, " +
                "protege pais ou cônjuge que dependam de você financeiramente, " +
                "e garante que ninguém próximo assuma o ônus de um sinistro. " +
                (profRisk >= ProfessionRiskLevel.ALTO
                    ? "Para uma profissão de risco como a sua, a probabilidade de uso é especialmente relevante. "
                    : "") +
                "Se tiver filhos no futuro, já estará coberto sem restrições por condições preexistentes.'";
        }
        else if (action == RecommendedAction.AUMENTAR)
        {
            var monthsOfIncome = monthly > 0 && result.RecommendedCoverageAmount > 0
                ? $"aproximadamente {(result.RecommendedCoverageAmount / monthly):F0} meses de renda"
                : "mais do que o coletivo oferece";
            headline = "'Já tenho seguro coletivo no trabalho — estou coberto'";
            body =
                "Objeção mais comum em CLTs e servidores com benefícios corporativos. " +
                "Contra-argumento: 'O seguro coletivo é um bom benefício, mas tem dois limites críticos: " +
                "primeiro, o benefício termina com o vínculo empregatício — " +
                "uma demissão ou transição de carreira e você fica sem cobertura, " +
                "possivelmente sem poder contratar individualmente pela mesma tarifa. " +
                $"Segundo, coberturas coletivas costumam representar 24 a 36 meses de salário, " +
                $"enquanto o motor calculou {monthsOfIncome} para o seu perfil específico. " +
                "A diferença precisa ser coberta individualmente.'";
        }
        else if (action == RecommendedAction.REVISAR)
        {
            headline = "'Parece que você só quer que eu troque de apólice'";
            body =
                "Desconfiança natural em processos de revisão. " +
                "Contra-argumento: 'Entendo a desconfiança — ela é completamente legítima. " +
                "O que estou trazendo é o resultado de um motor de avaliação técnico e imparcial, " +
                "não minha opinião pessoal. " +
                "Se a análise com os dados completos confirmar que está tudo bem, " +
                "saio daqui sem sugerir nenhuma alteração. " +
                "Meu objetivo é que você tenha certeza sobre sua proteção — não que mude por mudar.'";
        }
        else
        {
            headline = "'O prêmio é caro demais para o meu orçamento atual'";
            body =
                $"Objeção de preço é sempre sobre percepção de valor relativo. " +
                $"Contra-argumento: 'Vamos colocar em perspectiva: " +
                $"o motor calculou que sua família precisaria de {Brl(Math.Abs(result.ProtectionGapAmount))} " +
                $"em caso de sinistro. " +
                $"O prêmio mensal de uma cobertura adequada para o seu perfil costuma representar " +
                $"menos de 1% da renda — enquanto o risco que ele transfere equivale a 100% da necessidade calculada. " +
                $"O custo real não é o prêmio que você paga — é o {Brl(Math.Abs(result.ProtectionGapAmount))} " +
                $"que sua família não teria se você não tivesse o seguro.'";
        }

        return new BrokerInsight
        {
            Category = InsightCategory.OBJECAO_PREVISTA,
            Priority = InsightPriority.MEDIA,
            Headline = headline,
            Body     = body,
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. PRODUTO SUGERIDO — Most appropriate product(s) for this profile
    // ─────────────────────────────────────────────────────────────────────
    private static BrokerInsight BuildProdutoSugerido(
        LifeInsuranceAssessmentResult result,
        LifeInsuranceAssessmentRequest request)
    {
        var action   = result.RecommendedAction;
        var risk     = result.RiskClassification;
        var age      = request.PersonalContext.Age;
        var deps     = request.FamilyContext.DependentsCount;
        var profRisk = request.PersonalContext.ProfessionRiskLevel;
        var hasDebt  = (request.FinancialContext.Debts?.TotalAmount ?? 0m) > 0m;
        var debt     = request.FinancialContext.Debts?.TotalAmount ?? 0m;
        var isSmoker = request.PersonalContext.IsSmoker ?? false;
        var gap      = Math.Abs(result.ProtectionGapAmount);

        var priority = risk == RiskClassification.CRITICO ? InsightPriority.ALTA : InsightPriority.MEDIA;

        string headline, body;

        if (action == RecommendedAction.MANTER)
        {
            headline = "Cross-sell natural com cliente bem estruturado";
            body =
                "Cliente com proteção adequada é o perfil ideal para produtos complementares. " +
                "Produtos prioritários: " +
                (age < 45
                    ? "1. Previdência Privada (PGBL se ainda há espaço na dedução do IR; VGBL se já está no teto). " +
                      "Cliente organizado financeiramente responde bem ao argumento de acumulação de longo prazo. "
                    : "1. Previdência Privada com foco em renda complementar na aposentadoria e sucessão patrimonial. ") +
                "2. Cobertura de Invalidez Total e Parcial Permanente (ITP/IPP) — " +
                "proteção para o cenário estatisticamente mais frequente de afastamento prolongado, não só óbito. " +
                "3. DIT (Diária por Incapacidade Temporária) se a profissão justificar.";
        }
        else if (action == RecommendedAction.REDUZIR)
        {
            headline = "Proposta de otimização com realocação de prêmio";
            body =
                "Estratégia de dois movimentos simultâneos que torna a proposta irrecusável: " +
                "1. Reduzir a cobertura de vida para o valor exato calculado pelo motor — " +
                "reduzindo o prêmio mensal sem perder proteção real. " +
                "2. Redirecionar a diferença do prêmio para previdência privada ou VGBL — " +
                "transformando capital 'desperdiçado' em acumulação patrimonial. " +
                "Essa proposta converte uma conversa de redução de produto " +
                "em uma estratégia financeira integrada, muito mais fácil de fechar.";
        }
        else if (profRisk is ProfessionRiskLevel.ALTO or ProfessionRiskLevel.MUITO_ALTO
                 && risk != RiskClassification.ADEQUADO)
        {
            headline = "Invalidez é a prioridade máxima neste perfil profissional";
            body =
                $"Para profissões de risco elevado, a probabilidade de invalidez por acidente " +
                $"supera estatisticamente a de óbito prematuro. " +
                $"Produto prioritário: Seguro de Acidentes Pessoais com cobertura de " +
                $"Invalidez Total e Parcial Permanente (ITP/IPP) e Morte Acidental — " +
                $"proteção para o cenário mais provável de sinistro neste perfil. " +
                $"Produto complementar: Seguro de Vida Temporário cobrindo o gap de {Brl(gap)} " +
                $"para substituição de renda em caso de óbito. " +
                (isSmoker
                    ? "Atenção: fumante ativo — prepare o cliente para o impacto no prêmio " +
                      "e negocie a cobertura de acordo antes de apresentar o valor final."
                    : "Combine os dois produtos em proposta única para facilitar a decisão.");
        }
        else if (hasDebt && debt > 0 && risk == RiskClassification.CRITICO)
        {
            headline = "Seguro de vida + prestamista: dupla cobertura para este perfil";
            body =
                $"Para este perfil com dívidas de {Brl(debt)}, a estratégia ideal é dupla: " +
                $"1. Seguro de Vida Temporário cobrindo o gap calculado de {Brl(gap)} — " +
                $"proteção da família por substituição de renda. " +
                $"2. Seguro Prestamista (credit life) vinculado às principais dívidas — " +
                $"quitação automática do passivo em caso de sinistro, " +
                $"sem onerar o espólio ou o patrimônio familiar. " +
                $"Apresente os dois como produtos complementares e indissociáveis para este perfil.";
        }
        else if (age < 40 && deps > 0)
        {
            headline = "Temporário de longo prazo: máxima cobertura, mínimo prêmio";
            body =
                $"Para {age} anos com {deps} dependente{(deps > 1 ? "s" : "")}, " +
                $"o melhor custo-benefício é o Seguro de Vida Temporário de 15 a 20 anos. " +
                $"Oferece a maior cobertura pelo menor prêmio durante o período de maior exposição — " +
                $"quando os filhos ainda dependem financeiramente e as dívidas estão no pico. " +
                $"Prêmio travado na tarifa de hoje, a mais competitiva da vida do cliente. " +
                (isSmoker
                    ? "Observação: fumante ativo — as seguradoras aplicam carga adicional de 50% a 200%; " +
                      "prepare o cliente para essa realidade antes de apresentar o valor."
                    : "Inclua cláusula de ITP/IPP na proposta como cobertura complementar.");
        }
        else if (age >= 55)
        {
            headline = "Vida inteira ou universal life para planejamento sucessório";
            body =
                $"Para um cliente de {age} anos, o Seguro de Vida Inteira é o mais indicado: " +
                $"cobertura permanente sem prazo de expiração, " +
                $"com componente de acumulação e valor de resgate crescente. " +
                $"Utilidade dupla: proteção da família em caso de sinistro " +
                $"e instrumento de transferência patrimonial com liquidez imediata no inventário — " +
                $"recurso disponível no dia seguinte ao sinistro, sem aguardar bloqueio de bens. " +
                $"Sempre que possível, envolva um advogado de planejamento patrimonial " +
                $"para posicionar o produto como parte de uma estratégia integrada.";
        }
        else
        {
            headline = "Seguro de vida individual com revisão anual programada";
            body =
                $"Para este perfil, a recomendação é um Seguro de Vida Individual " +
                $"com cobertura de {Brl(result.RecommendedCoverageAmount)}, " +
                $"incluindo cláusula de Invalidez Total e Parcial Permanente (ITP/IPP). " +
                $"Inclua na proposta uma revisão anual contratual — " +
                $"isso cria um ciclo de relacionamento que aumenta o LTV do cliente " +
                $"e permite ajustar a cobertura conforme o perfil evolui. " +
                (isSmoker
                    ? "Atenção: fumante ativo — prepare o cliente para o impacto no prêmio antes de apresentar o valor final. "
                    : "") +
                $"Considere adicionar cobertura de DIT (Diária por Incapacidade Temporária) " +
                $"se a profissão justificar o risco de afastamentos recorrentes.";
        }

        return new BrokerInsight
        {
            Category = InsightCategory.PRODUTO_SUGERIDO,
            Priority = priority,
            Headline = headline,
            Body     = body,
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. PRÓXIMO PASSO — Concrete actions after the evaluation
    // ─────────────────────────────────────────────────────────────────────
    private static BrokerInsight BuildProximoPasso(
        LifeInsuranceAssessmentResult result,
        LifeInsuranceAssessmentRequest request)
    {
        var action      = result.RecommendedAction;
        var risk        = result.RiskClassification;
        var gap         = Math.Abs(result.ProtectionGapAmount);
        var recommended = result.RecommendedCoverageAmount;
        var current     = result.CurrentCoverageAmount;

        var priority = risk switch
        {
            RiskClassification.CRITICO  => InsightPriority.ALTA,
            RiskClassification.MODERADO => InsightPriority.MEDIA,
            _                           => InsightPriority.BAIXA,
        };

        string headline, body;

        switch (action)
        {
            case RecommendedAction.AUMENTAR when risk == RiskClassification.CRITICO:
                headline = "Ligação ou reunião presencial — nunca só e-mail";
                body =
                    $"Gap crítico de {Brl(gap)} exige abordagem direta e pessoal. " +
                    $"Checklist de ações imediatas: " +
                    $"1. Ligar ou agendar reunião presencial — e-mail isolado não gera urgência adequada para perfis críticos. " +
                    $"2. Preparar simulação de prêmio para a cobertura de {Brl(recommended)} antes do contato. " +
                    $"3. Se houver apólice existente, solicitar que o cliente a traga para análise — " +
                    $"comparar a cobertura atual com a necessidade real é o gatilho de venda mais eficaz. " +
                    $"4. Documentar o contato independentemente do resultado para rastreabilidade de relacionamento.";
                break;

            case RecommendedAction.AUMENTAR:
                headline = "Proposta comparativa antes da reunião de fechamento";
                body =
                    $"Sequência de abordagem de maior conversão: " +
                    $"1. Preparar comparativo visual: cobertura atual ({Brl(current)}) " +
                    $"vs. recomendada ({Brl(recommended)}) com simulação de prêmio mensal. " +
                    $"2. Enviar por WhatsApp ou e-mail com confirmação de leitura antes de ligar. " +
                    $"3. Na ligação de follow-up, não apresente o produto — pergunte: " +
                    $"'Você teve chance de ver a análise que enviei? O que achou dos números?' " +
                    $"Deixe o cliente processar antes de tentar fechar. " +
                    $"4. Reunião de fechamento somente após o cliente ter os números em mãos.";
                break;

            case RecommendedAction.MANTER:
                headline = "Registrar, agendar revisão e pedir indicações";
                body =
                    "1. Registrar na base como 'cobertura adequada — próxima revisão em 12 meses'. " +
                    "2. Criar lembrete automático para revisão anual. " +
                    "3. Aproveitar o momento de validação positiva para pedir indicações: " +
                    "'Você conhece alguém — colega, familiar, sócio — que poderia se beneficiar " +
                    "de uma análise como essa? Clientes bem estruturados geralmente estão " +
                    "rodeados de pessoas que também valorizam organização financeira.' " +
                    "4. Perguntar sobre mudanças de vida esperadas nos próximos 12 meses " +
                    "(filhos, compra de imóvel, mudança de emprego) para antecipar a próxima revisão.";
                break;

            case RecommendedAction.REDUZIR:
                headline = "Proposta de otimização + documentação formal obrigatória";
                body =
                    "1. Preparar proposta com a cobertura otimizada e o novo prêmio mensal. " +
                    "2. Incluir na proposta o destino sugerido para o prêmio economizado " +
                    "(previdência, VGBL ou outra aplicação). " +
                    "3. Documentar formalmente — com aceite do cliente — " +
                    "que a recomendação de redução foi apresentada e que o ajuste foi solicitado pelo cliente. " +
                    "Isso é obrigatório para fins de compliance e proteção do corretor. " +
                    "4. Agendar revisão em 12 meses para confirmar que a nova cobertura " +
                    "permanece adequada após o ajuste.";
                break;

            default: // REVISAR
                headline = "Reunião de coleta de dados — sem proposta nesta etapa";
                body =
                    "1. Marcar reunião exclusiva para confirmação e coleta de dados completos. " +
                    "2. Não apresentar nenhuma proposta comercial nesta etapa — " +
                    "proposta sem dados completos gera recomendação imprecisa e perda de credibilidade. " +
                    "3. Checklist de dados a confirmar: renda atual, dívidas vigentes, " +
                    "dependentes e idades, reserva de emergência, apólices existentes. " +
                    "4. Após a reunião, rodar nova avaliação no motor com os dados completos. " +
                    "5. Só apresentar proposta comercial após o resultado da nova avaliação " +
                    "confirmar a recomendação adequada para o perfil atualizado.";
                break;
        }

        return new BrokerInsight
        {
            Category = InsightCategory.PROXIMO_PASSO,
            Priority = priority,
            Headline = headline,
            Body     = body,
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────
    private static string Brl(decimal value) => value.ToString("C0", PtBr);
}
