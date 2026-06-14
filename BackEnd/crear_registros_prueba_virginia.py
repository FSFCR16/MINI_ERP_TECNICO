"""
Seed de prueba: inserta ~200 registros para un técnico Virginia en una semana.
Replica EXACTAMENTE el cálculo de FrontEnd/src/Utils/virginiaCalc.js (cash/CC/mixto)
para que los totales coincidan con lo que vería el front.

Uso:
    .venv/Scripts/python.exe crear_registros_prueba_virginia.py
Parámetros editables abajo (NOMBRE_TECNICO, SEMANA_LABEL, CANTIDAD).

Para borrar lo insertado por este script, filtrar por job_name que empieza con 'LK-'.
"""
import random

from app.db import SessionLocal
from app.models_virginia import TecnicoVirginia, SemanaVirginia, RegistroVirginia, MetodoPagoVirginia

NOMBRE_TECNICO = "NICK"
SEMANA_LABEL = "2026_06_semana_24"
CANTIDAD = 200
PREFIJO_JOBNAME = "LK-"  # marca para poder identificar/borrar este lote
# Métodos CC variados para demostrar el desglose dinámico en el Excel.
METODOS_CC_DEMO = ["Uleadz", "Zelle", "Cash App"]


def formatear(num):
    return int(num) if float(num).is_integer() else round(num, 2)


def cash(valor, pct, minimo, adic, tipo):
    valor_real = valor
    minimo_tec = valor_real * (pct / 100)
    mini_gil = valor_real * ((100 - pct) / 100)
    if valor <= minimo + 25 and tipo != "MIXTO":
        return formatear(valor_real / 2 + adic)
    if minimo_tec > minimo or tipo == "MIXTO":
        return formatear(mini_gil + adic)
    if 0 < minimo_tec <= minimo:
        return formatear(valor_real - minimo + adic)
    return 0


def cc(valor, pct, minimo, adic, tipo):
    proceso_tec = valor * (pct / 100)
    if valor <= minimo + 25 and tipo != "MIXTO":
        return formatear((valor / 2 - adic) * -1)
    if proceso_tec > minimo or tipo == "MIXTO":
        return formatear((proceso_tec - adic) * -1)
    if 0 < proceso_tec <= minimo:
        return formatear((minimo - adic) * -1)
    return 0


def total_de(tipo, valor, efectivo, tarjeta, pct, minimo, adic):
    if tipo == "CC":
        return cc(valor, pct, minimo, adic, tipo)
    if tipo == "MIXTO":
        return formatear(
            cash(efectivo, pct, minimo, adic, "MIXTO")
            + cc(tarjeta, pct, minimo, 0, "MIXTO")
        )
    return cash(valor, pct, minimo, adic, tipo)


def main():
    db = SessionLocal()
    try:
        tec = db.query(TecnicoVirginia).filter(TecnicoVirginia.nombre == NOMBRE_TECNICO).first()
        if not tec:
            raise SystemExit(f"No existe el técnico '{NOMBRE_TECNICO}'")
        sem = db.query(SemanaVirginia).filter(SemanaVirginia.semana == SEMANA_LABEL).first()
        if not sem:
            raise SystemExit(f"No existe la semana '{SEMANA_LABEL}'")

        cfg = tec.configs[0] if tec.configs else None
        if not cfg:
            raise SystemExit(f"El técnico '{NOMBRE_TECNICO}' no tiene config de job")
        job = cfg.job
        pct = cfg.porcentaje_tecnico or 0
        minimo = cfg.minimo or 0
        adic = tec.valor_adicional or 0

        metodo_cash = next((m.nombre for m in tec.metodos_pago if m.trato == "CASH"), "Cash")

        # Asegura que existan los métodos CC de demo (para que el desglose tenga varios)
        existentes = {m.nombre.strip().lower() for m in tec.metodos_pago}
        for nombre_m in METODOS_CC_DEMO:
            if nombre_m.lower() not in existentes:
                db.add(MetodoPagoVirginia(
                    tecnico_virginia_id=tec.id, nombre=nombre_m, trato="CC", principal=False,
                ))
        db.commit()

        nuevos = []
        for i in range(1, CANTIDAD + 1):
            tipo = random.choices(["CASH", "CC", "MIXTO"], weights=[60, 25, 15])[0]
            valor = random.choice([random.randint(20, 80), random.randint(80, 250), random.randint(250, 600)])
            efectivo = tarjeta = 0
            if tipo == "MIXTO":
                efectivo = round(valor * random.uniform(0.3, 0.7), 2)
                tarjeta = round(valor - efectivo, 2)
                metodo = "MIXTO"
            elif tipo == "CC":
                metodo = random.choice(METODOS_CC_DEMO)   # reparte Uleadz/Zelle/Cash App
            else:
                metodo = metodo_cash

            total = total_de(tipo, valor, efectivo, tarjeta, pct, minimo, adic)

            nuevos.append(RegistroVirginia(
                tecnico_virginia_id=tec.id,
                semana_virginia_id=sem.id,
                nombre=tec.nombre,
                job=job,
                job_name=f"{PREFIJO_JOBNAME}{i:04d}",
                valor_servicio=valor,
                metodo_pago=metodo,
                tipo_pago=tipo,
                valor_efectivo=efectivo,
                valor_tarjeta=tarjeta,
                porcentaje_tecnico=pct,
                subtotal=0,
                total=total,
            ))

        db.bulk_save_objects(nuevos)
        db.commit()
        print(f"OK: insertados {len(nuevos)} registros para {tec.nombre} en {SEMANA_LABEL}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
