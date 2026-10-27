#!/usr/bin/env python3
"""Validate the repository's main -> feature -> staging -> main flow."""
import os
import sys


def validate(event, *, base='', head='', head_repository='', repository='', ref=''):
    if event == 'pull_request':
        if base == 'main':
            if head != 'staging' or head_repository != repository:
                raise ValueError('Pull requests to main must come from staging in this repository.')
        elif base == 'staging':
            if not head or head in ('main', 'staging'):
                raise ValueError('Pull requests to staging must come from a feature branch.')
        else:
            raise ValueError('Pull requests must target staging or main.')
    elif event in ('push', 'workflow_dispatch'):
        if ref not in ('main', 'staging'):
            raise ValueError('Deployments are only supported from main or staging.')
    else:
        raise ValueError('Unsupported workflow event.')


def main():
    try:
        validate(
            os.environ.get('EVENT_NAME', ''),
            base=os.environ.get('BASE_BRANCH', ''),
            head=os.environ.get('HEAD_BRANCH', ''),
            head_repository=os.environ.get('HEAD_REPOSITORY', ''),
            repository=os.environ.get('REPOSITORY', ''),
            ref=os.environ.get('REF_NAME', ''),
        )
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1
    print('Branch flow accepted.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
