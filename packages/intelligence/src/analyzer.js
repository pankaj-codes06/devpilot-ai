import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import ignore from 'ignore';

function createIgnore() {
  const fn = typeof ignore === 'function' ? ignore : ignore.default;
  return fn();
}

export const SENSITIVE_EXCLUDE_PATTERNS = [
  '**/.env*',
  '**/*.pem',
  '**/*.key',
  '**/*.cert',
  '**/*.pfx',
  '**/*.p12',
  '**/id_rsa*',
  '**/id_ed25519*',
  '**/*.credentials*',
  '**/credentials.json',
  '**/secrets.*',
];

export const DIRECTORY_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.output/**',
  '**/coverage/**',
  '**/.next/**',
  '**/target/**',
  '**/vendor/**',
  '**/.turbo/**',
  '**/.cache/**',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
];

const LANGUAGE_EXTENSION_MAP = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.cpp': 'C++',
  '.c': 'C',
  '.cs': 'C#',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.sql': 'SQL',
  '.prisma': 'Prisma Schema',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.json': 'JSON',
  '.md': 'Markdown',
};

export class RepositoryAnalyzer {
  /**
   * Deterministically analyzes a directory tree (git repository or extracted ZIP workspace)
   * without executing any untrusted code or scripts.
   */
  static async analyze(
    repoPath,
    teamModules = [],
    allowedPaths = [],
    excludedPaths = []
  ) {
    // 1. Load .gitignore if present
    const ig = createIgnore();
    ig.add(DIRECTORY_EXCLUDE_PATTERNS);
    ig.add(SENSITIVE_EXCLUDE_PATTERNS);

    const gitignorePath = path.join(repoPath, '.gitignore');
    try {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      ig.add(gitignoreContent);
    } catch {
      // .gitignore is optional
    }

    // 2. Discover all files
    const allFiles = await fg('**/*', {
      cwd: repoPath,
      dot: true,
      onlyFiles: true,
      ignore: DIRECTORY_EXCLUDE_PATTERNS.concat(SENSITIVE_EXCLUDE_PATTERNS),
    });

    // 3. Filter files using .gitignore and repository allowed/excluded paths
    const filteredFiles = allFiles.filter((relPath) => {
      if (ig.ignores(relPath)) return false;

      // Whitelist check
      if (allowedPaths.length > 0) {
        const matchesAllowed = allowedPaths.some((pattern) =>
          fg.isDynamicPattern(pattern)
            ? createIgnore().add(pattern).ignores(relPath)
            : relPath.startsWith(pattern)
        );
        if (!matchesAllowed) return false;
      }

      // Blacklist check
      if (excludedPaths.length > 0) {
        const matchesExcluded = excludedPaths.some((pattern) =>
          fg.isDynamicPattern(pattern)
            ? createIgnore().add(pattern).ignores(relPath)
            : relPath.startsWith(pattern)
        );
        if (matchesExcluded) return false;
      }

      return true;
    });

    // 4. Map files and match team modules
    const languageByteCounts = {};
    const fileMetadataList = [];
    const testFiles = [];
    const schemaFiles = [];
    const routeFiles = [];
    let totalBytes = 0;

    for (const relPath of filteredFiles) {
      const fullPath = path.join(repoPath, relPath);
      let stat;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        continue;
      }

      const ext = path.extname(relPath).toLowerCase();
      const language = LANGUAGE_EXTENSION_MAP[ext] || 'Other';

      // Accumulate language statistics
      languageByteCounts[language] = (languageByteCounts[language] || 0) + stat.size;
      totalBytes += stat.size;

      // Identify tests, schemas, routes
      if (
        relPath.includes('.test.') ||
        relPath.includes('.spec.') ||
        relPath.includes('__tests__') ||
        relPath.startsWith('tests/') ||
        relPath.startsWith('test/')
      ) {
        testFiles.push(relPath);
      }

      if (
        ext === '.prisma' ||
        relPath.includes('/migrations/') ||
        relPath.includes('schema.') ||
        relPath.endsWith('.sql')
      ) {
        schemaFiles.push(relPath);
      }

      if (
        relPath.includes('/routes/') ||
        relPath.includes('/controllers/') ||
        relPath.includes('/api/') ||
        relPath.endsWith('server.ts') ||
        relPath.endsWith('server.js') ||
        relPath.endsWith('app.ts') ||
        relPath.endsWith('app.js')
      ) {
        routeFiles.push(relPath);
      }

      // Team Module matching
      let assignedModule = 'Unassigned';
      let assignedMember = undefined;

      for (const mod of teamModules) {
        const modIg = createIgnore().add(mod.pathPattern);
        if (modIg.ignores(relPath) || relPath.startsWith(mod.pathPattern.replace(/\*.*$/, ''))) {
          assignedModule = mod.name;
          assignedMember = mod.ownerName;
          break;
        }
      }

      fileMetadataList.push({
        relativePath: relPath,
        sizeBytes: stat.size,
        extension: ext,
        moduleName: assignedModule,
        assignedMember,
      });
    }

    // 5. Calculate Language Percentages
    const languages = {};
    for (const [lang, bytes] of Object.entries(languageByteCounts)) {
      if (totalBytes > 0) {
        languages[lang] = Math.round((bytes / totalBytes) * 100);
      }
    }

    // 6. Detect Frameworks, Package Manifests & Dependencies
    const frameworks = new Set();
    let dependencies = {};
    let devDependencies = {};
    let packageManager = 'npm';
    let projectType = 'Generic';

    // Inspect package.json
    try {
      const pkgPath = path.join(repoPath, 'package.json');
      const pkgJson = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
      dependencies = pkgJson.dependencies || {};
      devDependencies = pkgJson.devDependencies || {};

      const allDeps = { ...dependencies, ...devDependencies };
      if (allDeps['react']) frameworks.add('React');
      if (allDeps['next']) frameworks.add('Next.js');
      if (allDeps['vue']) frameworks.add('Vue');
      if (allDeps['express']) frameworks.add('Express');
      if (allDeps['fastify']) frameworks.add('Fastify');
      if (allDeps['@nestjs/core']) frameworks.add('NestJS');
      if (allDeps['tailwindcss']) frameworks.add('Tailwind CSS');
      if (allDeps['prisma'] || allDeps['@prisma/client']) frameworks.add('Prisma ORM');
      if (allDeps['drizzle-orm']) frameworks.add('Drizzle ORM');
      if (allDeps['vitest']) frameworks.add('Vitest');
      if (allDeps['jest']) frameworks.add('Jest');

      if (filteredFiles.some((f) => f === 'pnpm-lock.yaml')) {
        packageManager = 'pnpm';
      } else if (filteredFiles.some((f) => f === 'yarn.lock')) {
        packageManager = 'yarn';
      } else if (filteredFiles.some((f) => f === 'bun.lockb' || f === 'bun.lock')) {
        packageManager = 'bun';
      }

      projectType = allDeps['next'] ? 'Next.js App' : allDeps['react'] ? 'React Frontend' : 'Node.js Service';
    } catch {
      // Non-Node project or package.json not at root
    }

    // Inspect Python, Go, Rust manifests
    const hasRequirements = filteredFiles.some((f) => f === 'requirements.txt' || f === 'pyproject.toml');
    if (hasRequirements) {
      frameworks.add('Python');
      projectType = 'Python Project';
    }

    const hasGoMod = filteredFiles.some((f) => f === 'go.mod');
    if (hasGoMod) {
      frameworks.add('Go');
      projectType = 'Go Project';
    }

    const hasCargo = filteredFiles.some((f) => f === 'Cargo.toml');
    if (hasCargo) {
      frameworks.add('Rust');
      projectType = 'Rust Project';
    }

    // 7. Detect Documentation Excerpts
    let readmeExcerpt = null;
    const readmeFile = filteredFiles.find((f) => f.toLowerCase() === 'readme.md');
    if (readmeFile) {
      try {
        const content = await fs.readFile(path.join(repoPath, readmeFile), 'utf-8');
        readmeExcerpt = content.slice(0, 3000); // Truncate to safe length
      } catch {
        // Readme error ignored
      }
    }

    let contributingExcerpt = null;
    const contribFile = filteredFiles.find((f) => f.toLowerCase() === 'contributing.md');
    if (contribFile) {
      try {
        const content = await fs.readFile(path.join(repoPath, contribFile), 'utf-8');
        contributingExcerpt = content.slice(0, 3000);
      } catch {
        // Contributing error ignored
      }
    }

    // 8. Module Statistics
    const moduleMap = new Map();
    for (const mod of teamModules) {
      moduleMap.set(mod.name, {
        pathPattern: mod.pathPattern,
        ownerName: mod.ownerName,
        count: 0,
      });
    }

    let unassignedCount = 0;
    for (const file of fileMetadataList) {
      if (file.moduleName === 'Unassigned') {
        unassignedCount++;
      } else {
        const existing = moduleMap.get(file.moduleName);
        if (existing) existing.count++;
      }
    }

    const moduleSummaries = Array.from(moduleMap.entries()).map(([name, data]) => ({
      name,
      pathPattern: data.pathPattern,
      ownerName: data.ownerName,
      fileCount: data.count,
    }));

    if (unassignedCount > 0 || moduleSummaries.length === 0) {
      moduleSummaries.push({
        name: 'Unassigned',
        pathPattern: '**/*',
        ownerName: undefined,
        fileCount: unassignedCount,
      });
    }

    // 9. Detect Entry Points & Test Frameworks
    const entryPoints = filteredFiles.filter((f) =>
      ['src/main.tsx', 'src/index.ts', 'src/index.js', 'src/server.ts', 'src/server.js', 'main.go', 'app.py', 'src/App.tsx', 'src/App.jsx'].includes(
        f
      )
    );

    const testFrameworks = [];
    if (frameworks.has('Vitest')) testFrameworks.push('Vitest');
    if (frameworks.has('Jest')) testFrameworks.push('Jest');
    if (hasRequirements) testFrameworks.push('Pytest');
    if (hasGoMod) testFrameworks.push('Go Test');

    const architectureSummary = {
      languages,
      frameworks: Array.from(frameworks),
      packageManager,
      projectType,
      totalFiles: filteredFiles.length,
      testFrameworks,
      hasDocumentation: Boolean(readmeExcerpt),
      hasCi: filteredFiles.some((f) => f.startsWith('.github/workflows/')),
      entryPoints,
      modules: moduleSummaries,
    };

    return {
      summary: architectureSummary,
      files: fileMetadataList,
      readmeExcerpt,
      contributingExcerpt,
      dependencies,
      devDependencies,
      testFiles,
      schemaFiles,
      routeFiles,
    };
  }
}
