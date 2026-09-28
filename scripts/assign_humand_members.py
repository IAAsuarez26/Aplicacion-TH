# -*- coding: utf-8 -*-
"""
Motor de Asignación Organizacional: Departamentos y Puestos TH -> Humand
=======================================================================
Asigna a cada colaborador en Humand:
1. Su Departamento correspondiente (PUT /departments/members/{employeeInternalId})
2. Su Puesto de Trabajo / Cargo (PUT /job-positions/members/{employeeInternalId})

Opciones:
  python scripts/assign_humand_members.py --dry-run
  python scripts/assign_humand_members.py --pilot 11144933
  python scripts/assign_humand_members.py --apply
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
        "User-Agent": "TH-Humand-MemberAssignment/1.0"
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

def humand_get_all(endpoint, api_key):
    items = []
    page = 1
    limit = 50
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json"
    }
    while True:
        url = f"{HUMAND_BASE_URL}{endpoint}?page={page}&limit={limit}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            current = data.get("items", [])
            items.extend(current)
            total_pages = data.get("totalPages", 1)
            if page >= total_pages or not current:
                break
            page += 1
    return items

def humand_get_all_users(api_key):
    all_users = []
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json"
    }
    import math
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




def run_assignment(mode="dry-run", pilot_cedula=None):
    load_env()
    api_key = os.getenv("HUMAND_API_KEY")
    if not api_key:
        print("[!] Error: HUMAND_API_KEY no encontrada.")
        sys.exit(1)

    print("\n" + "=" * 75)
    print("  MOTOR DE ASIGNACIÓN ORGANIZACIONAL: DEPARTAMENTOS Y CARGOS")
    print(f"  Modo de Operación: [{mode.upper()}]")
    if pilot_cedula:
        print(f"  Filtro Piloto: Cédula {pilot_cedula}")
    print("=" * 75)

    # 1. Cargar catálogos de Humand
    print("\n[1/4] Consultando catálogos actuales en Humand...")
    h_deps = humand_get_all("/departments", api_key)
    h_jobs = humand_get_all("/job-positions", api_key)
    print(f"      Humand Departamentos disponibles: {len(h_deps)}")
    print(f"      Humand Puestos disponibles:        {len(h_jobs)}")

    # Diccionarios Humand por nombre en minúsculas y normalizado
    def norm_name(s):
        if not s: return ""
        s = s.strip().lower()
        s = s.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        return s

    humand_dep_map = {norm_name(d.get("name")): d.get("id") for d in h_deps}
    humand_job_map = {norm_name(j.get("name")): j.get("id") for j in h_jobs}

    # 2. Cargar catálogos de TH (InsForge)
    print("\n[2/4] Consultando estructura interna de Aplicación TH (InsForge)...")
    th_deps = insforge_query("departamentos")
    th_cargos = insforge_query("cargos")
    th_emps = insforge_query("empleados")
    print(f"      TH Departamentos: {len(th_deps)}")
    print(f"      TH Cargos:        {len(th_cargos)}")
    print(f"      TH Empleados:     {len(th_emps)}")

    # Mapear código a nombre en TH
    th_dep_cod_to_name = {d.get("codigo"): d.get("nombre") for d in th_deps if d.get("codigo")}
    th_cargo_cod_to_name = {c.get("codigo"): c.get("nombre") for c in th_cargos if c.get("codigo")}

    # 3. Cargar usuarios existentes de Humand
    print("\n[3/4] Indexando usuarios existentes en Humand...")
    h_users = humand_get_all_users(api_key)
    h_user_by_cedula = {clean_cedula(u.get("employeeInternalId")): u for u in h_users if clean_cedula(u.get("employeeInternalId"))}
    print(f"      Usuarios indexados en Humand por cédula: {len(h_user_by_cedula)}")

    # 4. Planificar asignaciones
    print("\n[4/4] Evaluando correspondencias y asignaciones...")
    assignments = []
    sin_usuario_humand = 0
    sin_dep_match = 0
    sin_job_match = 0

    for emp in th_emps:
        cedula = clean_cedula(emp.get("documento_identidad"))
        nombre_completo = f"{emp.get('nombres', '')} {emp.get('apellidos', '')}".strip()
        cod_dep = emp.get("codigo_departamento")
        cod_cargo = emp.get("codigo_cargo")

        # Verificar si existe en Humand
        if cedula not in h_user_by_cedula:
            sin_usuario_humand += 1
            continue

        h_user = h_user_by_cedula[cedula]
        internal_id = h_user.get("employeeInternalId")

        # Resolver departamento
        dep_nombre_th = th_dep_cod_to_name.get(cod_dep, "")
        dep_id_humand = humand_dep_map.get(norm_name(dep_nombre_th))
        if not dep_id_humand:
            sin_dep_match += 1

        # Resolver puesto
        cargo_nombre_th = th_cargo_cod_to_name.get(cod_cargo, "")
        job_id_humand = humand_job_map.get(norm_name(cargo_nombre_th))
        if not job_id_humand:
            sin_job_match += 1

        assignments.append({
            "cedula": cedula,
            "internal_id": internal_id,
            "nombre": nombre_completo,
            "cod_dep": cod_dep,
            "dep_nombre": dep_nombre_th,
            "dep_id_humand": dep_id_humand,
            "cod_cargo": cod_cargo,
            "cargo_nombre": cargo_nombre_th,
            "job_id_humand": job_id_humand
        })

    print(f"\n  Total colaboradores evaluados en TH:                {len(th_emps)}")
    print(f"  Colaboradores con cuenta confirmada en Humand:      {len(assignments)}")
    print(f"  Colaboradores sin cuenta en Humand:                 {sin_usuario_humand}")
    
    completos = [a for a in assignments if a["dep_id_humand"] and a["job_id_humand"]]
    solo_dep = [a for a in assignments if a["dep_id_humand"] and not a["job_id_humand"]]
    solo_job = [a for a in assignments if not a["dep_id_humand"] and a["job_id_humand"]]
    print(f"  -> Con Departamento y Cargo coincidentes:           {len(completos)} ({round(len(completos)/len(assignments)*100, 1)}%)")
    if solo_dep:
        print(f"  -> Solo con Departamento coincidente:               {len(solo_dep)}")
    if solo_job:
        print(f"  -> Solo con Cargo coincidente:                      {len(solo_job)}")

    # Filtro piloto si aplica
    targets = assignments
    if pilot_cedula:
        clean_p = clean_cedula(pilot_cedula)
        targets = [a for a in assignments if a["cedula"] == clean_p]
        if not targets:
            print(f"\n[!] Cédula piloto {pilot_cedula} no encontrada entre los usuarios vinculados.")
            return

    # Visualización de muestra
    print("\n--- Muestra de asignaciones planificadas ---")
    for a in targets[:5]:
        print(f"Colaborador: {a['nombre']} (C.I. {a['internal_id']})")
        print(f"  * Dpto TH:   {a['dep_nombre']} -> Humand Dpto ID: {a['dep_id_humand']}")
        print(f"  * Cargo TH:  {a['cargo_nombre']} -> Humand Job ID:  {a['job_id_humand']}")

    # Ejecución
    if mode == "dry-run":
        print("\n[DRY-RUN] Simulación completa finalizada. No se aplicaron cambios en producción.")
        return

    print(f"\n>>> INICIANDO APLICACIÓN REAL SOBRE {len(targets)} COLABORADORES <<<")
    exitos_dep = 0
    exitos_job = 0
    errores = 0

    for idx, a in enumerate(targets, 1):
        internal_id = a["internal_id"]
        print(f"\n[{idx}/{len(targets)}] Asignando a: {a['nombre']} (ID: {internal_id})")

        # 1. Asignar Departamento
        if a["dep_id_humand"]:
            payload_dep = {"departmentId": a["dep_id_humand"]}
            ok_dep, st_dep, resp_dep, _ = humand_request(
                f"/departments/members/{internal_id}",
                api_key,
                method="PUT",
                body=payload_dep
            )
            if ok_dep and st_dep in [200, 204]:
                print(f"    [OK] Dpto: '{a['dep_nombre']}' (ID: {a['dep_id_humand']}) asignado exitosamente.")
                exitos_dep += 1
            else:
                print(f"    [ERROR] Falló asignación Dpto (HTTP {st_dep}): {resp_dep}")
                errores += 1
        else:
            print(f"    [OMITIDO] No se encontró equivalencia para Dpto TH '{a['dep_nombre']}'.")

        # 2. Asignar Puesto de Trabajo
        if a["job_id_humand"]:
            payload_job = {"jobPositionId": a["job_id_humand"]}
            ok_job, st_job, resp_job, _ = humand_request(
                f"/job-positions/members/{internal_id}",
                api_key,
                method="PUT",
                body=payload_job
            )
            if ok_job and st_job in [200, 204]:
                print(f"    [OK] Cargo: '{a['cargo_nombre']}' (ID: {a['job_id_humand']}) asignado exitosamente.")
                exitos_job += 1
            else:
                print(f"    [ERROR] Falló asignación Cargo (HTTP {st_job}): {resp_job}")
                errores += 1
        else:
            print(f"    [OMITIDO] No se encontró equivalencia para Cargo TH '{a['cargo_nombre']}'.")

        # Pausa suave de 0.35s para mantenerse fluidamente dentro de la ventana de 100 req/min
        time.sleep(0.35)


    print("\n" + "=" * 75)
    print("  RESUMEN DE ASIGNACIONES APLICADAS")
    print("=" * 75)
    print(f"  Departamentos asignados con éxito: {exitos_dep}")
    print(f"  Puestos de trabajo asignados:      {exitos_job}")
    print(f"  Errores registrados:               {errores}")
    print("=" * 75 + "\n")

def main():
    parser = argparse.ArgumentParser(description="Asignador de Departamentos y Puestos en Humand")
    parser.add_argument("--apply", action="store_true", help="Aplicar a todos los colaboradores")
    parser.add_argument("--pilot", type=str, help="Ejecutar prueba piloto en un solo colaborador por C.I.")
    parser.add_argument("--dry-run", action="store_true", help="Simulacion sin llamadas mutativas")

    args = parser.parse_args()

    if args.pilot:
        run_assignment(mode="pilot", pilot_cedula=args.pilot)
    elif args.apply:
        run_assignment(mode="apply")
    else:
        run_assignment(mode="dry-run")

if __name__ == "__main__":
    main()
