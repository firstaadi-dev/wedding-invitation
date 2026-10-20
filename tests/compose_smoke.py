"""Exercise service selection with real containers. Build both Docker images first."""
import hashlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('deployment',root/'deploy/deploy.py')
deployment=importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployment)

def docker(*args,**kwargs):
    return subprocess.run(['docker',*args],check=True,**kwargs)

with tempfile.TemporaryDirectory(prefix='invitation-compose-') as tmp:
    directory=Path(tmp)
    directory.joinpath('Caddyfile').write_text((root/'deploy/Caddyfile').read_text().replace('127.0.0.1:5174','database:5174').replace('127.0.0.1:5173','frontend:8080'))
    directory.joinpath('compose.yaml').write_text('''name: wedding-invitation-split-smoke
services:
  gateway:
    image: caddy:2-alpine
    environment:
      CMS_DOMAIN: http://dashboard.example
      INVITATION_DOMAIN: http://invitation.example
    ports: ['127.0.0.1::80']
    volumes: ['./Caddyfile:/etc/caddy/Caddyfile:ro']
  database:
    image: postgres:17-alpine
    environment:
      POSTGRES_PASSWORD: invitation-test
      POSTGRES_DB: invitation_test
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 1s
      timeout: 5s
      retries: 30
  frontend:
    image: ${FRONTEND_IMAGE}
    healthcheck:
      test: ['CMD', 'wget', '-q', '-O', '/dev/null', 'http://127.0.0.1:8080/healthz-frontend']
      interval: 1s
      timeout: 5s
      retries: 30
  backend:
    image: ${BACKEND_IMAGE}
    network_mode: service:database
    env_file: ./app.env
    healthcheck:
      test: ['CMD', 'invitation', 'health']
      interval: 1s
      timeout: 5s
      retries: 30
''')
    directory.joinpath('app.env').write_text('DATABASE_URL=postgresql://postgres:invitation-test@127.0.0.1:5432/invitation_test?sslmode=disable\nDATABASE_URL_UNPOOLED=postgresql://postgres:invitation-test@127.0.0.1:5432/invitation_test?sslmode=disable\nPUBLIC_ORIGIN=https://invitation.example\nCMS_ORIGIN=https://dashboard.example\nADMIN_PASSWORD_HASH='+('a'*32)+':'+hashlib.scrypt(b'host-test-password',salt=('a'*32).encode(),n=16384,r=8,p=1,dklen=64).hex()+'\n')
    images={}
    for service in ('frontend','backend'):
        for sha in ('a'*40,'b'*40,'c'*40):
            image=f'ghcr.io/local/invitation-{service}:{sha}'
            docker('tag',f'wedding-split-{service}:test',image)
            images[service,sha]=image
    env={**os.environ,'FRONTEND_IMAGE':images['frontend','a'*40],'BACKEND_IMAGE':images['backend','a'*40]}
    def compose(*args):
        return docker('compose','--project-directory',tmp,*args,env=env,capture_output=True,text=True).stdout.strip()
    calls=[]
    def local_run(argv,**kwargs):
        # These images were built locally; all deployment operations except registry pull run for real.
        if 'pull' not in argv:
            calls.append(argv)
            return subprocess.run(argv,**kwargs)
    try:
        compose('up','-d','--wait','database')
        deployment.deploy(tmp,'a'*40,{'frontend':images['frontend','a'*40],'backend':images['backend','a'*40]},local_run)
        compose('up','-d','--wait','gateway')
        gateway_port=int(compose('port','gateway','80').rsplit(':',1)[1])
        def request(host,path,method='GET',body=None,headers=None):
            connection=http.client.HTTPConnection('127.0.0.1',gateway_port,timeout=10)
            connection.request(method,path,body,{'Host':host,**(headers or {})})
            response=connection.getresponse()
            result=(response.status,dict(response.getheaders()),response.read().decode())
            connection.close()
            return result
        assert 'id="root"' in request('dashboard.example','/')[2], 'Dashboard root did not serve React CMS'
        assert request('invitation.example','/')[0]==200, 'Invitation root unavailable'
        assert request('invitation.example','/api/admin/session')[0]==404, 'Admin API exposed on invitation host'
        assert request('dashboard.example','/api/identification/config')[0]==404, 'Guest API exposed on dashboard host'
        status,headers,body=request('dashboard.example','/api/admin/login','POST',json.dumps({'email':'firstaadip16@gmail.com','password':'host-test-password'}),{'Origin':'https://dashboard.example','Content-Type':'application/json'})
        assert status==200, (status,body)
        cookie=headers['Set-Cookie']
        assert 'Domain=' not in cookie, 'Admin cookie shared across hosts'
        account=json.loads(body)
        auth={'Cookie':cookie.split(';')[0],'Origin':'https://dashboard.example','Content-Type':'application/json','X-CSRF-Token':account['csrf']}
        status,_,body=request('dashboard.example','/api/admin/guests','POST',json.dumps({'name':'Host routing guest'}),auth)
        assert status==201, (status,body)
        link=json.loads(body)['link']
        public_id=account['account']['tenant']['publicId']
        assert link.startswith('https://invitation.example/u/') and len(link.rsplit('/',1)[1])==27, link
        status,headers,html=request('invitation.example','/u/'+link.rsplit('/',1)[1])
        assert status==200 and 'access-message' in html and 'response-form' not in html, 'Guest code bypassed verification'
        assert headers['Referrer-Policy']=='no-referrer' and headers['X-Robots-Tag']=='noindex, nofollow'
        status,_,html=request('invitation.example','/'+public_id)
        assert status==200 and 'content="https://invitation.example/'+public_id+'"' in html, 'Opaque URL metadata missing'
        status,headers,_=request('invitation.example','/i/firsta-talitha')
        assert status==302 and headers['Location']=='/'+public_id, 'Legacy link redirect failed'
        assert request('dashboard.example','/preview',headers=auth)[0]==200, 'Dashboard preview lost admin session'
        assert request('invitation.example','/preview',headers=auth)[0]==404, 'Admin preview exposed on invitation host'
        print('PASS: real Caddy routes two hosts, isolates admin APIs, retains preview and legacy URLs, and generates nameless links with host-only cookies.')
        backend_before=compose('ps','-q','backend')
        frontend_before=compose('ps','-q','frontend')
        deployment.deploy(tmp,'b'*40,{'frontend':images['frontend','b'*40]},local_run)
        assert compose('ps','-q','backend')==backend_before, 'Frontend deployment replaced backend container'
        assert compose('ps','-q','frontend')!=frontend_before, 'Frontend container was not replaced'
        frontend_after=compose('ps','-q','frontend')
        deployment.deploy(tmp,'c'*40,{'backend':images['backend','c'*40]},local_run)
        assert compose('ps','-q','frontend')==frontend_after, 'Backend deployment replaced frontend container'
        assert compose('ps','-q','backend')!=backend_before, 'Backend container was not replaced'
        assert sum('migrate' in argv for argv in calls)==2, 'Migration ran during frontend-only deploy'
        state=json.loads(directory.joinpath('state.json').read_text())
        assert state['frontend_image']==images['frontend','b'*40]
        assert state['backend_image']==images['backend','c'*40]
        print('PASS: real frontend-only and backend-only deployments preserve the other container and image; migrations run only with backend.')
        compose('stop','backend')
        code='a'*27
        assert request('invitation.example','/u/'+code,headers={'Referer':'https://invitation.example/u/'+code})[0]==502
        logs=compose('logs','--no-color','gateway')
        assert '/u/[redacted]' in logs and code not in logs, 'Guest code leaked into proxy error logs'
        print('PASS: proxy errors redact guest codes and omit credential-bearing Referer headers.')
    finally:
        compose('down','-v','--remove-orphans')
        for image in images.values():
            docker('image','rm',image,stdout=subprocess.DEVNULL)
