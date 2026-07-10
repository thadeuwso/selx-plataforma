from fastapi.testclient import TestClient

from app.gateway import redigir_pii
from app.main import app

cliente = TestClient(app)


def test_saude():
    r = cliente.get("/health")
    assert r.status_code == 200 and r.json()["ok"] is True


def test_redacao_de_pii():
    texto = "CPF 123.456.789-01, email joao@empresa.com.br, fone (11) 98888-7777"
    saida = redigir_pii(texto)
    assert "[CPF]" in saida and "[EMAIL]" in saida and "[FONE]" in saida
    assert "123.456" not in saida and "joao@" not in saida


def test_purpose_nao_registrado():
    r = cliente.post(
        "/v1/ia/gerar",
        json={
            "purpose": "inexistente@v1",
            "cod_ten": 1,
            "mensagens": [{"papel": "user", "conteudo": "olá"}],
        },
    )
    assert r.status_code == 422


def test_ia_desabilitada_e_estado_de_primeira_classe():
    r = cliente.post(
        "/v1/ia/gerar",
        json={
            "purpose": "plataforma.diagnostico@v1",
            "cod_ten": 1,
            "mensagens": [{"papel": "user", "conteudo": "diagnóstico"}],
        },
    )
    assert r.status_code == 503
    assert r.json()["detail"]["codigo"] == "IA_DESABILITADA"
