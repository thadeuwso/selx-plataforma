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

// Resultado
if (falhas.length > 0) {
  console.error(`\n${falhas.length} falha(s) na fumaça do Core.`);
  process.exit(1);
}
console.log("\nFumaça do Core: todos os cenários passaram.");
