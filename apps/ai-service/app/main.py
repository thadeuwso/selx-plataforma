"""SelX 2.0 — ai-service.

Casa do AI Gateway (ADR-0003). Regras que este serviço fará valer:
- ponto único de chamada a provedores de LLM (adapters);
- pipeline fixo: créditos -> redação de PII -> chamada com retry/fallback
  -> validação da saída por schema -> telemetria e custo por tenant;
- prompts versionados (purpose@versao);
- "IA apoia, não decide" — nenhuma decisão automática sobre pessoas.
"""

from datetime import datetime, timezone

from fastapi import FastAPI

from app.gateway import router as gateway_router

app = FastAPI(title="SelX AI Service", version="0.1.0")
app.include_router(gateway_router)


@app.get("/health")
def verificar_saude() -> dict:
    return {
        "ok": True,
        "servico": "selx-ai-service",
        "dataHora": datetime.now(timezone.utc).isoformat(),
    }
