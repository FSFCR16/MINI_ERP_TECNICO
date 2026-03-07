from datetime import date, timedelta

def semana_actual():
    hoy = date.today()
    num_semana = hoy.isocalendar()[1]
    año = hoy.year
    mes= hoy.month
    return f"{año}_{mes:02d}_semana_{num_semana}", año, num_semana

def procesarDatosTecnico(datos: dict, nombre: str, trabajo:str):
    dicDataModificar={
        "NOMBRE":"",
        "JOB":"",
        "JOB_NAME": "",
        "PORCENTAJE_TECNICO": 0,
        "VALOR_SERVICIO":0,
        "MINIMO":0,
        "TIPO_PAGO":["CASH", "CC", "MIXTO"],
        "VALOR_TARJETA":0,
        "VALOR_CASH":0,
        "PORCENTAJE_CC":0,
        "PARTES_GIL": 0,
        "PARTES_TECNICO": 0,
        "TECH":0,
        "SUBTOTAL":0,
        "TOTAL":0,
        "NOTAS": []
    }

    #Nombre del tenico
    dicDataModificar["NOMBRE"] = nombre

    #PORCENTAJE DEL TENICO

    if(datos["porcentaje_adicional_empresa"] != 0):
        dicDataModificar["NOTAS"].append(
            f"Este tecnico tiene un porcentaje adicional para ciertos servicios de {datos['porcentaje_adicional_empresa']}%"
        )

    dicDataModificar["PORCENTAJE_TECNICO"] = datos["porcentaje_tenico"]

    #PORCENTAJE CC

    dicDataModificar["PORCENTAJE_CC"] = datos["porcentaje_cc"]

    #MINIMO

    dicDataModificar["MINIMO"] = datos["minimo"]
    

    
def obtener_rango_semana():
    hoy = date.today()

    # lunes de esta semana
    print(hoy)
    fecha_inicio = hoy - timedelta(days=hoy.weekday())
    print(timedelta(days=hoy.weekday()))

    # domingo de esta semana
    fecha_fin = fecha_inicio + timedelta(days=6)

    return fecha_inicio, fecha_fin
