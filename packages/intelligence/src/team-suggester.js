export class TeamSuggester {
  /**
   * Generates automated team assignments and module mappings based on
   * deterministic static codebase analysis.
   */
  static suggest(analysis) {
    const { summary, files, routeFiles, schemaFiles, testFiles } = analysis;
    const allRelPaths = files.map((f) => f.relativePath);

    const teams = [
      {
        name: 'Frontend Team',
        slug: 'frontend-team',
        description: 'Client-side applications, user interfaces, components, and styles.',
        color: '#3b82f6',
      },
      {
        name: 'Backend API Team',
        slug: 'backend-api-team',
        description: 'Server-side services, API endpoints, business logic, controllers, and middlewares.',
        color: '#10b981',
      },
      {
        name: 'DevOps & QA Team',
        slug: 'devops-qa-team',
        description: 'CI/CD workflows, containerization, deployment configs, and automated test suites.',
        color: '#8b5cf6',
      },
      {
        name: 'Core & Data Team',
        slug: 'core-data-team',
        description: 'Database schemas, migrations, shared packages, and domain data models.',
        color: '#f59e0b',
      },
    ];

    const modules = [];

    // 1. Check for Monorepo structure (e.g. apps/*, packages/*)
    const hasAppsWeb = allRelPaths.some((p) => p.startsWith('apps/web/') || p.startsWith('packages/web/'));
    const hasAppsApi = allRelPaths.some((p) => p.startsWith('apps/api/') || p.startsWith('packages/api/'));
    const hasAppsWorker = allRelPaths.some((p) => p.startsWith('apps/worker/'));
    const hasPackagesDb = allRelPaths.some((p) => p.startsWith('packages/database/'));
    const hasPackagesShared = allRelPaths.some((p) => p.startsWith('packages/shared/'));

    if (hasAppsWeb) {
      modules.push({
        name: 'Web Application',
        description: 'Frontend React/web user interface and client components.',
        pathPattern: 'apps/web/**',
        teamSlug: 'frontend-team',
        isShared: false,
        suggestedBy: 'AI_SUGGESTER',
      });
    }

    if (hasAppsApi) {
      modules.push({
        name: 'API Service',
        description: 'Primary REST API backend endpoints, controllers, and middleware.',
        pathPattern: 'apps/api/**',
        teamSlug: 'backend-api-team',
        isShared: false,
        suggestedBy: 'AI_SUGGESTER',
      });
    }

    if (hasAppsWorker) {
      modules.push({
        name: 'Background Worker',
        description: 'Asynchronous task scheduler, queues, and background jobs.',
        pathPattern: 'apps/worker/**',
        teamSlug: 'backend-api-team',
        isShared: false,
        suggestedBy: 'AI_SUGGESTER',
      });
    }

    if (hasPackagesDb) {
      modules.push({
        name: 'Database Models & Migrations',
        description: 'Centralized database schemas, migrations, and Prisma models.',
        pathPattern: 'packages/database/**',
        teamSlug: 'core-data-team',
        isShared: false,
        suggestedBy: 'AI_SUGGESTER',
      });
    }

    if (hasPackagesShared) {
      modules.push({
        name: 'Shared Library',
        description: 'Shared constants, DTO schemas, and types utilized across packages.',
        pathPattern: 'packages/shared/**',
        teamSlug: null,
        isShared: true,
        suggestedBy: 'AI_SUGGESTER',
      });
    }

    // 2. Non-monorepo (standard repo structure) detection
    if (!hasAppsWeb && !hasAppsApi) {
      // Frontend components / pages
      const hasComponents = allRelPaths.some(
        (p) =>
          p.startsWith('src/components/') ||
          p.startsWith('src/pages/') ||
          p.startsWith('src/views/') ||
          p.startsWith('frontend/') ||
          p.startsWith('client/')
      );
      if (hasComponents || summary.frameworks.includes('React') || summary.frameworks.includes('Vue')) {
        modules.push({
          name: 'Frontend UI',
          description: 'Client user interface, views, components, and client-side logic.',
          pathPattern: 'src/components/**',
          teamSlug: 'frontend-team',
          isShared: false,
          suggestedBy: 'AI_SUGGESTER',
        });
      }

      // Backend API routes / controllers
      if (routeFiles.length > 0) {
        modules.push({
          name: 'Backend API & Controllers',
          description: 'HTTP route handlers, controllers, and business services.',
          pathPattern: 'src/routes/**',
          teamSlug: 'backend-api-team',
          isShared: false,
          suggestedBy: 'AI_SUGGESTER',
        });
      }

      // Schemas & Database
      if (schemaFiles.length > 0) {
        modules.push({
          name: 'Database & Schemas',
          description: 'Database models, SQL schemas, migrations, and ORM definitions.',
          pathPattern: 'prisma/**',
          teamSlug: 'core-data-team',
          isShared: false,
          suggestedBy: 'AI_SUGGESTER',
        });
      }
    }

    // 3. DevOps & QA Detection
    const hasCi = summary.hasCi || allRelPaths.some((p) => p.startsWith('.github/'));
    const hasDocker = allRelPaths.some((p) => p.startsWith('docker') || p.includes('Dockerfile'));
    if (hasCi || hasDocker) {
      modules.push({
        name: 'CI/CD & Infrastructure',
        description: 'GitHub Actions workflows, Docker containers, and deployment scripts.',
        pathPattern: '.github/**',
        teamSlug: 'devops-qa-team',
        isShared: false,
        suggestedBy: 'AI_SUGGESTER',
      });
    }

    if (testFiles.length > 0) {
      modules.push({
        name: 'Test Suites & QA',
        description: 'Automated integration tests, unit tests, and QA specifications.',
        pathPattern: '**/*.test.*',
        teamSlug: 'devops-qa-team',
        isShared: false,
        suggestedBy: 'AI_SUGGESTER',
      });
    }

    // 4. Shared Core & Configs
    modules.push({
      name: 'Shared Root Configuration',
      description: 'Root package.json, TypeScript configs, and project-wide settings.',
      pathPattern: '*.json',
      teamSlug: null,
      isShared: true,
      suggestedBy: 'AI_SUGGESTER',
    });

    return {
      teams,
      modules,
    };
  }

  /**
   * Validates whether a module assignment produces an ownership conflict with existing modules.
   *
   * A conflict occurs when:
   * 1. The target module is NOT marked shared (`isShared: false`).
   * 2. An existing module is also NOT marked shared (`isShared: false`).
   * 3. Both modules are assigned to DIFFERENT teams (teamId !== existing.teamId).
   * 4. Their path patterns overlap (identical pattern, or one pattern encompasses the other).
   */
  static detectConflict(existingModules, candidate) {
    // If either candidate or existing is explicitly shared, no ownership conflict occurs.
    if (candidate.isShared) {
      return { hasConflict: false };
    }

    // If candidate has no team assigned yet, no conflict
    if (!candidate.teamId) {
      return { hasConflict: false };
    }

    for (const existing of existingModules) {
      // Skip comparing against itself during update operations
      if (candidate.id && existing.id && candidate.id === existing.id) {
        continue;
      }

      // Shared modules never conflict
      if (existing.isShared) {
        continue;
      }

      // Same team assignment never conflicts with itself
      if (existing.teamId === candidate.teamId) {
        continue;
      }

      // Both modules are private to different teams. Check for pattern overlap.
      if (this.patternsOverlap(candidate.pathPattern, existing.pathPattern)) {
        return {
          hasConflict: true,
          conflictingModule: existing,
          reason: `Module '${candidate.name}' pattern ('${candidate.pathPattern}') conflicts with '${existing.name}' pattern ('${existing.pathPattern}'), which is already assigned to another team. Mark overlapping modules as shared or refine the path patterns.`,
        };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Determines if two glob / directory patterns overlap.
   */
  static patternsOverlap(p1, p2) {
    const norm1 = this.normalizePattern(p1);
    const norm2 = this.normalizePattern(p2);

    // Exact match
    if (norm1 === norm2) return true;

    // Wildcard root matches everything
    if (norm1 === '**' || norm1 === '**/*' || norm2 === '**' || norm2 === '**/*') {
      return true;
    }

    // Directory prefix match (e.g. apps/api/** encompasses apps/api/src/routes/**)
    const base1 = norm1.replace(/\/?\*\*.*$/, '').replace(/\/+$/, '');
    const base2 = norm2.replace(/\/?\*\*.*$/, '').replace(/\/+$/, '');

    if (base1.length > 0 && base2.length > 0) {
      if (base1 === base2) return true;
      if (base1.startsWith(base2 + '/')) return true;
      if (base2.startsWith(base1 + '/')) return true;
    }

    return false;
  }

  static normalizePattern(p) {
    return p.trim().replace(/^[./]+/, '').replace(/\\/g, '/');
  }
}
