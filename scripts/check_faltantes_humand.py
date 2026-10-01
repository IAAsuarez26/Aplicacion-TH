import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
from check_humand_catalogs_trade import load_env
from assign_humand_members import insforge_query, humand_get_all_users, clean_cedula

def main():
    env = load_env()
    api_key = env.get('HUMAND_API_KEY')
    th_emps = insforge_query('empleados')
    h_users = humand_get_all_users(api_key)
    h_cedulas = {clean_cedula(u.get('employeeInternalId')): u for u in h_users if clean_cedula(u.get('employeeInternalId'))}

    print(f"TH total empleados: {len(th_emps)}")
    print(f"Humand total indexados: {len(h_cedulas)}")

    faltantes = []
    for e in th_emps:
        c = clean_cedula(e.get('documento_identidad'))
        if c not in h_cedulas:
            faltantes.append(e)

    print(f"\nEmpleados en TH que NO están en Humand: {len(faltantes)}")
    for f in faltantes:
        ci = f.get('documento_identidad')
        eid = f.get('empleado_id')
        nom = f"{f.get('nombres')} {f.get('apellidos')}"
        eh = f.get('estatus_h')
        em = f.get('email_corporativo') or f.get('email')
        print(f"  CI: {ci:12} | ID: {eid:3} | {nom:35} | estatus_h: {eh} | email: {em}")

if __name__ == '__main__':
    main()
