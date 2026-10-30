import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name, ROOT/path)
    value=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value
changes=module('changes','scripts/changes.py')
deployment=module('deployment','deploy/deploy.py')
SHA='a'*40
OLD='b'*40
FE='ghcr.io/example/invitation-frontend:'+SHA
BE='ghcr.io/example/invitation-backend:'+SHA
class DeploymentTests(unittest.TestCase):
    def test_docker_images_share_frontend_build_stage(self):
        frontend=(ROOT/'frontend/Dockerfile').read_text().split('\nFROM ',1)[0].splitlines()
        backend=(ROOT/'backend/Dockerfile').read_text().split('\nFROM ',1)[0].splitlines()
        self.assertEqual(frontend[0].split(' AS ')[0],backend[0].split(' AS ')[0])
        self.assertEqual(frontend[1:],backend[1:])

    def test_trigger_matrix(self):
        for paths,want in [(['frontend/src/main.tsx'],(True,False)),(['frontend/Dockerfile'],(True,False)),(['frontend/README.md','backend/db/accounts/README.md'],(False,False)),(['frontend/content.js','frontend/styles.css','frontend/static/assets/a.webp'],(True,False)),(['backend/internal/app/app.go'],(False,True)),(['backend/go.mod'],(False,True)),(['backend/db/accounts/customer.json'],(False,True)),(['frontend/index.html'],(True,True)),(['frontend/access.html'],(True,True)),(['frontend/package-lock.json'],(True,True)),(['frontend/vite.config.js'],(True,True)),(['deploy/compose.yaml'],(True,True)),(['docs/vps-deploy.md','README.md'],(False,False)),(['tests/api.test.mjs'],(False,False))]:
            with self.subTest(paths=paths):self.assertEqual(changes.classify(paths),want)
        self.assertEqual(changes.classify([],first=True),(True,True))
    def test_deploy_preserves_untouched_image_and_container(self):
        for selected in ('frontend','backend'):
            with self.subTest(selected=selected),tempfile.TemporaryDirectory() as tmp:
                path=Path(tmp)/'state.json';previous={'commit':OLD,'frontend_image':FE.replace(SHA,OLD),'backend_image':BE.replace(SHA,OLD)};path.write_text(json.dumps(previous));calls=[];containers={'frontend':'old-frontend','backend':'old-backend'}
                def run(argv,env,check):
                    calls.append(argv[6:])
                    self.assertEqual(env[('BACKEND' if selected=='frontend' else 'FRONTEND')+'_IMAGE'],previous[('backend' if selected=='frontend' else 'frontend')+'_image'])
                    if 'up' in argv:containers[argv[-1]]='new-'+argv[-1]
                deployment.deploy(tmp,SHA,{selected:FE if selected=='frontend' else BE},run)
                result=json.loads(path.read_text());other='backend' if selected=='frontend' else 'frontend'
                self.assertEqual(result[other+'_image'],previous[other+'_image']);self.assertEqual(containers[other],'old-'+other);self.assertEqual(containers[selected],'new-'+selected)
                self.assertEqual(any('migrate' in call for call in calls),selected=='backend')
                self.assertEqual(calls[0],['pull',selected]);self.assertEqual(calls[-1][-1],selected)
    def test_first_deploy_migrate_once_then_health_then_record(self):
        with tempfile.TemporaryDirectory() as tmp:
            calls=[]
            def run(argv,**kwargs):
                self.assertFalse((Path(tmp)/'state.json').exists());calls.append(argv[6:])
            deployment.deploy(tmp,SHA,{'frontend':FE,'backend':BE},run)
            self.assertEqual(calls,[['pull','frontend','backend'],['run','--rm','--no-deps','backend','migrate'],['up','-d','--no-deps','--remove-orphans','--wait','--wait-timeout','150','frontend','backend']])
            self.assertEqual(json.loads((Path(tmp)/'state.json').read_text())['commit'],SHA)
    def test_failed_migration_or_health_keeps_success_baseline(self):
        for failure in ('migrate','up'):
            with self.subTest(failure=failure),tempfile.TemporaryDirectory() as tmp:
                path=Path(tmp)/'state.json';before=json.dumps({'commit':OLD,'frontend_image':FE.replace(SHA,OLD),'backend_image':BE.replace(SHA,OLD)});path.write_text(before)
                def run(argv,**kwargs):
                    if failure in argv:raise subprocess.CalledProcessError(1,argv)
                with self.assertRaises(subprocess.CalledProcessError):deployment.deploy(tmp,SHA,{'frontend':FE,'backend':BE},run)
                self.assertEqual(path.read_text(),before)
    def test_failed_changes_are_included_on_next_attempt(self):
        with tempfile.TemporaryDirectory() as tmp:
            def git(*args):return subprocess.check_output(['git',*args],cwd=tmp,text=True).strip()
            git('init','-q');git('config','user.email','test@example.com');git('config','user.name','Test')
            (Path(tmp)/'README.md').write_text('initial');git('add','.');git('commit','-qm','initial');healthy=git('rev-parse','HEAD')
            for force,other in [('frontend','backend'),('backend','frontend')]:
                forced=subprocess.check_output(['python3',str(ROOT/'scripts/changes.py'),'--base',healthy,'--force',force],cwd=tmp,text=True)
                self.assertIn(force+'=true',forced);self.assertIn(other+'=false',forced)
            (Path(tmp)/'frontend').mkdir();(Path(tmp)/'frontend/content.js').write_text('change');git('add','.');git('commit','-qm','failed frontend deploy')
            (Path(tmp)/'backend').mkdir();(Path(tmp)/'backend/main.go').write_text('change');git('add','.');git('commit','-qm','backend change')
            result=subprocess.check_output(['python3',str(ROOT/'scripts/changes.py'),'--base',healthy],cwd=tmp,text=True)
            self.assertIn('frontend=true',result);self.assertIn('backend=true',result)
    def test_first_deploy_rejects_missing_pair(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):deployment.deploy(tmp,SHA,{'frontend':FE})
if __name__=='__main__':unittest.main()
