import { describe, it, expect } from 'vitest';
import { SecureCloner } from '../executor/cloner.js';

describe('Secure Repository Cloner Safety Controls', () => {
  it('rejects path traversal attempts in owner or name', async () => {
    await expect(
      SecureCloner.cloneRepository({
        runId: 'run-1',
        githubRepoId: 12345,
        installationId: 67890,
        owner: '../../../etc',
        name: 'passwd',
      })
    ).rejects.toThrow('Invalid repository naming format');

    await expect(
      SecureCloner.cloneRepository({
        runId: 'run-2',
        githubRepoId: 12345,
        installationId: 67890,
        owner: 'valid-owner',
        name: '../../evil-repo',
      })
    ).rejects.toThrow('Invalid repository naming format');
  });

  it('fails safely when GitHub App credentials are not configured', async () => {
    await expect(
      SecureCloner.cloneRepository({
        runId: 'test-run-unconfigured',
        githubRepoId: 99999,
        installationId: 11111,
        owner: 'octocat',
        name: 'hello-world',
      })
    ).rejects.toThrow(/GitHub App credentials/);
  });
});
