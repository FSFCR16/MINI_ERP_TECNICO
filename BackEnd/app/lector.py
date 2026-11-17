"""
LEER UN TICKET (2026-11-09): UNA llamada a la IA con el prompt ORDENADO POR SECCIONES, y las reglas exactas en el código.

La IA decide el pago (CASH, CC o MIXTO) por CONTEXTO, como siempre: el mensaje no siempre dice «cash» o «cc».
El prompt es uno solo, partido en secciones para poder leerlo y cambiarlo sin perderse:
    GENERAL  ·  PAGO (cómo decidir)  ·  CASH  ·  CC  ·  MIXTO  ·  CAMPOS

Las reglas del dueño que son EXACTAS no se le preguntan a la IA: las aplica el código (`senales`), gratis y siempre igual:
  - un % suelto («40%»)       → lo que se lleva el TÉCNICO en ese trabajo, en vez del % del contrato;
  - «no fee» y parecidos      → no se cobra la comisión de la tarjeta (0);
  - «ccf 13» / «13 ccf»       → la comisión de la tarjeta son 13 DÓLARES, tal cual (ya NO son partes de Gil);
  - Cash App, Zelle o Venmo   → la plata la tiene Gil: es CC, pero esas apps no cobran comisión (0).
  Si dice «ccf N», ese valor manda sobre «no fee» y sobre las apps.
  - el valor, SOLO si la IA lo dejó vacío (MXQ4F del 2026-11-16: lo pierde 1 de cada 5 veces): «total $N» manda; si
    no, la suma de cada «número + pago» del mensaje («278 cc», «22cc / 44cash» = 66 MIXTO, «240$ scanpay»). Nunca
    pisa a la IA. Probada contra los 263 trabajos con texto (sem. 45-46): 170 de 171 iguales (el otro lo cambió una
    persona). Si tampoco hay nada, el trabajo cae en la cola de problemas.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

_NUM = r"(\d+(?:[.,]\d{1,2})?)"
_APPS = re.compile(r"\b(?:cash\s*app|cashapp|zelle|venmo)\b")
_SIN_FEE = re.compile(r"\b(?:no|sin|without|zero)\s*(?:cc\s*|card\s*|tarjeta\s*)?(?:fee|fees|ccf)\b|\bfee\s*free\b|\bfree\s+fee\b|\bnofee\b")
# Los dos lados de «ccf», por separado: con una sola búsqueda «211$ ccf» se come la palabra y «ccf 8$» ya no aparece.
_CCF_DESPUES = re.compile(rf"\bccf\s*[:=]?\s*\$?\s*{_NUM}(?!\s*%)")
_CCF_ANTES = re.compile(rf"(?<![\w.]){_NUM}\s*\$?\s*ccf\b")
# Lo que va pegado DESPUÉS de un número y lo hace partes, no comisión: «ccf 5$ parts», «ccf 10 keys», «ccf 15p».
_ES_PARTE = re.compile(r"\s*\$?\s*(?:parts?|partes?|keys?|p|cp)\b")
# El valor cuando la IA lo pierde. «número + forma de pago» en cualquier parte; «ccf» no cuenta (cc\b) y «cash app» es
# tarjeta. «total»: el número va DESPUÉS («total: $154») o pegado a un $ antes («740$ total»): sin eso agarraba la
# factura o el código postal («invoice 637641 total $280»).
_TARJETA = r"cc|card|credit|scanpay|zelle|cash\s*app|cashapp|venmo"
_PAGO = re.compile(rf"(?<![\w.])\$?\s*{_NUM}\s*\$?\s*({_TARJETA}|cash)\b")
_TOTAL = re.compile(rf"\btotal\s*:?\s*\$?\s*{_NUM}|(?<![\w.])(?:\$\s*{_NUM}|{_NUM}\s*\$)\s*total\b")
_PORCENTAJE = re.compile(r"(?<![\w.])(\d{1,3}(?:[.,]\d{1,2})?)\s*%")


def norm(t: str) -> str:
    t = unicodedata.normalize("NFKD", (t or "").lower())
    return re.sub(r"\s+", " ", "".join(c for c in t if not unicodedata.combining(c))).strip()


def _n(s: str) -> float:
    return float(s.replace(",", "."))


def senales(texto: str) -> dict[str, Any]:
    """Lo exacto del mensaje, sin preguntarle a nadie.

    app                  True si pagó (o pagó una parte) por Cash App, Zelle o Venmo
    sin_fee              True si no se cobra la comisión de la tarjeta («no fee» o una app)
    ccf                  la comisión de la tarjeta en dólares, si la dijo («ccf 13»); si no, None
    porcentaje_tecnico   el % suelto (lo que se lleva el técnico); None si no hay o si hay dos distintos
    valor                el valor según el texto: «total N» o la suma de «número + pago»; None si no hay
    cash, tarjeta        lo de cada lado (para el MIXTO); 0 si no aparece
    """
    t = norm(texto)
    app = bool(_APPS.search(t))
    pcts = {_n(x) for x in _PORCENTAJE.findall(t)}
    pct = next(iter(pcts)) if len(pcts) == 1 else None
    if pct is not None and not 0 <= pct <= 100:
        pct = None
    cash = tarjeta = 0.0
    for p in _PAGO.finditer(t):
        if p[2] == "cash":
            cash += _n(p[1])
        else:
            tarjeta += _n(p[1])
    tot = _TOTAL.search(t)
    valor = _n(next(g for g in tot.groups() if g)) if tot else (round(cash + tarjeta, 2) or None)
    opciones = _opciones_ccf(t)
    return {"app": app, "sin_fee": app or bool(_SIN_FEE.search(t)), "ccf": _elige_ccf(opciones, valor),
            "ccf_opciones": opciones, "porcentaje_tecnico": pct, "valor": valor, "cash": round(cash, 2),
            "tarjeta": round(tarjeta, 2)}


def _opciones_ccf(t: str) -> list[float]:
    """Los números que pueden ser la comisión, en el orden del texto: el de antes («8$ ccf») y el de después («ccf 8»).
    Contractors escribe de las dos formas («6$ ccf 5$ parts» → 6; «K 211$ Ccf 8$» → 8), así que se juntan los dos y
    se descarta el de después si es partes («ccf 5$ parts»)."""
    antes = [(m.start(1), _n(m[1])) for m in _CCF_ANTES.finditer(t)]
    despues = [(m.start(1), _n(m[1])) for m in _CCF_DESPUES.finditer(t) if not _ES_PARTE.match(t, m.end())]
    return [v for _, v in sorted(antes + despues)]


def _elige_ccf(opciones: list[float], *valores: Any) -> float | None:
    """24CPT del 2026-11-16: «K 211$ Ccf 8$» daba 211. Con dos candidatos, el que es el valor del servicio no es la
    comisión. Si después de eso queda más de uno, el primero (como siempre)."""
    if not opciones:
        return None
    servicio = {round(float(v), 2) for v in valores if v}
    quedan = [x for x in opciones if round(x, 2) not in servicio] if len(opciones) > 1 else opciones
    return (quedan or opciones)[0]


def comision(senal: dict[str, Any], calculada: float) -> float:
    """La comisión de la tarjeta, en dólares: «ccf N» manda; si no hay fee, 0; si no, la del % del contrato."""
    if senal.get("ccf") is not None:
        return float(senal["ccf"])
    if senal.get("sin_fee"):
        return 0.0
    return calculada


def completa(ia: dict[str, Any], senal: dict[str, Any]) -> dict[str, Any]:
    """La lectura de la IA con lo exacto del código encima, con su nombre propio para que el panel y el bot lo
    apliquen igual. Con una app (Zelle, Cash App, Venmo) o con «ccf» hubo tarjeta: nunca es CASH; si la IA dijo
    CASH, es CC (si dijo MIXTO, se queda MIXTO)."""
    if not ia:
        return ia
    if senal.get("ccf_opciones"):     # con lo que leyó la IA se sabe mejor cuál número es el valor
        senal = {**senal, "ccf": _elige_ccf(senal["ccf_opciones"], senal.get("valor"), ia.get("valor_servicio"))}
    tipo = str(ia.get("tipo_pago") or "CASH").upper()
    if (senal["app"] or senal["ccf"] is not None) and tipo == "CASH":
        tipo = "CC"
    extra: dict[str, Any] = {}
    if not ia.get("valor_servicio") and senal.get("valor"):     # la IA lo perdió: lo dice el texto
        extra["valor_servicio"] = senal["valor"]
        if senal.get("cash") and senal.get("tarjeta"):           # «22cc / 44cash»: hubo de los dos
            tipo = "MIXTO"
            extra |= {"valor_efectivo": senal["cash"], "valor_tarjeta": senal["tarjeta"]}
    return {**ia, **extra, "tipo_pago": tipo, "sin_fee": senal["sin_fee"], "ccf": senal["ccf"],
            "porcentaje_tecnico": senal["porcentaje_tecnico"]}


# ─────────────────────────────── el prompt, por secciones ───────────────────────────────

GENERAL = """
Eres un extractor de datos de tickets de servicio de cerrajería.
Devuelve SOLO un JSON válido. Sin texto extra, sin markdown, sin explicaciones.

━━━ 1. GENERAL ━━━
- Si un campo no está claro en el mensaje → null
- NUNCA inventes datos
- NUNCA combines datos de campos distintos
- Un número con % (ej. «40%») NO es dinero: ignóralo.
- «ccf» con un número (ej. «ccf 13», «13 ccf») es la comisión de la tarjeta: NO es dinero del servicio ni partes
  (ignora ese número), pero quiere decir que se pagó con tarjeta (CC, o MIXTO si también hubo cash).
- Un número es dinero SOLO si va con contexto de pago, de partes o de pago al técnico, o si por el contexto es el
  valor final del servicio. Si no, ignóralo.

PARTES (NO son el valor del servicio, nunca se suman):
- "20$ parts Afik" → parts_tecnico=20, parts_tecnico_nombre="Afik"
- "50$ parts"      → parts_tecnico=50, parts_tecnico_nombre=null
- "10p" o "50p" o "$50p" → parts_tecnico=ese número, es la letra p pegada al número
- "parts gil"      → parts_gil=ese valor
- "40$ cp", "$40 cp", "cp 40" → parts_gil=40   (cp = company parts = partes de Gil; NO es la «p» del técnico)
- "parts company", "part company", "company parts", "parte company" → parts_gil=ese valor
  (todo lo que sea "company" o "gil" en contexto de partes va a parts_gil)

PAGO AL TÉCNICO (tech) — dinero asignado directamente al técnico, NO es parte ni servicio:
- "100$ to tech", "to technician 100", "for tech 100", "para el tecnico 100" → tech=100
- Es independiente del valor del servicio y de las partes; NUNCA se suma a valor_servicio.
- Si no aparece → tech=0

JOB TYPE — solo 2 valores posibles: "CAR KEY", "LOCKOUT":
- Variantes de CAR KEY: car key, car key made, key made, key program, key programming
- Variantes de LOCKOUT: lockout, car lockout, lock out, locked out, lock change, lock
- Si no hay ninguna variante clara → null
"""

PAGO = """
━━━ 2. EL PAGO: decide CASH, CC o MIXTO por el CONTEXTO del mensaje ━━━
- CASH: cash, efectivo, o el cliente le pagó en mano al técnico.
- CC: cc, credit, credit card, card, scanpay, paid to (nombre), Zelle, Cash App, Venmo.
- MIXTO: una parte en cash y otra con tarjeta o app en el mismo trabajo.
- Si el mensaje no dice nada del pago y el contexto no lo aclara → "CASH".
- SIEMPRE devuelve uno de: "CASH", "CC", "MIXTO" — nunca null, nunca otro valor.
"""

BLOQUES = {
    "CASH": """
━━━ 3. SI ES CASH ━━━
- valor_servicio = lo que se cobró. Si aparece UN SOLO número de dinero sin más contexto, ese es valor_servicio.
- valor_efectivo = 0, valor_tarjeta = 0.
""",
    "CC": """
━━━ 4. SI ES CC ━━━
- valor_servicio = lo que se cobró. Si aparece UN SOLO número de dinero sin más contexto, ese es valor_servicio.
- valor_efectivo = 0, valor_tarjeta = 0.
""",
    "MIXTO": """
━━━ 5. SI ES MIXTO ━━━
- valor_efectivo = el monto pagado en cash (solo si aparece explícito; si no, null).
- valor_tarjeta = el monto pagado con tarjeta o app (solo si aparece explícito; si no, null).
- valor_servicio = el total que aparece en el mensaje; si no aparece, la suma de los dos.
""",
}

COMUN = """
En los tres: NUNCA sumes partes al valor_servicio. Si no puedes determinarlo → null.
"""

CAMPOS = """
━━━ 6. CAMPOS A EXTRAER ━━━

{
  "company":               "nombre de la empresa | null",
  "job_name":              "código o número del ticket (ej: TLER-BCPS, AKBZH7, 5PVLF) | null",
  "nombre":                "nombre del cliente | null",
  "job_type":              "CAR KEY | LOCKOUT | null",
  "date":                  "fecha como aparezca en el mensaje | null",
  "time":                  "hora como aparezca en el mensaje | null",
  "address":               "dirección completa | null",
  "phone":                 "teléfono principal del cliente | null",
  "valor_servicio":        número o 0,
  "valor_efectivo":        número o 0,
  "valor_tarjeta":         número o 0,
  "tipo_pago":             "CASH | CC | MIXTO",
  "parts_tecnico":         número o 0,
  "parts_tecnico_nombre":  "nombre del técnico | 0",
  "parts_gil":             número o 0,
  "tech":                  número o 0
}
"""

PROMPT = GENERAL + PAGO + "".join(BLOQUES.values()) + COMUN + CAMPOS
