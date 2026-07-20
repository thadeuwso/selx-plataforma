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
const candidaturaSinalizada = pipelineComSinal.json?.find((c) => c.codCdt === cdtComRisco.json?.codCdt);
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
const cdtNoPipeline = pipelineComAdmissao.json?.find((c) => c.codCdt === cdtProc.json?.codCdt);
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
const matchForte = pipelineMatch.json?.find((c) => c.codCdt === cdtForte.json?.codCdt)?.match;
const matchFraco = pipelineMatch.json?.find((c) => c.codCdt === cdtFraco.json?.codCdt)?.match;

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
  pipelineSemReq.json?.find((c) => c.codCdt === cdtSemRequisitos.json?.codCdt)?.match == null,
);

// Resultado
if (falhas.length > 0) {
  console.error(`\n${falhas.length} falha(s) na fumaça do Core.`);
  process.exit(1);
}
console.log("\nFumaça do Core: todos os cenários passaram.");
