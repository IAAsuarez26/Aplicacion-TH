# -*- coding: utf-8 -*-
"""
Script de Depuración y Sincronización de Fechas de Ingreso: Humand
=================================================================
1. Elimina de forma segura y controlada las 9 cuentas que están en Humand
   y no pertenecen a la nómina de la Aplicación TH.
   (Protege estrictamente las cuentas técnicas: carolina.ellena, integracionespb, comunicacionespb).
2. Audita y actualiza cualquier fecha de contratación (hiringDate) en Humand
   que no coincida con la fecha de ingreso (fecha_ingreso) de Aplicación TH.

Uso:
  python scripts/reconcile_humand_users.py --dry-run
  python scripts/reconcile_humand_users.py --apply
"""

import os
import sys
import re
import json
import math
import time
import argparse
import urllib.request
import urllib.error

HUMAND_BASE_URL = "https://api-prod.humand.co/public/api/v1"
INSFORGE_BASE_URL = "https://jj96rzs4.us-east.insforge.app"
INSFORGE_ANON_KEY = "anon_5a5f85153758df2568fcdfd16b5c70e958ba93aea7782df47d39f15f61aa5323"

# Cuentas técnicas que bajo ninguna circunstancia deben ser alteradas ni eliminadas
PROTECTED_ACCOUNTS = [
    "carolina.ellena@humand.co",
    "integracionespb",
    "comunicacionespb"
]

# Las 9 cédulas identificadas que están en Humand pero no en la nómina de TH
TARGET_DELETE_IDS = [
    "17478213",  # Martin Javier Mendoza Rivas
    "19532795",  # Johan Marcel Correa
    "26427563",  # Genesis Hildamar Coronil Escobar
    "31748401",  # Luis Manuel Graterol Brito
    "32397497",  # Matias George Verar
    "32436262",  # Sofia Valentina Pinto Herrera
    "32890447",  # Valeria Nazaret Pinto Yanez
    "32890491",  # Valeria Darianna Vivas Cordero
    "33237675"   # Genesis Andrea Mota Vargas
]

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
    if "T" in val_str:
        val_str = val_str.split("T")[0]
    return val_str[:10]

def humand_request(endpoint, api_key, method="GET", body=None):
    url = f"{HUMAND_BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "TH-Humand-Reconcile/1.0"
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

def run_reconciliation(dry_run=True):
    load_env()
    api_key = os.getenv("HUMAND_API_KEY")
    if not api_key:
        print("[!] Error: HUMAND_API_KEY no encontrada.")
        sys.exit(1)

    print("\n" + "=" * 75)
    print("  DEPURACIÓN Y ACTUALIZACIÓN DE USUARIOS: HUMAND <-> APLICACIÓN TH")
    print(f"  Modo de Operación: [{'SIMULACIÓN / DRY-RUN' if dry_run else 'APLICACIÓN REAL / APPLY'}]")
    print("=" * 75)

    # 1. Obtener usuarios actuales en Humand
    print("\n[PASO 1] Consultando usuarios en Humand...")
    h_users = humand_get_all_users(api_key)
    print(f"         Total usuarios recuperados en Humand: {len(h_users)}")

    h_by_id = {str(u.get("employeeInternalId", "")).strip(): u for u in h_users}
    
    # 2. Obtener empleados de TH
    print("\n[PASO 2] Consultando empleados en Aplicación TH (InsForge)...")
    th_emps = insforge_query("empleados")
    print(f"         Total empleados en TH: {len(th_emps)}")
    
    th_by_cedula = {clean_cedula(e.get("documento_identidad")): e for e in th_emps if clean_cedula(e.get("documento_identidad"))}

    # =========================================================================
    # ACCIÓN 1: ELIMINACIÓN CONTROLADA DE LAS 9 CUENTAS
    # =========================================================================
    print("\n" + "-" * 75)
    print("ACCION 1: ELIMINACIÓN DE CUENTAS QUE NO PERTENECEN A TH")
    print("-" * 75)
    
    to_delete = []
    for tid in TARGET_DELETE_IDS:
        # Verificación estricta de seguridad
        if tid in PROTECTED_ACCOUNTS:
            print(f"  [BLOQUEO DE SEGURIDAD] Cuenta protegida omitida: {tid}")
            continue
            
        if tid in h_by_id:
            u = h_by_id[tid]
            to_delete.append((tid, f"{u.get('firstName', '')} {u.get('lastName', '')}".strip()))
        else:
            print(f"  [INFO] Cédula {tid} ya no se encuentra en Humand.")

    print(f"\nTotal cuentas a eliminar confirmadas: {len(to_delete)}")
    for idx, (cid, nom) in enumerate(to_delete, 1):
        print(f"  {idx}. C.I. {cid} | {nom}")

    if not dry_run and to_delete:
        print("\n-> Ejecutando eliminación permanente en Humand (DELETE /users/{id})...")
        deleted_count = 0
        for idx, (cid, nom) in enumerate(to_delete, 1):
            # Probar DELETE
            ok, st, resp, _ = humand_request(f"/users/{cid}", api_key, method="DELETE")
            if not ok and st == 405:
                # Fallback alias si el método DELETE estuviera restringido por proxy
                ok, st, resp, _ = humand_request(f"/users/{cid}/delete", api_key, method="POST")

            if ok and st in [200, 204]:
                print(f"   [{idx}/{len(to_delete)}] [OK] Eliminado: C.I. {cid} ({nom}) - HTTP {st}")
                deleted_count += 1
            else:
                print(f"   [{idx}/{len(to_delete)}] [ERROR] Falló eliminar C.I. {cid}: HTTP {st} - {resp}")
            time.sleep(0.3)
        print(f"\n[RESULTADO ACCION 1] Cuentas eliminadas exitosamente: {deleted_count} de {len(to_delete)}")
    elif dry_run:
        print("\n[DRY-RUN ACCION 1] No se eliminaron cuentas en producción.")

    # =========================================================================
    # ACCIÓN 2: ACTUALIZACIÓN DE FECHAS DE CONTRATACIÓN (hiringDate)
    # =========================================================================
    print("\n" + "-" * 75)
    print("ACCION 2: AUDITORÍA Y ACTUALIZACIÓN DE FECHAS DE CONTRATACIÓN")
    print("-" * 75)

    dates_to_update = []
    
    for c, emp in th_by_cedula.items():
        if c in h_by_id:
            u = h_by_id[c]
            internal_id = u.get("employeeInternalId")
            nom = f"{emp.get('nombres', '')} {emp.get('apellidos', '')}".strip()
            
            d_th = normalize_date(emp.get("fecha_ingreso"))
            d_h = normalize_date(u.get("hiringDate"))
            
            if d_th and d_th != d_h:
                dates_to_update.append({
                    "internal_id": internal_id,
                    "nombre": nom,
                    "fecha_th": d_th,
                    "fecha_humand_actual": d_h or "No asignada"
                })

    print(f"Total colaboradores que requieren actualización de fecha: {len(dates_to_update)}")
    
    if dates_to_update:
        for idx, item in enumerate(dates_to_update, 1):
            print(f"  {idx}. C.I. {item['internal_id']} | {item['nombre']:<30} | Humand actual: {item['fecha_humand_actual']} -> Nuevo TH: {item['fecha_th']}")
            
        if not dry_run:
            print("\n-> Aplicando actualización de fechas (PATCH /users/{id})...")
            updated_dates = 0
            for idx, item in enumerate(dates_to_update, 1):
                payload = {"hiringDate": item["fecha_th"]}
                ok, st, resp, _ = humand_request(f"/users/{item['internal_id']}", api_key, method="PATCH", body=payload)
                if ok and st in [200, 204]:
                    print(f"   [{idx}/{len(dates_to_update)}] [OK] Actualizada fecha para: {item['nombre']} (HTTP {st})")
                    updated_dates += 1
                else:
                    print(f"   [{idx}/{len(dates_to_update)}] [ERROR] Falló actualizar fecha para: {item['nombre']}: HTTP {st} - {resp}")
                time.sleep(0.3)
            print(f"\n[RESULTADO ACCION 2] Fechas actualizadas: {updated_dates} de {len(dates_to_update)}")
    else:
        print("  [OK] Todas las fechas de contratación en Humand ya coinciden al 100% con la fecha de ingreso de TH.")

    print("\n" + "=" * 75)
    print("  FIN DEL PROCESO")
    print("=" * 75 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Depuración y actualización de usuarios Humand")
    parser.add_argument("--apply", action="store_true", help="Aplicar cambios en Humand (por defecto es Dry-Run)")
    parser.add_argument("--dry-run", action="store_true", help="Modo simulación sin escrituras")
    args = parser.parse_args()

    is_dry_run = not args.apply or args.dry_run
    run_reconciliation(dry_run=is_dry_run)

if __name__ == "__main__":
    main()
