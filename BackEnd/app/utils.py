from datetime import date, timedelta
import pandas as pd
from io import BytesIO
from openpyxl import load_workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.styles import PatternFill
from openpyxl.utils import get_column_letter

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

def construcionTablaResultado(df):
    df.columns = df.columns.str.upper()
    print(df)
    dfResultados = {
        "NOMBRE": [
            "TOTAL JOBS",
            "TOTAL CASH",
            "TOTAL CC",
            "TOTAL SALES",
            "TOTAL PARTS",
            "AVERAGE SALES",
            "TOTAL"
        ],
        "RESULTADO": []
    }

    # TOTAL JOBS
    totalJobs = len(df)
    dfResultados["RESULTADO"].append(totalJobs)

    # CASH
    dfCash = df[df["TIPO PAGO"] == "CASH"]
    sumaCash = dfCash["VALOR SERVICIO"].sum()

    # CC
    dfCC = df[df["TIPO PAGO"] == "CC"]
    sumaCC = dfCC["VALOR SERVICIO"].sum()

    # MIXTO
    dfMixto = df[df["TIPO PAGO"] == "MIXTO"]

    sumaCash += dfMixto["VALOR EFECTIVO"].sum()
    sumaCC += dfMixto["VALOR TARJETA"].sum()

    dfResultados["RESULTADO"].append(sumaCash)
    dfResultados["RESULTADO"].append(sumaCC)

    # TOTAL SALES
    totalSales = sumaCash + sumaCC
    dfResultados["RESULTADO"].append(totalSales)

    # TOTAL PARTS
    totalPartesGil = df["PARTES GIL"].sum()
    totalPartesTecnico = df["PARTES TECNICO"].sum()

    totalParts = totalPartesGil + totalPartesTecnico
    dfResultados["RESULTADO"].append(totalParts)

    # AVERAGE SALES
    averageSales = totalSales / totalJobs if totalJobs else 0
    dfResultados["RESULTADO"].append(averageSales)

    # TOTAL
    total = df["TOTAL"].sum()
    dfResultados["RESULTADO"].append(total)

    return pd.DataFrame(dfResultados)


def estilizar_excel(output, df, dfResultado, fila_inicio):

    output.seek(0)
    wb = load_workbook(output)
    ws = wb.active

    # =========================
    # TABLA 1 (REGISTROS)
    # =========================

    ultima_columna = get_column_letter(len(df.columns))
    ultima_fila = len(df) + 1

    rango_tabla1 = f"A1:{ultima_columna}{ultima_fila}"

    tabla1 = Table(displayName="TablaRegistros", ref=rango_tabla1)

    estilo_tabla1 = TableStyleInfo(
        name="TableStyleMedium9",
        showFirstColumn=False,
        showLastColumn=False,
        showRowStripes=True,
        showColumnStripes=False,
    )

    tabla1.tableStyleInfo = estilo_tabla1
    ws.add_table(tabla1)

    # =========================
    # FILAS ROJAS SI TOTAL < 0
    # =========================

    col_total = df.columns.get_loc("TOTAL") + 1

    rojo_claro = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")

    for row in range(2, ultima_fila + 1):

        valor_total = ws.cell(row=row, column=col_total).value

        if valor_total is not None and valor_total < 0:

            for col in range(1, len(df.columns) + 1):
                ws.cell(row=row, column=col).fill = rojo_claro

    # =========================
    # TABLA 2 (RESULTADOS)
    # =========================

    inicio_tabla2 = fila_inicio + 1
    fin_tabla2 = inicio_tabla2 + len(dfResultado)

    rango_tabla2 = f"A{inicio_tabla2}:B{fin_tabla2}"

    tabla2 = Table(displayName="TablaResultados", ref=rango_tabla2)

    estilo_tabla2 = TableStyleInfo(
        name="TableStyleMedium4",
        showFirstColumn=False,
        showLastColumn=False,
        showRowStripes=True,
        showColumnStripes=False,
    )

    tabla2.tableStyleInfo = estilo_tabla2
    ws.add_table(tabla2)

    nuevo_output = BytesIO()
    wb.save(nuevo_output)
    nuevo_output.seek(0)

    return nuevo_output

