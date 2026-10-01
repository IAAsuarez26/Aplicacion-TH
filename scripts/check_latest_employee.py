import os
import sys
import json
import urllib.request

INSFORGE_BASE_URL = "https://jj96rzs4.us-east.insforge.app"
INSFORGE_ANON_KEY = "anon_5a5f85153758df2568fcdfd16b5c70e958ba93aea7782df47d39f15f61aa5323"

def main():
    url = f"{INSFORGE_BASE_URL}/api/database/records/empleados?select=*"
    headers = {
        "apikey": INSFORGE_ANON_KEY,
        "Authorization": f"Bearer {INSFORGE_ANON_KEY}"
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=25) as resp:
        emps = json.loads(resp.read().decode('utf-8'))
        
    print(f"Total empleados en TH: {len(emps)}")
    sorted_emps = sorted(emps, key=lambda x: x.get('empleado_id', 0), reverse=True)
    for e in sorted_emps[:15]:
        print(f"ID: {e.get('empleado_id')} | CI: {e.get('documento_identidad')} | Nombre: {e.get('nombres')} {e.get('apellidos')} | Cod: {e.get('codigo_empleado')} | Estado: {e.get('estado_laboral')} | Ingreso: {e.get('fecha_ingreso')} | Dpto: {e.get('codigo_departamento')} | Cargo: {e.get('codigo_cargo')} | Email: {e.get('email_corporativo') or e.get('email')}")

if __name__ == '__main__':
    main()
