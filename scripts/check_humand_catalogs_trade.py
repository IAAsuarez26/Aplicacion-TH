import os
import sys
import json
import urllib.request
import urllib.error

def load_env():
    env = {}
    with open('.env.local', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def main():
    env = load_env()
    api_key = env.get('HUMAND_API_KEY')
    base_url = env.get('HUMAND_BASE_URL', 'https://api-prod.humand.co/public/api/v1')

    headers = {
        'Authorization': f'Basic {api_key}',
        'Content-Type': 'application/json'
    }

    req = urllib.request.Request(f'{base_url}/departments?page=1&limit=50', headers=headers)
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode('utf-8'))

    items = data.get('items', [])
    print(f'Total departamentos en Humand (pag 1): {len(items)}')
    for d in items:
        if 'trade' in d.get('name', '').lower() or 'marketing' in d.get('name', '').lower():
            print('  -> Dep Humand:', d)

    req2 = urllib.request.Request(f'{base_url}/job-positions?page=1&limit=50', headers=headers)
    with urllib.request.urlopen(req2, timeout=25) as resp:
        data2 = json.loads(resp.read().decode('utf-8'))

    jobs = data2.get('items', [])
    print(f'\nTotal puestos en Humand: {len(jobs)}')
    for j in jobs:
        if 'trade' in j.get('name', '').lower() or 'marketing' in j.get('name', '').lower():
            print('  -> Cargo Humand:', j)

if __name__ == '__main__':
    main()
