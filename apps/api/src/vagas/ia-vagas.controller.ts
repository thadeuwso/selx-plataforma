import { BadRequestException, Body, Controller, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../auth/autenticacao.guard';

/**
 * Estruturação de vaga com IA — herda a experiência do SelX 1.0 (prompt de
 * JOB_AUTOFILL) mas passa pelo AI Gateway (ADR-0003): purpose versionado,
 * PII redigida, saída validada por JSON Schema. Nada é publicado
 * automaticamente — o RH revisa e edita antes de criar a vaga (POST /vagas).
 */

const PURPOSE = 'recrutamento.estruturar-vaga@v1';

const PROMPT_SISTEMA = `Você é um assistente de estruturação de vagas de um ATS brasileiro.
Objetivo: transformar uma descrição bruta de vaga em um objeto estruturado, consistente e utilizável.

Regras:
- Responda SOMENTE com um JSON válido, sem markdown, sem comentários, seguindo EXATAMENTE as chaves do modelo abaixo (mesmos nomes, mesmos tipos).
- Não invente requisitos que não estejam implicados no texto. Se um campo não existir no texto, use null (nunca omita a chave).
- Separe requisitos em OBRIGATORIO e DESEJAVEL. Marque knockout=true só quando o requisito for claramente eliminatório.
- Sugira de 2 a 5 perguntas de triagem objetivas (sim/não), focadas nos requisitos obrigatórios mais importantes.
- Se o texto tiver dados pessoais (telefone, e-mail, CPF), ignore-os — não fazem parte da estrutura da vaga.
- A IA apoia a organização; a decisão final é sempre humana. Idioma: português do Brasil.

Modelo exato de resposta (preencha os valores, mantenha todas as chaves):
{
  "titulo": "string",
  "senioridade": "ESTAGIO|JUNIOR|PLENO|SENIOR|ESPECIALISTA|GESTAO|null",
  "modeloTrab": "PRESENCIAL|HIBRIDO|REMOTO|null",
  "local": "string ou null",
  "vlrSalMin": "número ou null",
  "vlrSalMax": "número ou null",
  "requisitos": [{ "descrReq": "string", "tipoReq": "OBRIGATORIO|DESEJAVEL", "knockout": true }],
  "perguntas": [{ "pergunta": "string" }]
}`;

const ESQUEMA_SAIDA = {
  type: 'object',
  required: ['titulo', 'requisitos', 'perguntas'],
  properties: {
    titulo: { type: 'string' },
    senioridade: { type: ['string', 'null'], enum: ['ESTAGIO', 'JUNIOR', 'PLENO', 'SENIOR', 'ESPECIALISTA', 'GESTAO', null] },
    modeloTrab: { type: ['string', 'null'], enum: ['PRESENCIAL', 'HIBRIDO', 'REMOTO', null] },
    local: { type: ['string', 'null'] },
    vlrSalMin: { type: ['number', 'null'] },
    vlrSalMax: { type: ['number', 'null'] },
    requisitos: {
      type: 'array',
      items: {
        type: 'object',
        required: ['descrReq', 'tipoReq', 'knockout'],
        properties: {
          descrReq: { type: 'string' },
          tipoReq: { type: 'string', enum: ['OBRIGATORIO', 'DESEJAVEL'] },
          knockout: { type: 'boolean' },
        },
      },
    },
    perguntas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['pergunta'],
        properties: { pergunta: { type: 'string' } },
      },
    },
  },
} as const;

interface RespostaIa {
  titulo: string;
  senioridade: string | null;
  modeloTrab: string | null;
  local: string | null;
  vlrSalMin: number | null;
  vlrSalMax: number | null;
  requisitos: { descrReq: string; tipoReq: 'OBRIGATORIO' | 'DESEJAVEL'; knockout: boolean }[];
  perguntas: { pergunta: string }[];
}

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) {
      throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    }
    throw erro;
  }
}

type ReqAut = Request & { usuario: UsuarioAutenticado };

@Controller('vagas')
export class IaVagasController {
  /** Estrutura uma descrição bruta de vaga via AI Gateway. Não persiste nada. */
  @Post('estruturar-ia')
  @Permissoes('recrutamento.vagas.criar')
  async estruturar(@Req() req: ReqAut, @Body() corpo: unknown): Promise<RespostaIa> {
    const dados = validar(z.object({ rawText: z.string().min(40).max(12000) }), corpo);
    const baseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

    let resp: Response;
    try {
      resp = await fetch(`${baseUrl}/v1/ia/gerar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          purpose: PURPOSE,
          cod_ten: Number(req.usuario.codTen),
          mensagens: [
            { papel: 'system', conteudo: PROMPT_SISTEMA },
            { papel: 'user', conteudo: dados.rawText },
          ],
          orcamento_tokens: 1200,
          esquema_saida: ESQUEMA_SAIDA,
        }),
        signal: AbortSignal.timeout(90_000),
      });
    } catch {
      throw new ServiceUnavailableException({
        codigo: 'IA_INDISPONIVEL',
        mensagem: 'Serviço de IA não respondeu — preencha manualmente.',
      });
    }

    const json = (await resp.json().catch(() => null)) as { detail?: unknown; conteudo?: unknown } | null;
    if (!resp.ok) {
      // Repassa o estado de primeira classe do gateway (IA_DESABILITADA, SAIDA_INVALIDA...)
      throw new ServiceUnavailableException(json?.detail ?? { codigo: 'IA_ERRO', mensagem: 'Falha ao estruturar vaga com IA.' });
    }
    return json?.conteudo as RespostaIa;
  }
}
