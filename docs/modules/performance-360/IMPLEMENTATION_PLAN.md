# Painel 360 do Colaborador — IMPLEMENTATION_PLAN

> Sequência em fases pequenas e verificáveis. Cada fase fecha com **typecheck + lint + testes + fumaça** e,
> quando toca UI, conferência no navegador. Cada fase que entrega valor vira uma RN no vault.
> Migrations sempre incrementais + bloco RLS. Nada destrutivo.

Estado atual: **Fases 1–5 entregues.** 4 (Visão 360 + `ProximaAcao`, mig 0033), 5a (360 por cargo: modelo/participantes/consolidação, mig 0034), **5b** (role-fit `CompetenciaCargo`/`situacaoAderenciaCargo`, heatmap, gaveta de detalhe da competência, config de esperadas por cargo; mig 0035).
5c reescopou o modelo 360 (empresa/departamento/colaboradores + cargo; migs 0036/0037/0038). Role-fit na tela "Competências do cargo". **Fase 6 entregue:** metas (`Meta`/`ProgressoMeta`, status derivado, resumo ponderado, trilha de progresso, aba Metas) + feedbacks (reuso na aba Feedbacks); mig 0041.
**Próxima: Fase 7 (PDI e treinamentos — `Treinamento`/`MatriculaTreinamento`/`RecomendacaoTreinamento`).**

---

## Fase 3 — Estrutura base (primeira a implementar)
Rota `/app/gestao-pessoas/colaboradores/[codFun]` com `layout.tsx` (cabeçalho compacto fixo do colaborador + navegação de abas) e `page.tsx` (aba Visão 360 com skeletons). Endpoint agregador `GET …/colaboradores/:codFun/360` retornando o que já existe hoje (dados do funcionário, ciclo atual, nota da avaliação, contadores de PDI/feedback, aderência) — **sem entidades novas ainda**. Ponto de entrada: linkar o nome do colaborador (drawer de funcionários, "quem já completou", novas contratações) para o novo painel.
- Cria: rota + layout + página + `Colaborador360Header` + `Colaborador360Abas` + controller agregador (só leitura, dados existentes).
- Verificação: tsc, lint, fumaça (agregador), navegador.

## Fase 4 — Visão 360 (resumo, nota, evolução, destaques, atenção, próximos passos)
`ResumoExecutivo` + `CartaoNota` + `TendenciaDesempenho` + destaques/pontos de atenção (das competências já existentes) + `PainelProximosPassos`. Introduz **`ProximaAcao` (`TGPPROX`)** (migration incremental) — recomendação vira tarefa. Gráfico de evolução (conforme decisão B4).
- Cria: `ProximaAcao` + endpoints de próximos passos + componentes da Visão 360.

## Fase 5 — Competências e avaliadores (360 configurável por cargo)
Detalhe de competência (gaveta), heatmap (SVG próprio), histórico. **360 configurável (B3):** `ModeloAvaliacao360` (`TGPMOD360`) + `ModeloAvaliador360` (`TGPMOD360AVAL`) — empresa define, por cargo, tipos de avaliador e pesos. `ParticipanteAvaliacao` (`TGPAVALPART`) instanciado a partir do modelo do cargo ao enturmar; empresa atribui as pessoas. `NotaCompetencia.codAvalPart?`; consolidação `notaFinal` estendida por peso de tipo. `ComparacaoAvaliadores` com alertas neutros. **`CompetenciaCargo` (`TFPCARCOMP`)** + `AderenciaAoCargo` com faixas configuráveis.
- Regras puras novas: consolidação 360, role-fit — com testes unitários. (UI de configuração por cargo entra aqui ou em fase própria conforme tamanho.)

## Fase 6 — Metas e feedbacks
**`Meta` (`TGPMETA`)** + **`ProgressoMeta` (`TGPMETAPROG`)**; resumo, cartões, indicadores (no prazo/atrasada/risco). Feedbacks: reusa `Feedback`, agrega enviados/recebidos, filtros, ciência. (Impacto na nota conforme B6.)

## Fase 7 — PDI e treinamentos
PDI reusa o existente dentro do 360 (`QuadroPDI`). **`Treinamento`/`MatriculaTreinamento`/`RecomendacaoTreinamento`**; relação com competências/cargo/PDI/metas; recomendações por regra + IA (sem matrícula automática). "Transformar ponto de atenção em objetivo de PDI".

## Fase 8 — Perfil, cargo e carreira
Ponte comportamental (decisão B2) + `ResumoComportamental` com aviso metodológico. `ResumoPotencial` (**`AvaliacaoPotencial`/`PerfilSucessao`**, matriz configurável, revisão humana — B7). **`PerfilCarreira`**.

## Fase 9 — IA de desempenho
Purposes novos no gateway (`OllamaPerformanceProvider`, `MockPerformanceProvider`): resumo executivo, roteiro de feedback, sugestões de desenvolvimento, explicação de tendência, resumo de feedbacks. **`IADesempenhoInsight` (`TGPIAINS`)** (molde `TREIAANALISE`): JSON Zod, hash, evidências, auditoria. `ResumoIA` + `GavetaEvidencias` + Ver evidências / Gerar novamente. `PreparacaoFeedback` (§20).

## Fase 10 — Riscos e alertas
Motor de regras transparente → **`Alerta` (`TGPALERTA`)**; IA só complementa a explicação. Revisão/descartar; alimenta próximos passos. Regras puras testadas.

## Fase 11 — Exportação, auditoria e segurança
PDF **server-side** (decisão B5, Playwright headless) com seções selecionáveis + controle de acesso. Auditoria de **leitura/exportação/IA** via `LogAuditoria`. Papéis/escopos (B1): novas chaves de permissão + **`Departamento.codFunGestor?`** (aditivo — o gestor é o responsável do departamento) + escopo "minha equipe" (departamento e sub-árvore) + filtro do colaborador (EMPLOYEE, só o próprio 360, sem comparação nominal nem risco restrito). Dashboard do gestor (§23).

## Fase 12 — Testes, snapshot e documentação
`ResumoSnapshot` (`TGPSNAP`) por ciclo. Cobertura: unit (evolução, comparação, role-fit, metas, PDI, alertas, acesso, isolamento, validação IA), integração (carregamento, seções, próximos passos, IA, exportação, auditoria), E2E por papel. Fechamento no vault.

---

## Gate de verificação (fim de cada fase)
`tsc` (api+web) · `eslint --max-warnings 0` · `pnpm --filter @selexops/api test` · `node apps/api/scripts/fumaca-core.mjs` · navegador quando houver UI · checagem **rotas × consumidores** (nenhum endpoint órfão).

## Critérios de aceite (§39) — rastreamento
Cada item da §39 será marcado ao fim da fase que o satisfaz; o conjunto fecha na Fase 12. Nenhum passo remove funcionalidade atual; nenhuma migration antiga é alterada.
