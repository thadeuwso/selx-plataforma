"""SelexOps — ai-service.

Casa do AI Gateway (ADR-0003). Regras que este serviço fará valer:
- ponto único de chamada a provedores de LLM (adapters);
- pipeline fixo: créditos -> redação de PII -> chamada com retry/fallback
  -> validação da saída por schema -> telemetria e custo por tenant;
- prompts versionados (purpose@versao);
- "IA apoia, não decide" — nenhuma decisão automática sobre pessoas.
"""

import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

from app.gateway import router as gateway_router

# O `.env` deste app existia e era documentado no README, mas nada o lia: o
# gateway consulta `os.environ` direto, então subir com `uv run uvicorn` sem
# exportar as variáveis à mão fazia toda chamada de IA responder
# IA_DESABILITADA ("nenhum provedor configurado") — o serviço parecia no ar,
# respondia /health, e só falhava na hora de usar.
#
# `override=False` de propósito: variável já presente no ambiente (contêiner,
# CI, produção) vence o arquivo — o `.env` é conveniência de desenvolvimento,
# não fonte de verdade em produção.
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)

app = FastAPI(title="SelexOps AI Service", version="0.1.0")
app.include_router(gateway_router)


@app.get("/health")
def verificar_saude() -> dict:
    """Saúde do serviço **e** da configuração.

    Antes só dizia "estou de pé", o que escondia exatamente a falha acima.
    `provedor` deixa visível, em uma chamada, se as chamadas de IA vão
    funcionar — sem jamais expor a chave, só se ela existe.
    """
    provedor = (os.environ.get("AI_PROVIDER") or "").strip().lower()
    chave_por_provedor = {"openai": "OPENAI_API_KEY", "ollama": "OLLAMA_BASE_URL"}
    credencial = chave_por_provedor.get(provedor)
    return {
        "ok": True,
        "servico": "selexops-ai-service",
        "dataHora": datetime.now(timezone.utc).isoformat(),
        "provedor": provedor or None,
        "provedorConfigurado": bool(provedor) and provedor != "disabled" and bool(os.environ.get(credencial or "")),
    }
