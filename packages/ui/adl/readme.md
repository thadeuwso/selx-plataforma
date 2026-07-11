# AION Design Language (ADL)

**ADL** é a linguagem de design da **AION.IT**. O **SelX 2.0** (recrutamento & seleção / RH) é o primeiro produto construído sobre ela; todos os softwares futuros da empresa a utilizarão.

Este projeto materializa a **Fase 1–2 do roadmap do ADL**: o vault original (fonte: pasta local `12 - ADL/`, Obsidian) era exclusivamente documentação — princípios sem HEX, sem fonte escolhida, sem código. As decisões concretas aqui (índigo profundo dessaturado, IBM Plex, Lucide, escalas) foram tomadas nesta fase com aprovação do usuário e devem ser registradas de volta no Changelog do vault.

## Fontes

- Pasta local `12 - ADL/` — 17 documentos: Manifesto, Princípios, Foundations, Design Tokens, Typography, Layout, Motion, Accessibility, Components, Business Components, Patterns, AI Experience, Content Guidelines, Roadmap, Changelog, Inspiration, README. (Somente leitura; sem código, sem Figma, sem assets.)

## O que o ADL defende (resumo do Manifesto)

Softwares corporativos são **habitados, não visitados** — analistas de RH passam 8h/dia nas telas. Portanto:

1. **Sobriedade é sofisticação** — sem neon, sem gradientes chamativos, sem "cara de dashboard de IA".
2. **Ferramenta de trabalho, não vitrine** — clareza e baixa fadiga > impacto de demo.
3. **Consistência é pacto** — mesmo problema, mesma solução, em todos os produtos.
4. **Tecnologia aparece pelo resultado** — IA se manifesta em fluidez, nunca em fogos de artifício.
5. **Acessibilidade não é feature** — WCAG 2.2 AA mínimo, estrutural.
6. **A linguagem precede o código.**

## Decisões de Fase 1 tomadas aqui

| Decisão | Valor | Status |
|---|---|---|
| Matiz da marca | Índigo profundo dessaturado (`--brand-700: #3B3A5C`) | Escolhido pelo usuário |
| Tipografia | IBM Plex Sans (interface) + IBM Plex Mono (dados) | Escolhido pelo usuário; via Google Fonts CDN — **binários locais pendentes** |
| Ícones | Lucide (traço 1.5–2px, sóbrio, ISC license) | Escolhido pelo usuário; via CDN |
| Tema padrão | Claro; escuro completo em `[data-theme="dark"]` | — |
| Logo | **Não existe** — SelX/AION.IT são renderizados em tipografia pura (IBM Plex Sans semibold). Nunca inventar marca. | Aguardando logo do SelX |
| Unidade-base de espaço | 4px | — |

## CONTENT FUNDAMENTALS

Fonte: `Content Guidelines.md` + `AI Experience.md` do vault.

- **Idioma:** português brasileiro é o idioma-mãe. Termos consagrados ficam em inglês quando a tradução confunde (*pipeline*, *dashboard*) — caso a caso, registrados em glossário.
- **Voz:** "especialista sereno" — competente sem arrogância, direto sem rispidez, próximo sem intimidade forçada. Como um bom colega explica.
- **Tratamento:** sempre "você"; nunca "o usuário" ou terceira pessoa cerimoniosa.
- **Botões dizem o que fazem:** "Publicar vaga", "Agendar entrevista" — nunca "OK"/"Confirmar" sozinhos em ações com consequência.
- **Frases curtas, palavras comuns.** Se dá para cortar uma palavra, corte.
- **Erros = o que houve + o que fazer.** Sem códigos crípticos, sem culpar o usuário, sem "Ops!".
- **Sem alarme, sem euforia:** nada de "Incrível!", exclamações em cascata ou emoji. Celebrações discretas onde couberem.
- **Terminologia sagrada:** um conceito = um nome no produto inteiro (vaga é vaga; candidatura nunca vira "aplicação").
- **Datas, números e moeda no padrão brasileiro**, sempre com contexto (há quanto tempo, comparado a quê).
- **Linguagem respeitosa sobre pessoas:** "não aprovado nesta etapa", nunca "reprovado".
- **IA identificada e humilde:** conteúdo de IA marcado sutilmente, com confiança declarada e "por quê" — número sem explicação é proibido. IA apoia, não decide.
- **Emoji: não são usados** na interface.
- **Casing:** sentence case em títulos, rótulos e botões (padrão pt-BR).

Exemplos canônicos: "Publicar vaga" · "Agendar entrevista" · "Nenhuma candidatura ainda — divulgue a vaga para começar a receber." · "Não foi possível salvar. Verifique a conexão e tente de novo."

## VISUAL FOUNDATIONS

- **Cores:** neutros frios levemente tingidos de índigo compõem quase toda a interface; a marca (`#3B3A5C`) aparece cirurgicamente — ação primária, seleção, foco. Verde/vermelho/âmbar/azul têm significado fixo de estado, nunca decorativos. Saturação contida em toda a paleta.
- **Contraste calibrado, não máximo:** texto forte `#16161B` sobre branco; bordas e divisores suaves (`neutral-200/300`) — baixa fadiga em jornadas de 8h.
- **Tipografia é a hierarquia:** peso e tamanho comunicam estrutura, cor comunica estado. Escala curta: display 28/36 · title 20/28 · subtitle 16/24 · body 14/22 · support 13/20 · caption 12/16. Algarismos tabulares (`font-variant-numeric: tabular-nums`) obrigatórios em tabelas/KPIs.
- **Espaço organiza antes de qualquer linha:** base 4px; bordas e fundos só quando o espaço não basta. Densidade em dois níveis: confortável (controles 36px, linhas 48px) e compacta (28px/36px) — decidida por padrão de tela, não por gosto.
- **Forma:** raios curtos e calmos — 4/6/8/12px, `full` para pills e avatares. Nada de cantos "divertidos".
- **Elevação:** bordas sutis > sombras. Três sombras com significado fixo: raised (cartão), floating (popover/dropdown), overlay (modal/drawer). Intensidade mínima.
- **Fundos:** superfícies sólidas e planas (`--surface-page` cinza-frio, cartões brancos). **Sem** gradientes, texturas, padrões, ilustrações ou imagens de fundo.
- **Movimento:** feedback e continuidade, nunca espetáculo. instant 80ms (hover/press) · fast 140ms (estados) · base 200ms (modais/drawers), `cubic-bezier(0.2,0,0,1)`. Nada se move sozinho; `prefers-reduced-motion` é lei; skeletons em vez de spinners.
- **Hover:** mudança sutil de superfície (`--surface-hover`), nunca de escala. **Press:** superfície um passo mais escura (`--surface-pressed`); sem shrink.
- **Foco:** anel duplo sempre visível (`--focus-ring`: 2px surface + 2px brand-500).
- **Transparência e blur:** apenas o scrim de overlay (`rgba(22,22,27,.44)`); sem glassmorphism.
- **Imagens:** produtos ADL quase não usam imagens; avatares (círculo) são a exceção. Sem imagens decorativas.
- **Cards:** fundo `--surface-default`, borda 1px `--border-subtle`, raio 8px, sombra raised opcional; padding 16–24px.
- **Layout:** zonas estáveis — nav lateral fixa 240px + cabeçalho de contexto 56px + área de trabalho; largura de leitura máx. 68ch; dados tabulares podem esticar. Desktop-first.
- **Escuro:** nasce junto, mesma hierarquia semântica — nunca "port" do claro.

## ICONOGRAPHY

- **Família única: [Lucide](https://lucide.dev)** — traço consistente ~1.75px, estilo outline sóbrio, licença ISC, cobertura ampla. Carregada via CDN (`lucide-static`); nenhum SVG desenhado à mão é permitido.
- Uso no sistema: componente `Icon` (`components/foundation/Icon.jsx`) busca o SVG do CDN por nome (`<Icon name="search" />`), herda `currentColor`, tamanhos 16/20/24.
- **Ícones sempre acompanham rótulo em ações primárias**; ícone sozinho apenas onde a convenção é universal (fechar, buscar) — e sempre com `aria-label`.
- Sem icon font, sem emoji, sem unicode decorativo. Cor do ícone segue a cor do texto adjacente.
- Não há logos/ilustrações no vault fonte — **nenhum asset visual foi copiado porque nenhum existe**. Marcas renderizadas em texto.

## Intentional additions

- `Icon` (wrapper Lucide) — necessário para consumir a família de ícones escolhida de forma consistente.

## Índice

- `styles.css` — entrada global (só `@import`s) → `tokens/{fonts,colors,typography,spacing,base}.css`
- `guidelines/` — specimen cards das fundações (Design System tab)
- `components/foundation/` — AppShell, Page, Card, Divider, Icon
- `components/actions/` — Button, ButtonGroup, ActionMenu
- `components/inputs/` — TextField, TextArea, Select, Combobox, DateField, Checkbox, Radio, Switch, FileUpload
- `components/display/` — DataTable, ListView, StatusBadge, Avatar, Stat, Tooltip, Tag
- `components/feedback/` — Toast, Alert, ConfirmDialog, EmptyState, Skeleton, ProgressBar
- `components/navigation/` — Tabs, Breadcrumb, Pagination, GlobalSearch
- `components/overlay/` — Modal, Drawer, Popover
- `components/business/` — PersonCard, PipelineBoard, ScoreIndicator, KpiCard
- `ui_kits/selx/` — SelX 2.0: listagem mestre, detalhe de candidato, dashboard, pipeline kanban (index.html interativo)
- `SKILL.md` — skill para agentes

## Caveats

- Fontes servidas por CDN (Google Fonts); anexar binários IBM Plex para distribuição offline.
- Nenhum logo fornecido — placeholders tipográficos até o logo do SelX existir.
- As telas do UI kit são composições novas seguindo Layout/Patterns do vault (não existe produto implementado para copiar).
