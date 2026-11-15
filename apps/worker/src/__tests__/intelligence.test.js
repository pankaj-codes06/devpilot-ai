import { describe, it, expect } from 'vitest';
import {
  HeuristicStaticProvider,
  IntelligenceEngineFactory,
} from '../planner/intelligence.js';

describe('AI Intelligence Engine Provider Abstraction', () => {
  const mockAnalysis = {
    summary: {
      languages: { TypeScript: 80, JavaScript: 20 },
      frameworks: ['Express', 'React'],
      packageManager: 'npm',
      projectType: 'Node.js Service',
      totalFiles: 15,
      testFrameworks: [],
      hasDocumentation: false,
      hasCi: false,
      entryPoints: ['src/server.ts'],
      modules: [{ name: 'Unassigned', pathPattern: '**/*', fileCount: 15 }],
    },
    files: [
      {
        relativePath: 'src/server.ts',
        sizeBytes: 1024,
        extension: '.ts',
        moduleName: 'Unassigned',
      },
      {
        relativePath: 'src/services/billing.ts',
        sizeBytes: 2048,
        extension: '.ts',
        moduleName: 'Billing',
        assignedMember: 'Alice',
      },
    ],
    readmeExcerpt: null,
    contributingExcerpt: null,
    dependencies: { express: '^4.19.2' },
    devDependencies: { typescript: '^5.4.5' },
    testFiles: [],
    schemaFiles: [],
    routeFiles: ['src/routes/api.ts'],
  };

  it('generates structured, grounded tasks adhering to Zod schema', async () => {
    const provider = new HeuristicStaticProvider();
    const result = await provider.analyze({
      repositoryName: 'acme/backend',
      defaultBranch: 'main',
      analysis: mockAnalysis,
    });

    expect(result.summary).toBeDefined();
    expect(result.architecture.primaryLanguages).toContain('TypeScript');
    expect(result.tasks.length).toBeGreaterThan(0);

    for (const task of result.tasks) {
      expect(task.title).toBeTruthy();
      expect(task.description).toBeTruthy();
      expect(task.evidence).toBeTruthy();
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(task.priority);
      expect(task.relevantFiles.length).toBeGreaterThan(0);
      expect(task.suggestedApproach).toBeTruthy();
      expect(task.requiredTests).toBeTruthy();
    }
  });

  it('selects the deterministic provider when external LLM API keys are absent', () => {
    const provider = IntelligenceEngineFactory.getProvider();
    expect(provider).toBeDefined();
    expect(provider.name).toBe('Deterministic Static Analyzer');
  });
});
