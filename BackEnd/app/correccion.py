"""
CORREGIR UN TRABAJO DESDE EL CHAT (D-350, 2026-11-08).

Antes, corregir era volver a leer el mensaje ORIGINAL con la corrección al final: cada corrección empezaba de cero (la
anterior se perdía) y la IA solo conocía los campos de un ticket, así que «el porcentaje de la tarjeta es 12» acababa
en partes de Gil y «cc como cash» cambiaba el pago a CASH.

Ahora se EDITA el trabajo como está:
  1. El CÓDIGO entiende las correcciones de siempre («partes gil 0», «cp 40», «cc como cash», «son 320 cash»).
  2. Solo si queda algo que el código no entiende, la IA TRADUCE la frase a cambios de una lista CERRADA de campos,
     viendo la ficha actual. No decide nada más: lo que devuelva fuera de la lista o con un valor raro se descarta.
  3. «Partes» sin decir de quién: si solo un lado tiene partes, ese; si no, se pregunta (no se adivina).
El resto (aplicar, recalcular, la ficha, deshacer) lo hace `servicio_bot.edita`.
"""

from __future__ import annotations

import json
import re
import unicodedata
from typing import Any, Callable

# campo → (cómo se le dice al dueño, qué es, tipo)
CAMPOS: dict[str, tuple[str, str, str]] = {
    "valor_servicio": ("valor", "lo que se cobró por el servicio, en dólares", "numero"),
    "tipo_pago": ("pago", "cómo pagó el cliente: CASH, CC (tarjeta, scanpay, zelle) o MIXTO", "pago"),
    "valor_efectivo": ("cash", "en un pago MIXTO, cuánto fue en efectivo", "numero"),
    "valor_tarjeta": ("tarjeta", "en un pago MIXTO, cuánto fue con tarjeta", "numero"),
    "partes_tecnico": ("partes técnico", "lo que el técnico pagó en piezas, en dólares", "numero"),
    "partes_gil": ("partes Gil", "lo que Gil (la empresa) pagó en piezas, en dólares; «cp» = company parts", "numero"),
    "tech": ("to tech", "dinero asignado directo al técnico («100 to tech»)", "numero"),
    "porcentaje_cc": ("comisión tarjeta", "la comisión del pago con tarjeta, en DÓLARES (no en %)", "numero"),
    "is_cash": ("cc como cash", "si un pago con tarjeta se liquida como efectivo (sí/no)", "si_no"),
}
PARTES = "partes"          # «partes» sin decir de quién: lo resuelve `resuelve_partes`
MAX_VALOR = 100_000

_PAGO = {"cash": "CASH", "efectivo": "CASH", "cc": "CC", "card": "CC", "tarjeta": "CC", "credit": "CC",
         "scanpay": "CC", "zelle": "CC", "mixto": "MIXTO", "mixed": "MIXTO"}
_N = r"\$?\s*(\d+(?:[.,]\d{1,2})?)\s*\$?"
_PAGOS = r"(cash|efectivo|cc|card|tarjeta|credit|scanpay|zelle)"
_ES = r"\s*(?:es|son|era|eran|=|:|en|de|a|queda(?:n)?\s+en)?\s*"


def norm(t: str) -> str:
    t = unicodedata.normalize("NFKD", (t or "").lower())
    return re.sub(r"\s+", " ", "".join(c for c in t if not unicodedata.combining(c))).strip()


def _n(s: str) -> float:
    return float(s.replace(",", "."))


# Cada regla: (patrón, qué devuelve). Van de lo más específico a lo más general; la primera que casa gana.
_REGLAS: list[tuple[str, Callable[[re.Match], dict[str, Any]]]] = [
    (r"\b(?:desactiva|desactivar|quita|quitar|apaga|apagar|sin|no)\b.*\bcc como cash\b", lambda m: {"is_cash": False}),
    (r"\bcc como cash\b", lambda m: {"is_cash": True}),
    (rf"\b(?:partes?|parts?)\s+(?:de\s+|del\s+)?(?:gil|company){_ES}{_N}", lambda m: {"partes_gil": _n(m[1])}),
    (rf"{_N}\s*(?:cp|(?:partes?|parts?)\s+(?:de\s+)?(?:gil|company)|company\s+parts?)\b", lambda m: {"partes_gil": _n(m[1])}),
    (rf"\bcp{_ES}{_N}", lambda m: {"partes_gil": _n(m[1])}),
    (rf"\b(?:partes?|parts?)\s+(?:de\s+|del\s+)?(?:tecnico|tech){_ES}{_N}", lambda m: {"partes_tecnico": _n(m[1])}),
    (rf"(?<![\w.])(\d+(?:[.,]\d{{1,2}})?)\s*\$?\s*p\b", lambda m: {"partes_tecnico": _n(m[1])}),
    (rf"\b(?:comision|porcentaje|fee)\s+(?:de\s+)?(?:la\s+)?(?:tarjeta|cc|card){_ES}{_N}", lambda m: {"porcentaje_cc": _n(m[1])}),
    (rf"\b(?:to|for)\s+tech(?:nician)?{_ES}{_N}", lambda m: {"tech": _n(m[1])}),
    (rf"{_N}\s*(?:to|for)\s+tech(?:nician)?\b", lambda m: {"tech": _n(m[1])}),
    (rf"\b(?:partes?|parts?){_ES}{_N}", lambda m: {PARTES: _n(m[1])}),
    (rf"{_N}\s*{_PAGOS}\b", lambda m: {"valor_servicio": _n(m[1]), "tipo_pago": _PAGO[m[2]]}),
    (rf"\b(?:valor|son|fue|fueron|cobro|total|precio){_ES}{_N}", lambda m: {"valor_servicio": _n(m[1])}),
    # el pago solo, sin número: la frase ENTERA tiene que ser eso («fue cash», «pago con tarjeta»)
    (rf"^(?:el\s+)?(?:pago|pagaron|pagado|es|fue|era)?\s*(?:en\s+|con\s+)?{_PAGOS}$", lambda m: {"tipo_pago": _PAGO[m[1]]}),
    (r"^(?:el\s+)?(?:pago\s+|es\s+|fue\s+)?(?:es\s+)?(mixto|mixed)$", lambda m: {"tipo_pago": "MIXTO"}),
]
# Palabras que, si quedan en una parte que ninguna regla entendió, significan que había algo que corregir.
_CLAVE = re.compile(r"\d|cash|efectivo|\bcc\b|tarjeta|card|partes?|parts?|\bgil\b|tech|valor|comision|porcentaje|fee|mixto|\bcp\b")


def por_codigo(texto: str) -> dict[str, Any] | None:
    """Los cambios que entiende el código, o None si hay una parte que no entiende (entonces va a la IA, ENTERA)."""
    cambios: dict[str, Any] = {}
    for parte in re.split(r"\s*(?:,|;|\n|\.\s|\by\b|\band\b|\btambien\b)\s*", norm(texto)):
        parte = parte.strip(" .!¡¿?")
        if not parte:
            continue
        for patron, hace in _REGLAS:
            m = re.search(patron, parte)
            if m:
                if re.search(r"\d", parte[:m.start()] + parte[m.end():]):
                    return None               # quedó un número sin entender: mejor la IA con la frase entera
                cambios.update(hace(m))
                break
        else:
            if _CLAVE.search(parte):
                return None
    return cambios or None


PROMPT = """Traduces la corrección que escribe el dueño de un negocio de cerrajería a cambios sobre UN trabajo.
Devuelve SOLO un JSON: {"cambios": [{"campo": "...", "valor": ...}]}. Sin texto extra.

Campos permitidos (no hay otros):
%s
- "partes": úsalo SOLO si dice «partes» sin decir si son del técnico o de Gil.

Reglas:
- Solo lo que la corrección pide. Lo que no menciona, no lo pongas.
- Números en dólares, sin el signo. Sí/no → true/false. Pago → "CASH", "CC" o "MIXTO".
- «ccf» solo, sin decir qué es, no está claro: no lo traduzcas. Si la misma frase dice qué es («12 ccf son la
  comisión / el porcentaje de la tarjeta»), usa lo que dice la frase.
- Si algo no lo entiendes, déjalo fuera. Nunca inventes."""


def ficha_texto(fila: dict[str, Any]) -> str:
    return "\n".join(f"- {CAMPOS[k][0]}: {fila.get(k)}" for k in CAMPOS)


Interprete = Callable[[str, dict[str, Any]], tuple[list[dict[str, Any]], dict[str, Any]]]


def por_ia(texto: str, fila: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """La IA traduce la frase a [{campo, valor}]. Devuelve también el uso (tokens) para el gasto."""
    from app.controllers import MODELO_LECTOR, client       # import aquí: controllers carga OpenAI y pandas
    uso = {"modelo": MODELO_LECTOR, "tokens_entrada": 0, "tokens_salida": 0}
    lista = "\n".join(f'- "{k}": {d} ({CAMPOS[k][2]})' for k, (_, d, _t) in CAMPOS.items())
    try:
        r = client.chat.completions.create(
            model=MODELO_LECTOR, max_completion_tokens=1500,
            messages=[{"role": "system", "content": PROMPT % lista},
                      {"role": "user", "content": f"FICHA ACTUAL:\n{ficha_texto(fila)}\n\nCORRECCIÓN: {texto}"}])
        if getattr(r, "usage", None):
            uso["tokens_entrada"], uso["tokens_salida"] = r.usage.prompt_tokens or 0, r.usage.completion_tokens or 0
        crudo = re.sub(r"```json|```", "", r.choices[0].message.content or "").strip()
        datos = json.loads(crudo)
        return (datos.get("cambios") if isinstance(datos, dict) and isinstance(datos.get("cambios"), list) else []), uso
    except Exception:                                        # noqa: BLE001 — sin lectura = no se cambia nada
        return [], uso


def valida(cambios: list[dict[str, Any]] | dict[str, Any]) -> dict[str, Any]:
    """Solo campos de la lista y valores con sentido. Lo demás se descarta, en silencio: lo que quede es lo que se aplica."""
    pares = cambios.items() if isinstance(cambios, dict) else (
        (c.get("campo"), c.get("valor")) for c in cambios if isinstance(c, dict))
    salida: dict[str, Any] = {}
    for campo, valor in pares:
        tipo = "numero" if campo == PARTES else CAMPOS.get(campo, (None, None, None))[2]
        if tipo == "numero":
            try:
                v = float(str(valor).replace(",", ".").replace("$", "").strip())
            except (TypeError, ValueError):
                continue
            if 0 <= v <= MAX_VALOR:
                salida[campo] = v
        elif tipo == "pago":
            v = _PAGO.get(norm(str(valor)), str(valor).upper())
            if v in ("CASH", "CC", "MIXTO"):
                salida[campo] = v
        elif tipo == "si_no":
            if isinstance(valor, bool):
                salida[campo] = valor
            elif norm(str(valor)) in ("si", "true", "1", "activo", "activa"):
                salida[campo] = True
            elif norm(str(valor)) in ("no", "false", "0", "inactivo", "desactiva"):
                salida[campo] = False
    return salida


def resuelve_partes(cambios: dict[str, Any], fila: dict[str, Any]) -> dict[str, Any] | None:
    """«Partes N» sin decir de quién. Si solo un lado tiene partes, es ese. Si no, None: hay que preguntar."""
    if PARTES not in cambios:
        return cambios
    v = cambios.pop(PARTES)
    tec, gil = float(fila.get("partes_tecnico") or 0), float(fila.get("partes_gil") or 0)
    if tec and not gil:
        return {**cambios, "partes_tecnico": v}
    if gil and not tec:
        return {**cambios, "partes_gil": v}
    cambios[PARTES] = v
    return None


def interpreta(texto: str, fila: dict[str, Any], interprete: Interprete | None = None
               ) -> tuple[dict[str, Any], dict[str, Any] | None]:
    """(cambios validados, uso de la IA o None si no hizo falta)."""
    codigo = por_codigo(texto)
    if codigo is not None:
        return valida(codigo), None
    lista, uso = (interprete or por_ia)(texto, fila)
    return valida(lista), uso
