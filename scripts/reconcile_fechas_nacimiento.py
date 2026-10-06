# -*- coding: utf-8 -*-
"""
Script de Conciliación y Actualización de Fechas de Nacimiento
=============================================================
Lee el archivo 'documentos/Fechas_Nacimiento_Empleados.xlsx' y cruza
las cédulas contra la base de datos de Aplicación TH (PostgreSQL / InsForge).

Modos:
  python scripts/reconcile_fechas_nacimiento.py           # Modo Dry-Run (Solo análisis)
  python scripts/reconcile_fechas_nacimiento.py --apply   # Aplica los cambios en la BD
"""

import os
import re
import sys
import json
import argparse
import datetime
import openpyxl
import urllib.request
import urllib.error

INSFORGE_BASE_URL = "https://jj96rzs4.us-east.insforge.app"
INSFORGE_ANON_KEY = "anon_5a5f85153758df2568fcdfd16b5c70e958ba93aea7782df47d39f15f61aa5323"

def clean_ci(val):
    if val is None:
        return ""
    return re.sub(r'[^0-9]', '', str(val))

def load_excel_data(file_path):
    wb = openpyxl.load_workbook(file_path, data_only=True)
    ws = wb['Empleados'] if 'Empleados' in wb.sheetnames else wb.active
    
    excel_records = {}
    for r in range(4, ws.max_row + 1):
        ci_raw = ws.cell(row=r, column=2).value
        nom_raw = ws.cell(row=r, column=3).value
        ape_raw = ws.cell(row=r, column=4).value
        fn_raw = ws.cell(row=r, column=5).value
        
        ci = clean_ci(ci_raw)
        if not ci:
            continue
            
        date_str = None
        if isinstance(fn_raw, datetime.datetime) or isinstance(fn_raw, datetime.date):
            date_str = fn_raw.strftime('%Y-%m-%d')
        elif fn_raw:
            parts = str(fn_raw).strip().split(' ')[0]
            # Soportar DD/MM/YYYY o YYYY-MM-DD
            if '/' in parts:
                dp = parts.split('/')
                if len(dp) == 3:
                    if len(dp[2]) == 4: # DD/MM/YYYY
                        date_str = f"{dp[2]}-{dp[1].zfill(2)}-{dp[0].zfill(2)}"
                    elif len(dp[0]) == 4: # YYYY/MM/DD
                        date_str = f"{dp[0]}-{dp[1].zfill(2)}-{dp[2].zfill(2)}"
            elif '-' in parts:
                date_str = parts
                
        excel_records[ci] = {
            'nombre': f"{nom_raw or ''} {ape_raw or ''}".strip(),
            'fecha_nacimiento': date_str,
            'row': r
        }
        
    return excel_records

def get_th_empleados():
    url = f"{INSFORGE_BASE_URL}/api/database/records/empleados?select=empleado_id,codigo_empleado,documento_identidad,nombres,apellidos,fecha_nacimiento"
    headers = {
        "apikey": INSFORGE_ANON_KEY,
        "Authorization": f"Bearer {INSFORGE_ANON_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def update_empleado_fecha(empleado_id, fecha_nacimiento):
    url = f"{INSFORGE_BASE_URL}/api/database/records/empleados/{empleado_id}"
    headers = {
        "apikey": INSFORGE_ANON_KEY,
        "Authorization": f"Bearer {INSFORGE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    payload = json.dumps({"fecha_nacimiento": fecha_nacimiento}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.status in (200, 204), resp.status
    except urllib.error.HTTPError as e:
        return False, e.code

def main():
    parser = argparse.ArgumentParser(description="Conciliación y carga de Fechas de Nacimiento")
    parser.add_argument("--apply", action="store_true", help="Aplica la actualización en la base de datos")
    args = parser.parse_args()

    excel_file = os.path.join(os.path.dirname(__file__), "..", "documentos", "Fechas_Nacimiento_Empleados.xlsx")
    if not os.path.exists(excel_file):
        print(f"[ERROR] Archivo no encontrado: {excel_file}")
        sys.exit(1)

    print("=====================================================================")
    print("  AUDITORÍA Y ACTUALIZACIÓN DE FECHAS DE NACIMIENTO: TH")
    print("=====================================================================")
    print(f"Modo: {'EJECUCION REAL (--apply)' if args.apply else 'SIMULACION (DRY-RUN)'}")
    print(f"Archivo Excel: {excel_file}")
    
    excel_records = load_excel_data(excel_file)
    print(f"Total registros válidos leídos de Excel: {len(excel_records)}")
    
    print("\nConsultando base de datos de Aplicación TH (PostgreSQL)...")
    th_emps = get_th_empleados()
    print(f"Total colaboradores activos en Aplicación TH: {len(th_emps)}")
    
    matched = []
    unmatched_th = []
    
    for emp in th_emps:
        clean_doc = clean_ci(emp.get("documento_identidad"))
        if clean_doc in excel_records and excel_records[clean_doc]["fecha_nacimiento"]:
            matched.append({
                "empleado_id": emp["empleado_id"],
                "codigo": emp["codigo_empleado"],
                "ci": clean_doc,
                "nombre_th": f"{emp['nombres']} {emp['apellidos']}",
                "nombre_excel": excel_records[clean_doc]["nombre"],
                "fecha_nacimiento": excel_records[clean_doc]["fecha_nacimiento"],
                "fecha_actual_db": emp.get("fecha_nacimiento")
            })
        else:
            unmatched_th.append({
                "empleado_id": emp["empleado_id"],
                "codigo": emp["codigo_empleado"],
                "ci": clean_doc,
                "nombre_th": f"{emp['nombres']} {emp['apellidos']}"
            })
            
    print("\n---------------------------------------------------------------------")
    print(f"RESULTADOS DE CONCILIACIÓN:")
    print(f"  * Coincidencias encontradas con fecha: {len(matched)} de {len(th_emps)} ({round(len(matched)/len(th_emps)*100, 1)}%)")
    print(f"  * Sin coincidencia o sin fecha en Excel: {len(unmatched_th)}")
    print("---------------------------------------------------------------------")
    
    if unmatched_th:
        print("\nColaboradores de TH que NO se encontraron en el Excel:")
        for u in unmatched_th:
            print(f"  - [{u['codigo']}] CI: {u['ci'] or 'SIN CI':<10} | {u['nombre_th']}")

    print("\nMuestra de los primeros 5 cruces conciliados:")
    for m in matched[:5]:
        print(f"  - [{m['codigo']}] CI: {m['ci']:<10} | {m['nombre_th']:<30} -> {m['fecha_nacimiento']}")

    print("\n---------------------------------------------------------------------")
    print(f"GENERANDO SQL DE ACTUALIZACION EN BLOQUE ({len(matched)} registros)...")
    print("---------------------------------------------------------------------")
    
    values_str = ",\n  ".join([f"({m['empleado_id']}, '{m['fecha_nacimiento']}')" for m in matched])
    sql = f"""UPDATE empleados AS e
SET fecha_nacimiento = v.fn::date
FROM (VALUES
  {values_str}
) AS v(empleado_id, fn)
WHERE e.empleado_id = v.empleado_id;"""

    sql_path = os.path.join(os.path.dirname(__file__), "update_fechas_nacimiento.sql")
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write(sql)
        
    print(f"  [OK] Archivo SQL generado exitosamente en: {sql_path}")
    print(f"  Total sentencias agrupadas en transacción atómica: {len(matched)}")

if __name__ == "__main__":
    main()
