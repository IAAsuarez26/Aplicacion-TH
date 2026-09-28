# -*- coding: utf-8 -*-
"""
Script de Inspección y Conciliación Profunda de Usuarios: Humand vs Aplicación TH
==============================================================================
Inspecciona:
1. Atributos actuales de los 175 usuarios en Humand (departamento, cargo, jefe, segmentaciones).
2. Cruce referencial con la tabla 'empleados' de Aplicación TH (InsForge).
"""

import os
import sys
import json
import time
import urllib.request

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

def humand_get_users(api_key, status="UNCLAIMED"):
    users = []
    offset = 0
    limit = 50
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json"
    }
    while True:
        url = f"{HUMAND_BASE_URL}/users?limit={limit}&offset={offset}&status={status}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            batch = data.get("users", [])
            users.extend(batch)
            total = data.get("count", len(users))
            if len(users) >= total or not batch:
                break
            offset += limit
    return users

def get_humand_user_detail(api_key, internal_id):
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json"
    }
    url = f"{HUMAND_BASE_URL}/users/{internal_id}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"error": str(e)}

def insforge_query(table):
    url = f"{INSFORGE_BASE_URL}/api/database/records/{table}?select=*"
    headers = {
        "apikey": INSFORGE_ANON_KEY,
        "Authorization": f"Bearer {INSFORGE_ANON_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_inspection():
    load_env()
    api_key = os.getenv("HUMAND_API_KEY")
    if not api_key:
        print("Error: HUMAND_API_KEY no encontrada.")
        sys.exit(1)
        
    print("\n" + "=" * 75)
    print("  INSPECCIÓN DETALLADA DE USUARIOS: HUMAND vs APLICACIÓN TH")
    print("=" * 75)
    
    # 1. Recuperar usuarios de Humand
    print("\n[1/3] Descargando inventario completo de usuarios desde Humand...")
    active_users = humand_get_users(api_key, status="ACTIVE")
    unclaimed_users = humand_get_users(api_key, status="UNCLAIMED")
    all_humand = active_users + unclaimed_users
    print(f"      Total Humand: {len(all_humand)} usuarios ({len(active_users)} ACTIVE, {len(unclaimed_users)} UNCLAIMED)")
    
    # 2. Recuperar empleados de TH
    print("\n[2/3] Descargando empleados desde Aplicación TH (InsForge)...")
    th_empleados = insforge_query("empleados")
    print(f"      Total en TH: {len(th_empleados)} empleados registrados")
    
    # Analizar estructura de IDs en Humand
    # En la captura de pantalla vimos que los IDs eran números como: 10352343, 10520318 (que corresponden a Cédulas de Identidad)
    print("\n[3/3] Análisis estructural de los perfiles en Humand...")
    
    # Muestra detallada de 3 usuarios para ver qué atributos tienen asignados
    sample_ids = [u.get("employeeInternalId") for u in all_humand if u.get("employeeInternalId")][:3]
    print(f"\n--- Inspección de detalle de perfiles en Humand (Muestra de {len(sample_ids)}) ---")
    for sid in sample_ids:
        det = get_humand_user_detail(api_key, sid)
        print(f"\nColaborador: {det.get('firstName')} {det.get('lastName')} (ID Interno: {det.get('employeeInternalId')})")
        print(f"  * Status: {det.get('status')}")
        print(f"  * Email: {det.get('email')}")
        print(f"  * Teléfono: {det.get('phoneNumber') or 'No asignado'}")
        print(f"  * Fecha Ingreso: {det.get('hiringDate') or 'No asignada'}")
        print(f"  * Departamento: {det.get('department') or det.get('departmentId') or 'No asignado'}")
        print(f"  * Puesto de Trabajo: {det.get('jobPosition') or det.get('jobPositionId') or 'No asignado'}")
        print(f"  * Relaciones / Jefaturas (relationships): {det.get('relationships') or []}")
        print(f"  * Segmentaciones: {det.get('segmentations') or det.get('segmentation') or []}")
        print(f"  * Campos de Perfil (fields): {len(det.get('fields', []))} campos")
        
    import re
    def clean_id(val):
        if not val:
            return ""
        return re.sub(r'[^0-9]', '', str(val))

    # Cruce de correspondencia con Aplicación TH
    th_by_cedula = {}
    th_by_codigo = {}
    th_by_email = {}
    for emp in th_empleados:
        doc = clean_id(emp.get("documento_identidad"))
        cod = str(emp.get("codigo_empleado", "")).strip().lower()
        email = str(emp.get("email_corporativo") or emp.get("email") or "").strip().lower()
        if doc:
            th_by_cedula[doc] = emp
        if cod:
            th_by_codigo[cod] = emp
        if email:
            th_by_email[email] = emp
            
    matches_cedula = 0
    matches_codigo = 0
    matches_email = 0
    sin_coincidencia = []
    
    for u in all_humand:
        uid = clean_id(u.get("employeeInternalId"))
        ucod = str(u.get("employeeInternalId", "")).strip().lower()
        uemail = str(u.get("email", "")).strip().lower()
        
        if uid and uid in th_by_cedula:
            matches_cedula += 1
        elif ucod and ucod in th_by_codigo:
            matches_codigo += 1
        elif uemail and uemail in th_by_email:
            matches_email += 1
        else:
            sin_coincidencia.append(u)

            
    print("\n" + "=" * 75)
    print("  RESULTADOS DEL CRUCE REFERENCIAL (HUMAND <-> APLICACIÓN TH)")
    print("=" * 75)
    print(f"Total colaboradores en Humand:           {len(all_humand)}")
    print(f"Total colaboradores en Aplicación TH:      {len(th_empleados)}")
    print(f"Coincidencias unívocas por Cédula/ID:     {matches_cedula}")
    print(f"Coincidencias adicionales por Código TH:  {matches_codigo}")
    print(f"Coincidencias adicionales por Email:      {matches_email}")
    total_matches = matches_cedula + matches_codigo + matches_email
    print(f"TOTAL COINCIDENTES:                       {total_matches} / {len(all_humand)} ({round(total_matches/len(all_humand)*100, 1)}%)")
    print(f"Usuarios en Humand sin match en TH:       {len(sin_coincidencia)}")
    
    if sin_coincidencia:
        print("\nMuestra de usuarios en Humand que no coincidieron con TH:")
        for sc in sin_coincidencia[:5]:
            print(f"  - {sc.get('firstName')} {sc.get('lastName')} (ID: {sc.get('employeeInternalId')}, Email: {sc.get('email')})")
            
    print("\n" + "=" * 75)
    print("  FIN DE LA INSPECCIÓN")
    print("=" * 75 + "\n")

if __name__ == "__main__":
    run_inspection()
