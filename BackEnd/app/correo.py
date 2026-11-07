"""El correo del código para entrar al ERP. Sin dependencias: una llamada a Resend. Sin ERP_RESEND_KEY no hay código."""

import json
import logging
import os
import urllib.error
import urllib.request

log = logging.getLogger("erp.correo")


def activo() -> bool:
    return bool(os.getenv("ERP_RESEND_KEY"))


def enviar_codigo(para: str, codigo: str) -> bool:
    cuerpo = json.dumps({
        "from": os.getenv("ERP_CORREO_DE") or "MINI ERP <avisos@gaela.com.co>",
        "to": [para],
        "subject": f"Tu código para entrar al ERP: {codigo}",
        "text": f"Escribe este código para entrar al ERP:\n\n{codigo}\n\nVale 10 minutos. Si no fuiste tú, cambia tu clave.",
    }).encode()
    pedido = urllib.request.Request("https://api.resend.com/emails", cuerpo, {
        "authorization": f"Bearer {os.getenv('ERP_RESEND_KEY')}", "content-type": "application/json", "user-agent": "mini-erp"})
    try:
        with urllib.request.urlopen(pedido, timeout=15) as r:
            return r.status < 300
    except (urllib.error.URLError, TimeoutError) as e:
        log.warning("[correo] no se pudo enviar el código: %s", e)
        return False
