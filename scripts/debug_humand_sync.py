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

    def query(endpoint):
        req = urllib.request.Request(f'{base_url}{endpoint}', headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            return {'error': e.code, 'msg': e.read().decode('utf-8')}
        except Exception as e:
            return {'error': str(e)}

    # 1. Search user
    print('1. Checking user 20673981 in Humand:')
    user = query('/users/20673981')
    print('User by internalId 20673981:', json.dumps(user, indent=2))

    # Also search by email
    print('\n1.1 Search user by email jollalvis@ponce-benzo.com:')
    search_email = query('/users?email=jollalvis@ponce-benzo.com')
    print('Search email result:', json.dumps(search_email, indent=2))

    # 2. Check department Dep-0054
    print('\n2. Checking department Dep-0054 in Humand:')
    deps = query('/departments?limit=100')
    found_dep = [d for d in deps.get('data', []) if d.get('internalId') == 'Dep-0054' or '0054' in str(d.get('internalId'))]
    print('Dep-0054 in Humand:', found_dep)

    # 3. Check cargo Cargo-0099
    print('\n3. Checking cargo Cargo-0099 in Humand:')
    jobs = query('/job-positions?limit=100')
    found_job = [j for j in jobs.get('data', []) if j.get('internalId') == 'Cargo-0099' or '0099' in str(j.get('internalId'))]
    print('Cargo-0099 in Humand:', found_job)

if __name__ == '__main__':
    main()
