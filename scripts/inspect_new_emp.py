import os
import sys
import json
import urllib.request
import urllib.error

INSFORGE_BASE_URL = "https://jj96rzs4.us-east.insforge.app"
INSFORGE_ANON_KEY = "anon_5a5f85153758df2568fcdfd16b5c70e958ba93aea7782df47d39f15f61aa5323"

def query_insforge(table, params=""):
    url = f"{INSFORGE_BASE_URL}/api/database/records/{table}?{params}"
    headers = {
        "apikey": INSFORGE_ANON_KEY,
        "Authorization": f"Bearer {INSFORGE_ANON_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    emp = query_insforge("empleados", "empleado_id=eq.177")
    print("Empleado 177 en Insforge:")
    print(json.dumps(emp, indent=2))

    dep = query_insforge("departamentos", "codigo=eq.Dep-0054")
    print("\nDepartamento Dep-0054 en Insforge:")
    print(json.dumps(dep, indent=2))

    cargo = query_insforge("cargos", "codigo=eq.Cargo-0099")
    print("\nCargo Cargo-0099 en Insforge:")
    print(json.dumps(cargo, indent=2))

if __name__ == '__main__':
    main()
