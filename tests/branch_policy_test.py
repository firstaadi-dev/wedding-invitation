import importlib.util
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/branch_policy.py'
spec = importlib.util.spec_from_file_location('branch_policy', SCRIPT)
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
REPO = 'firstaadi-dev/wedding-invitation'


class BranchPolicyTests(unittest.TestCase):
    def test_feature_pull_requests_target_staging(self):
        for name in ('feat/midtrans', 'feature/payment', 'fix/login'):
            with self.subTest(name=name):
                policy.validate('pull_request', base='staging', head=name,
                                head_repository=REPO, repository=REPO)

    def test_main_requires_staging_from_the_same_repository(self):
        policy.validate('pull_request', base='main', head='staging',
                        head_repository=REPO, repository=REPO)
        for name, repository in (('feat/payment', REPO), ('main', REPO),
                                 ('staging', 'other/fork'), ('staging', '')):
            with self.subTest(name=name, repository=repository):
                with self.assertRaises(ValueError):
                    policy.validate('pull_request', base='main', head=name,
                                    head_repository=repository, repository=REPO)

    def test_main_cannot_bypass_feature_flow_into_staging(self):
        for head in ('main', 'staging', ''):
            with self.subTest(head=head), self.assertRaises(ValueError):
                policy.validate('pull_request', base='staging', head=head,
                                head_repository=REPO, repository=REPO)

    def test_deploy_only_accepts_environment_branches(self):
        for event in ('push', 'workflow_dispatch'):
            for ref in ('main', 'staging'):
                policy.validate(event, ref=ref)
            with self.subTest(event=event), self.assertRaises(ValueError):
                policy.validate(event, ref='feat/payment')

    def test_other_events_and_pr_targets_are_rejected(self):
        with self.assertRaises(ValueError):
            policy.validate('pull_request_target', base='main', head='staging')
        with self.assertRaises(ValueError):
            policy.validate('pull_request', base='release', head='feat/payment')

    def test_workflow_cli_exits_nonzero_for_a_direct_feature_release(self):
        environment = {**os.environ, 'EVENT_NAME': 'pull_request',
                       'BASE_BRANCH': 'main', 'HEAD_BRANCH': 'feat/payment',
                       'HEAD_REPOSITORY': REPO, 'REPOSITORY': REPO}
        result = subprocess.run(['python3', str(SCRIPT)], env=environment,
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertIn('must come from staging', result.stderr)


if __name__ == '__main__':
    unittest.main()
