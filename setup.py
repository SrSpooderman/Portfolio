from pathlib import Path
import secrets
p=Path(__file__).parent/'.env'
if p.exists():
    print('.env ya existe; se conserva sin cambios.')
else:
    password=secrets.token_urlsafe(18)
    with p.open('x') as f:
        f.write(f'POSTGRES_PASSWORD={secrets.token_hex(24)}\nSECRET_KEY={secrets.token_hex(32)}\nSUPERADMIN_PASSWORD={password}\nSUPERADMIN_EMAIL=admin@example.com\nPUBLIC_URL=http://localhost:8080\nCOOKIE_SECURE=false\nPORT=8080\n')
    p.chmod(0o600)
    print('Credenciales creadas en .env. Usuario: superadmin. Consulta SUPERADMIN_PASSWORD para entrar.')
