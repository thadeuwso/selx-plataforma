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


def _pedido_diagnostico():
    return cliente.post(
        "/v1/ia/gerar",
        json={
            "purpose": "plataforma.diagnostico@v1",
            "cod_ten": 1,
            "mensagens": [{"papel": "user", "conteudo": "diagnóstico"}],
        },
    )


def test_ia_desabilitada_e_estado_de_primeira_classe(monkeypatch):
    # `AI_PROVIDER` explicitamente vazio, não "por acaso ausente": este teste
    # passava só porque nada carregava o `.env` da aplicação. Quando o carregamento
    # foi corrigido, ele quebrou — dependia do bug para ficar verde.
    monkeypatch.setenv("AI_PROVIDER", "")
    r = _pedido_diagnostico()
    assert r.status_code == 503
    assert r.json()["detail"]["codigo"] == "IA_DESABILITADA"


def test_provedor_configurado_passa_do_portao_de_desabilitado(monkeypatch):
    """O outro lado da mesma regra.

    Provar que sem provedor a IA degrada é metade do teste; a outra metade é que
    **com** provedor a requisição avança. Usa-se um adapter inexistente de
    propósito: chega-se ao roteamento (PROVEDOR_INDISPONIVEL) sem chamada de rede
    nem custo.
    """
    monkeypatch.setenv("AI_PROVIDER", "provedor-de-mentira")
    r = _pedido_diagnostico()
    assert r.status_code == 503
    assert r.json()["detail"]["codigo"] == "PROVEDOR_INDISPONIVEL"


def test_saude_expoe_se_o_provedor_esta_configurado(monkeypatch):
    """`/health` respondia 200 mesmo sem provedor — o serviço parecia no ar e só
    falhava na hora de usar. Agora a configuração aparece no health."""
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-teste")
    corpo = cliente.get("/health").json()
    assert corpo["provedor"] == "openai" and corpo["provedorConfigurado"] is True

    monkeypatch.setenv("AI_PROVIDER", "")
    corpo = cliente.get("/health").json()
    assert corpo["ok"] is True and corpo["provedorConfigurado"] is False


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
