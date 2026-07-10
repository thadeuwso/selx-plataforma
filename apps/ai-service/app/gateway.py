"""AI Gateway v1 (ADR-0003) — ponto único de acesso a LLMs.

Pipeline: purpose registrado -> créditos (hook) -> redação de PII ->
roteamento por adapter -> chamada -> telemetria. IA apoia, não decide.
"""

import hashlib
import os
import re
import time
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/v1/ia")

# Catálogo de purposes registrados (v1: em código; futuro: configuração por tenant)
PURPOSES_REGISTRADOS = {
    "plataforma.diagnostico@v1",
}

_PADROES_PII = [
    (re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b"), "[CPF]"),
    (re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b"), "[CNPJ]"),
    (re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]+\b"), "[EMAIL]"),
    (re.compile(r"\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b"), "[FONE]"),
]


def redigir_pii(texto: str) -> str:
    """Mascara dados pessoais antes de qualquer envio a provedor externo (LGPD)."""
    for padrao, mascara in _PADROES_PII:
        texto = padrao.sub(mascara, texto)
    return texto


class Mensagem(BaseModel):
    papel: str = Field(pattern="^(system|user|assistant)$")
    conteudo: str


class RequisicaoGerar(BaseModel):
    purpose: str
    cod_ten: int
    correlation_id: str | None = None
    mensagens: list[Mensagem] = Field(min_length=1)
    orcamento_tokens: int = Field(default=2048, gt=0, le=32768)
    sensibilidade: str = Field(default="normal", pattern="^(normal|sensivel)$")


@router.post("/gerar")
def gerar(req: RequisicaoGerar) -> dict:
    inicio = time.monotonic()
    correlation_id = req.correlation_id or str(uuid.uuid4())

    # 1. Purpose precisa estar registrado
    if req.purpose not in PURPOSES_REGISTRADOS:
        raise HTTPException(422, {"codigo": "PURPOSE_NAO_REGISTRADO", "purpose": req.purpose})

    # 2. Créditos/entitlements — hook (integra com billing futuramente)

    # 3. Redação de PII antes de qualquer provedor
    mensagens = [
        {"papel": m.papel, "conteudo": redigir_pii(m.conteudo)} for m in req.mensagens
    ]
    hash_entrada = hashlib.sha256(
        "\n".join(m["conteudo"] for m in mensagens).encode()
    ).hexdigest()

    # 4. Roteamento — v1: nenhum adapter configurado => estado de primeira classe
    provedor = (os.environ.get("AI_PROVIDER") or "").strip().lower()
    if not provedor or provedor == "disabled":
        raise HTTPException(
            503,
            {
                "codigo": "IA_DESABILITADA",
                "mensagem": "Nenhum provedor configurado (AI_PROVIDER); degrade para fluxo manual",
                "correlation_id": correlation_id,
            },
        )

    # 5/6. Adapters reais (OpenAI, Ollama...) entram aqui — próxima iteração.
    raise HTTPException(
        503,
        {
            "codigo": "PROVEDOR_INDISPONIVEL",
            "mensagem": f"Adapter '{provedor}' ainda não implementado",
            "correlation_id": correlation_id,
            "hash_entrada": hash_entrada,
            "latencia_ms": int((time.monotonic() - inicio) * 1000),
        },
    )
