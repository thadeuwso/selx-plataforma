/**
 * Templates de e-mail (RN-SX-001) — versionados em código, como os purposes do
 * AI Gateway. Editáveis por tenant é uma decisão de produto que ainda não foi
 * tomada; enquanto não for, ter um só lugar torna a revisão de texto possível.
 *
 * Todo texto aqui fala com o **candidato**, não com o recrutador. Nada de
 * jargão interno (estágio técnico, score, knockout) e nenhuma promessa sobre o
 * resultado do processo.
 */

export interface DadosTemplate {
  nomeCandidato: string;
  nomeEmpresa: string;
  tituloVaga: string;
  url: string;
  /** Só para a entrevista confirmada. */
  dhEntrevista?: Date;
  tipoEntrevista?: string;
  localEntrevista?: string;
  /** Só para a assinatura: o nome do documento, que não é o título da vaga. */
  nomeDocumento?: string;
  /** Só para a avaliação comportamental: quantas perguntas e o tempo estimado. */
  totalPerguntas?: number;
  tempoMin?: number | null;
  tempoMax?: number | null;
}

export interface MensagemMontada {
  assunto: string;
  texto: string;
  html: string;
}

const rodape =
  'Se você não reconhece esta mensagem, pode ignorá-la — nenhum dado seu será alterado sem que você acesse o link.';

/** HTML deliberadamente simples: cliente de e-mail não é navegador. */
function envelope(titulo: string, paragrafos: string[], url: string, rotuloBotao: string): string {
  const corpo = paragrafos.map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p}</p>`).join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2b2b2b;max-width:560px">
<h1 style="font-size:18px;margin:0 0 16px">${titulo}</h1>
${corpo}
<p style="margin:22px 0">
  <a href="${url}" style="background:#4A2C1A;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;display:inline-block">${rotuloBotao}</a>
</p>
<p style="margin:0 0 6px;font-size:13px;color:#666">Se o botão não funcionar, copie este endereço no navegador:</p>
<p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${url}">${url}</a></p>
<p style="margin:0;font-size:12px;color:#888">${rodape}</p>
</div>`;
}

type Montador = (d: DadosTemplate) => MensagemMontada;

export const TEMPLATES: Record<string, Montador> = {
  /** Link do portal: acompanhar o processo e completar o próprio cadastro. */
  'portal-candidato': (d) => {
    const paragrafos = [
      `Olá, ${d.nomeCandidato}.`,
      `Sua candidatura para <strong>${d.tituloVaga}</strong> na ${d.nomeEmpresa} está em andamento.`,
      'No link abaixo você acompanha em que etapa está, mantém seus dados atualizados, anexa seu currículo e responde um questionário rápido sobre como você gosta de trabalhar.',
      'O link é só seu e continua valendo durante todo o processo — vale guardar.',
    ];
    return {
      assunto: `Sua candidatura — ${d.tituloVaga}`,
      texto: [
        `Olá, ${d.nomeCandidato}.`,
        '',
        `Sua candidatura para ${d.tituloVaga} na ${d.nomeEmpresa} está em andamento.`,
        'No link abaixo você acompanha em que etapa está, mantém seus dados atualizados, anexa seu currículo e responde um questionário rápido sobre como você gosta de trabalhar.',
        '',
        d.url,
        '',
        'O link é só seu e continua valendo durante todo o processo.',
        '',
        rodape,
      ].join('\n'),
      html: envelope('Acompanhe sua candidatura', paragrafos, d.url, 'Abrir meu acompanhamento'),
    };
  },

  /** Convite da avaliação comportamental. */
  'avaliacao-comportamental': (d) => {
    const duracao =
      d.tempoMin && d.tempoMax ? `Leva de ${d.tempoMin} a ${d.tempoMax} minutos.` : 'Leva poucos minutos.';
    const quantas = d.totalPerguntas ? `São ${d.totalPerguntas} afirmações.` : '';
    const paragrafos = [
      `Olá, ${d.nomeCandidato}.`,
      `Como parte do processo para <strong>${d.tituloVaga}</strong> na ${d.nomeEmpresa}, gostaríamos que você respondesse uma avaliação de perfil comportamental.`,
      `${quantas} ${duracao} Não há resposta certa ou errada — responda como você realmente é no trabalho.`,
      'Você pode parar e retomar depois: suas respostas ficam salvas.',
    ];
    return {
      assunto: `Avaliação de perfil — ${d.tituloVaga}`,
      texto: [
        `Olá, ${d.nomeCandidato}.`,
        '',
        `Como parte do processo para ${d.tituloVaga} na ${d.nomeEmpresa}, gostaríamos que você respondesse uma avaliação de perfil comportamental.`,
        `${quantas} ${duracao}`.trim(),
        'Não há resposta certa ou errada — responda como você realmente é no trabalho. Você pode parar e retomar depois.',
        '',
        d.url,
        '',
        rodape,
      ].join('\n'),
      html: envelope('Avaliação de perfil comportamental', paragrafos, d.url, 'Responder avaliação'),
    };
  },

  /** Processo de admissão: o candidato preenche dados e anexa documentos. */
  'processo-admissao': (d) => {
    const paragrafos = [
      `Olá, ${d.nomeCandidato}.`,
      `Boas-vindas! Para dar início à sua admissão na ${d.nomeEmpresa} como <strong>${d.tituloVaga}</strong>, precisamos de alguns dados e documentos seus.`,
      'No link abaixo você preenche as informações e anexa os documentos. Pode fazer em etapas — o que você salvar fica guardado.',
      'Assim que enviar, nossa equipe confere e avisa se faltar algo.',
    ];
    return {
      assunto: `Sua admissão na ${d.nomeEmpresa} — dados e documentos`,
      texto: [
        `Olá, ${d.nomeCandidato}.`,
        '',
        `Boas-vindas! Para dar início à sua admissão na ${d.nomeEmpresa} como ${d.tituloVaga}, precisamos de alguns dados e documentos seus.`,
        'No link abaixo você preenche as informações e anexa os documentos. Pode fazer em etapas — o que você salvar fica guardado.',
        '',
        d.url,
        '',
        rodape,
      ].join('\n'),
      html: envelope('Vamos começar sua admissão', paragrafos, d.url, 'Preencher meus dados'),
    };
  },

  /** Documento aguardando assinatura eletrônica. */
  'documento-assinatura': (d) => {
    const paragrafos = [
      `Olá, ${d.nomeCandidato}.`,
      `A ${d.nomeEmpresa} enviou um documento para a sua assinatura: <strong>${d.nomeDocumento ?? "documento"}</strong>.`,
      'Você consegue ler o documento inteiro antes de assinar. A assinatura é eletrônica e registra data, hora e o conteúdo exato que você leu.',
    ];
    return {
      assunto: `Documento para assinatura — ${d.nomeDocumento ?? d.nomeEmpresa}`,
      texto: [
        `Olá, ${d.nomeCandidato}.`,
        '',
        `A ${d.nomeEmpresa} enviou um documento para a sua assinatura: ${d.nomeDocumento ?? "documento"}.`,
        'Você consegue ler o documento inteiro antes de assinar. A assinatura é eletrônica e registra data, hora e o conteúdo exato que você leu.',
        '',
        d.url,
        '',
        rodape,
      ].join('\n'),
      html: envelope('Documento para assinar', paragrafos, d.url, 'Ler e assinar'),
    };
  },
  /** Grade aberta: o candidato escolhe o horário que preferir. */
  'entrevista-escolher-horario': (d) => {
    const quantos = d.totalPerguntas ? `Há ${d.totalPerguntas} horário(s) disponível(is).` : '';
    const paragrafos = [
      `Olá, ${d.nomeCandidato}.`,
      `Boa notícia: queremos conversar com você sobre a vaga <strong>${d.tituloVaga}</strong> na ${d.nomeEmpresa}.`,
      `${quantos} Escolha no link abaixo o que melhor encaixa na sua agenda — assim ninguém precisa trocar mensagens para acertar a data.`,
    ];
    return {
      assunto: `Escolha o horário da sua entrevista — ${d.tituloVaga}`,
      texto: [
        `Olá, ${d.nomeCandidato}.`,
        '',
        `Queremos conversar com você sobre a vaga ${d.tituloVaga} na ${d.nomeEmpresa}.`,
        `${quantos} Escolha no link abaixo o horário que melhor encaixa na sua agenda.`,
        '',
        d.url,
        '',
        rodape,
      ].join('\n'),
      html: envelope('Escolha o horário da sua entrevista', paragrafos, d.url, 'Escolher horário'),
    };
  },

  /** Entrevista marcada: data, formato e onde. */
  'entrevista-confirmada': (d) => {
    const quando = d.dhEntrevista
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(d.dhEntrevista)
      : 'a combinar';
    const onde =
      d.tipoEntrevista === 'PRESENCIAL'
        ? `Presencial${d.localEntrevista ? `, em ${d.localEntrevista}` : ''}.`
        : d.tipoEntrevista === 'TELEFONE'
          ? 'Por telefone — vamos ligar para você.'
          : 'Por vídeo. O link está no botão abaixo.';
    const paragrafos = [
      `Olá, ${d.nomeCandidato}.`,
      `Sua entrevista para <strong>${d.tituloVaga}</strong> na ${d.nomeEmpresa} está confirmada.`,
      `<strong>Quando:</strong> ${quando}<br><strong>Formato:</strong> ${onde}`,
      'Se algo mudar de última hora, responda esta mensagem — conseguimos remarcar.',
    ];
    return {
      assunto: `Entrevista confirmada — ${d.tituloVaga}`,
      texto: [
        `Olá, ${d.nomeCandidato}.`,
        '',
        `Sua entrevista para ${d.tituloVaga} na ${d.nomeEmpresa} está confirmada.`,
        `Quando: ${quando}`,
        `Formato: ${onde}`,
        '',
        d.url,
        '',
        'Se algo mudar de última hora, responda esta mensagem — conseguimos remarcar.',
        '',
        rodape,
      ].join('\n'),
      html: envelope('Entrevista confirmada', paragrafos, d.url, d.tipoEntrevista === 'VIDEO' ? 'Entrar na reunião' : 'Ver meu processo'),
    };
  },
};

export function montarMensagem(template: string, dados: DadosTemplate): MensagemMontada {
  const montador = TEMPLATES[template];
  if (!montador) throw new Error(`Template de e-mail não registrado: ${template}`);
  return montador(dados);
}
