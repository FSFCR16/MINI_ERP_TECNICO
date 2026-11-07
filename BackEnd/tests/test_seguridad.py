"""Plan del bot, fase 1: la API cerrada (sesión o llave del chat), el freno, CORS solo para el panel y los enlaces."""

import time

import pytest

from app import seguridad, correo
from app.main import app as aplicacion


def _rutas(app):
    abiertas = {"/auth/entrar", "/auth/codigo", "/auth/canjear", "/api/excel/{token}", "/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}
    # /api/excel/{token} no pide sesión, pero sin una firma buena responde 403 (lo prueba test_bot.py)
    for r in app.routes:
        for m in sorted(getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}):
            if r.path not in abiertas:
                yield m, r.path


def test_ninguna_ruta_responde_sin_sesion(cliente):
    rutas = list(_rutas(aplicacion))
    assert len(rutas) > 60                                    # todas las del general, Virginia y notas
    for metodo, ruta in rutas:
        url = ruta.replace("{", "").replace("}", "")          # cualquier valor sirve: la puerta va antes
        r = cliente.request(metodo, url, json={})
        assert r.status_code == 401, (metodo, ruta, r.status_code)


def test_entrar_bien_y_mal(cliente, usuario):
    malo = cliente.post("/auth/entrar", json={"email": usuario[0], "clave": "otra-clave"})
    assert malo.status_code == 401
    bueno = cliente.post("/auth/entrar", json={"email": " DUENO@erp.local ", "clave": usuario[1]})
    assert bueno.status_code == 200 and bueno.json()["nombre"] == "Dueño"
    h = {"Authorization": f"Bearer {bueno.json()['token']}"}
    assert cliente.get("/auth/yo", headers=h).json()["email"] == usuario[0]
    assert cliente.get("/api/version", headers=h).status_code == 200      # una ruta de verdad, con sesión


def test_el_freno_a_los_5_intentos(cliente, usuario):
    for _ in range(5):
        cliente.post("/auth/entrar", json={"email": "otro@erp.local", "clave": "x"})
    r = cliente.post("/auth/entrar", json={"email": "otro@erp.local", "clave": "x"})
    assert r.status_code == 429
    seguridad.limpia_fallos("otro@erp.local")


def test_token_alterado_o_vencido_no_entra(cliente, sesion):
    token = sesion["Authorization"][7:]
    cuerpo, firma = token.split(".")
    alterado = cuerpo[:-2] + ("AA" if cuerpo[-2:] != "AA" else "BB") + "." + firma
    assert cliente.get("/api/version", headers={"Authorization": f"Bearer {alterado}"}).status_code == 401
    vencido = seguridad.firma({"t": "sesion", "u": 1}, -1)
    assert cliente.get("/api/version", headers={"Authorization": f"Bearer {vencido}"}).status_code == 401
    enlace = seguridad.enlace_excel("AFIK", "2026_11_semana_45")          # un enlace no sirve de sesión
    assert cliente.get("/api/version", headers={"Authorization": f"Bearer {enlace}"}).status_code == 401


def test_la_llave_del_chat(cliente):
    assert cliente.get("/api/version", headers={"X-Llave-Chat": "llave-del-chat-de-pruebas"}).status_code == 200
    assert cliente.get("/api/version", headers={"X-Llave-Chat": "otra"}).status_code == 401
    assert cliente.get("/auth/yo", headers={"X-Llave-Chat": "llave-del-chat-de-pruebas"}).json()["tipo"] == "chat"


def test_cors_solo_para_el_panel(cliente):
    pre = {"Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization"}
    bueno = cliente.options("/api/version", headers={"Origin": "http://panel.local", **pre})
    malo = cliente.options("/api/version", headers={"Origin": "https://otro-sitio.com", **pre})
    assert bueno.headers.get("access-control-allow-origin") == "http://panel.local"
    assert "access-control-allow-origin" not in malo.headers


def test_claves_y_enlaces():
    h = seguridad.hashea("mi-clave-larga")
    assert h.startswith("pbkdf2$") and "mi-clave" not in h
    assert seguridad.verifica("mi-clave-larga", h) and not seguridad.verifica("otra", h)
    assert seguridad.hashea("mi-clave-larga") != h                       # cada una con su sal
    e = seguridad.enlace_excel("AFIK", "2026_11_semana_45")
    assert seguridad.valida_enlace_excel(e, "AFIK", "2026_11_semana_45")
    assert not seguridad.valida_enlace_excel(e, "NICK", "2026_11_semana_45")
    assert not seguridad.valida_enlace_excel(seguridad.enlace_excel("AFIK", "x", -1), "AFIK", "x")


def test_sin_secreto_no_arranca(monkeypatch):
    monkeypatch.setenv("ERP_SECRETO", "corto")
    with pytest.raises(RuntimeError):
        seguridad.token_de_sesion(1)


# ── «Abrir el ERP» desde la app de GAELA: pase de un solo uso, 60 s ──
CHAT = {"X-Llave-Chat": "llave-del-chat-de-pruebas"}


def test_el_pase_entra_sin_clave_y_sirve_una_sola_vez(cliente):
    r = cliente.post("/auth/pase-chat", headers=CHAT, json={"email": "Dueno.App@GAELA.co", "nombre": "Dueño App"})
    assert r.status_code == 200
    pase = r.json()["pase"]
    s = cliente.post("/auth/canjear", json={"pase": pase})
    assert s.status_code == 200 and s.json()["dura"] == 30 * 24 * 3600
    yo = cliente.get("/auth/yo", headers={"authorization": f"Bearer {s.json()['token']}"}).json()
    assert yo["email"] == "dueno.app@gaela.co"
    assert cliente.post("/auth/canjear", json={"pase": pase}).status_code == 401        # segunda vez: no
    # el usuario creado así no tiene clave: entrar con correo y cualquier clave no funciona
    assert cliente.post("/auth/entrar", json={"email": "dueno.app@gaela.co", "clave": "sin-clave:"}).status_code == 401


def test_el_pase_solo_lo_pide_el_chat_y_vence(cliente, sesion, monkeypatch):
    assert cliente.post("/auth/pase-chat", json={"email": "a@b.co"}).status_code == 401
    assert cliente.post("/auth/pase-chat", headers=sesion, json={"email": "a@b.co"}).status_code == 403
    assert cliente.post("/auth/canjear", json={"pase": "inventado.x"}).status_code == 401
    pase = cliente.post("/auth/pase-chat", headers=CHAT, json={"email": "a@b.co"}).json()["pase"]
    real = time.time
    monkeypatch.setattr(seguridad.time, "time", lambda: real() + 61)
    assert cliente.post("/auth/canjear", json={"pase": pase}).status_code == 401


def test_con_correo_activo_pide_el_codigo_y_sirve_una_sola_vez(cliente, usuario, monkeypatch):
    enviados = []
    monkeypatch.setenv("ERP_RESEND_KEY", "re_prueba")
    monkeypatch.setattr(correo, "enviar_codigo", lambda para, codigo: enviados.append((para, codigo)) or True)
    r = cliente.post("/auth/entrar", json={"email": usuario[0], "clave": usuario[1]}).json()
    assert "token" not in r and r["reto"] and "•••@" in r["correo"] and enviados[0][0] == usuario[0]
    malo = cliente.post("/auth/codigo", json={"reto": r["reto"], "codigo": "000000"})
    assert malo.status_code == 401
    bien = cliente.post("/auth/codigo", json={"reto": r["reto"], "codigo": enviados[0][1]})
    assert bien.status_code == 200 and bien.json()["token"]
    assert cliente.post("/auth/codigo", json={"reto": r["reto"], "codigo": enviados[0][1]}).status_code == 401
    seguridad.limpia_fallos(usuario[0])


def test_una_clave_mala_no_manda_ningun_codigo(cliente, usuario, monkeypatch):
    enviados = []
    monkeypatch.setenv("ERP_RESEND_KEY", "re_prueba")
    monkeypatch.setattr(correo, "enviar_codigo", lambda para, codigo: enviados.append(para) or True)
    assert cliente.post("/auth/entrar", json={"email": usuario[0], "clave": "otra-clave"}).status_code == 401
    assert enviados == []
    seguridad.limpia_fallos(usuario[0])


def test_si_el_correo_falla_no_entra(cliente, usuario, monkeypatch):
    monkeypatch.setenv("ERP_RESEND_KEY", "re_prueba")
    monkeypatch.setattr(correo, "enviar_codigo", lambda para, codigo: False)
    assert cliente.post("/auth/entrar", json={"email": usuario[0], "clave": usuario[1]}).status_code == 503


def test_otro_token_no_sirve_de_reto(cliente, usuario):
    falso = seguridad.firma({"t": "sesion", "u": 1, "j": "x", "h": "y"}, 60)
    assert cliente.post("/auth/codigo", json={"reto": falso, "codigo": "123456"}).status_code == 401
