#!/usr/bin/env python3
"""Choose images from the last healthy deployment, never the previous CI run."""
import argparse
import json
import re
import subprocess


def classify(paths, first=False):
    frontend = backend = first
    for path in paths:
        if path.endswith(('.md', '.rst')) or path.startswith('docs/'):
            continue
        if path.startswith(('frontend/',)):
            frontend = True
            if path in ('frontend/index.html', 'frontend/access.html', 'frontend/package.json', 'frontend/package-lock.json', 'frontend/vite.config.js', 'frontend/tsconfig.json'):
                backend = True
        elif path.startswith('backend/'):
            backend = True
        elif path.startswith(('deploy/', '.github/workflows/', 'scripts/')) or path in ('package.json', 'package-lock.json', '.dockerignore'):
            frontend = backend = True
    return frontend, backend


def changed(base, target):
    if not base or not re.fullmatch('[a-f0-9]{40}', base):
        return None
    if subprocess.run(['git', 'merge-base', '--is-ancestor', base, target], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode:
        return None
    return subprocess.check_output(['git', 'diff', '--no-renames', '--name-only', '-z', base, target]).decode().split('\0')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default='')
    parser.add_argument('--target', default='HEAD')
    parser.add_argument('--force', choices=['auto', 'frontend', 'backend', 'both'], default='auto')
    args = parser.parse_args()
    paths = changed(args.base, args.target)
    frontend, backend = classify(paths or [], first=paths is None)
    frontend |= args.force in ('frontend', 'both')
    backend |= args.force in ('backend', 'both')
    print(f'frontend={str(frontend).lower()}')
    print(f'backend={str(backend).lower()}')
    print('services=' + json.dumps((["frontend"] if frontend else []) + (["backend"] if backend else []), separators=(',', ':')))


if __name__ == '__main__':
    main()
