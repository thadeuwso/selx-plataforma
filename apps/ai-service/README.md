# @selx/ai-service

Serviço de IA (FastAPI) — **casa do AI Gateway** (ADR-0003 no vault).

## Rodando localmente

⚠️ **`pnpm dev` na raiz NÃO sobe este serviço** — ele é Python e fica fora do workspace pnpm/turbo. Sem ele no ar, toda funcionalidade de IA da plataforma (resumo comportamental, perguntas de entrevista, estruturação de vaga) falha com "Não foi possível gerar…". Suba à mão, num terminal próprio.

```bash
# com uv (https://docs.astral.sh/uv/)
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

## Configuração

O `.env` deste diretório é carregado no startup (`app/main.py`). Variáveis já presentes no ambiente **vencem** o arquivo — em produção, configure pelo ambiente do contêiner.

| Variável | Para quê |
|---|---|
| `AI_PROVIDER` | `openai` \| `ollama`. Vazio ou `disabled` faz o gateway degradar para fluxo manual (`IA_DESABILITADA`) sem quebrar a plataforma |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Provedor OpenAI |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Provedor local — usado obrigatoriamente quando o dado é classificado como **sensível**, que por política (ADR-0003) nunca sai da máquina |

## Health check

`GET http://localhost:8000/health` responde também o estado da **configuração**, não só "estou de pé":

```json
{ "ok": true, "provedor": "openai", "provedorConfigurado": true }
```

`provedorConfigurado: false` com o serviço respondendo 200 é exatamente o caso que já ocorreu em desenvolvimento: no ar, mas falhando só na hora de usar. A chave nunca é exposta — apenas se ela existe.

## O que entra aqui (e o que não entra)

- ✅ Adapters de provedores (OpenAI, Ollama, ...), roteamento por política, redação de PII, validação de saída, telemetria e custo por tenant, prompts versionados.
- ❌ Regra de negócio de módulos (vive na `apps/api`). O gateway serve a plataforma inteira e não conhece domínio.
