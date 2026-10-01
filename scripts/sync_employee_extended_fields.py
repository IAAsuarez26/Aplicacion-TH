# -*- coding: utf-8 -*-
"""
Script de Sincronización de Campos Extendidos: Aplicación TH -> Humand
======================================================================
Sincroniza para los colaboradores habilitados (estatus_h = 1):
1. Ubicación (Segmentación grupal 'Ubicación' en Humand)
2. Estado Civil (Campo de Perfil con UUID 52005932-0bdb-438d-834c-82d8e3330e26)
3. Nivel Educativo (Campo de Perfil con UUID a0b1e6b5-4bc7-444b-a27c-2844dd5a9532)

Reglas de Negocio:
- estatus_h = 1: Colaboradores habilitados para sincronizar con Humand.
- estatus_h = 0: Registros locales exclusivos de TH (NUNCA se envían a Humand).
- El campo estatus_h es interno de Aplicación TH y no viaja a Humand.

Uso:
  python scripts/sync_employee_extended_fields.py --dry-run
  python scripts/sync_employee_extended_fields.py --pilot <cedula>
  python scripts/sync_employee_extended_fields.py --apply
"""

import os
import sys
import re
import json
import time
import argparse
import urllib.request
import urllib.error

HUMAND_BASE_URL = "https://api-prod.humand.co/public/api/v1"
INSFORGE_BASE_URL = "https://jj96rzs4.us-east.insforge.app"
INSFORGE_ANON_KEY = "anon_5a5f85153758df2568fcdfd16b5c70e958ba93aea7782df47d39f15f61aa5323"

UUID_ESTADO_CIVIL = "52005932-0bdb-438d-834c-82d8e3330e26"
UUID_NIVEL_EDUCATIVO = "a0b1e6b5-4bc7-444b-a27c-2844dd5a9532"

VALID_EDO_CIVIL = ["Soltero", "Casado", "Divorciado", "Viudo", "Concubinato"]
VALID_NIVEL_EDUCATIVO = ["Bachiller", "Técnico Medio", "Técnico Superior", "Universitario", "Posgrado"]
VALID_UBICACION = ["Barquisimeto", "Caracas", "Maracaibo", "Puerto Ordaz", "San Cristobal", "Valencia", "Yagua"]

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

def humand_request(endpoint, api_key, method="GET", body=None):
    url = f"{HUMAND_BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "TH-Humand-ExtendedFieldsSync/1.0"
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                status = resp.status
                raw = resp.read().decode("utf-8")
                parsed = json.loads(raw) if raw else {}
                return True, status, parsed, dict(resp.headers)
        except urllib.error.HTTPError as e:
            status = e.code
            raw = e.read().decode("utf-8")
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {"raw": raw}
                
            if status == 429 and attempt < max_retries - 1:
                retry_after = int(e.headers.get("Retry-After", 2 ** (attempt + 1)))
                print(f"      [429 Rate Limit] Esperando {retry_after}s...")
                time.sleep(retry_after)
                continue
                
            return False, status, parsed, dict(e.headers)
        except Exception as e:
            return False, 0, {"error": str(e)}, {}
            
    return False, 0, {"error": "Excedido maximo de reintentos"}, {}

def insforge_query(table):
    url = f"{INSFORGE_BASE_URL}/api/database/records/{table}?select=*"
    headers = {
        "apikey": INSFORGE_ANON_KEY,
        "Authorization": f"Bearer {INSFORGE_ANON_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8"))

def humand_get_all_users(api_key):
    all_users = []
    offset = 0
    limit = 50
    
    while True:
        endpoint = f"/users?limit={limit}&offset={offset}"
        ok, status, data, _ = humand_request(endpoint, api_key)
        if not ok:
            print(f"Error al paginar usuarios de Humand (offset={offset}): status {status} - {data}")
            break
            
        users = data.get("users", [])
        if not users:
            break
            
        all_users.extend(users)
        total = data.get("count", len(all_users))
        offset += limit
        if offset >= total:
            break
            
    return all_users

def normalize_ubicacion(val):
    if not val:
        return None
    val_clean = str(val).strip()
    for u in VALID_UBICACION:
        if u.lower() == val_clean.lower():
            return u
    # Si viene con acento o sin acento
    if "cristobal" in val_clean.lower():
        return "San Cristobal"
    if "ordaz" in val_clean.lower():
        return "Puerto Ordaz"
    return val_clean

def normalize_edo_civil(val):
    if not val:
        return None
    val_clean = str(val).strip()
    for e in VALID_EDO_CIVIL:
        if e.lower() == val_clean.lower():
            return e
    return val_clean

def normalize_nivel_educativo(val):
    if not val:
        return None
    val_clean = str(val).strip()
    for n in VALID_NIVEL_EDUCATIVO:
        if n.lower() == val_clean.lower():
            return n
    if "tecnico medio" in val_clean.lower() or "tcnico medio" in val_clean.lower():
        return "Técnico Medio"
    if "tecnico superior" in val_clean.lower() or "tcnico superior" in val_clean.lower() or "tsu" in val_clean.lower():
        return "Técnico Superior"
    return val_clean

def main():
    parser = argparse.ArgumentParser(description="Sincronización de campos extendidos (Ubicación, EdoCivil, NivelEducativo) con Humand")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="Audita discrepancias y planifica cambios sin mutar Humand")
    group.add_argument("--pilot", type=str, help="Ejecuta la sincronización en vivo únicamente para una cédula de prueba")
    group.add_argument("--apply", action="store_true", help="Aplica la sincronización en vivo a todos los colaboradores con estatus_h = 1")
    args = parser.parse_args()

    load_env()
    humand_api_key = os.environ.get("HUMAND_API_KEY")
    if not humand_api_key:
        print("[ERROR] HUMAND_API_KEY no encontrada en el entorno ni en .env.local")
        sys.exit(1)

    print("=" * 78)
    print(" MOTOR DE SINCRONIZACIÓN DE CAMPOS EXTENDIDOS: APLICACIÓN TH -> HUMAND")
    print(" (Ubicación [Segmentación], Estado Civil [Profile], Nivel Educativo [Profile])")
    print("=" * 78)

    # 1. Cargar empleados desde Insforge
    print("\n[1/4] Descargando nómina de colaboradores desde Aplicación TH...")
    try:
        raw_emps = insforge_query("empleados")
        # Manejar estructura Insforge (lista o dict)
        if isinstance(raw_emps, dict) and "data" in raw_emps:
            th_emps = raw_emps["data"]
        elif isinstance(raw_emps, list):
            th_emps = raw_emps
        else:
            th_emps = []
        print(f"      Total registros en TH: {len(th_emps)}")
    except Exception as e:
        print(f"[ERROR] No se pudo consultar Insforge: {e}")
        sys.exit(1)

    # Filtrar estrictamente estatus_h == 1
    syncable_emps = [e for e in th_emps if e.get("estatus_h") == 1]
    excluded_emps = [e for e in th_emps if e.get("estatus_h") != 1]
    print(f"      -> Habilitados para Humand (estatus_h = 1): {len(syncable_emps)}")
    print(f"      -> Excluidos / Solo TH (estatus_h = 0): {len(excluded_emps)} (NUNCA viajarán a Humand)")

    if args.pilot:
        pilot_clean = clean_cedula(args.pilot)
        syncable_emps = [e for e in syncable_emps if clean_cedula(e.get("documento_identidad")) == pilot_clean]
        if not syncable_emps:
            print(f"[AVISO] La cédula {args.pilot} no se encontró entre los colaboradores habilitados con estatus_h = 1.")
            sys.exit(0)
        print(f"      [MODO PILOTO] Restringido al colaborador con cédula: {pilot_clean}")

    # 2. Descargar usuarios de Humand
    print("\n[2/4] Consultando directorio de usuarios en Humand Public API v1...")
    humand_users = humand_get_all_users(humand_api_key)
    print(f"      Total cuentas recuperadas en Humand: {len(humand_users)}")

    # Indexar usuarios de Humand por cédula
    humand_by_cedula = {}
    for u in humand_users:
        emp_id = str(u.get("employeeInternalId") or "").strip()
        c = clean_cedula(emp_id)
        if c:
            humand_by_cedula[c] = u

    # 3. Conciliación y detección de deltas
    print("\n[3/4] Evaluando valores y preparando payloads de sincronización...")
    discrepancies = []
    
    for emp in syncable_emps:
        ced = clean_cedula(emp.get("documento_identidad"))
        h_user = humand_by_cedula.get(ced)
        if not h_user:
            continue
            
        emp_id = h_user.get("employeeInternalId")
        nombre_completo = f"{emp.get('nombres', '')} {emp.get('apellidos', '')}".strip()
        
        target_ubicacion = normalize_ubicacion(emp.get("ubicacion") or emp.get("sede"))
        target_edo_civil = normalize_edo_civil(emp.get("edo_civil"))
        target_nivel_ed = normalize_nivel_educativo(emp.get("nivel_educativo"))

        # Determinar si requiere actualizar segmentación o profile fields
        needs_seg_update = bool(target_ubicacion)
        needs_pf_update = bool(target_edo_civil or target_nivel_ed)

        if needs_seg_update or needs_pf_update:
            discrepancies.append({
                "cedula": ced,
                "employeeInternalId": emp_id,
                "nombre": nombre_completo,
                "ubicacion": target_ubicacion,
                "edo_civil": target_edo_civil,
                "nivel_educativo": target_nivel_ed,
            })

    print(f"      Colaboradores a procesar en Humand: {len(discrepancies)}")

    # 4. Ejecución (Dry-Run vs Apply)
    print("\n[4/4] Ejecución de sincronización...")
    if args.dry_run:
        print("      [DRY-RUN] Simulación activa. No se realizarán llamadas mutativas a Humand.")
        print("-" * 78)
        print(f"{'CÉDULA':<12} | {'COLABORADOR':<26} | {'UBICACIÓN':<14} | {'EDO CIVIL':<10} | {'NIVEL ED.'}")
        print("-" * 78)
        for d in discrepancies[:20]:
            print(f"{d['cedula']:<12} | {d['nombre'][:25]:<26} | {str(d['ubicacion'] or '-'):<14} | {str(d['edo_civil'] or '-'):<10} | {str(d['nivel_educativo'] or '-')}")
        if len(discrepancies) > 20:
            print(f"... y {len(discrepancies) - 20} colaboradores adicionales listos para sincronizar.")
        print("-" * 78)
        print(">> Ejecuta con --pilot <cedula> para probar un colaborador o con --apply para sincronizar en vivo.")
        return

    # MODO APPLY / PILOT
    success_count = 0
    error_count = 0
    print(f"      Iniciando transmisión segura a Humand API ({len(discrepancies)} colaboradores)...")

    for idx, d in enumerate(discrepancies, 1):
        emp_id = d["employeeInternalId"]
        ced = d["cedula"]
        nombre = d["nombre"]
        print(f"  [{idx}/{len(discrepancies)}] Cédula {ced} ({nombre})...", end=" ")

        errors_in_emp = []

        # 1. Actualizar Segmentación Ubicación si aplica
        if d["ubicacion"]:
            seg_payload = {
                "segmentations": [
                    {
                        "group": "Ubicación",
                        "item": d["ubicacion"]
                    }
                ]
            }
            ok_s, st_s, resp_s, _ = humand_request(f"/users/{emp_id}", humand_api_key, method="PATCH", body=seg_payload)
            if not ok_s:
                errors_in_emp.append(f"Seg Ubicación ({st_s}): {resp_s}")

        # 2. Actualizar Profile Fields (Estado Civil + Nivel Educativo) si aplica
        pf_list = []
        if d["edo_civil"]:
            pf_list.append({"id": UUID_ESTADO_CIVIL, "value": d["edo_civil"]})
        if d["nivel_educativo"]:
            pf_list.append({"id": UUID_NIVEL_EDUCATIVO, "value": d["nivel_educativo"]})

        if pf_list:
            pf_payload = {"fields": pf_list}
            ok_p, st_p, resp_p, _ = humand_request(f"/users/{emp_id}/profile-fields", humand_api_key, method="PATCH", body=pf_payload)
            if not ok_p:
                errors_in_emp.append(f"Profile Fields ({st_p}): {resp_p}")

        if not errors_in_emp:
            print("OK [Sincronizado]")
            success_count += 1
        else:
            print(f"FALLO -> {'; '.join(errors_in_emp)}")
            error_count += 1

        time.sleep(0.15)  # Respetar rate limit de Humand

    print("\n" + "=" * 78)
    print(f" RESUMEN DE SINCRONIZACIÓN DE CAMPOS EXTENDIDOS")
    print(f" - Exitosos: {success_count}")
    print(f" - Con error: {error_count}")
    print(f" - Excluidos por estatus_h = 0: {len(excluded_emps)} (Protegidos, no subieron)")
    print("=" * 78)

if __name__ == "__main__":
    main()
