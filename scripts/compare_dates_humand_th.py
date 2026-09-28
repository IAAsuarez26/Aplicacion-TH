# -*- coding: utf-8 -*-
"""
Comparador Exhaustivo de Colaboradores y Fechas: Aplicación TH vs Humand
======================================================================
Compara minuciosamente:
1. Fecha de Contratación (hiringDate en Humand) vs Fecha de Ingreso (fecha_ingreso en TH).
2. Detección de discrepancias exactas, formatos invertidos o fechas ausentes.
3. Generación de informe en consola y reporte en Excel (.xlsx).
"""

import os
import sys
import re
import json
import math
import urllib.request
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

HUMAND_BASE_URL = "https://api-prod.humand.co/public/api/v1"
INSFORGE_BASE_URL = "https://jj96rzs4.us-east.insforge.app"
INSFORGE_ANON_KEY = "anon_5a5f85153758df2568fcdfd16b5c70e958ba93aea7782df47d39f15f61aa5323"

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k not in os.environ:
                        os.environ[k] = v

def clean_cedula(val):
    if not val:
        return ""
    return re.sub(r'[^0-9]', '', str(val))

def normalize_date(val):
    if not val:
        return None
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ["none", "null"]:
        return None
    # Truncar hora si viene formato ISO
    if "T" in val_str:
        val_str = val_str.split("T")[0]
    val_str = val_str[:10]
    return val_str

def humand_get_all_users(api_key):
    all_users = []
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json"
    }
    for st in ["ACTIVE", "UNCLAIMED"]:
        page = 1
        limit = 50
        while True:
            url = f"{HUMAND_BASE_URL}/users?limit={limit}&page={page}&status={st}"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                batch = data.get("users", [])
                all_users.extend(batch)
                total_count = data.get("count", 0)
                total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
                if not batch or page >= total_pages:
                    break
                page += 1
    return all_users

def insforge_query(table):
    url = f"{INSFORGE_BASE_URL}/api/database/records/{table}?select=*"
    headers = {
        "apikey": INSFORGE_ANON_KEY,
        "Authorization": f"Bearer {INSFORGE_ANON_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_comparison():
    load_env()
    api_key = os.getenv("HUMAND_API_KEY")
    if not api_key:
        print("[!] Error: HUMAND_API_KEY no encontrada.")
        sys.exit(1)

    print("\n" + "=" * 75)
    print("  AUDITORÍA COMPARATIVA DE COLABORADORES Y FECHAS DE INGRESO")
    print("  Aplicación TH vs Humand Public API")
    print("=" * 75)

    # 1. Recuperar usuarios de Humand
    print("\n[1/3] Consultando colaboradores en Humand...")
    h_users = humand_get_all_users(api_key)
    print(f"      Total recuperados en Humand: {len(h_users)}")

    # 2. Recuperar colaboradores de TH
    print("\n[2/3] Consultando colaboradores en Aplicación TH (InsForge)...")
    th_emps = insforge_query("empleados")
    print(f"      Total empleados en TH:        {len(th_emps)}")

    # Indexar
    h_by_cedula = {}
    for u in h_users:
        c = clean_cedula(u.get("employeeInternalId"))
        if c:
            h_by_cedula[c] = u

    th_by_cedula = {}
    for e in th_emps:
        c = clean_cedula(e.get("documento_identidad"))
        if c:
            th_by_cedula[c] = e

    # 3. Comparación minuciosa
    print("\n[3/3] Comparando registros y evaluando fechas de contratación...")

    matched_exact = []
    matched_diff = []
    missing_in_humand_date = []
    missing_in_th_date = []
    only_in_th = []
    only_in_humand = []

    all_cedulas = sorted(set(list(h_by_cedula.keys()) + list(th_by_cedula.keys())))

    records = []

    for c in all_cedulas:
        in_th = c in th_by_cedula
        in_h = c in h_by_cedula

        if in_th and in_h:
            e = th_by_cedula[c]
            u = h_by_cedula[c]

            nombre_th = f"{e.get('nombres', '')} {e.get('apellidos', '')}".strip()
            nombre_h = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip()
            
            d_th = normalize_date(e.get("fecha_ingreso"))
            d_h = normalize_date(u.get("hiringDate"))

            # Evaluar estado de la fecha
            if d_th and d_h:
                if d_th == d_h:
                    status = "COINCIDE_EXACTO"
                    matched_exact.append((c, nombre_th, d_th, d_h))
                else:
                    status = "DIFERENCIA_FECHAS"
                    matched_diff.append((c, nombre_th, d_th, d_h))
            elif d_th and not d_h:
                status = "SIN_FECHA_EN_HUMAND"
                missing_in_humand_date.append((c, nombre_th, d_th))
            elif not d_th and d_h:
                status = "SIN_FECHA_EN_TH"
                missing_in_th_date.append((c, nombre_th, d_h))
            else:
                status = "AMBOS_SIN_FECHA"

            records.append({
                "cedula": c,
                "codigo_th": e.get("codigo_empleado"),
                "nombre_th": nombre_th,
                "nombre_h": nombre_h,
                "fecha_th": d_th or "No registrada",
                "fecha_humand": d_h or "No registrada",
                "estado_fecha": status,
                "estado_laboral_th": e.get("estado_laboral"),
                "status_humand": u.get("status")
            })

        elif in_th and not in_h:
            e = th_by_cedula[c]
            nombre_th = f"{e.get('nombres', '')} {e.get('apellidos', '')}".strip()
            d_th = normalize_date(e.get("fecha_ingreso"))
            only_in_th.append((c, nombre_th, d_th))
            records.append({
                "cedula": c,
                "codigo_th": e.get("codigo_empleado"),
                "nombre_th": nombre_th,
                "nombre_h": "No existe en Humand",
                "fecha_th": d_th or "No registrada",
                "fecha_humand": "N/A",
                "estado_fecha": "SOLO_EN_TH",
                "estado_laboral_th": e.get("estado_laboral"),
                "status_humand": "N/A"
            })

        elif not in_th and in_h:
            u = h_by_cedula[c]
            nombre_h = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip()
            d_h = normalize_date(u.get("hiringDate"))
            only_in_humand.append((c, nombre_h, d_h))
            records.append({
                "cedula": c,
                "codigo_th": "N/A",
                "nombre_th": "No existe en TH",
                "nombre_h": nombre_h,
                "fecha_th": "N/A",
                "fecha_humand": d_h or "No registrada",
                "estado_fecha": "SOLO_EN_HUMAND",
                "estado_laboral_th": "N/A",
                "status_humand": u.get("status")
            })

    # Resumen en consola
    print("\n" + "=" * 75)
    print("  RESULTADOS CONSOLIDADOS DE LA COMPARACIÓN")
    print("=" * 75)
    total_coincidentes_poblacion = len(matched_exact) + len(matched_diff) + len(missing_in_humand_date) + len(missing_in_th_date)
    print(f"Colaboradores presentes en ambos sistemas:       {total_coincidentes_poblacion}")
    print(f"  [OK] Fechas coincidentes al 100%:              {len(matched_exact)} ({round(len(matched_exact)/total_coincidentes_poblacion*100, 1)}%)")
    print(f"  [!]  Diferencias de fecha detectadas:          {len(matched_diff)} ({round(len(matched_diff)/total_coincidentes_poblacion*100, 1)}%)")
    print(f"  [?]  Con fecha en TH pero sin fecha en Humand: {len(missing_in_humand_date)}")
    print(f"  [?]  Con fecha en Humand pero sin fecha en TH: {len(missing_in_th_date)}")
    print(f"\nColaboradores SOLO en Aplicación TH:             {len(only_in_th)}")
    print(f"Colaboradores SOLO en Humand:                    {len(only_in_humand)}")

    if matched_diff:
        print("\n" + "-" * 75)
        print(f"DETALLE DE DISCREPANCIAS EN FECHAS ({len(matched_diff)} colaboradores):")
        print("-" * 75)
        for c, nom, f_th, f_h in matched_diff:
            print(f"  * C.I. {c} | {nom:<32} | TH: {f_th} <--> Humand: {f_h}")

    if only_in_th:
        print("\n" + "-" * 75)
        print(f"COLABORADORES EN TH PENDIENTES DE ALTA EN HUMAND ({len(only_in_th)} colaboradores):")
        print("-" * 75)
        for c, nom, f_th in only_in_th:
            print(f"  * C.I. {c} | {nom:<32} | Fecha Ingreso TH: {f_th}")

    if only_in_humand:
        print("\n" + "-" * 75)
        print(f"CUENTAS EN HUMAND NO REGISTRADAS EN TH ({len(only_in_humand)} cuentas):")
        print("-" * 75)
        for c, nom, f_h in only_in_humand:
            print(f"  * C.I. {c} | {nom:<32} | Fecha Contratación: {f_h}")

    # Generación de Excel
    generate_excel_comparison(records)

def generate_excel_comparison(records):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    ws = wb.create_sheet(title="Comparativa de Fechas")
    ws.views.sheetView[0].showGridLines = True

    # Estilos
    navy_fill = PatternFill(start_color="1B365D", end_color="1B365D", fill_type="solid")
    white_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    
    fill_ok = PatternFill(start_color="E6FFFA", end_color="E6FFFA", fill_type="solid")      # Verde claro
    fill_diff = PatternFill(start_color="FFF5F5", end_color="FFF5F5", fill_type="solid")    # Rojo claro
    fill_warn = PatternFill(start_color="FEFCBF", end_color="FEFCBF", fill_type="solid")    # Amarillo
    fill_info = PatternFill(start_color="EBF8FF", end_color="EBF8FF", fill_type="solid")    # Azul claro

    font_ok = Font(name="Calibri", size=10, color="234E52")
    font_diff = Font(name="Calibri", size=10, bold=True, color="C53030")
    font_warn = Font(name="Calibri", size=10, color="975A16")
    font_info = Font(name="Calibri", size=10, color="2B6CB0")
    font_regular = Font(name="Calibri", size=10)

    thin_border = Border(
        left=Side(style="thin", color="CBD5E0"),
        right=Side(style="thin", color="CBD5E0"),
        top=Side(style="thin", color="CBD5E0"),
        bottom=Side(style="thin", color="CBD5E0")
    )

    # Título
    ws.merge_cells("A1:I1")
    t = ws["A1"]
    t.value = "AUDITORÍA COMPARATIVA DE COLABORADORES: FECHA DE INGRESO (TH) vs FECHA DE CONTRATACIÓN (HUMAND)"
    t.font = Font(name="Calibri", size=13, bold=True, color="1B365D")
    t.alignment = Alignment(vertical="center")
    ws.row_dimensions[1].height = 30

    headers = [
        "N°", "Cédula / ID", "Código TH", "Nombre en TH", "Nombre en Humand",
        "Fecha Ingreso (TH)", "Fecha Contratación (Humand)", "Diagnóstico Comparativo", "Estatus Humand"
    ]
    ws.append(headers)
    ws.row_dimensions[2].height = 24

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col_idx)
        cell.fill = navy_fill
        cell.font = white_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    # Ordenar: primero discrepancias, luego exactos, luego faltantes
    def sort_key(r):
        priority = {
            "DIFERENCIA_FECHAS": 1,
            "SIN_FECHA_EN_HUMAND": 2,
            "SIN_FECHA_EN_TH": 3,
            "SOLO_EN_TH": 4,
            "SOLO_EN_HUMAND": 5,
            "COINCIDE_EXACTO": 6
        }
        return (priority.get(r["estado_fecha"], 9), r["cedula"])

    records_sorted = sorted(records, key=sort_key)

    for idx, r in enumerate(records_sorted, 1):
        row_num = idx + 2
        
        diag_label = {
            "COINCIDE_EXACTO": "COINCIDE EXACTO",
            "DIFERENCIA_FECHAS": "DIFERENCIA DE FECHAS",
            "SIN_FECHA_EN_HUMAND": "SIN FECHA EN HUMAND",
            "SIN_FECHA_EN_TH": "SIN FECHA EN TH",
            "SOLO_EN_TH": "SOLO REGISTRADO EN TH",
            "SOLO_EN_HUMAND": "SOLO REGISTRADO EN HUMAND"
        }.get(r["estado_fecha"], r["estado_fecha"])

        row_data = [
            idx,
            r["cedula"],
            r["codigo_th"],
            r["nombre_th"],
            r["nombre_h"],
            r["fecha_th"],
            r["fecha_humand"],
            diag_label,
            r["status_humand"]
        ]
        ws.append(row_data)
        ws.row_dimensions[row_num].height = 20

        # Estilo según diagnóstico
        st = r["estado_fecha"]
        current_fill = None
        current_font = font_regular

        if st == "COINCIDE_EXACTO":
            current_fill = fill_ok
            current_font = font_ok
        elif st == "DIFERENCIA_FECHAS":
            current_fill = fill_diff
            current_font = font_diff
        elif st in ["SIN_FECHA_EN_HUMAND", "SIN_FECHA_EN_TH"]:
            current_fill = fill_warn
            current_font = font_warn
        elif st in ["SOLO_EN_TH", "SOLO_EN_HUMAND"]:
            current_fill = fill_info
            current_font = font_info

        for col_idx in range(1, 10):
            c = ws.cell(row=row_num, column=col_idx)
            c.border = thin_border
            c.font = current_font
            if current_fill:
                c.fill = current_fill
            if col_idx in [1, 2, 3, 6, 7, 8, 9]:
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    output_path = os.path.join(os.path.dirname(__file__), "..", "documentos", "Comparativo_Fechas_Ingreso_TH_vs_Humand.xlsx")
    try:
        wb.save(output_path)
        print(f"\n[EXCEL] Reporte generado exitosamente en:\n        {output_path}")
    except PermissionError:
        alt_path = os.path.join(os.path.dirname(__file__), "..", "documentos", "Comparativo_Fechas_Ingreso_TH_vs_Humand_Actualizado.xlsx")
        wb.save(alt_path)
        print(f"\n[EXCEL] El archivo original estaba abierto en Excel. Reporte guardado en:\n        {alt_path}")


if __name__ == "__main__":
    run_comparison()
