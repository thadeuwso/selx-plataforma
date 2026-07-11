# UI Kit — SelX 2.0

Recriação de referência das telas principais do SelX 2.0 (recrutamento & seleção), compondo exclusivamente os componentes do ADL.

**Importante:** o SelX 2.0 ainda não tem implementação — estas telas são **composições novas** que seguem os padrões especificados no vault do ADL (Layout, Patterns, Components), não cópias de um produto existente.

## Telas

- `index.html` — app interativo completo (navegação real entre telas)
- **Dashboard** — KPIs de recrutamento + pendências (padrão "dashboard")
- **Vagas** — listagem mestre: tabela + busca + filtros + seleção em lote + paginação
- **Pipeline** — kanban de candidatos com score de IA e drag entre estágios
- **Candidato** — detalhe de entidade: cabeçalho + abas + linha do tempo + análise de IA (drawer aberto a partir de vagas/pipeline)

Interações demonstradas: navegação lateral, busca global, abrir candidato (drawer), mover cartão no kanban, seleção em lote na tabela, modal de confirmação destrutiva.
