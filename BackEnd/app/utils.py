from datetime import date, timedelta
import pandas as pd
from io import BytesIO
from openpyxl import load_workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.styles import PatternFill, Font,Border, Side, Alignment
from openpyxl.utils import get_column_letter

def semana_actual():
    hoy = date.today()
    iso = hoy.isocalendar()
    num_semana = iso[1]
    año = iso[0]  # también usar el año ISO, no hoy.year

    # Anclar al lunes de la semana ISO
    lunes = hoy - timedelta(days=hoy.weekday())
    mes = lunes.month

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
    dfResultados = {
        "NOMBRE": [
            "TOTAL JOBS",
            "TOTAL CASH",
            "TOTAL CC",
            "TOTAL SALES",
            "TOTAL PARTS",
            "AVERAGE SALES",
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

    return pd.DataFrame(dfResultados)


def estilizar_excel(output, df, dfResultado, fila_inicio):

    output.seek(0)
    wb = load_workbook(output)
    ws = wb.active

    # =========================
    # ANCHOS DE COLUMNA
    # =========================
    anchos = {
        "A": 12, "B": 14, "C": 6,  "D": 14,
        "E": 10, "F": 8,  "G": 10, "H": 12,
        "I": 8,  "J": 12,
    }
    for col_letra, ancho in anchos.items():
        ws.column_dimensions[col_letra].width = ancho

    fmt_moneda = '$#,##0.00_);[Red]($#,##0.00);$ -'
    fmt_pct    = '0"%"'

    col_indices = {col: idx + 1 for idx, col in enumerate(df.columns)}
    ultima_fila_datos = len(df) + 1

    cols_moneda = ["SALES", "4%CC", "GIL PARTS", "TECH PARTS", "TECH", "TOTAL"]
    if "CASH" in df.columns:
        cols_moneda += ["CASH", "CC"]

    for col_name in cols_moneda:
        if col_name in col_indices:
            col_num = col_indices[col_name]
            for row in range(2, ultima_fila_datos + 1):
                ws.cell(row=row, column=col_num).number_format = fmt_moneda

    if "%" in col_indices:
        col_pct = col_indices["%"]
        for row in range(2, ultima_fila_datos + 1):
            ws.cell(row=row, column=col_pct).number_format = fmt_pct

    # =========================
    # TABLA 1
    # =========================
    ultima_columna = get_column_letter(len(df.columns))
    rango_tabla1   = f"A1:{ultima_columna}{ultima_fila_datos}"
    tabla1 = Table(displayName="TablaRegistros", ref=rango_tabla1)
    tabla1.tableStyleInfo = TableStyleInfo(
        name="TableStyleMedium4",
        showFirstColumn=False,
        showLastColumn=False,
        showRowStripes=True,
        showColumnStripes=False,
    )
    ws.add_table(tabla1)

    # =========================
    # FILAS ROJAS SI TOTAL < 0
    # =========================
    col_total  = col_indices.get("TOTAL", len(df.columns))
    rojo_claro = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")

    for row in range(2, ultima_fila_datos + 1):
        valor_total = ws.cell(row=row, column=col_total).value
        if valor_total is not None and valor_total < 0:
            for col in range(1, len(df.columns) + 1):
                ws.cell(row=row, column=col).fill = rojo_claro

    # =========================
    # TABLA 2 (RESULTADOS)
    # =========================
    inicio_tabla2 = fila_inicio + 1
    fin_tabla2    = inicio_tabla2 + len(dfResultado)
    rango_tabla2  = f"A{inicio_tabla2}:B{fin_tabla2}"
    tabla2 = Table(displayName="TablaResultados", ref=rango_tabla2)
    tabla2.tableStyleInfo = TableStyleInfo(
        name="TableStyleMedium4",
        showFirstColumn=False,
        showLastColumn=False,
        showRowStripes=True,
        showColumnStripes=False,
    )
    ws.add_table(tabla2)

    # =========================
    # COLORES FILAS RESULTADOS
    # =========================
    colores_resultados = [
        ("FFFF00", "000000"),  # TOTAL JOBS
        ("00FF00", "000000"),  # TOTAL CASH
        ("FF0000", "FFFFFF"),  # TOTAL CC
        ("008B8B", "FFFFFF"),  # TOTAL SALES
        ("6A5ACD", "FFFFFF"),  # TOTAL PARTS
        ("FF8C00", "FFFFFF"),  # AVERAGE SALES
    ]

    for i, (bg, fg) in enumerate(colores_resultados):
        fill = PatternFill(start_color=bg, end_color=bg, fill_type="solid")
        font = Font(bold=True, color=fg)
        fila_excel = inicio_tabla2 + 1 + i
        for col in range(1, 3):
            cell = ws.cell(row=fila_excel, column=col)
            cell.fill = fill
            cell.font = font

    for i in range(len(dfResultado)):
        ws.cell(row=inicio_tabla2 + 1 + i, column=2).number_format = fmt_moneda

    # =========================
    # BALANCED TECH — columna dinámica a la derecha del TOTAL
    # =========================
    # Buscar columna TOTAL directamente en el header del worksheet
# =========================
    # ALINEACIÓN GENERAL
    # =========================
    alineacion = Alignment(horizontal="center", vertical="center")
    for row in ws.iter_rows(min_row=1, max_row=fin_tabla2 + 2):
        for cell in row:
            cell.alignment = alineacion

    # =========================
    # BALANCED TECH — SIEMPRE AL FINAL (después de alineación)
    # =========================
    col_total_idx = None
    for cell in ws[1]:
        if cell.value and str(cell.value).upper() == "TOTAL":
            col_total_idx = cell.column
            break

    if col_total_idx is None:
        col_total_idx = ws.max_column

    col_balance  = col_total_idx
    fila_header  = ultima_fila_datos + 4   # 👈 4 = 2 filas más abajo
    fila_valor   = fila_header + 1

    verde_oscuro       = PatternFill(start_color="00B050", end_color="00B050", fill_type="solid")
    fuente_blanca_bold = Font(bold=True, color="FFFFFF", size=11)
    thin_border = Border(
        left=Side(style="thin"),  right=Side(style="thin"),
        top=Side(style="thin"),   bottom=Side(style="thin"),
    )

    cell_header = ws.cell(row=fila_header, column=col_balance, value="BALANCED TECH")
    cell_header.fill      = verde_oscuro
    cell_header.font      = fuente_blanca_bold
    cell_header.border    = thin_border
    cell_header.alignment = Alignment(horizontal="center", vertical="center")

    balanced_tech = df["TOTAL"].sum() if "TOTAL" in df.columns else 0
    cell_valor = ws.cell(row=fila_valor, column=col_balance, value=balanced_tech)
    cell_valor.fill          = verde_oscuro
    cell_valor.font          = fuente_blanca_bold
    cell_valor.border        = thin_border
    cell_valor.alignment     = Alignment(horizontal="center", vertical="center")
    cell_valor.number_format = fmt_moneda

    ws.column_dimensions[get_column_letter(col_balance)].width = 16
    # =========================
    # ALINEACIÓN GENERAL
    # =========================
    alineacion = Alignment(horizontal="center", vertical="center")
    for row in ws.iter_rows(min_row=1, max_row=fin_tabla2 + 2):
        for cell in row:
            cell.alignment = alineacion

    nuevo_output = BytesIO()
    wb.save(nuevo_output)
    nuevo_output.seek(0)
    return nuevo_output