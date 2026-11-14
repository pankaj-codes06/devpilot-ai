import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { RepositoryAnalyzer } from '../planner/analyzer.js';

describe('Deterministic Repository Analyzer', () => {
  let tempRepoDir: string;

  beforeEach(async () => {
    tempRepoDir = path.join(os.tmpdir(), `test-analyzer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
    await fs.mkdir(tempRepoDir, { recursive: true });

    // Create realistic repository structure
    await fs.mkdir(path.join(tempRepoDir, 'src/modules/billing'), { recursive: true });
    await fs.mkdir(path.join(tempRepoDir, 'src/modules/auth'), { recursive: true });
    await fs.mkdir(path.join(tempRepoDir, 'node_modules/fake-package'), { recursive: true });
    await fs.mkdir(path.join(tempRepoDir, '.git'), { recursive: true });

    // Create package.json
    await fs.writeFile(
      path.join(tempRepoDir, 'package.json'),
      JSON.stringify({
        name: 'test-app',
        dependencies: {
          react: '^18.3.1',
          express: '^4.19.2',
          tailwindcss: '^3.4.3',
          prisma: '^5.14.0',
        },
        devDependencies: {
          vitest: '^1.6.0',
        },
      })
    );

    // Create source files
    await fs.writeFile(path.join(tempRepoDir, 'src/index.ts'), 'export const app = true;');
    await fs.writeFile(path.join(tempRepoDir, 'src/modules/billing/invoice.ts'), 'export function bill() {}');
    await fs.writeFile(path.join(tempRepoDir, 'src/modules/billing/invoice.test.ts'), 'test("bill", () => {})');
    await fs.writeFile(path.join(tempRepoDir, 'src/modules/auth/login.ts'), 'export function login() {}');

    // Create sensitive files that MUST be ignored
    await fs.writeFile(path.join(tempRepoDir, '.env'), 'SECRET_KEY=supersecret');
    await fs.writeFile(path.join(tempRepoDir, '.env.production'), 'API_KEY=leak');
    await fs.writeFile(path.join(tempRepoDir, 'cert.pem'), '-----BEGIN PRIVATE KEY-----');
    await fs.writeFile(path.join(tempRepoDir, 'node_modules/fake-package/index.js'), 'malicious');
    await fs.writeFile(path.join(tempRepoDir, '.git/config'), '[core]\n');

    // Create README
    await fs.writeFile(path.join(tempRepoDir, 'README.md'), '# Test App\nArchitecture description.');
  });

  afterEach(async () => {
    await fs.rm(tempRepoDir, { recursive: true, force: true }).catch(() => {});
  });

  it('detects frameworks, languages, and dependencies correctly', async () => {
    const result = await RepositoryAnalyzer.analyze(tempRepoDir);

    expect(result.summary.frameworks).toContain('React');
    expect(result.summary.frameworks).toContain('Express');
    expect(result.summary.frameworks).toContain('Tailwind CSS');
    expect(result.summary.frameworks).toContain('Prisma ORM');
    expect(result.summary.frameworks).toContain('Vitest');
    expect(result.summary.languages['TypeScript']).toBeGreaterThan(0);
    expect(result.summary.hasDocumentation).toBe(true);
  });

  it('strictly excludes node_modules, .git, and sensitive secrets (.env, *.pem)', async () => {
    const result = await RepositoryAnalyzer.analyze(tempRepoDir);
    const filePaths = result.files.map((f) => f.relativePath);

    // Assert sensitive files are not included
    expect(filePaths).not.toContain('.env');
    expect(filePaths).not.toContain('.env.production');
    expect(filePaths).not.toContain('cert.pem');
    expect(filePaths.some((p) => p.startsWith('node_modules/'))).toBe(false);
    expect(filePaths.some((p) => p.startsWith('.git/'))).toBe(false);

    // Assert valid source files are included
    expect(filePaths).toContain('src/index.ts');
    expect(filePaths).toContain('src/modules/billing/invoice.ts');
    expect(filePaths).toContain('src/modules/auth/login.ts');
  });

  it('maps files to team modules and tags unassigned files', async () => {
    const teamModules = [
      {
        id: 'mod-1',
        name: 'Billing System',
        pathPattern: 'src/modules/billing/**',
        ownerName: 'Alice Engineer',
      },
    ];

    const result = await RepositoryAnalyzer.analyze(tempRepoDir, teamModules);

    const billingFile = result.files.find((f) => f.relativePath.includes('invoice.ts'));
    expect(billingFile?.moduleName).toBe('Billing System');
    expect(billingFile?.assignedMember).toBe('Alice Engineer');

    const authFile = result.files.find((f) => f.relativePath.includes('login.ts'));
    expect(authFile?.moduleName).toBe('Unassigned');
    expect(authFile?.assignedMember).toBeUndefined();
  });

  it('correctly categorizes test files and entry points', async () => {
    const result = await RepositoryAnalyzer.analyze(tempRepoDir);

    expect(result.testFiles).toContain('src/modules/billing/invoice.test.ts');
    expect(result.summary.entryPoints).toContain('src/index.ts');
  });
});
