#!/usr/bin/env python3
"""Run on the VPS. Commit the image pair only after all selected services pass health."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile


def load_state(path):
    if not path.exists():
        return {}
    state = json.loads(path.read_text())
    if not re.fullmatch('[a-f0-9]{40}', state.get('commit', '')):
        raise ValueError('Invalid deployment state commit')
    for service in ('frontend', 'backend'):
        if not valid_image(state.get(service + '_image', '')):
            raise ValueError('Invalid deployment image state')
    return state


def valid_image(image):
    return bool(re.fullmatch(r'ghcr\.io/[a-z0-9_./-]+:[a-f0-9]{40}', image))


def deploy(directory, commit, images, run=subprocess.run):
    directory = Path(directory)
    state_path = directory / 'state.json'
    # A host lock also serializes operational runs outside GitHub Actions.
    with (directory / '.deploy.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        previous = load_state(state_path)
        if not re.fullmatch('[a-f0-9]{40}', commit):
            raise ValueError('Use a full commit SHA')
        selected = [service for service in ('frontend', 'backend') if images.get(service)]
        if not selected:
            return
        next_state = {**previous, 'commit': commit}
        for service in ('frontend', 'backend'):
            image = images.get(service) or previous.get(service + '_image')
            if not image or not valid_image(image):
                raise ValueError('First deployment requires both images')
            next_state[service + '_image'] = image
        env = {**os.environ, 'FRONTEND_IMAGE': next_state['frontend_image'], 'BACKEND_IMAGE': next_state['backend_image']}
        def compose(*args):
            return run(['docker', 'compose', '--project-directory', str(directory), '-f', str(directory / 'compose.yaml'), *args], env=env, check=True)
        compose('pull', *selected)
        if 'backend' in selected:
            compose('run', '--rm', '--no-deps', 'backend', 'migrate')
        # The first split deployment retires the old monolithic app service in this project.
        orphans = ['--remove-orphans'] if not previous else []
        compose('up', '-d', '--no-deps', *orphans, '--wait', '--wait-timeout', '150', *selected)
        # fsync + rename leaves either the old complete record or the new complete record.
        fd, temporary = tempfile.mkstemp(prefix='.state-', dir=directory)
        try:
            with os.fdopen(fd, 'w') as output:
                json.dump(next_state, output, indent=2)
                output.write('\n')
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, state_path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', default='/opt/wedding-invitation')
    parser.add_argument('--commit', required=True)
    parser.add_argument('--frontend', default='')
    parser.add_argument('--backend', default='')
    args = parser.parse_args()
    deploy(args.directory, args.commit, {'frontend': args.frontend, 'backend': args.backend})
