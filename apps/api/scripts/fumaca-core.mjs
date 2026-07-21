/**
 * Fumaça do módulo Core — exercita a API real de ponta a ponta:
 * cadastro de 2 tenants, login, refresh, RBAC e isolamento multi-tenant VIA API.
 * Pré-requisitos: postgres + migrations + seed aplicados; API rodando.
 * Uso: node scripts/fumaca-core.mjs [urlBase]   (padrão http://localhost:3001)
 */
const base = process.argv[2] ?? "http://localhost:3001";
const rodada = Date.now();
const falhas = [];

function verificar(descricao, cond) {
  console.log(`${cond ? "✅" : "❌"} ${descricao}`);
  if (!cond) falhas.push(descricao);
}

async function http(metodo, rota, corpo, token) {
  const res = await fetch(`${base}${rota}`, {
    method: metodo,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

// 0. Saúde
const saude = await http("GET", "/health");
verificar("GET /health responde ok", saude.status === 200 && saude.json?.ok === true);

// 1. Cadastro de dois tenants
const cadA = await http("POST", "/auth/cadastro", {
  nomeGrupo: `Grupo A ${rodada}`,
  nomeFantasia: "Alfa Matriz",
  razaoSocial: "Alfa LTDA",
  nomeUsu: "Admin A",
  email: `admin.a.${rodada}@teste.selx`,
  senha: "SenhaForte@123",
});
verificar("cadastro do tenant A (201)", cadA.status === 201 && !!cadA.json?.codTen);

const cadB = await http("POST", "/auth/cadastro", {
  nomeGrupo: `Grupo B ${rodada}`,
  nomeFantasia: "Beta Matriz",
  razaoSocial: "Beta LTDA",
  nomeUsu: "Admin B",
  email: `admin.b.${rodada}@teste.selx`,
  senha: "SenhaForte@123",
});
verificar("cadastro do tenant B (201)", cadB.status === 201);

// 2. Validação de entrada
const cadInvalido = await http("POST", "/auth/cadastro", { email: "não-é-email" });
verificar("cadastro inválido é rejeitado (400)", cadInvalido.status === 400);

// 3. Login
const loginA = await http("POST", "/auth/login", {
  email: `admin.a.${rodada}@teste.selx`,
  senha: "SenhaForte@123",
});
verificar("login A devolve access+refresh", !!loginA.json?.accessToken && !!loginA.json?.refreshToken);
const tokenA = loginA.json?.accessToken;

const loginErrado = await http("POST", "/auth/login", {
  email: `admin.a.${rodada}@teste.selx`,
  senha: "senha-errada",
});
verificar("senha errada → 401", loginErrado.status === 401);

const loginB = await http("POST", "/auth/login", {
  email: `admin.b.${rodada}@teste.selx`,
  senha: "SenhaForte@123",
});
const tokenB = loginB.json?.accessToken;

// 4. /auth/eu e proteção
const eu = await http("GET", "/auth/eu", null, tokenA);
verificar("GET /auth/eu identifica o usuário", eu.status === 200 && eu.json?.nome === "Admin A");
verificar("permissões vieram no token", Array.isArray(eu.json?.permissoes) && eu.json.permissoes.length >= 5);

const semToken = await http("GET", "/empresas");
verificar("rota protegida sem token → 401", semToken.status === 401);

// 5. Refresh: rotaciona e o novo access funciona
const refresh = await http("POST", "/auth/atualizar", { refreshToken: loginA.json?.refreshToken });
verificar("refresh emite novo par de tokens", !!refresh.json?.accessToken);
const euNovo = await http("GET", "/auth/eu", null, refresh.json?.accessToken);
verificar("novo access token é aceito", euNovo.status === 200);

const refreshComAccess = await http("POST", "/auth/atualizar", { refreshToken: tokenA });
verificar("access token não serve como refresh → 401", refreshComAccess.status === 401);

// 5b. Rotação de verdade: o refresh antigo morre ao ser usado
const reuso = await http("POST", "/auth/atualizar", { refreshToken: loginA.json?.refreshToken });
verificar("reuso de refresh já rotacionado → 401", reuso.status === 401);

// 5c. Logout revoga a sessão no servidor
const logout = await http("POST", "/auth/sair", { refreshToken: refresh.json?.refreshToken });
verificar("logout responde ok", logout.status === 201 && logout.json?.ok === true);
const aposLogout = await http("POST", "/auth/atualizar", { refreshToken: refresh.json?.refreshToken });
verificar("refresh após logout → 401 (revogação server-side)", aposLogout.status === 401);

// Re-login para seguir os cenários de empresas com sessão válida
const reLoginA = await http("POST", "/auth/login", {
  email: `admin.a.${rodada}@teste.selx`,
  senha: "SenhaForte@123",
});
const tokenA2 = reLoginA.json?.accessToken;

// 6. Empresas: criar filial e listar
const filial = await http(
  "POST",
  "/empresas",
  {
    nomeFantasia: "Alfa Filial SP",
    razaoSocial: "Alfa Filial SP LTDA",
    codEmpMatriz: cadA.json?.codEmp,
  },
  tokenA2,
);
verificar("tenant A cria filial (201)", filial.status === 201 && !!filial.json?.codEmp);

const listaA = await http("GET", "/empresas", null, tokenA2);
verificar("tenant A lista 2 empresas (matriz+filial)", listaA.status === 200 && listaA.json?.length === 2);

// 7. Isolamento multi-tenant VIA API
const listaB = await http("GET", "/empresas", null, tokenB);
verificar(
  "tenant B lista apenas a própria empresa (isolamento)",
  listaB.status === 200 && listaB.json?.length === 1 && listaB.json[0].nomeFantasia === "Beta Matriz",
);

const filialInvasora = await http(
  "POST",
  "/empresas",
  {
    nomeFantasia: "Invasora",
    razaoSocial: "Invasora LTDA",
    codEmpMatriz: cadA.json?.codEmp, // matriz do tenant A com token do tenant B
  },
  tokenB,
);
verificar("tenant B não enxerga matriz do tenant A → 400", filialInvasora.status === 400);

// 8. Papéis e usuários com RBAC restrito
const papel = await http(
  "POST",
  "/papeis",
  { nomePap: "Somente Leitura", permissoes: ["core.empresas.ler"] },
  tokenA2,
);
verificar("cria papel restrito (201)", papel.status === 201 && !!papel.json?.codPap);

const novoUsu = await http(
  "POST",
  "/usuarios",
  {
    nomeUsu: "Leitor",
    email: `leitor.${rodada}@teste.selx`,
    senha: "SenhaForte@123",
    papeis: [papel.json?.codPap],
  },
  tokenA2,
);
verificar("cria usuário com papel restrito (201)", novoUsu.status === 201);

const loginLeitor = await http("POST", "/auth/login", {
  email: `leitor.${rodada}@teste.selx`,
  senha: "SenhaForte@123",
});
const tokenLeitor = loginLeitor.json?.accessToken;
verificar("usuário restrito loga", !!tokenLeitor);

const leitorLista = await http("GET", "/empresas", null, tokenLeitor);
verificar("usuário restrito LÊ empresas (200)", leitorLista.status === 200);

const leitorCria = await http(
  "POST",
  "/empresas",
  { nomeFantasia: "Não Pode", razaoSocial: "Não Pode LTDA" },
  tokenLeitor,
);
verificar("usuário restrito NÃO cria empresa → 403", leitorCria.status === 403);

const listaUsu = await http("GET", "/usuarios", null, tokenA2);
verificar("admin lista usuários do tenant (2)", listaUsu.status === 200 && listaUsu.json?.length === 2);

// 9. Troca de senha revoga sessões
const trocaErrada = await http(
  "PATCH",
  "/auth/senha",
  { senhaAtual: "errada", senhaNova: "OutraSenha@123" },
  tokenLeitor,
);
verificar("troca de senha com atual errada → 401", trocaErrada.status === 401);

const troca = await http(
  "PATCH",
  "/auth/senha",
  { senhaAtual: "SenhaForte@123", senhaNova: "NovaSenha@456" },
  tokenLeitor,
);
verificar("troca de senha ok", troca.status === 200 && troca.json?.ok === true);

const refreshPosTroca = await http("POST", "/auth/atualizar", {
  refreshToken: loginLeitor.json?.refreshToken,
});
verificar("sessões revogadas após troca de senha → 401", refreshPosTroca.status === 401);

const loginNovaSenha = await http("POST", "/auth/login", {
  email: `leitor.${rodada}@teste.selx`,
  senha: "NovaSenha@456",
});
verificar("login com a senha nova funciona", !!loginNovaSenha.json?.accessToken);

// 10. Funcionários, cargos e departamentos
const cargo = await http("POST", "/cargos", { nomeCar: "Analista de RH" }, tokenA2);
verificar("cria cargo (201)", cargo.status === 201);

const depPai = await http("POST", "/departamentos", { descrDep: "Recursos Humanos" }, tokenA2);
verificar("cria departamento raiz (grau 1)", depPai.status === 201 && depPai.json?.grau === 1);

const depFilho = await http(
  "POST",
  "/departamentos",
  { descrDep: "Recrutamento", codDepPai: depPai.json?.codDep },
  tokenA2,
);
verificar("departamento filho herda hierarquia (grau 2)", depFilho.status === 201 && depFilho.json?.grau === 2);

const fun = await http(
  "POST",
  "/funcionarios",
  {
    codEmp: cadA.json?.codEmp,
    numCad: 1001,
    nomeFun: "Maria Silva",
    dtAdm: "2026-07-01",
    codCar: cargo.json?.codCar,
    codDep: depFilho.json?.codDep,
    vlrSal: 4500.5,
  },
  tokenA2,
);
verificar("admissão de funcionário (201)", fun.status === 201 && !!fun.json?.codFun);

const funDup = await http(
  "POST",
  "/funcionarios",
  { codEmp: cadA.json?.codEmp, numCad: 1001, nomeFun: "Duplicada", dtAdm: "2026-07-01" },
  tokenA2,
);
verificar("NUMCAD duplicado na mesma empresa é rejeitado", funDup.status >= 400);

const hist = await http("GET", `/funcionarios/${fun.json?.codFun}/historico`, null, tokenA2);
verificar("histórico registra ADMISSAO", hist.status === 200 && hist.json?.[0]?.tipoMud === "ADMISSAO");

const funB = await http("GET", "/funcionarios", null, tokenB);
verificar("tenant B não vê funcionários do A (isolamento)", funB.status === 200 && funB.json?.length === 0);

// 11. Projetos, contratos de serviço e dependentes
const proj = await http("POST", "/projetos", { identificacao: "Implantação SelX", abreviatura: "IMPSELX", dtInicio: "2026-07-01", vlrOrcado: 150000 }, tokenA2);
verificar("cria projeto (201)", proj.status === 201 && proj.json?.grau === 1);

const projFilho = await http("POST", "/projetos", { identificacao: "Fase 1", abreviatura: "IMPF1", codProjPai: proj.json?.codProj }, tokenA2);
verificar("projeto filho herda hierarquia (grau 2)", projFilho.status === 201 && projFilho.json?.grau === 2);

const contr = await http("POST", "/contratos-servico", { descrContrato: "Contrato Cliente X", numContrato: "CT-001", codProj: proj.json?.codProj, vlrHora: 180, tipo: "M" }, tokenA2);
verificar("cria contrato vinculado a projeto (201)", contr.status === 201);

const contrRuim = await http("POST", "/contratos-servico", { descrContrato: "Órfão", codProj: 999999 }, tokenA2);
verificar("contrato com projeto inexistente → 400", contrRuim.status === 400);

const dep = await http("POST", `/funcionarios/${fun.json?.codFun}/dependentes`, { nomeDpd: "João Silva", tipoDpd: "FILHO", dtNasc: "2015-03-10" }, tokenA2);
verificar("cria dependente (201)", dep.status === 201);

const deps = await http("GET", `/funcionarios/${fun.json?.codFun}/dependentes`, null, tokenA2);
verificar("lista dependentes (1)", deps.status === 200 && deps.json?.length === 1);

const projB = await http("GET", "/projetos", null, tokenB);
verificar("tenant B não vê projetos do A", projB.status === 200 && projB.json?.length === 0);

// 12. Recrutamento: vagas com ciclo de aprovação
const vaga = await http(
  "POST",
  "/vagas",
  {
    codEmp: cadA.json?.codEmp,
    titulo: "Analista de Benefícios Pleno",
    senioridade: "PLENO",
    modeloTrab: "HIBRIDO",
    vlrSalMin: 4000,
    vlrSalMax: 6000,
    codCar: cargo.json?.codCar,
    codDep: depFilho.json?.codDep,
    requisitos: [
      { descrReq: "Experiência com Sankhya", tipoReq: "OBRIGATORIO", knockout: "S" },
      { descrReq: "Inglês intermediário", tipoReq: "DESEJAVEL" },
    ],
    perguntas: [
      { pergunta: "Possui CNH categoria B?", respElimina: "Não" },
    ],
  },
  tokenA2,
);
verificar("cria vaga em RASCUNHO (201)", vaga.status === 201 && vaga.json?.status === "RASCUNHO");

const aprovarCedo = await http("PATCH", `/vagas/${vaga.json?.codVag}/status`, { acao: "aprovar" }, tokenA2);
verificar("aprovar RASCUNHO é transição inválida → 400", aprovarCedo.status === 400);

const enviar = await http("PATCH", `/vagas/${vaga.json?.codVag}/status`, { acao: "enviar_aprovacao" }, tokenA2);
verificar("envia para aprovação", enviar.status === 200 && enviar.json?.status === "EM_APROVACAO");

const aprovar = await http("PATCH", `/vagas/${vaga.json?.codVag}/status`, { acao: "aprovar", observacao: "ok" }, tokenA2);
verificar("aprova → ABERTA", aprovar.status === 200 && aprovar.json?.status === "ABERTA");

const detalhe = await http("GET", `/vagas/${vaga.json?.codVag}`, null, tokenA2);
verificar(
  "detalhe traz requisitos tipados e knockout",
  detalhe.status === 200 && detalhe.json?.requisitos?.length === 2 && detalhe.json.requisitos[0].knockout === "S",
);
verificar(
  "detalhe traz pergunta de triagem persistida",
  detalhe.json?.perguntas?.length === 1 && detalhe.json.perguntas[0].respElimina === "Não",
);
const codVagPer = detalhe.json?.perguntas?.[0]?.codVagPer;

const vagasB = await http("GET", "/vagas", null, tokenB);
verificar("tenant B não vê vagas do A (isolamento)", vagasB.status === 200 && vagasB.json?.length === 0);

// 13. Captação multi-canal: canais, dedup, idempotência, pipeline e timeline
const canal = await http("POST", "/canais", { nomeCanal: "Catho", tipoCanal: "importacao", vlrCustoMes: 890 }, tokenA2);
verificar("cria canal de captação (201)", canal.status === 201);

const cand1 = await http("POST", "/candidatos", { nomeCand: "Ana Souza", email: `ana.${rodada}@mail.com`, cidade: "Uberlândia" }, tokenA2);
verificar("cadastra candidato (201)", cand1.status === 201 && cand1.json?.deduplicado === false);

const cand2 = await http("POST", "/candidatos", { nomeCand: "Ana S. Atualizada", email: `ana.${rodada}@mail.com`, fone: "34 99999-0000" }, tokenA2);
verificar("mesmo e-mail → DEDUP (mesmo codCand)", cand2.status === 201 && cand2.json?.deduplicado === true && cand2.json?.codCand === cand1.json?.codCand);

const cdt = await http("POST", `/vagas/${vaga.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Ana S. Atualizada", email: `ana.${rodada}@mail.com` },
  codCanal: canal.json?.codCanal,
  idExterno: `catho-${rodada}`,
}, tokenA2);
verificar("candidatura em vaga ABERTA (201)", cdt.status === 201 && cdt.json?.estagio === "applied");

const cdtRepetida = await http("POST", `/vagas/${vaga.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Ana", email: `ana.${rodada}@mail.com` },
  codCanal: canal.json?.codCanal,
  idExterno: `catho-${rodada}`,
}, tokenA2);
verificar("reenvio mesmo canal+idExterno → idempotente", cdtRepetida.json?.idempotente === true && cdtRepetida.json?.codCdt === cdt.json?.codCdt);

const mover = await http("PATCH", `/candidaturas/${cdt.json?.codCdt}/estagio`, { estagio: "screening", nota: "Currículo aderente" }, tokenA2);
verificar("move estágio applied → screening", mover.status === 200 && mover.json?.estagio === "screening");

const tl = await http("GET", `/candidaturas/${cdt.json?.codCdt}/timeline`, null, tokenA2);
verificar("timeline registra recebimento + mudança de estágio", tl.status === 200 && tl.json?.length >= 2 && tl.json.at(-1)?.tipoEvento === "mudanca_estagio");

// 13b. RN-REC-004: sinalização automática de knockout (não move estágio — decisão é do recrutador, como no 1.0)
const cdtSemRisco = await http("POST", `/vagas/${vaga.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Bruno Lima", email: `bruno.${rodada}@mail.com` },
  codCanal: canal.json?.codCanal,
  respostas: { [codVagPer]: "Sim" },
}, tokenA2);
verificar("resposta não eliminatória → sem sinalização", cdtSemRisco.status === 201 && cdtSemRisco.json?.sinalizadoKnockout === false);

const cdtComRisco = await http("POST", `/vagas/${vaga.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Carla Mendes", email: `carla.${rodada}@mail.com` },
  codCanal: canal.json?.codCanal,
  respostas: { [codVagPer]: "Não" },
}, tokenA2);
verificar("resposta eliminatória → sinalizada (201)", cdtComRisco.status === 201 && cdtComRisco.json?.sinalizadoKnockout === true);

const pipelineComSinal = await http("GET", `/vagas/${vaga.json?.codVag}/candidaturas`, null, tokenA2);
const candidaturaSinalizada = pipelineComSinal.json?.itens?.find((c) => c.codCdt === cdtComRisco.json?.codCdt);
verificar(
  "sinalizada continua em applied (não elimina de verdade) e mostra a pergunta",
  candidaturaSinalizada?.estagio === "applied" && candidaturaSinalizada?.knockoutJson?.pergunta === "Possui CNH categoria B?",
);

const tlSinal = await http("GET", `/candidaturas/${cdtComRisco.json?.codCdt}/timeline`, null, tokenA2);
verificar(
  "timeline registra sinalização automática, ator sistema",
  tlSinal.json?.some((e) => e.tipoEvento === "sinalizacao_knockout" && e.tipoAtor === "sistema"),
);

// 14. Currículo: upload, extração de texto e prefill de contato (heurística, sem IA)
const candDiana = await http("POST", "/candidatos", { nomeCand: "Diana Rocha", email: `diana.${rodada}@mail.com` }, tokenA2);
verificar("cadastra candidato p/ teste de currículo (201)", candDiana.status === 201);

const textoCv = `Diana Rocha\nEmail: diana.${rodada}@mail.com\nTelefone: (31) 98877-6655\n\nExperiencia\nAnalista - Empresa Y - 2019-2024\n`;
const form = new FormData();
form.set("arquivo", new Blob([textoCv], { type: "text/plain" }), "cv-diana.txt");
const uploadRes = await fetch(`${base}/candidatos/${candDiana.json?.codCand}/curriculo`, {
  method: "POST",
  headers: { authorization: `Bearer ${tokenA2}` },
  body: form,
});
const uploadJson = await uploadRes.json().catch(() => null);
verificar("upload de currículo extrai texto (201)", uploadRes.status === 201 && uploadJson?.statusExtracao === "ok");

const candidatosLista = await http("GET", "/candidatos", null, tokenA2);
const diana = candidatosLista.json?.find((c) => c.codCand === candDiana.json?.codCand);
verificar("telefone prefill a partir do currículo (heurística)", diana?.fone === "(31) 98877-6655");

const curriculosLista = await http("GET", `/candidatos/${candDiana.json?.codCand}/curriculo`, null, tokenA2);
verificar("lista currículos do candidato (1)", curriculosLista.status === 200 && curriculosLista.json?.length === 1);

const codCandCvDiana = curriculosLista.json?.[0]?.codCandCv;
const arquivoRes = await fetch(`${base}/candidatos/${candDiana.json?.codCand}/curriculo/${codCandCvDiana}/arquivo`, {
  headers: { authorization: `Bearer ${tokenA2}` },
});
const arquivoTexto = await arquivoRes.text().catch(() => "");
verificar(
  "baixa o arquivo original do currículo (mesmo conteúdo enviado)",
  arquivoRes.status === 200 && arquivoRes.headers.get("content-type")?.includes("text/plain") && arquivoTexto.includes("Diana Rocha"),
);
const arquivoResB = await fetch(`${base}/candidatos/${candDiana.json?.codCand}/curriculo/${codCandCvDiana}/arquivo`, {
  headers: { authorization: `Bearer ${tokenB}` },
});
verificar("tenant B não baixa currículo do candidato do tenant A → 400", arquivoResB.status === 400);

// 15. RN-REC-007: hired -> proposta de admissão -> confirmar-admissão no Core
const cdtAdm = await http("POST", `/vagas/${vaga.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Diana Rocha", email: `diana.${rodada}@mail.com` },
  codCanal: canal.json?.codCanal,
}, tokenA2);
verificar("candidatura para admissão (201)", cdtAdm.status === 201);

const propostaCedo = await http("GET", `/candidaturas/${cdtAdm.json?.codCdt}/proposta-admissao`, null, tokenA2);
verificar("proposta antes de hired → 400", propostaCedo.status === 400);

const moverHired = await http("PATCH", `/candidaturas/${cdtAdm.json?.codCdt}/estagio`, { estagio: "hired" }, tokenA2);
verificar("move estágio para hired", moverHired.status === 200 && moverHired.json?.estagio === "hired");

const proposta = await http("GET", `/candidaturas/${cdtAdm.json?.codCdt}/proposta-admissao`, null, tokenA2);
verificar(
  "proposta de admissão pré-preenchida (nome, empresa, tipo contrato)",
  proposta.status === 200 && proposta.json?.nomeFun === "Diana Rocha" && proposta.json?.tipoContrato === "CLT",
);

const confirmar = await http("POST", `/candidaturas/${cdtAdm.json?.codCdt}/confirmar-admissao`, {
  numCad: 9500 + (rodada % 400),
  dtAdm: "2026-08-01",
  vlrSal: 5000,
}, tokenA2);
verificar("confirma admissão cria funcionário (201/200)", confirmar.status < 300 && !!confirmar.json?.codFun);

const confirmarDeNovo = await http("POST", `/candidaturas/${cdtAdm.json?.codCdt}/confirmar-admissao`, {
  numCad: 9999,
  dtAdm: "2026-08-01",
}, tokenA2);
verificar("segunda confirmação bloqueada (já admitido) → 400", confirmarDeNovo.status === 400);

const timelineAdm = await http("GET", `/candidaturas/${cdtAdm.json?.codCdt}/timeline`, null, tokenA2);
verificar(
  "timeline registra admissao_confirmada",
  timelineAdm.json?.some((e) => e.tipoEvento === "admissao_confirmada"),
);

// 16. Assinatura eletrônica própria (v1, sem fornecedor externo — Thadeu, 2026-07-14)
const funAssin = await http("POST", "/funcionarios", {
  codEmp: cadA.json?.codEmp, numCad: 5001, nomeFun: "Assinante Teste", cgc: "98765432100",
  dtAdm: "2026-08-01", tipoContrato: "CLT", vlrSal: 4500,
}, tokenA2);
verificar("cria funcionário p/ teste de assinatura (201)", funAssin.status === 201);

const modeloDoc = await http("POST", "/documentos-modelo", {
  nomeDoc: "Contrato de Experiência",
  conteudoModelo: "Eu, {{nomeFun}}, CPF {{cgc}}, admitido pela {{nomeEmpresa}} em {{dtAdm}}, regime {{tipoContrato}}.",
}, tokenA2);
verificar("cria modelo de documento (201)", modeloDoc.status === 201);

const envioAssin = await http("POST", `/funcionarios/${funAssin.json?.codFun}/assinaturas`, { codDoc: modeloDoc.json?.codDoc }, tokenA2);
verificar("envia documento p/ assinatura, gera token (201)", envioAssin.status === 201 && !!envioAssin.json?.tokenPub);

const consultaPub = await http("GET", `/assinaturas/publico/${envioAssin.json?.tokenPub}`);
verificar(
  "consulta pública (SEM login) mostra conteúdo renderizado",
  consultaPub.status === 200 && consultaPub.json?.conteudoRenderizado?.includes("Assinante Teste") && !consultaPub.json.conteudoRenderizado.includes("{{"),
);

const assinarPub = await http("POST", `/assinaturas/publico/${envioAssin.json?.tokenPub}/assinar`, {});
verificar("assina publicamente (sem login)", assinarPub.status === 201 && assinarPub.json?.status === "ASSINADO");

const assinarPubDeNovo = await http("POST", `/assinaturas/publico/${envioAssin.json?.tokenPub}/assinar`, {});
verificar("reassinar já assinado → 400", assinarPubDeNovo.status === 400);

const tokenInvalido = await http("GET", "/assinaturas/publico/token-inexistente-xyz");
verificar("token inválido → 400", tokenInvalido.status === 400);

// 17. Processo de Admissão completo (fluxo real vlow — Thadeu, 2026-07-14)
const candCarlos = await http("POST", "/candidatos", { nomeCand: "Carlos Almeida", email: `carlos.${rodada}@mail.com` }, tokenA2);
verificar("cadastra candidato p/ teste de processo de admissão (201)", candCarlos.status === 201);

const cdtProc = await http("POST", `/vagas/${vaga.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Carlos Almeida", email: `carlos.${rodada}@mail.com` },
  codCanal: canal.json?.codCanal,
}, tokenA2);
verificar("candidatura p/ processo de admissão (201)", cdtProc.status === 201);

const iniciarCedo = await http("POST", `/candidaturas/${cdtProc.json?.codCdt}/admissao/iniciar`, {}, tokenA2);
verificar("iniciar admissão antes de hired → 400", iniciarCedo.status === 400);

const moverProcHired = await http("PATCH", `/candidaturas/${cdtProc.json?.codCdt}/estagio`, { estagio: "hired" }, tokenA2);
verificar("move candidatura de admissão p/ hired", moverProcHired.status === 200 && moverProcHired.json?.estagio === "hired");

const iniciar = await http("POST", `/candidaturas/${cdtProc.json?.codCdt}/admissao/iniciar`, {}, tokenA2);
verificar("inicia processo de admissão, gera token público (201)", iniciar.status === 201 && !!iniciar.json?.tokenPub && iniciar.json?.status === "AGUARDANDO_CANDIDATO");
const tokenAdm = iniciar.json?.tokenPub;

const iniciarDeNovo = await http("POST", `/candidaturas/${cdtProc.json?.codCdt}/admissao/iniciar`, {}, tokenA2);
verificar("reiniciar é idempotente (mesmo processo)", iniciarDeNovo.json?.codAdmProc === iniciar.json?.codAdmProc);

const detalheRh = await http("GET", `/candidaturas/${cdtProc.json?.codCdt}/admissao`, null, tokenA2);
verificar("RH vê detalhe do processo", detalheRh.status === 200 && detalheRh.json?.status === "AGUARDANDO_CANDIDATO");

const consultaAdmInvalida = await http("GET", "/admissao/publico/token-inexistente-xyz");
verificar("token de admissão inválido → 400", consultaAdmInvalida.status === 400);

const consultaAdmPub = await http("GET", `/admissao/publico/${tokenAdm}`);
verificar(
  "candidato consulta processo publicamente (sem login)",
  consultaAdmPub.status === 200 && consultaAdmPub.json?.candidatura?.candidato?.nomeCand === "Carlos Almeida",
);

const dados1 = await http("POST", `/admissao/publico/${tokenAdm}/dados`, { endereco: "Rua das Flores, 100" });
verificar("candidato preenche dados complementares (parte 1)", dados1.status === 201);

const dados2 = await http("POST", `/admissao/publico/${tokenAdm}/dados`, { banco: "Itaú", agencia: "0001" });
verificar("candidato preenche dados complementares (parte 2, faz merge)", dados2.status === 201);

const consultaAposDados = await http("GET", `/admissao/publico/${tokenAdm}`);
verificar(
  "dados complementares acumulam (merge), não sobrescrevem",
  consultaAposDados.json?.dadosComplementaresJson?.endereco === "Rua das Flores, 100" &&
    consultaAposDados.json?.dadosComplementaresJson?.banco === "Itaú",
);

const formRg = new FormData();
formRg.set("categoria", "RG");
formRg.set("arquivo", new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xdb])], { type: "image/jpeg" }), "rg-frente.jpg");
const uploadRgRes = await fetch(`${base}/admissao/publico/${tokenAdm}/anexos`, { method: "POST", body: formRg });
const uploadRgJson = await uploadRgRes.json().catch(() => null);
verificar("candidato anexa foto do RG (201)", uploadRgRes.status === 201 && uploadRgJson?.categoria === "RG");

const formInvalido = new FormData();
formInvalido.set("categoria", "CPF");
formInvalido.set("arquivo", new Blob(["texto puro"], { type: "text/plain" }), "cpf.txt");
const uploadInvalidoRes = await fetch(`${base}/admissao/publico/${tokenAdm}/anexos`, { method: "POST", body: formInvalido });
verificar("anexo em formato não suportado → 400", uploadInvalidoRes.status === 400);

const consultaAposAnexo = await http("GET", `/admissao/publico/${tokenAdm}`);
verificar("anexo aparece na consulta pública (1 anexo)", consultaAposAnexo.json?.anexos?.length === 1);

const enviarCandidato = await http("POST", `/admissao/publico/${tokenAdm}/enviar`, {});
verificar("candidato envia p/ aprovação do DP", enviarCandidato.status === 201 && enviarCandidato.json?.status === "AGUARDANDO_APROVACAO_DP");

const dadosAposEnvio = await http("POST", `/admissao/publico/${tokenAdm}/dados`, { extra: "não deveria entrar" });
verificar("editar dados após envio → 400 (aguardando DP)", dadosAposEnvio.status === 400);

const ajustes = await http("POST", `/candidaturas/${cdtProc.json?.codCdt}/admissao/solicitar-ajustes`, {
  obsAjuste: "Falta comprovante de residência legível",
}, tokenA2);
verificar("DP solicita ajustes (201)", ajustes.status === 201 && ajustes.json?.status === "AJUSTES_SOLICITADOS");

const consultaAposAjuste = await http("GET", `/admissao/publico/${tokenAdm}`);
verificar(
  "candidato vê observação de ajuste",
  consultaAposAjuste.json?.status === "AJUSTES_SOLICITADOS" && consultaAposAjuste.json?.obsAjuste?.includes("comprovante"),
);

const dadosAposAjuste = await http("POST", `/admissao/publico/${tokenAdm}/dados`, { comprovanteReenviado: true });
verificar("candidato pode editar dados de novo após ajuste solicitado", dadosAposAjuste.status === 201);

const reenviar = await http("POST", `/admissao/publico/${tokenAdm}/enviar`, {});
verificar("candidato reenvia após ajuste", reenviar.status === 201 && reenviar.json?.status === "AGUARDANDO_APROVACAO_DP");

const aprovarSemContrato = await http("POST", `/candidaturas/${cdtProc.json?.codCdt}/admissao/aprovar`, {
  numCad: 20000 + (rodada % 400),
  dtAdm: "2026-09-01",
  vlrSal: 4800,
}, tokenA2);
verificar("aprovar sem codDocContrato → 400", aprovarSemContrato.status === 400);

const modeloContrato = await http("POST", "/documentos-modelo", {
  nomeDoc: "Contrato de Trabalho Padrão",
  conteudoModelo: "Contrato de {{nomeFun}}, CPF {{cgc}}, admitido em {{dtAdm}}.",
}, tokenA2);
verificar("cria modelo de contrato p/ admissão (201)", modeloContrato.status === 201);

const modeloTermoLgpd = await http("POST", "/documentos-modelo", {
  nomeDoc: "Termo de Consentimento LGPD",
  conteudoModelo: "Eu, {{nomeFun}}, autorizo o tratamento dos meus dados pessoais.",
}, tokenA2);
verificar("cria modelo do kit admissional (201)", modeloTermoLgpd.status === 201);

const kit = await http("POST", "/kits-admissionais", {
  nomeKit: "Kit Admissional Padrão",
  codDocumentos: [modeloTermoLgpd.json?.codDoc],
}, tokenA2);
verificar("cria kit admissional (201)", kit.status === 201 && !!kit.json?.codKit);

const aprovarAdmissao = await http("POST", `/candidaturas/${cdtProc.json?.codCdt}/admissao/aprovar`, {
  numCad: 20000 + (rodada % 400),
  dtAdm: "2026-09-01",
  vlrSal: 4800,
  codDocContrato: modeloContrato.json?.codDoc,
  codKit: kit.json?.codKit,
}, tokenA2);
verificar(
  "DP aprova: cria funcionário + dispara contrato + kit p/ assinatura (201)",
  aprovarAdmissao.status === 201 && !!aprovarAdmissao.json?.codFun && aprovarAdmissao.json?.assinaturas?.length === 2,
);

const aprovarDeNovo = await http("POST", `/candidaturas/${cdtProc.json?.codCdt}/admissao/aprovar`, {
  numCad: 9999, dtAdm: "2026-09-01", codDocContrato: modeloContrato.json?.codDoc,
}, tokenA2);
verificar("segunda aprovação bloqueada (já aprovado) → 400", aprovarDeNovo.status === 400);

const assinaturasGeradas = await http("GET", `/funcionarios/${aprovarAdmissao.json?.codFun}/assinaturas`, null, tokenA2);
verificar(
  "funcionário recém-admitido tem 2 assinaturas pendentes (contrato + kit)",
  assinaturasGeradas.status === 200 && assinaturasGeradas.json?.length === 2 && assinaturasGeradas.json.every((a) => a.status === "PENDENTE"),
);

// 18. Listagens tenant-wide p/ o dashboard (GET /admissoes, GET /assinaturas)
const admissoesLista = await http("GET", "/admissoes", null, tokenA2);
verificar(
  "GET /admissoes responde 200 com array e enxerga o processo criado",
  admissoesLista.status === 200 && Array.isArray(admissoesLista.json) && admissoesLista.json.some((p) => p.codCdt === cdtProc.json?.codCdt),
);

const admissoesListaB = await http("GET", "/admissoes", null, tokenB);
verificar(
  "GET /admissoes isola por tenant (B não vê processo do A)",
  admissoesListaB.status === 200 && !admissoesListaB.json?.some((p) => p.codCdt === cdtProc.json?.codCdt),
);

const assinaturasLista = await http("GET", "/assinaturas", null, tokenA2);
verificar(
  "GET /assinaturas responde 200 com array e enxerga as assinaturas geradas",
  assinaturasLista.status === 200 && Array.isArray(assinaturasLista.json) && assinaturasLista.json.some((a) => a.codAssin === aprovarAdmissao.json?.assinaturas?.[0]?.codAssin),
);

const assinaturasListaB = await http("GET", "/assinaturas", null, tokenB);
verificar(
  "GET /assinaturas isola por tenant (B não vê assinaturas do A)",
  assinaturasListaB.status === 200 && !assinaturasListaB.json?.some((a) => a.codAssin === aprovarAdmissao.json?.assinaturas?.[0]?.codAssin),
);

// 19. Pipeline expõe codFun/processoAdmissao (botão "Iniciar Admissão" no kanban)
const pipelineComAdmissao = await http("GET", `/vagas/${vaga.json?.codVag}/candidaturas`, null, tokenA2);
const cdtNoPipeline = pipelineComAdmissao.json?.itens?.find((c) => c.codCdt === cdtProc.json?.codCdt);
verificar(
  "pipeline mostra codFun após aprovação (candidatura já admitida)",
  pipelineComAdmissao.status === 200 && cdtNoPipeline?.codFun === aprovarAdmissao.json?.codFun,
);

// 20. RN-REC-006: match determinístico (sem IA — porte fiel do SelX 1.0)
const vagaMatch = await http("POST", "/vagas", {
  codEmp: cadA.json?.codEmp,
  titulo: "Engenheiro de Dados Sênior",
  requisitos: [
    { descrReq: "SQL avançado", tipoReq: "OBRIGATORIO", peso: 8, nivelEsperado: 4, tempoEspMeses: 24 },
    { descrReq: "Terraform", tipoReq: "DESEJAVEL", peso: 3, nivelEsperado: 2 },
  ],
  perfilCulturalIdeal: { autonomy: 4, pace: 3, collaboration: 5, structure: 3, dataDriven: 4, directCommunication: 5 },
}, tokenA2);
verificar("cria vaga p/ teste de match (201)", vagaMatch.status === 201);
await http("PATCH", `/vagas/${vagaMatch.json?.codVag}/status`, { acao: "enviar_aprovacao" }, tokenA2);
await http("PATCH", `/vagas/${vagaMatch.json?.codVag}/status`, { acao: "aprovar" }, tokenA2);

const detalheMatch = await http("GET", `/vagas/${vagaMatch.json?.codVag}`, null, tokenA2);
verificar(
  "requisitos trazem peso/nível/tempo persistidos",
  detalheMatch.json?.requisitos?.[0]?.peso === 8 && detalheMatch.json.requisitos[0].nivelEsperado === 4,
);
const [reqObrigatorio, reqDesejavel] = detalheMatch.json?.requisitos ?? [];

const canalMatch = await http("POST", "/canais", { nomeCanal: "LinkedIn Match" }, tokenA2);

// Candidata forte: nível/tempo/evidência batendo com o esperado + perfil cultural idêntico ao ideal
const cdtForte = await http("POST", `/vagas/${vagaMatch.json?.codVag}/candidaturas`, {
  candidato: {
    nomeCand: "Beatriz Forte", email: `beatriz.${rodada}@mail.com`,
    perfilCultural: { autonomy: 4, pace: 3, collaboration: 5, structure: 3, dataDriven: 4, directCommunication: 5 },
  },
  codCanal: canalMatch.json?.codCanal,
  autoavaliacao: {
    [reqObrigatorio?.codVagReq]: { nivel: 4, tempoMeses: 24, evidenciaTexto: "Liderei migração de pipelines SQL por 2 anos." },
    [reqDesejavel?.codVagReq]: { nivel: 2, tempoMeses: 0, evidenciaTexto: "" },
  },
}, tokenA2);
verificar("candidatura forte registrada (201)", cdtForte.status === 201);

// Candidato fraco: reprova o obrigatório, sem perfil cultural
const cdtFraco = await http("POST", `/vagas/${vagaMatch.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Carlos Fraco", email: `carlos.fraco.${rodada}@mail.com` },
  codCanal: canalMatch.json?.codCanal,
  autoavaliacao: {
    [reqObrigatorio?.codVagReq]: { nivel: 1, tempoMeses: 3, evidenciaTexto: "" },
    [reqDesejavel?.codVagReq]: { nivel: 0, tempoMeses: 0, evidenciaTexto: "" },
  },
}, tokenA2);
verificar("candidatura fraca registrada (201)", cdtFraco.status === 201);

const pipelineMatch = await http("GET", `/vagas/${vagaMatch.json?.codVag}/candidaturas`, null, tokenA2);
const matchForte = pipelineMatch.json?.itens?.find((c) => c.codCdt === cdtForte.json?.codCdt)?.match;
const matchFraco = pipelineMatch.json?.itens?.find((c) => c.codCdt === cdtFraco.json?.codCdt)?.match;

verificar(
  "candidata forte: score geral alto, sem gap crítico, fit cultural perfeito",
  matchForte?.scoreGeral >= 85 && matchForte?.qtdGapsCrit === 0 && matchForte?.scoreCultura === 100,
);
verificar(
  "candidata forte: driver principal é o requisito mais forte (obrigatório)",
  matchForte?.driverPrincipal === "SQL avançado",
);
verificar(
  "candidato fraco: obrigatório reprovado gera gap crítico e derruba o score",
  matchFraco?.qtdGapsCrit === 1 && matchFraco?.scoreGeral < 25 && matchFraco?.scoreGeral < matchForte?.scoreGeral,
);
verificar(
  "candidato fraco sem perfil cultural → scoreCultura null, contratação ainda calculada",
  matchFraco?.scoreCultura === null && typeof matchFraco?.scoreContratacao === "number",
);

const vagaSemRequisitos = await http("POST", "/vagas", { codEmp: cadA.json?.codEmp, titulo: "Vaga sem requisitos" }, tokenA2);
await http("PATCH", `/vagas/${vagaSemRequisitos.json?.codVag}/status`, { acao: "enviar_aprovacao" }, tokenA2);
await http("PATCH", `/vagas/${vagaSemRequisitos.json?.codVag}/status`, { acao: "aprovar" }, tokenA2);
const cdtSemRequisitos = await http("POST", `/vagas/${vagaSemRequisitos.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Diego Sem Requisito", email: `diego.${rodada}@mail.com` },
  codCanal: canalMatch.json?.codCanal,
}, tokenA2);
const pipelineSemReq = await http("GET", `/vagas/${vagaSemRequisitos.json?.codVag}/candidaturas`, null, tokenA2);
verificar(
  "vaga sem requisitos não gera match (nada a medir)",
  pipelineSemReq.json?.itens?.find((c) => c.codCdt === cdtSemRequisitos.json?.codCdt)?.match == null,
);

// 20b. Detalhe da candidatura (painel do candidato no pipeline redesenhado)
const detalheCdtForte = await http("GET", `/candidaturas/${cdtForte.json?.codCdt}`, null, tokenA2);
verificar(
  "detalhe da candidatura traz candidato, vaga com requisitos e match",
  detalheCdtForte.status === 200 &&
    detalheCdtForte.json?.candidato?.nomeCand === "Beatriz Forte" &&
    detalheCdtForte.json?.vaga?.requisitos?.length === 2 &&
    detalheCdtForte.json?.match?.scoreGeral === matchForte?.scoreGeral,
);
const reqAvaliadoObrigatorio = detalheCdtForte.json?.requisitosAvaliados?.find((r) => r.codVagReq === reqObrigatorio?.codVagReq);
verificar(
  "quebra por requisito calculada ao vivo (candidata forte pontua alto no obrigatório)",
  reqAvaliadoObrigatorio?.scorePct >= 90 && reqAvaliadoObrigatorio?.nivelInformado === 4,
);
const detalheCdtForteB = await http("GET", `/candidaturas/${cdtForte.json?.codCdt}`, null, tokenB);
verificar("tenant B não vê detalhe de candidatura do tenant A → 400", detalheCdtForteB.status === 400);

// 21. Gestão de Pessoas — Avaliação Comportamental (DIR/CON/SUS/PRE, sem IA)
const vagaComp = await http("POST", "/vagas", { codEmp: cadA.json?.codEmp, titulo: "Vaga Comportamental" }, tokenA2);
await http("PATCH", `/vagas/${vagaComp.json?.codVag}/status`, { acao: "enviar_aprovacao" }, tokenA2);
await http("PATCH", `/vagas/${vagaComp.json?.codVag}/status`, { acao: "aprovar" }, tokenA2);

const perfilComp = await http("POST", `/vagas/${vagaComp.json?.codVag}/perfil-comportamental`, {
  fatores: [
    { sigla: "DIR", minimo: 60, maximo: 100, peso: 2, importancia: "ALTA" },
    { sigla: "PRE", minimo: 40, maximo: 100, peso: 1 },
  ],
}, tokenA2);
verificar("cria perfil comportamental da vaga (201)", perfilComp.status === 201 && !!perfilComp.json?.codPerVag);

const perfilCompConsulta = await http("GET", `/vagas/${vagaComp.json?.codVag}/perfil-comportamental`, null, tokenA2);
verificar(
  "consulta perfil comportamental traz os 2 fatores configurados",
  perfilCompConsulta.json?.fatores?.length === 2 && perfilCompConsulta.json.modelo?.nome === "Avaliação Comportamental Padrão",
);

const cdtComp = await http("POST", `/vagas/${vagaComp.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Fernanda Comportamental", email: `fernanda.comp.${rodada}@mail.com` },
  codCanal: canalMatch.json?.codCanal,
}, tokenA2);
verificar("candidatura p/ teste comportamental (201)", cdtComp.status === 201);

const conviteComp = await http("POST", `/candidaturas/${cdtComp.json?.codCdt}/avaliacao-comportamental/convidar`, {}, tokenA2);
verificar("gera convite com token público (201)", conviteComp.status === 201 && !!conviteComp.json?.tokenPub);
const tokenComp = conviteComp.json?.tokenPub;

const conviteCompDeNovo = await http("POST", `/candidaturas/${cdtComp.json?.codCdt}/avaliacao-comportamental/convidar`, {}, tokenA2);
verificar("reconvidar é idempotente (mesmo token)", conviteCompDeNovo.json?.tokenPub === tokenComp);

const consultaCompInicial = await http("GET", `/avaliacao-comportamental/publico/${tokenComp}`);
verificar(
  "candidato consulta convite (sem login): 48 perguntas, sem consentimento ainda",
  consultaCompInicial.status === 200 && consultaCompInicial.json?.perguntas?.length === 48 && consultaCompInicial.json?.consentimentoAceito === false,
);

const consentimentoComp = await http("POST", `/avaliacao-comportamental/publico/${tokenComp}/consentimento`, {});
verificar("aceita termo de ciência (201)", consentimentoComp.status === 201 && !!consentimentoComp.json?.codSes);

for (const p of consultaCompInicial.json.perguntas) {
  const r = await http("POST", `/avaliacao-comportamental/publico/${tokenComp}/responder`, { codPer: p.codPer, valor: 5 });
  if (r.status !== 201) verificar(`responde pergunta ${p.codPer} (201)`, false);
}
verificar("todas as 48 respostas salvas (autosave)", true);

// Respondendo tudo com "5": cada fator tem 6 diretas (pontos=5) + 6 reversas (pontos=6-5=1) -> bruta=36,
// min=12, max=60, percentual=(36-12)/(60-12)*100=50 — igual em todos os fatores (verificação determinística).
const finalizarComp = await http("POST", `/avaliacao-comportamental/publico/${tokenComp}/finalizar`, {});
verificar(
  "finaliza: calcula os 4 fatores em 50% e a aderência ponderada esperada (93.33)",
  finalizarComp.status === 201 &&
    finalizarComp.json?.fatores?.length === 4 &&
    finalizarComp.json.fatores.every((f) => f.percentualNormalizado === 50) &&
    Math.abs(finalizarComp.json?.aderencia?.aderenciaGeral - 93.333) < 0.01,
);
verificar(
  "respostas 100% uniformes → indicador de consistência sinaliza (não reprova)",
  finalizarComp.json?.indicadorConsistencia === "BAIXA_CONSISTENCIA",
);

const finalizarCompDeNovo = await http("POST", `/avaliacao-comportamental/publico/${tokenComp}/finalizar`, {});
verificar("finalizar de novo é bloqueado (já concluído) → 400", finalizarCompDeNovo.status === 400);

const detalheComp = await http("GET", `/candidaturas/${cdtComp.json?.codCdt}/avaliacao-comportamental`, null, tokenA2);
verificar(
  "RH vê o resultado completo (fatores + aderência) pela candidatura",
  detalheComp.status === 200 && detalheComp.json?.sessao?.resultado?.fatores?.length === 4 && detalheComp.json.sessao.resultado.aderencias?.length === 1,
);

const detalheCompIsolamento = await http("GET", `/candidaturas/${cdtComp.json?.codCdt}/avaliacao-comportamental`, null, tokenB);
verificar("tenant B não acessa avaliação comportamental de candidatura do tenant A → 400", detalheCompIsolamento.status === 400);

const tokenCompInvalido = await http("GET", "/avaliacao-comportamental/publico/token-inexistente-xyz");
verificar("token de avaliação comportamental inválido → 400", tokenCompInvalido.status === 400);

// 22. Configurações da vaga (editar depois de criada) + Perfil Comportamental Padrão da empresa
const vagaCfg = await http("POST", "/vagas", { codEmp: cadA.json?.codEmp, titulo: "Vaga Configurações" }, tokenA2);
verificar("cria vaga p/ teste de configurações (201)", vagaCfg.status === 201);

const cfgAdiciona = await http("PATCH", `/vagas/${vagaCfg.json?.codVag}/configuracoes`, {
  requisitos: [{ descrReq: "Excel avançado", tipoReq: "OBRIGATORIO", peso: 6 }],
  perguntas: [{ pergunta: "Tem CNH categoria B?", respElimina: "Não" }],
}, tokenA2);
verificar("adiciona requisito/pergunta antes de ter candidatura (200)", cfgAdiciona.status === 200 && !cfgAdiciona.json?.bloqueadoPorCandidatura);

const vagaCfgDetalhe1 = await http("GET", `/vagas/${vagaCfg.json?.codVag}`, null, tokenA2);
verificar(
  "requisito/pergunta persistidos",
  vagaCfgDetalhe1.json?.requisitos?.length === 1 && vagaCfgDetalhe1.json?.perguntas?.length === 1,
);

const cfgRemoveLivre = await http("PATCH", `/vagas/${vagaCfg.json?.codVag}/configuracoes`, { requisitos: [], perguntas: [] }, tokenA2);
const vagaCfgDetalhe2 = await http("GET", `/vagas/${vagaCfg.json?.codVag}`, null, tokenA2);
verificar(
  "sem candidatura: remoção livre funciona (requisito/pergunta somem)",
  cfgRemoveLivre.status === 200 && vagaCfgDetalhe2.json?.requisitos?.length === 0 && vagaCfgDetalhe2.json?.perguntas?.length === 0,
);

// Recoloca um requisito, aprova a vaga e registra uma candidatura — agora a remoção deve ser bloqueada
await http("PATCH", `/vagas/${vagaCfg.json?.codVag}/configuracoes`, {
  requisitos: [{ descrReq: "Excel avançado", tipoReq: "OBRIGATORIO", peso: 6 }],
}, tokenA2);
await http("PATCH", `/vagas/${vagaCfg.json?.codVag}/status`, { acao: "enviar_aprovacao" }, tokenA2);
await http("PATCH", `/vagas/${vagaCfg.json?.codVag}/status`, { acao: "aprovar" }, tokenA2);
await http("POST", `/vagas/${vagaCfg.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Fabio Config", email: `fabio.config.${rodada}@mail.com` },
  codCanal: canalMatch.json?.codCanal,
}, tokenA2);

const vagaCfgComCdt = await http("GET", `/vagas/${vagaCfg.json?.codVag}`, null, tokenA2);
const reqExistente = vagaCfgComCdt.json?.requisitos?.[0];
const cfgTentaRemover = await http("PATCH", `/vagas/${vagaCfg.json?.codVag}/configuracoes`, { requisitos: [] }, tokenA2);
const vagaCfgDetalhe3 = await http("GET", `/vagas/${vagaCfg.json?.codVag}`, null, tokenA2);
verificar(
  "com candidatura: requisito existente é mantido (não removido), aviso sinalizado",
  cfgTentaRemover.status === 200 &&
    cfgTentaRemover.json?.bloqueadoPorCandidatura === true &&
    cfgTentaRemover.json?.avisos?.length === 1 &&
    vagaCfgDetalhe3.json?.requisitos?.length === 1,
);

const cfgEditaExistente = await http("PATCH", `/vagas/${vagaCfg.json?.codVag}/configuracoes`, {
  requisitos: [{ codVagReq: reqExistente.codVagReq, descrReq: "Excel avançado", tipoReq: "OBRIGATORIO", peso: 9 }],
}, tokenA2);
const vagaCfgDetalhe4 = await http("GET", `/vagas/${vagaCfg.json?.codVag}`, null, tokenA2);
verificar(
  "com candidatura: editar peso de requisito existente funciona",
  cfgEditaExistente.status === 200 && vagaCfgDetalhe4.json?.requisitos?.[0]?.peso === 9,
);

// Perfil Comportamental Padrão da empresa (fallback quando a vaga não tem perfil próprio)
const padraoAntes = await http("GET", "/vagas/" + vagaCfg.json?.codVag + "/perfil-comportamental", null, tokenA2);
verificar("sem padrão e sem perfil de vaga: consulta retorna null", padraoAntes.status === 200 && padraoAntes.json === null);

const criaPadrao = await http("POST", "/gestao-pessoas/perfil-comportamental-padrao", {
  fatores: [{ sigla: "DIR", minimo: 50, maximo: 100, peso: 1 }],
}, tokenA2);
verificar("cria perfil comportamental padrão da empresa (201)", criaPadrao.status === 201 && !!criaPadrao.json?.codPerPad);

const consultaComPadrao = await http("GET", `/vagas/${vagaCfg.json?.codVag}/perfil-comportamental`, null, tokenA2);
verificar(
  "vaga sem perfil próprio herda o padrão da empresa",
  consultaComPadrao.status === 200 && consultaComPadrao.json?.herdadoDoPadrao === true && consultaComPadrao.json?.fatores?.length === 1,
);

const consultaVagaComPerfilProprio = await http("GET", `/vagas/${vagaComp.json?.codVag}/perfil-comportamental`, null, tokenA2);
verificar(
  "vaga com perfil próprio NÃO herda o padrão (herdadoDoPadrao false)",
  consultaVagaComPerfilProprio.status === 200 && consultaVagaComPerfilProprio.json?.herdadoDoPadrao === false,
);

// Aderência calculada ao vivo contra o padrão quando a candidatura é de uma vaga sem perfil próprio
const cdtsCfg = await http("GET", `/vagas/${vagaCfg.json?.codVag}/candidaturas`, null, tokenA2);
const cdtCfg = cdtsCfg.json?.itens?.[0];
const conviteCfg = await http("POST", `/candidaturas/${cdtCfg?.codCdt}/avaliacao-comportamental/convidar`, {}, tokenA2);
const tokenPubCfg = conviteCfg.json?.tokenPub;
await http("POST", `/avaliacao-comportamental/publico/${tokenPubCfg}/consentimento`, {});
const consultaCfg = await http("GET", `/avaliacao-comportamental/publico/${tokenPubCfg}`);
for (const p of consultaCfg.json.perguntas) {
  await http("POST", `/avaliacao-comportamental/publico/${tokenPubCfg}/responder`, { codPer: p.codPer, valor: 5 });
}
await http("POST", `/avaliacao-comportamental/publico/${tokenPubCfg}/finalizar`, {});
const detalheCfgFinal = await http("GET", `/candidaturas/${cdtCfg?.codCdt}/avaliacao-comportamental`, null, tokenA2);
verificar(
  "vaga sem perfil próprio: aderência calculada ao vivo contra o padrão (aderenciaPadrao)",
  detalheCfgFinal.status === 200 &&
    detalheCfgFinal.json?.sessao?.resultado?.aderencias?.length === 0 &&
    detalheCfgFinal.json?.aderenciaPadrao?.aderenciaGeral != null,
);

// 23. Lista de candidaturas paginada/ordenada/filtrada no servidor (RN-REC-011)
const listaPag = await http("GET", `/vagas/${vagaMatch.json?.codVag}/candidaturas?pagina=1&tamanhoPagina=1&ordenar=prioridade`, null, tokenA2);
verificar(
  "lista de candidaturas responde paginada {itens,total,pagina,tamanhoPagina}",
  listaPag.status === 200 && Array.isArray(listaPag.json?.itens) && typeof listaPag.json?.total === "number" &&
    listaPag.json.itens.length === 1 && listaPag.json.total >= 2,
);
verificar(
  "ordenação por prioridade: candidata forte vem primeiro (maior scoreContratacao)",
  listaPag.json?.itens?.[0]?.codCdt === cdtForte.json?.codCdt,
);

const listaOrdAsc = await http("GET", `/vagas/${vagaMatch.json?.codVag}/candidaturas?ordenar=aderencia_asc`, null, tokenA2);
verificar(
  "ordenação aderencia_asc: candidato fraco vem primeiro (menor scoreGeral)",
  listaOrdAsc.json?.itens?.[0]?.codCdt === cdtFraco.json?.codCdt,
);

const listaFiltroEstagio = await http("GET", `/vagas/${vagaMatch.json?.codVag}/candidaturas?estagio=applied`, null, tokenA2);
verificar(
  "filtro por estágio traz só o estágio pedido",
  listaFiltroEstagio.status === 200 && listaFiltroEstagio.json?.itens?.every((c) => c.estagio === "applied"),
);

const listaBusca = await http("GET", `/vagas/${vagaMatch.json?.codVag}/candidaturas?busca=Beatriz`, null, tokenA2);
verificar(
  "busca textual filtra por nome",
  listaBusca.status === 200 && listaBusca.json?.itens?.length === 1 && listaBusca.json.itens[0].codCdt === cdtForte.json?.codCdt,
);

const listaAderMin = await http("GET", `/vagas/${vagaMatch.json?.codVag}/candidaturas?aderenciaMin=50`, null, tokenA2);
verificar(
  "filtro aderenciaMin=50 exclui o candidato fraco",
  listaAderMin.status === 200 && !listaAderMin.json?.itens?.some((c) => c.codCdt === cdtFraco.json?.codCdt),
);

// 24. Ação em massa: mover estágio em lote
const loteMover = await http("PATCH", `/vagas/${vagaMatch.json?.codVag}/candidaturas/mover-estagio-lote`, {
  codCdts: [cdtForte.json?.codCdt, cdtFraco.json?.codCdt], estagio: "screening",
}, tokenA2);
verificar("mover estágio em lote move as duas candidaturas", loteMover.status === 200 && loteMover.json?.movidas === 2);
const listaAposLote = await http("GET", `/vagas/${vagaMatch.json?.codVag}/candidaturas?estagio=screening`, null, tokenA2);
verificar("as duas candidaturas estão no novo estágio após o lote", listaAposLote.json?.itens?.length === 2);
const loteOutroTenant = await http("PATCH", `/vagas/${vagaMatch.json?.codVag}/candidaturas/mover-estagio-lote`, {
  codCdts: [cdtForte.json?.codCdt], estagio: "shortlist",
}, tokenB);
verificar("tenant B não move candidaturas do tenant A em lote (0 encontradas)", loteOutroTenant.status === 200 && loteOutroTenant.json?.encontradas === 0);

// 25. Anotações do recrutador (timeline com tipoEvento='anotacao')
const criaAnotacao = await http("POST", `/candidaturas/${cdtForte.json?.codCdt}/anotacoes`, { nota: "Ótimo fit técnico, agendar conversa." }, tokenA2);
verificar("cria anotação (201)", criaAnotacao.status === 201 && criaAnotacao.json?.tipoEvento === "anotacao");
const listaAnotacoes = await http("GET", `/candidaturas/${cdtForte.json?.codCdt}/anotacoes`, null, tokenA2);
verificar(
  "lista anotações traz só as anotações (não a timeline inteira)",
  listaAnotacoes.status === 200 && listaAnotacoes.json?.length === 1 && listaAnotacoes.json[0].notaInterna.includes("fit técnico"),
);

// 26. KPIs agregados na lista de vagas
const vagasComKpi = await http("GET", "/vagas", null, tokenA2);
const vagaMatchKpi = vagasComKpi.json?.find((v) => v.codVag === vagaMatch.json?.codVag);
verificar(
  "lista de vagas traz KPIs agregados (total/novos/altaAderencia/diasEmAberto)",
  vagasComKpi.status === 200 && vagaMatchKpi?.totalCandidatos === 2 && vagaMatchKpi?.novos === 2 &&
    typeof vagaMatchKpi?.altaAderencia === "number" && typeof vagaMatchKpi?.diasEmAberto === "number",
);

// 27. Responsável da vaga (RN-REC-012)
const usuariosTenant = await http("GET", "/usuarios", null, tokenA2);
const meuUsuario = usuariosTenant.json?.[0];
const atribui = await http("PATCH", `/vagas/${vagaMatch.json?.codVag}/responsavel`, { codUsuResp: meuUsuario?.codUsu }, tokenA2);
verificar("atribui responsável à vaga (200)", atribui.status === 200 && atribui.json?.codUsuResp === meuUsuario?.codUsu);
const vagaComResp = await http("GET", `/vagas/${vagaMatch.json?.codVag}`, null, tokenA2);
verificar("detalhe da vaga traz o responsável com nome", vagaComResp.json?.responsavel?.nomeUsu === meuUsuario?.nomeUsu);
const listaComResp = await http("GET", "/vagas", null, tokenA2);
verificar(
  "lista de vagas traz o responsável",
  listaComResp.json?.find((v) => v.codVag === vagaMatch.json?.codVag)?.responsavel?.codUsu === meuUsuario?.codUsu,
);
const limpaResp = await http("PATCH", `/vagas/${vagaMatch.json?.codVag}/responsavel`, { codUsuResp: null }, tokenA2);
const vagaSemResp = await http("GET", `/vagas/${vagaMatch.json?.codVag}`, null, tokenA2);
verificar("remove responsável (null) limpa o campo", limpaResp.status === 200 && vagaSemResp.json?.responsavel === null);
const respOutroTenant = await http("PATCH", `/vagas/${vagaMatch.json?.codVag}/responsavel`, { codUsuResp: meuUsuario?.codUsu }, tokenB);
verificar("tenant B não atribui responsável em vaga do tenant A → 400", respOutroTenant.status === 400);

// 27a. Importação de currículos em lote
const vagaLote = await http("POST", "/vagas", { codEmp: cadA.json?.codEmp, titulo: "Vaga Importação Lote" }, tokenA2);
await http("PATCH", `/vagas/${vagaLote.json?.codVag}/status`, { acao: "enviar_aprovacao" }, tokenA2);
await http("PATCH", `/vagas/${vagaLote.json?.codVag}/status`, { acao: "aprovar" }, tokenA2);

const cvDe = (nome, email) =>
  `${nome}\nEmail: ${email}\nTelefone: (11) 97777-1234\n\nExperiencia\nAnalista - Empresa Z - 2020-2025\n`;
const formLote = new FormData();
formLote.set("codCanal", String(canal.json?.codCanal));
formLote.set("codVag", String(vagaLote.json?.codVag));
formLote.append("arquivos", new Blob([cvDe("Rafael Moreira Lima", `rafael.${rodada}@mail.com`)], { type: "text/plain" }), "rafael.txt");
formLote.append("arquivos", new Blob([cvDe("Juliana Castro", `juliana.${rodada}@mail.com`)], { type: "text/plain" }), "juliana.txt");
// Sem e-mail não há como deduplicar nem contatar — tem que sobrar para revisão manual.
formLote.append("arquivos", new Blob(["Curriculo sem contato nenhum\nExperiencia diversa\n"], { type: "text/plain" }), "sem-email.txt");
// Já cadastrada no banco de talentos: o currículo é anexado, o cadastro não é sobrescrito.
formLote.append("arquivos", new Blob([cvDe("Nome Chutado Errado", `diana.${rodada}@mail.com`)], { type: "text/plain" }), "diana-de-novo.txt");
formLote.append("arquivos", new Blob([Buffer.from([0x00, 0x01, 0x02])], { type: "image/png" }), "foto.png");

const loteRes = await fetch(`${base}/candidatos/importar-lote`, {
  method: "POST",
  headers: { authorization: `Bearer ${tokenA2}` },
  body: formLote,
});
const lote = await loteRes.json().catch(() => null);
verificar(
  "importa lote de currículos: 2 novos, 1 reaproveitado, 2 ignorados",
  loteRes.status === 201 && lote?.total === 5 && lote?.importados === 2 && lote?.reaproveitados === 1 && lote?.ignorados === 2,
);
verificar(
  "arquivo sem e-mail é ignorado com motivo, não vira candidato mudo",
  lote?.itens?.find((i) => i.arquivo === "sem-email.txt")?.motivo === "Nenhum e-mail encontrado no currículo",
);
verificar(
  "formato não suportado é ignorado sem derrubar o lote inteiro",
  lote?.itens?.find((i) => i.arquivo === "foto.png")?.status === "ignorado",
);
verificar(
  "nome é deduzido do currículo (heurística, sem IA)",
  lote?.itens?.find((i) => i.arquivo === "rafael.txt")?.nomeCand === "Rafael Moreira Lima",
);
const dianaDepois = (await http("GET", "/candidatos", null, tokenA2)).json
  ?.find((c) => c.codCand === candDiana.json?.codCand);
verificar(
  "candidato já existente não tem o nome sobrescrito pelo palpite do lote",
  dianaDepois?.nomeCand === "Diana Rocha",
);
const cdtsLote = await http("GET", `/vagas/${vagaLote.json?.codVag}/candidaturas`, null, tokenA2);
verificar(
  "cada currículo importado virou candidatura na vaga informada (3)",
  cdtsLote.json?.total === 3 && cdtsLote.json?.itens?.every((c) => c.estagio === "applied"),
);
// Sem autoavaliação não existe match: zero seria indistinguível de quem foi mal avaliado.
verificar(
  "candidatura importada entra sem score, não com score zero",
  cdtsLote.json?.itens?.every((c) => c.match == null),
);
const loteVagaFechada = new FormData();
loteVagaFechada.set("codCanal", String(canal.json?.codCanal));
loteVagaFechada.set("codVag", String(vagaSemRequisitos.json?.codVag));
loteVagaFechada.append("arquivos", new Blob([cvDe("Alguem Qualquer", `alguem.${rodada}@mail.com`)], { type: "text/plain" }), "x.txt");
const loteB = await fetch(`${base}/candidatos/importar-lote`, {
  method: "POST",
  headers: { authorization: `Bearer ${tokenB}` },
  body: loteVagaFechada,
});
verificar("tenant B não importa lote para canal/vaga do tenant A → 400", loteB.status === 400);

// 27b. KPIs de funil por canal (RN-REC-010)
const canalKpi = await http("POST", "/canais", { nomeCanal: `Canal KPI ${rodada}`, tipoCanal: "conector", vlrCustoMes: 3000 }, tokenA2);
const vagaKpi = await http("POST", "/vagas", { codEmp: cadA.json?.codEmp, titulo: "Vaga KPI Canal" }, tokenA2);
await http("PATCH", `/vagas/${vagaKpi.json?.codVag}/status`, { acao: "enviar_aprovacao" }, tokenA2);
await http("PATCH", `/vagas/${vagaKpi.json?.codVag}/status`, { acao: "aprovar" }, tokenA2);

const cdtEntrevistado = await http("POST", `/vagas/${vagaKpi.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Entrevistado Recusado", email: `entrev.${rodada}@mail.com` }, codCanal: canalKpi.json?.codCanal,
}, tokenA2);
const cdtParado = await http("POST", `/vagas/${vagaKpi.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Parou na Triagem", email: `parou.${rodada}@mail.com` }, codCanal: canalKpi.json?.codCanal,
}, tokenA2);

// Avança até entrevista e DEPOIS recusa — o estágio atual vira terminal.
for (const etapa of ["screening", "analysis", "shortlist", "interview", "rejected"]) {
  await http("PATCH", `/candidaturas/${cdtEntrevistado.json?.codCdt}/estagio`, { estagio: etapa }, tokenA2);
}
await http("PATCH", `/candidaturas/${cdtParado.json?.codCdt}/estagio`, { estagio: "screening" }, tokenA2);

const kpis = await http("GET", "/canais/kpis?dias=90", null, tokenA2);
const kpiCanal = kpis.json?.find((k) => String(k.codCanal) === String(canalKpi.json?.codCanal));
verificar(
  "KPIs por canal respondem 200 e trazem o canal recém-criado com suas 2 candidaturas",
  kpis.status === 200 && kpiCanal?.candidaturas === 2,
);
// O ponto do desenho: o funil é "chegou ao menos até", reconstruído da timeline.
// Se fosse contado pelo estágio atual, este candidato (hoje em 'rejected') sumiria
// da coluna de entrevistas e o canal pareceria não entregar entrevista nenhuma.
verificar(
  "funil conta quem chegou até a entrevista mesmo tendo sido recusado depois (timeline, não estágio atual)",
  kpiCanal?.entrevistas === 1 && kpiCanal?.triagem === 2 && kpiCanal?.propostas === 0,
);
verificar(
  "sem contratação no período, custo por contratação fica nulo (não divide por zero)",
  kpiCanal?.contratacoes === 0 && kpiCanal?.custoPorContratacao === null && kpiCanal?.taxaContratacao === 0,
);
const kpisB = await http("GET", "/canais/kpis?dias=90", null, tokenB);
verificar(
  "tenant B não vê canais nem números do tenant A nos KPIs",
  kpisB.status === 200 && !kpisB.json?.some((k) => String(k.codCanal) === String(canalKpi.json?.codCanal)),
);

// 28. Banco de perguntas e questionário próprio do tenant (RN-GP-001)
const bancoPerguntas = await http("GET", "/gestao-pessoas/perguntas", null, tokenA2);
verificar(
  "banco de perguntas expõe os 4 fatores com suas perguntas",
  bancoPerguntas.status === 200 && bancoPerguntas.json?.length === 4 &&
    bancoPerguntas.json.every((f) => f.perguntas.length > 0),
);

const todasPerguntas = bancoPerguntas.json.flatMap((f) => f.perguntas.map((p) => p.codPer));
const soUmFator = bancoPerguntas.json[0].perguntas.map((p) => p.codPer);
const modeloIncompleto = await http("POST", "/gestao-pessoas/modelos", { nome: "Só um fator", codPerguntas: soUmFator }, tokenA2);
verificar(
  "questionário sem cobrir todos os fatores é recusado → 400",
  modeloIncompleto.status === 400,
);

const modeloProprio = await http("POST", "/gestao-pessoas/modelos", { nome: "Questionário do Tenant A", codPerguntas: todasPerguntas }, tokenA2);
verificar("cria questionário próprio do tenant (201)", modeloProprio.status === 201 && modeloProprio.json?.qtdPerguntas === 64);

// O ponto crítico: TGPMOD é tabela global — o questionário de A não pode virar o padrão de B.
const modelosB = await http("GET", "/gestao-pessoas/modelos", null, tokenB);
verificar(
  "tenant B não enxerga o questionário do tenant A (só o da plataforma)",
  modelosB.status === 200 && !modelosB.json?.some((m) => m.codMod === modeloProprio.json?.codMod),
);

const vagaIsol = await http("POST", "/vagas", { codEmp: cadB.json?.codEmp, titulo: "Vaga Isolamento" }, tokenB);
await http("PATCH", `/vagas/${vagaIsol.json?.codVag}/status`, { acao: "enviar_aprovacao" }, tokenB);
await http("PATCH", `/vagas/${vagaIsol.json?.codVag}/status`, { acao: "aprovar" }, tokenB);
const canalB = await http("POST", "/canais", { nomeCanal: "Canal B" }, tokenB);
const cdtIsol = await http("POST", `/vagas/${vagaIsol.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Isolado", email: `isolado.${rodada}@mail.com` }, codCanal: canalB.json?.codCanal,
}, tokenB);
const convIsol = await http("POST", `/candidaturas/${cdtIsol.json?.codCdt}/avaliacao-comportamental/convidar`, {}, tokenB);
const consultaIsol = await http("GET", `/avaliacao-comportamental/publico/${convIsol.json?.tokenPub}`);
verificar(
  "convite do tenant B continua usando o questionário da plataforma (48), não o de A (64)",
  consultaIsol.json?.totalPerguntas === 48,
);

// A outra metade da mesma regra: isolar B não basta, o questionário próprio de A
// precisa de fato virar o padrão de A. Sem este cenário, um erro de ordenação
// (NULL primeiro no `codTen desc`) deixa A preso no questionário da plataforma e
// o teste acima continua verde.
const vagaPropria = await http("POST", "/vagas", { codEmp: cadA.json?.codEmp, titulo: "Vaga Questionário Próprio" }, tokenA2);
await http("PATCH", `/vagas/${vagaPropria.json?.codVag}/status`, { acao: "enviar_aprovacao" }, tokenA2);
await http("PATCH", `/vagas/${vagaPropria.json?.codVag}/status`, { acao: "aprovar" }, tokenA2);
const cdtPropria = await http("POST", `/vagas/${vagaPropria.json?.codVag}/candidaturas`, {
  candidato: { nomeCand: "Candidato Próprio", email: `proprio.${rodada}@mail.com` }, codCanal: canal.json?.codCanal,
}, tokenA2);
const convPropria = await http("POST", `/candidaturas/${cdtPropria.json?.codCdt}/avaliacao-comportamental/convidar`, {}, tokenA2);
const consultaPropria = await http("GET", `/avaliacao-comportamental/publico/${convPropria.json?.tokenPub}`);
verificar(
  "convite do tenant A passa a usar o questionário próprio (64), não mais o da plataforma (48)",
  consultaPropria.json?.totalPerguntas === 64,
);

const modelosA = await http("GET", "/gestao-pessoas/modelos", null, tokenA2);
verificar(
  "tenant A enxerga o da plataforma + o próprio",
  modelosA.json?.some((m) => m.codTen === null) && modelosA.json?.some((m) => m.codMod === modeloProprio.json?.codMod),
);

// 29. Portal de acompanhamento do candidato (sem login)
const linkAcomp = await http("POST", `/candidaturas/${cdtComRisco.json?.codCdt}/link-acompanhamento`, {}, tokenA2);
verificar("gera link de acompanhamento (201)", linkAcomp.status === 201 && !!linkAcomp.json?.tokenPub);
const linkAcompDeNovo = await http("POST", `/candidaturas/${cdtComRisco.json?.codCdt}/link-acompanhamento`, {}, tokenA2);
verificar("gerar o link de novo é idempotente", linkAcompDeNovo.json?.tokenPub === linkAcomp.json?.tokenPub);

const acomp = await http("GET", `/acompanhamento/publico/${linkAcomp.json?.tokenPub}`);
verificar(
  "candidato acompanha o processo sem login, com estágio traduzido",
  acomp.status === 200 && typeof acomp.json?.estagio?.rotulo === "string" && !!acomp.json?.vaga?.titulo,
);

// Este candidato tem knockout sinalizado e nota interna — nada disso pode aparecer.
const acompBruto = JSON.stringify(acomp.json);
verificar(
  "portal público não vaza dado interno (knockout, score, nota, estágio técnico)",
  !acompBruto.includes("knockout") &&
    !/"scoreGeral"|"scoreContratacao"|"qtdGapsCrit"/.test(acompBruto) &&
    !acompBruto.includes("notaInterna") &&
    !acompBruto.includes('"applied"'),
);

const acompInvalido = await http("GET", "/acompanhamento/publico/token-inexistente-abc");
verificar("token de acompanhamento inválido → 400", acompInvalido.status === 400);

// Resultado
if (falhas.length > 0) {
  console.error(`\n${falhas.length} falha(s) na fumaça do Core.`);
  process.exit(1);
}
console.log("\nFumaça do Core: todos os cenários passaram.");
