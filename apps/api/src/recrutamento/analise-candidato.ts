/**
 * Montagem do dossiê e do prompt da análise de candidato por IA (RN-REC-013).
 *
 * Herda o desenho do "IA Master" do SelX 1.0 (`backend/src/routes/ai.ts`), com
 * quatro diferenças deliberadas — ver `EsquemaAnalise` e `PROMPT_SISTEMA`:
 *
 * 1. A IA **não decide**. O 1.0 pedia `HIRE`/`NO_HIRE`/`NEEDS_INFO` e escrevia os
 *    limiares numéricos dentro do prompt, ou seja, delegava ao modelo uma regra
 *    determinística que ele pode aplicar errado. Aqui a recomendação continua
 *    vindo do match (`calcular-match.ts`) e a IA só a explica.
 * 2. **Evidência obrigatória** em cada ponto forte e risco. No 1.0 eram strings
 *    soltas; exigir a citação torna a invenção visível a olho nu.
 * 3. **Requisitos auditáveis derivados dos requisitos estruturados da vaga.** O
 *    1.0 tinha uma lista fixa de regex (PMP, NR11, inglês) e era cego a qualquer
 *    requisito fora dela.
 * 4. **`dadosFaltantes` explícito** no lugar de um veredito `NEEDS_INFO`.
 */

/** Palavras que aparecem em quase todo requisito e não ajudam a localizar nada. */
const PALAVRAS_VAZIAS = new Set([
  'com', 'para', 'sobre', 'entre', 'como', 'mais', 'menos', 'anos', 'ano', 'meses',
  'experiencia', 'experiencias', 'conhecimento', 'conhecimentos', 'vivencia',
  'atuacao', 'nivel', 'area', 'ferramentas', 'ferramenta', 'desejavel',
  'obrigatorio', 'minimo', 'pelo', 'ter', 'que', 'dos', 'das', 'nas', 'nos',
  'uma', 'the', 'and',
]);

const semAcento = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Termos com que vale procurar um requisito no currículo: palavras próprias do
 * requisito, sem acento, sem as genéricas e sem as curtas demais (que casariam
 * em qualquer lugar).
 */
export function termosDoRequisito(descrReq: string): string[] {
  return Array.from(
    new Set(
      semAcento(descrReq)
        .split(/[^a-z0-9+#.]+/)
        .map((t) => t.replace(/^[.]+|[.]+$/g, ''))
        // Mínimo de 3 letras para palavra comum — com 2, "de"/"em" casariam em
        // qualquer linha. A exceção são termos com símbolo (C#, C++, .NET, F#):
        // são inequívocos justamente por causa do símbolo, e ficariam de fora.
        .filter(
          (t) =>
            !PALAVRAS_VAZIAS.has(t) &&
            !/^\d+$/.test(t) &&
            (t.length >= 3 || /[+#.]/.test(t)),
        ),
    ),
  );
}

export interface EvidenciaRequisito {
  requisito: string;
  tipo: string;
  encontrado: boolean;
  trecho: string | null;
}

/**
 * Para cada requisito da vaga, o trecho do currículo que o sustenta — ou a
 * ausência declarada.
 *
 * Devolver `encontrado: false` explicitamente (em vez de omitir o requisito) é
 * o que permite ao prompt exigir "cite a evidência ou diga que não encontrou":
 * o modelo recebe a lista completa e não tem como fingir que não viu a lacuna.
 *
 * A busca é por **linha**, não pelo texto inteiro: currículo é uma lista de
 * itens, e a linha é a unidade que o recrutador reconhece ao conferir.
 */
export function montarEvidencias(
  requisitos: { descrReq: string; tipoReq: string }[],
  textoCurriculo: string | null,
): EvidenciaRequisito[] {
  const linhas = (textoCurriculo ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const linhasNormalizadas = linhas.map(semAcento);

  return requisitos.map((req) => {
    const termos = termosDoRequisito(req.descrReq);
    if (termos.length === 0 || linhas.length === 0) {
      return { requisito: req.descrReq, tipo: req.tipoReq, encontrado: false, trecho: null };
    }

    // Melhor linha = a que cobre mais termos do requisito. Uma linha que cita
    // "SQL" e "modelagem" é evidência mais forte que outra que só cita "SQL".
    let melhorIndice = -1;
    let melhorCobertura = 0;
    linhasNormalizadas.forEach((linha, i) => {
      const cobertura = termos.filter((t) => linha.includes(t)).length;
      if (cobertura > melhorCobertura) {
        melhorCobertura = cobertura;
        melhorIndice = i;
      }
    });

    if (melhorIndice < 0) {
      return { requisito: req.descrReq, tipo: req.tipoReq, encontrado: false, trecho: null };
    }
    return {
      requisito: req.descrReq,
      tipo: req.tipoReq,
      encontrado: true,
      trecho: linhas[melhorIndice].slice(0, 220),
    };
  });
}

/** Schema da saída — validado no gateway antes de voltar para a API. */
export const EsquemaAnalise = {
  type: 'object',
  required: [
    'resumoExecutivo',
    'aderenciaTecnica',
    'pontosFortes',
    'pontosAtencao',
    'riscos',
    'perguntasEntrevista',
    'proximoPasso',
    'dadosFaltantes',
  ],
  properties: {
    resumoExecutivo: { type: 'string', minLength: 40 },
    aderenciaTecnica: {
      type: 'object',
      required: ['sintese', 'atende', 'atendeParcialmente', 'naoAtende', 'impactoNaVaga'],
      properties: {
        sintese: { type: 'string', minLength: 20 },
        atende: { type: 'array', items: { type: 'string' } },
        atendeParcialmente: { type: 'array', items: { type: 'string' } },
        naoAtende: { type: 'array', items: { type: 'string' } },
        impactoNaVaga: { type: 'string', minLength: 20 },
      },
    },
    aderenciaComportamental: {
      type: ['object', 'null'],
      properties: {
        sintese: { type: 'string' },
        padroesObservados: { type: 'array', items: { type: 'string' } },
        impactoNaEquipe: { type: 'string' },
      },
    },
    // `evidencia` é obrigatória: sem citação, não entra.
    pontosFortes: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        required: ['ponto', 'evidencia'],
        properties: { ponto: { type: 'string' }, evidencia: { type: 'string' } },
      },
    },
    pontosAtencao: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        required: ['ponto', 'evidencia'],
        properties: { ponto: { type: 'string' }, evidencia: { type: 'string' } },
      },
    },
    riscos: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        required: ['risco', 'severidade', 'motivo'],
        properties: {
          risco: { type: 'string' },
          // Aceita a grafia acentuada porque é o que um modelo escrevendo em
          // português produz naturalmente — o Ollama devolveu "MÉDIA" e a
          // resposta inteira era descartada por causa do acento. A regra que
          // importa é "uma das três severidades"; a grafia é normalizada na
          // volta por `normalizarSeveridade`.
          severidade: { type: 'string', enum: ['BAIXA', 'MEDIA', 'MÉDIA', 'ALTA', 'Baixa', 'Média', 'Media', 'Alta'] },
          motivo: { type: 'string' },
        },
      },
    },
    perguntasEntrevista: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        required: ['pergunta', 'motivo'],
        properties: { pergunta: { type: 'string' }, motivo: { type: 'string' } },
      },
    },
    proximoPasso: { type: 'string', minLength: 10 },
    dadosFaltantes: { type: 'array', items: { type: 'string' } },
  },
} as const;

export const VERSAO_PROMPT = 'recrutamento.analise-candidato@v1';

export type Severidade = 'BAIXA' | 'MEDIA' | 'ALTA';

/**
 * Uniformiza a severidade antes de persistir.
 *
 * O schema aceita variações de grafia (acento e caixa) porque um modelo
 * escrevendo em português escreve "MÉDIA" — rejeitar a resposta inteira por
 * causa disso desperdiça uma geração cara. Guardar variação, porém, quebraria
 * a interface, que indexa cor por severidade. Normalizar na fronteira resolve
 * os dois: tolerante ao ler, rígido ao gravar.
 */
export function normalizarSeveridade(bruta: string): Severidade {
  const limpa = semAcento(bruta).toUpperCase();
  if (limpa === 'ALTA') return 'ALTA';
  if (limpa === 'BAIXA') return 'BAIXA';
  return 'MEDIA';
}

/** Aplica a normalização em toda a análise recebida do gateway. */
export function normalizarAnalise(conteudo: unknown): unknown {
  if (!conteudo || typeof conteudo !== 'object') return conteudo;
  const analise = conteudo as { riscos?: { severidade?: string }[] };
  if (!Array.isArray(analise.riscos)) return conteudo;
  return {
    ...analise,
    riscos: analise.riscos.map((r) => ({
      ...r,
      severidade: normalizarSeveridade(String(r.severidade ?? '')),
    })),
  };
}

export const PROMPT_SISTEMA = `Você é o assistente de análise de candidatos do SelexOps. Você APOIA a decisão do recrutador; você NUNCA decide.

REGRAS INEGOCIÁVEIS
1. Não produza nota, score ou percentual próprio. Os números do dossiê já foram calculados por um motor determinístico — cite-os, jamais recalcule ou conteste.
2. Não recomende contratar ou reprovar. Descreva impacto na vaga e o próximo passo de verificação.
3. Não invente fatos. Todo ponto forte e todo ponto de atenção precisa de "evidencia": uma citação curta do currículo, da resposta de triagem ou do resultado comportamental. Sem evidência no material recebido, não escreva o item.
4. Ausência de dado é informação: liste em "dadosFaltantes" o que faltou (currículo, avaliação comportamental, respostas) e explique no texto o que isso limita. Nunca preencha a lacuna com suposição.
5. Em REQUISITOS AUDITÁVEIS, cada item traz "encontrado" e o trecho. Respeite: se "encontrado" é false, o requisito vai em "naoAtende" — não deduza que a pessoa tem a competência por parecer plausível ao cargo.
6. Escreva em português do Brasil, tom profissional e neutro, sem adjetivos de entusiasmo.
7. Não comente idade, gênero, estado civil, origem, aparência, religião ou qualquer característica pessoal protegida — só competências e trajetória profissional.

Responda EXCLUSIVAMENTE com um JSON válido neste formato:
{
  "resumoExecutivo": "3 a 5 linhas: quem é o candidato, aderência à vaga e a principal ressalva",
  "aderenciaTecnica": {
    "sintese": "texto",
    "atende": ["requisito comprovado no material"],
    "atendeParcialmente": ["requisito com evidência fraca ou indireta"],
    "naoAtende": ["requisito sem evidência"],
    "impactoNaVaga": "o que isso significa no dia a dia da vaga"
  },
  "aderenciaComportamental": {
    "sintese": "texto",
    "padroesObservados": ["padrão apoiado nos fatores recebidos"],
    "impactoNaEquipe": "texto"
  },
  "pontosFortes": [{ "ponto": "texto", "evidencia": "citação curta do material" }],
  "pontosAtencao": [{ "ponto": "texto", "evidencia": "citação curta do material" }],
  "riscos": [{ "risco": "texto", "severidade": "BAIXA|MEDIA|ALTA", "motivo": "texto" }],
  "perguntasEntrevista": [{ "pergunta": "texto", "motivo": "o que ela verifica" }],
  "proximoPasso": "a verificação mais útil agora",
  "dadosFaltantes": ["o que não foi fornecido"]
}

Se não houver resultado comportamental no dossiê, "aderenciaComportamental" deve ser null — não descreva traços de personalidade sem a avaliação.`;

/** Limites por seção — o dossiê inteiro precisa caber no orçamento de tokens. */
const LIMITES = { curriculo: 9000, respostas: 2000, contexto: 3000 };

export interface DossieAnalise {
  vaga: unknown;
  requisitosAuditaveis: EvidenciaRequisito[];
  matchDeterministico: unknown;
  comportamental: unknown;
  respostasTriagem: unknown;
  curriculo: string | null;
}

export function montarPromptUsuario(dossie: DossieAnalise): string {
  const bloco = (rotulo: string, valor: unknown, limite = LIMITES.contexto) =>
    `${rotulo}:\n${JSON.stringify(valor, null, 2).slice(0, limite)}\n\n`;

  return (
    bloco('VAGA', dossie.vaga) +
    'REQUISITOS AUDITÁVEIS (cada um com o trecho que o sustenta, ou encontrado=false)\n' +
    bloco('REQUISITOS', dossie.requisitosAuditaveis, LIMITES.contexto * 2) +
    'MATCH DETERMINÍSTICO (já calculado — use como base, nunca recalcule)\n' +
    bloco('MATCH', dossie.matchDeterministico) +
    bloco('RESPOSTAS DE TRIAGEM', dossie.respostasTriagem, LIMITES.respostas) +
    bloco('RESULTADO COMPORTAMENTAL', dossie.comportamental) +
    (dossie.curriculo
      ? `CURRÍCULO (texto extraído):\n${dossie.curriculo.slice(0, LIMITES.curriculo)}\n\n`
      : 'CURRÍCULO: não fornecido — registre isso em dadosFaltantes.\n\n')
  );
}
