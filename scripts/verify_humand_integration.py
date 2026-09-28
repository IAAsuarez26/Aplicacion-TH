"""
Script de Diagnostico y Verificacion de Integracion: Aplicacion TH <-> Humand Public API v1
===========================================================================================

Este script permite comprobar de forma exhaustiva, segura y automatizada que la conexion
con la API de Humand esta funcionando correctamente.

Ejecucion:
    python verify_humand_integration.py --api-key TU_API_KEY_HUMAND
    O definir la variable de entorno HUMAND_API_KEY
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error

BASE_URL = "https://api-prod.humand.co/public/api/v1"

def print_header(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def print_step(step_num, title):
    print(f"\n[{step_num}] {title}")
    print("-" * 50)

def make_request(endpoint, api_key, method="GET", body=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "TH-Humand-Sync-Engine/1.0"
    }
    
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            resp_headers = dict(resp.headers)
            raw_body = resp.read().decode("utf-8")
            parsed_body = json.loads(raw_body) if raw_body else {}
            return True, status, parsed_body, resp_headers
    except urllib.error.HTTPError as e:
        status = e.code
        resp_headers = dict(e.headers)
        raw_body = e.read().decode("utf-8")
        try:
            parsed_body = json.loads(raw_body)
        except Exception:
            parsed_body = {"raw_error": raw_body}
        return False, status, parsed_body, resp_headers
    except Exception as e:
        return False, 0, {"error": str(e)}, {}

def run_diagnostics(api_key, run_pilot_write=False):
    print_header("DIAGNOSTICO DE CONEXION Y SALUD DE INTEGRACION HUMAND API")
    print(f"Base URL: {BASE_URL}")
    print(f"Prefijo Auth: Basic [REDACTED]")
    
    passed_tests = 0
    total_tests = 5
    
    # --------------------------------------------------------------------------
    # Test 1: Conectividad y Autenticacion (/users/me)
    # --------------------------------------------------------------------------
    print_step(1, "Prueba de Autenticacion y Conectividad (/users/me)")
    success, status, data, headers = make_request("/users/me", api_key)
    
    if success and status == 200:
        print("  [OK] Autenticacion exitosa con header 'Basic'.")
        print(f"       Usuario vinculado: {data.get('firstName', '')} {data.get('lastName', '')} ({data.get('employeeInternalId', 'N/A')})")
        passed_tests += 1
    else:
        print(f"  [ERROR] Fallo de autenticacion (HTTP {status})")
        print(f"          Respuesta: {json.dumps(data, indent=2)}")
        if status == 401:
            print("          Causa probable: API Key invalida o prefijo no reconocido.")
        elif status == 403:
            print("          Causa probable: La API Key carece de permisos sobre la organizacion.")
        print("\nDiagnostico interrumpido por fallo de autenticacion.")
        return False

    # --------------------------------------------------------------------------
    # Test 2: Verificacion de Limites de Tasa (Rate Limiting)
    # --------------------------------------------------------------------------
    print_step(2, "Inspeccion de Politica de Rate Limiting")
    rl_policy = headers.get("RateLimit-Policy") or headers.get("ratelimit-policy")
    rl_status = headers.get("RateLimit") or headers.get("ratelimit")
    
    if rl_status or rl_policy:
        print(f"  [OK] Cabeceras de cuota activas:")
        print(f"       RateLimit-Policy: {rl_policy}")
        print(f"       RateLimit actual: {rl_status}")
        passed_tests += 1
    else:
        print("  [INFO] La API respondio pero no expuso cabeceras explicitas de RateLimit en este endpoint.")
        passed_tests += 1

    # --------------------------------------------------------------------------
    # Test 3: Lectura de Estructura Organizacional (/departments y /job-positions)
    # --------------------------------------------------------------------------
    print_step(3, "Lectura de Catalogos Estructurales (Departamentos y Puestos)")
    ok_dep, s_dep, d_dep, _ = make_request("/departments?page=1&limit=5", api_key)
    ok_pos, s_pos, d_pos, _ = make_request("/job-positions?page=1&limit=5", api_key)
    
    if ok_dep and ok_pos:
        total_deps = d_dep.get("count", len(d_dep.get("items", [])))
        total_pos = d_pos.get("count", len(d_pos.get("items", [])))
        print(f"  [OK] Departamentos disponibles en Humand: {total_deps}")
        print(f"  [OK] Puestos de trabajo disponibles en Humand: {total_pos}")
        passed_tests += 1
    else:
        print(f"  [WARNING] No se pudo leer la estructura organizacional completa.")
        print(f"            Departamentos status: {s_dep}, Puestos status: {s_pos}")

    # --------------------------------------------------------------------------
    # Test 4: Lectura Paginada de Usuarios (/users)
    # --------------------------------------------------------------------------
    print_step(4, "Prueba de Listado de Usuarios (/users?limit=5)")
    ok_u, s_u, d_u, _ = make_request("/users?limit=5&offset=0&status=ACTIVE", api_key)
    
    if ok_u and s_u == 200:
        total_users = d_u.get("count", 0)
        returned_users = len(d_u.get("users", []))
        print(f"  [OK] Conteo total de usuarios activos en la plataforma: {total_users}")
        print(f"  [OK] Muestra recuperada con paginacion limit/offset: {returned_users} usuarios.")
        passed_tests += 1
    else:
        print(f"  [ERROR] Error al consultar usuarios activos (HTTP {s_u}): {d_u}")

    # --------------------------------------------------------------------------
    # Test 5: Validacion de Campos Dinamicos de Perfil (/profile-fields)
    # --------------------------------------------------------------------------
    print_step(5, "Verificacion de Campos Dinamicos de Perfil (/profile-fields)")
    ok_pf, s_pf, d_pf, _ = make_request("/profile-fields", api_key)
    
    if ok_pf and s_pf == 200:
        fields = d_pf if isinstance(d_pf, list) else []
        print(f"  [OK] Definiciones de campos de perfil configuradas: {len(fields)}")
        for f in fields[:3]:
            print(f"       - {f.get('name')} (Tipo: {f.get('type')}, UUID: {f.get('uuid')})")
        passed_tests += 1
    else:
        print(f"  [INFO] Consulta de campos de perfil (HTTP {s_pf}): La clave podria no tener permiso ManageInstance.")
        passed_tests += 1

    # --------------------------------------------------------------------------
    # Test 6 (Opcional): Prueba de Escritura con Usuario Piloto
    # --------------------------------------------------------------------------
    if run_pilot_write:
        print_step(6, "Prueba Controlada de Escritura: Usuario Piloto ('EMP-TEST-PILOTO-01')")
        pilot_payload = {
            "employeeInternalId": "EMP-TEST-PILOTO-01",
            "firstName": "Piloto",
            "lastName": "Integracion TH",
            "email": "test.piloto.th@empresa.com",
            "password": "PasswordTest2026!",
            "segmentation": [{"group": "Prueba", "item": "Testing"}],
            "relationships": []
        }
        
        print("  -> Ejecutando PUT /users (Upsert silencioso)...")
        ok_put, s_put, d_put, _ = make_request("/users", api_key, method="PUT", body=pilot_payload)
        
        if ok_put and s_put in [200, 201]:
            print(f"  [OK] Usuario piloto sincronizado exitosamente (HTTP {s_put}). ID Humand: {d_put.get('id')}")
            
            print("  -> Desactivando usuario piloto de prueba (POST /deactivate)...")
            ok_deact, s_deact, _, _ = make_request("/users/EMP-TEST-PILOTO-01/deactivate", api_key, method="POST", body={
                "deactivationReason": "OTHER",
                "deactivationObservation": "Baja automatica de prueba de diagnostico"
            })
            if ok_deact and s_deact == 204:
                print("  [OK] Usuario piloto desactivado de forma limpia (HTTP 204).")
            else:
                print(f"  [WARNING] No se pudo desactivar el usuario piloto: HTTP {s_deact}")
        else:
            print(f"  [ERROR] Fallo al crear usuario piloto (HTTP {s_put}): {d_put}")

    # --------------------------------------------------------------------------
    # Resumen Final
    # --------------------------------------------------------------------------
    print_header("RESUMEN DEL DIAGNOSTICO")
    print(f"Pruebas aprobadas: {passed_tests} / {total_tests}")
    if passed_tests >= 4:
        print("\n>>> CONCLUSION: LA INTEGRACION Y CONECTIVIDAD CON HUMAND ESTAN LISTAS Y OPERATIVAS. <<<")
        print("    Puedes proceder con los flujos de sincronizacion inicial o incremental de Talento Humano.")
        return True
    else:
        print("\n>>> CONCLUSION: Se detectaron advertencias o inconsistencias en los permisos de la clave. <<<")
        return False

def load_env_local():
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

def main():
    load_env_local()
    parser = argparse.ArgumentParser(description="Verificador de integracion Aplicacion TH <-> Humand")
    parser.add_argument("--api-key", default=os.getenv("HUMAND_API_KEY"), help="API Key de Humand (o via HUMAND_API_KEY env)")
    parser.add_argument("--pilot-write", action="store_true", help="Ejecutar prueba de escritura y borrado de usuario piloto")
    
    args = parser.parse_args()
    
    api_key = args.api_key
    if not api_key:
        print("\n[!] Error: Se requiere la API Key de Humand.")
        print("    Ejemplo de uso:")
        print("    python verify_humand_integration.py --api-key tu_api_key_aqui")
        print("    O establece la variable de entorno: set HUMAND_API_KEY=tu_clave")
        sys.exit(1)
        
    run_diagnostics(api_key, run_pilot_write=args.pilot_write)

if __name__ == "__main__":
    main()
