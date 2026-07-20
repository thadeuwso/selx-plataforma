/**
 * Seed do catálogo global de Avaliação Comportamental (TGP*): fatores,
 * escala de resposta, banco de 64 perguntas e o modelo padrão de 48.
 * Idempotente (upsert por sigla/texto). Conteúdo fonte de verdade:
 * "09 - Módulos/Gestão de Pessoas/02 - Banco de Perguntas.md" no vault.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FATORES = [
  { sigla: "DIR", nome: "Direcionamento", descricao: "Iniciativa, assertividade, tomada de decisão, foco em resultados, enfrentamento de desafios, velocidade de ação, autonomia, tolerância a riscos.", ordem: 1 },
  { sigla: "CON", nome: "Conexão", descricao: "Comunicação, sociabilidade, persuasão, influência, entusiasmo, exposição, criação de relacionamentos, mobilização de pessoas.", ordem: 2 },
  { sigla: "SUS", nome: "Sustentação", descricao: "Constância, paciência, colaboração, escuta, previsibilidade, estabilidade, apoio à equipe, preferência por mudanças graduais.", ordem: 3 },
  { sigla: "PRE", nome: "Precisão", descricao: "Análise, organização, atenção aos detalhes, planejamento, cumprimento de normas, controle, qualidade, redução de riscos.", ordem: 4 },
];

const ESCALA = [
  { valor: 1, rotulo: "Discordo totalmente", ordem: 1 },
  { valor: 2, rotulo: "Discordo parcialmente", ordem: 2 },
  { valor: 3, rotulo: "Nem concordo nem discordo", ordem: 3 },
  { valor: 4, rotulo: "Concordo parcialmente", ordem: 4 },
  { valor: 5, rotulo: "Concordo totalmente", ordem: 5 },
];

// [código, texto, tipo, faceta] — ver "02 - Banco de Perguntas.md"
const PERGUNTAS = {
  DIR: [
    ["DIR-D01", "Costumo tomar decisões mesmo quando nem todas as informações estão disponíveis.", "DIRETA", "Tomada de decisão"],
    ["DIR-D02", "Prefiro agir rapidamente a esperar o momento perfeito para começar.", "DIRETA", "Velocidade de ação"],
    ["DIR-D03", "Sinto-me à vontade para expressar minha opinião mesmo quando ela diverge da maioria.", "DIRETA", "Assertividade"],
    ["DIR-D04", "Costumo me colocar à frente quando um problema do time precisa ser resolvido.", "DIRETA", "Iniciativa"],
    ["DIR-D05", "Prefiro metas desafiadoras a tarefas previsíveis e repetitivas.", "DIRETA", "Enfrentamento de desafios"],
    ["DIR-D06", "Gosto de decidir por conta própria como conduzir o meu trabalho.", "DIRETA", "Autonomia"],
    ["DIR-D07", "Mantenho o foco no resultado final mesmo quando o caminho precisa mudar.", "DIRETA", "Foco em resultados"],
    ["DIR-D08", "Aceito correr riscos calculados para avançar mais rápido em um projeto.", "DIRETA", "Tolerância a riscos"],
    ["DIR-R01", "Prefiro esperar orientação de outra pessoa antes de agir em situações novas.", "REVERSA", "Iniciativa"],
    ["DIR-R02", "Evito me posicionar quando percebo que minha opinião pode gerar desacordo.", "REVERSA", "Assertividade"],
    ["DIR-R03", "Prefiro ter todas as informações confirmadas antes de tomar qualquer decisão.", "REVERSA", "Tomada de decisão"],
    ["DIR-R04", "Sinto-me mais confortável seguindo um plano já definido por outra pessoa.", "REVERSA", "Autonomia"],
    ["DIR-R05", "Prefiro adiar uma decisão difícil até que seja realmente necessário decidir.", "REVERSA", "Tomada de decisão"],
    ["DIR-R06", "Evito me envolver em tarefas cujo resultado final é incerto.", "REVERSA", "Tolerância a riscos"],
    ["DIR-R07", "Prefiro manter o ritmo atual de um projeto a acelerar uma entrega.", "REVERSA", "Velocidade de ação"],
    ["DIR-R08", "Prefiro evitar situações que exijam enfrentar um problema diretamente.", "REVERSA", "Enfrentamento de desafios"],
  ],
  CON: [
    ["CON-D01", "Sinto-me confortável iniciando conversas com pessoas que ainda não conheço.", "DIRETA", "Sociabilidade"],
    ["CON-D02", "Costumo conseguir engajar outras pessoas em torno de uma ideia nova.", "DIRETA", "Mobilização de pessoas"],
    ["CON-D03", "Gosto de apresentar minhas ideias para grupos de pessoas.", "DIRETA", "Exposição"],
    ["CON-D04", "Consigo convencer colegas a apoiar um ponto de vista com facilidade.", "DIRETA", "Persuasão"],
    ["CON-D05", "Demonstro entusiasmo de forma visível quando estou envolvido em um projeto.", "DIRETA", "Entusiasmo"],
    ["CON-D06", "Crio novos relacionamentos profissionais com naturalidade.", "DIRETA", "Criação de relacionamentos"],
    ["CON-D07", "Prefiro resolver um assunto conversando diretamente a trocar mensagens escritas.", "DIRETA", "Comunicação"],
    ["CON-D08", "Costumo contagiar um grupo com a minha energia.", "DIRETA", "Influência"],
    ["CON-R01", "Prefiro observar uma conversa em grupo a participar ativamente dela.", "REVERSA", "Sociabilidade"],
    ["CON-R02", "Sinto-me mais à vontade trabalhando sozinho do que apresentando ideias para outras pessoas.", "REVERSA", "Exposição"],
    ["CON-R03", "Evito tentar convencer alguém que já tem uma opinião formada sobre o assunto.", "REVERSA", "Persuasão"],
    ["CON-R04", "Prefiro me manter em segundo plano em reuniões com muitas pessoas.", "REVERSA", "Exposição"],
    ["CON-R05", "Mantenho minhas reações discretas mesmo quando estou entusiasmado com algo.", "REVERSA", "Entusiasmo"],
    ["CON-R06", "Levo tempo para me sentir à vontade em um novo grupo de trabalho.", "REVERSA", "Criação de relacionamentos"],
    ["CON-R07", "Prefiro me comunicar por escrito a ter uma conversa espontânea sobre um assunto.", "REVERSA", "Comunicação"],
    ["CON-R08", "Não costumo buscar aproximação com pessoas fora do meu círculo imediato de trabalho.", "REVERSA", "Criação de relacionamentos"],
  ],
  SUS: [
    ["SUS-D01", "Prefiro ambientes em que as mudanças aconteçam de maneira gradual.", "DIRETA", "Preferência por mudanças graduais"],
    ["SUS-D02", "Mantenho o mesmo ritmo de trabalho mesmo em períodos mais longos de uma tarefa.", "DIRETA", "Constância"],
    ["SUS-D03", "Escuto atentamente antes de dar minha opinião sobre um assunto.", "DIRETA", "Escuta"],
    ["SUS-D04", "Prefiro colaborar em equipe a conduzir uma tarefa sozinho na maior parte do tempo.", "DIRETA", "Colaboração"],
    ["SUS-D05", "Ofereço apoio a colegas quando percebo que estão sobrecarregados.", "DIRETA", "Apoio à equipe"],
    ["SUS-D06", "Sinto-me mais produtivo em rotinas estáveis e previsíveis.", "DIRETA", "Estabilidade"],
    ["SUS-D07", "Tenho paciência para repetir uma explicação quantas vezes forem necessárias.", "DIRETA", "Paciência"],
    ["SUS-D08", "Prefiro manter um processo que já funciona bem a substituí-lo sem necessidade clara.", "DIRETA", "Previsibilidade"],
    ["SUS-R01", "Prefiro ambientes em que as mudanças aconteçam de forma rápida e constante.", "REVERSA", "Preferência por mudanças graduais"],
    ["SUS-R02", "Meu ritmo de trabalho costuma variar bastante de um dia para o outro.", "REVERSA", "Constância"],
    ["SUS-R03", "Costumo formar minha opinião antes de ouvir todos os pontos de vista envolvidos.", "REVERSA", "Escuta"],
    ["SUS-R04", "Prefiro conduzir uma tarefa sozinho a dividir etapas com outras pessoas.", "REVERSA", "Colaboração"],
    ["SUS-R05", "Fico impaciente quando preciso repetir a mesma explicação mais de uma vez.", "REVERSA", "Paciência"],
    ["SUS-R06", "Prefiro me concentrar nas minhas próprias entregas a apoiar demandas de colegas.", "REVERSA", "Apoio à equipe"],
    ["SUS-R07", "Prefiro alternar entre tarefas diferentes a manter o mesmo processo por muito tempo.", "REVERSA", "Previsibilidade"],
    ["SUS-R08", "Costumo tomar decisões rápidas sem consultar quem mais é afetado por elas.", "REVERSA", "Colaboração / escuta"],
  ],
  PRE: [
    ["PRE-D01", "Antes de concluir uma atividade, reviso os detalhes mais de uma vez.", "DIRETA", "Atenção aos detalhes"],
    ["PRE-D02", "Organizo meu trabalho seguindo um planejamento definido previamente.", "DIRETA", "Planejamento"],
    ["PRE-D03", "Analiso as informações disponíveis com cuidado antes de tirar uma conclusão.", "DIRETA", "Análise"],
    ["PRE-D04", "Sigo as normas e procedimentos estabelecidos mesmo quando isso exige mais tempo.", "DIRETA", "Cumprimento de normas"],
    ["PRE-D05", "Verifico os resultados do meu trabalho antes de considerá-lo finalizado.", "DIRETA", "Controle de qualidade"],
    ["PRE-D06", "Prefiro reduzir riscos a acelerar uma entrega sem as devidas verificações.", "DIRETA", "Redução de riscos"],
    ["PRE-D07", "Mantenho meus documentos e registros de trabalho bem organizados.", "DIRETA", "Organização"],
    ["PRE-D08", "Dedico atenção especial aos pequenos detalhes de uma tarefa.", "DIRETA", "Atenção aos detalhes"],
    ["PRE-R01", "Prefiro concluir uma tarefa rapidamente a revisá-la várias vezes.", "REVERSA", "Atenção aos detalhes"],
    ["PRE-R02", "Costumo iniciar uma atividade sem planejar todas as etapas com antecedência.", "REVERSA", "Planejamento"],
    ["PRE-R03", "Tomo decisões com base na primeira impressão, sem analisar os dados a fundo.", "REVERSA", "Análise"],
    ["PRE-R04", "Prefiro adaptar uma norma à situação a segui-la rigidamente.", "REVERSA", "Cumprimento de normas"],
    ["PRE-R05", "Considero uma tarefa concluída assim que atinjo o resultado esperado, sem revisões adicionais.", "REVERSA", "Controle de qualidade"],
    ["PRE-R06", "Prefiro avançar rapidamente mesmo que isso signifique aceitar mais riscos.", "REVERSA", "Redução de riscos"],
    ["PRE-R07", "Meus registros e anotações de trabalho tendem a ficar dispersos.", "REVERSA", "Organização"],
    ["PRE-R08", "Costumo notar o panorama geral de uma situação mais do que os detalhes específicos.", "REVERSA", "Atenção aos detalhes"],
  ],
};

// Modelo padrão v1: 12 por fator (6 diretas D01-D06 + 6 reversas R01-R06).
// As D07/D08/R07/R08 de cada fator ficam no banco, disponíveis para versões futuras.
const CODIGOS_MODELO_PADRAO = new Set(
  Object.values(PERGUNTAS)
    .flatMap((lista) => lista.filter((_, i) => i < 6 || (i >= 8 && i < 14)).map((p) => p[0])),
);

const fatoresPorSigla = {};
for (const f of FATORES) {
  fatoresPorSigla[f.sigla] = await prisma.fatorComportamental.upsert({
    where: { sigla: f.sigla },
    update: { nome: f.nome, descricao: f.descricao, ordem: f.ordem },
    create: f,
  });
}
console.log(`Seed: ${FATORES.length} fatores comportamentais garantidos.`);

for (const e of ESCALA) {
  const existente = await prisma.escalaResposta.findFirst({ where: { tipoEscala: "NORMATIVA_1_5", valor: e.valor } });
  if (!existente) {
    await prisma.escalaResposta.create({ data: { tipoEscala: "NORMATIVA_1_5", ...e } });
  }
}
console.log(`Seed: ${ESCALA.length} opções da escala normativa 1-5 garantidas.`);

const perguntasCriadas = {};
for (const [sigla, lista] of Object.entries(PERGUNTAS)) {
  const fator = fatoresPorSigla[sigla];
  for (const [codigo, texto, tipo, categoria] of lista) {
    const existente = await prisma.perguntaComportamental.findFirst({ where: { texto } });
    const registro = existente
      ? await prisma.perguntaComportamental.update({ where: { codPer: existente.codPer }, data: { codFat: fator.codFat, tipo, categoria } })
      : await prisma.perguntaComportamental.create({ data: { codFat: fator.codFat, texto, tipo, categoria, idioma: "pt-BR" } });
    perguntasCriadas[codigo] = registro;
  }
}
const totalPerguntas = Object.values(PERGUNTAS).reduce((s, l) => s + l.length, 0);
console.log(`Seed: ${totalPerguntas} perguntas do banco comportamental garantidas.`);

let modelo = await prisma.modeloAvaliacaoComportamental.findFirst({ where: { nome: "Avaliação Comportamental Padrão", versao: 1 } });
if (!modelo) {
  modelo = await prisma.modeloAvaliacaoComportamental.create({
    data: {
      nome: "Avaliação Comportamental Padrão",
      versao: 1,
      status: "PUBLICADO",
      tempoEstimadoMin: 8,
      tempoEstimadoMax: 12,
      dhPublicacao: new Date(),
    },
  });
}

let ordem = 1;
for (const [codigo, pergunta] of Object.entries(perguntasCriadas)) {
  if (!CODIGOS_MODELO_PADRAO.has(codigo)) continue;
  await prisma.modeloAvaliacaoPergunta.upsert({
    where: { codMod_codPer: { codMod: modelo.codMod, codPer: pergunta.codPer } },
    update: { ordem },
    create: { codMod: modelo.codMod, codPer: pergunta.codPer, ordem },
  });
  ordem++;
}
console.log(`Seed: modelo "Avaliação Comportamental Padrão v1" com ${ordem - 1} perguntas (esperado: 48).`);

await prisma.$disconnect();
