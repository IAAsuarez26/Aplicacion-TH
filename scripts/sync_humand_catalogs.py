# -*- coding: utf-8 -*-
"""
Script de Sincronización de Catálogos Maestros: Aplicación TH -> Humand Public API v1
====================================================================================
Sincroniza:
1. Departamentos (POST /departments/bulk)
2. Puestos / Cargos (POST /job-positions/bulk)

Uso:
  python scripts/sync_humand_catalogs.py --dry-run
  python scripts/sync_humand_catalogs.py --apply
  python scripts/sync_humand_catalogs.py --apply --departments-only
  python scripts/sync_humand_catalogs.py --apply --cargos-only
"""

import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.error

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

def humand_request(endpoint, api_key, method="GET", body=None):
    url = f"{HUMAND_BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "TH-Humand-CatalogSync/1.0"
    }
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
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
            
            # Rate limiting handling
            if status == 429 and attempt < max_retries - 1:
                retry_after = int(e.headers.get("Retry-After", 2 ** attempt))
                print(f"    [429 Rate Limit] Esperando {retry_after}s antes de reintentar...")
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
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_humand_all_departments(api_key):
    items = []
    page = 1
    limit = 50
    while True:
        ok, status, data, _ = humand_request(f"/departments?page={page}&limit={limit}", api_key)
        if not ok:
            print(f"  [ERROR] No se pudo leer departamentos de Humand: {data}")
            break
        current = data.get("items", [])
        items.extend(current)
        total_pages = data.get("totalPages", 1)
        if page >= total_pages or not current:
            break
        page += 1
    return items

def get_humand_all_job_positions(api_key):
    items = []
    page = 1
    limit = 50
    while True:
        ok, status, data, _ = humand_request(f"/job-positions?page={page}&limit={limit}", api_key)
        if not ok:
            print(f"  [ERROR] No se pudo leer puestos de Humand: {data}")
            break
        current = data.get("items", [])
        items.extend(current)
        total_pages = data.get("totalPages", 1)
        if page >= total_pages or not current:
            break
        page += 1
    return items

def run_sync(dry_run=True, sync_departments=True, sync_cargos=True):
    load_env()
    api_key = os.getenv("HUMAND_API_KEY")
    if not api_key:
        print("[!] Error: HUMAND_API_KEY no encontrada en el entorno ni en .env.local")
        sys.exit(1)
        
    print("\n" + "=" * 75)
    print("  MOTOR DE SINCRONIZACIÓN DE CATÁLOGOS MAESTROS: TH -> HUMAND")
    print(f"  Modo: {'[SIMULACIÓN / DRY-RUN]' if dry_run else '[EJECUCIÓN REAL / APPLY]'}")
    print("=" * 75)
    
    # --------------------------------------------------------------------------
    # 1. SINCRONIZACIÓN DE DEPARTAMENTOS
    # --------------------------------------------------------------------------
    if sync_departments:
        print("\n[PASO 1] Conciliación de Departamentos")
        print("-" * 50)
        
        # Consultar TH
        print("  -> Consultando departamentos en Aplicación TH (InsForge)...")
        th_deps = insforge_query("departamentos")
        th_activos = [d for d in th_deps if d.get("estado") is not False]
        print(f"     Encontrados: {len(th_deps)} totales ({len(th_activos)} activos)")
        
        # Consultar Humand
        print("  -> Consultando departamentos existentes en Humand...")
        humand_deps = get_humand_all_departments(api_key)
        print(f"     Encontrados en Humand: {len(humand_deps)}")
        
        existing_names = {d.get("name", "").strip().lower() for d in humand_deps}
        
        # Filtrar los que faltan
        deps_to_create = []
        for d in th_activos:
            name = d.get("nombre", "").strip()
            codigo = d.get("codigo", "").strip()
            if name.lower() not in existing_names:
                deps_to_create.append({
                    "name": name,
                    "identifier": codigo
                })
                # Evitar duplicados en el mismo lote si TH tiene nombres repetidos
                existing_names.add(name.lower())
                
        print(f"\n  [EVALUACIÓN] Departamentos nuevos a sincronizar: {len(deps_to_create)}")
        for idx, item in enumerate(deps_to_create[:5], 1):
            print(f"    {idx}. [{item['identifier']}] {item['name']}")
        if len(deps_to_create) > 5:
            print(f"    ... y {len(deps_to_create) - 5} departamentos más.")
            
        if not dry_run and deps_to_create:
            print("\n  -> Enviando departamentos a Humand (POST /departments/bulk)...")
            # Enviar en bloques de 30 para respetar cuotas
            chunk_size = 30
            created_count = 0
            for i in range(0, len(deps_to_create), chunk_size):
                chunk = deps_to_create[i:i + chunk_size]
                payload = {"departments": chunk}
                ok, status, resp, _ = humand_request("/departments/bulk", api_key, method="POST", body=payload)
                if ok and status in [200, 201]:
                    print(f"     [OK] Lote {i//chunk_size + 1}: {len(chunk)} departamentos sincronizados (HTTP {status}).")
                    created_count += len(chunk)
                else:
                    print(f"     [ERROR] Fallo en lote {i//chunk_size + 1} (HTTP {status}): {resp}")
            print(f"  [RESULTADO] Total departamentos creados en Humand: {created_count}")
        elif dry_run:
            print("  [DRY-RUN] No se realizaron llamadas de escritura en Humand.")
    
    # --------------------------------------------------------------------------
    # 2. SINCRONIZACIÓN DE CARGOS / PUESTOS (JOB POSITIONS)
    # --------------------------------------------------------------------------
    if sync_cargos:
        print("\n[PASO 2] Conciliación de Puestos de Trabajo (Cargos)")
        print("-" * 50)
        
        # Consultar TH
        print("  -> Consultando cargos en Aplicación TH (InsForge)...")
        th_cargos = insforge_query("cargos")
        th_activos_cargos = [c for c in th_cargos if c.get("estado") is not False]
        print(f"     Encontrados: {len(th_cargos)} totales ({len(th_activos_cargos)} activos)")
        
        # Consultar Humand
        print("  -> Consultando puestos existentes en Humand...")
        humand_cargos = get_humand_all_job_positions(api_key)
        print(f"     Encontrados en Humand: {len(humand_cargos)}")
        
        existing_cargo_names = {c.get("name", "").strip().lower() for c in humand_cargos}
        
        # Filtrar los que faltan
        cargos_to_create = []
        for c in th_activos_cargos:
            name = c.get("nombre", "").strip()
            codigo = c.get("codigo", "").strip()
            if name.lower() not in existing_cargo_names:
                cargos_to_create.append({
                    "name": name,
                    "identifier": codigo
                })
                existing_cargo_names.add(name.lower())
                
        print(f"\n  [EVALUACIÓN] Puestos de trabajo nuevos a sincronizar: {len(cargos_to_create)}")
        for idx, item in enumerate(cargos_to_create[:5], 1):
            print(f"    {idx}. [{item['identifier']}] {item['name']}")
        if len(cargos_to_create) > 5:
            print(f"    ... y {len(cargos_to_create) - 5} puestos más.")
            
        if not dry_run and cargos_to_create:
            print("\n  -> Enviando puestos a Humand (POST /job-positions/bulk)...")
            chunk_size = 30
            created_cargos_count = 0
            for i in range(0, len(cargos_to_create), chunk_size):
                chunk = cargos_to_create[i:i + chunk_size]
                payload = {"jobPositions": chunk}
                ok, status, resp, _ = humand_request("/job-positions/bulk", api_key, method="POST", body=payload)
                if ok and status in [200, 201]:
                    print(f"     [OK] Lote {i//chunk_size + 1}: {len(chunk)} puestos sincronizados (HTTP {status}).")
                    created_cargos_count += len(chunk)
                else:
                    print(f"     [ERROR] Fallo en lote {i//chunk_size + 1} (HTTP {status}): {resp}")
            print(f"  [RESULTADO] Total puestos creados en Humand: {created_cargos_count}")
        elif dry_run:
            print("  [DRY-RUN] No se realizaron llamadas de escritura en Humand.")

    print("\n" + "=" * 75)
    print("  FIN DEL PROCESO DE CONCILIACIÓN")
    print("=" * 75 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Sincronizador de Departamentos y Cargos TH -> Humand")
    parser.add_argument("--apply", action="store_true", help="Ejecutar escritura real en Humand (por defecto es Dry-Run)")
    parser.add_argument("--dry-run", action="store_true", help="Simulacion sin escritura")
    parser.add_argument("--departments-only", action="store_true", help="Sincronizar solo departamentos")
    parser.add_argument("--cargos-only", action="store_true", help="Sincronizar solo cargos")
    
    args = parser.parse_args()
    
    is_dry_run = not args.apply or args.dry_run
    sync_deps = not args.cargos_only
    sync_cargos = not args.departments_only
    
    run_sync(dry_run=is_dry_run, sync_departments=sync_deps, sync_cargos=sync_cargos)

if __name__ == "__main__":
    main()
