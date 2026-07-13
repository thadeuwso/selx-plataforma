from fastapi.testclient import TestClient

from app.gateway import _validar_saida, redigir_pii
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


def test_esquema_saida_sem_validacao_retorna_string():
    assert _validar_saida("texto livre", None) is None


def test_esquema_saida_valida_json_conforme():
    esquema = {"type": "object", "required": ["titulo"], "properties": {"titulo": {"type": "string"}}}
    resultado = _validar_saida('{"titulo": "Analista"}', esquema)
    assert resultado == {"titulo": "Analista"}


def test_esquema_saida_rejeita_json_invalido_para_o_schema():
    import pytest
    from fastapi import HTTPException

    esquema = {"type": "object", "required": ["titulo"], "properties": {"titulo": {"type": "string"}}}
    with pytest.raises(HTTPException) as exc:
        _validar_saida('{"outraCoisa": 1}', esquema)
    assert exc.value.status_code == 422
    assert exc.value.detail["codigo"] == "SAIDA_INVALIDA"


def test_esquema_saida_rejeita_texto_que_nao_e_json():
    import pytest
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        _validar_saida("isso não é JSON", {"type": "object"})
    assert exc.value.status_code == 422
    assert exc.value.detail["codigo"] == "SAIDA_INVALIDA"
