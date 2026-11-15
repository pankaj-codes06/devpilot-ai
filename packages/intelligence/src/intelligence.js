import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { codebaseAnalysisOutputSchema } from '@devpilot/shared';

/**
 * Gemini-based Codebase Intelligence Provider
 */
export class GeminiIntelligenceProvider {
  constructor(apiKey) {
    this.name = 'Google Gemini';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyze(context) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const prompt = buildAnalysisPrompt(context);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsedJson = JSON.parse(responseText);

    return codebaseAnalysisOutputSchema.parse(parsedJson);
  }
}

/**
 * OpenAI-based Codebase Intelligence Provider
 */
export class OpenAIIntelligenceProvider {
  constructor(apiKey) {
    this.name = 'OpenAI';
    this.openai = new OpenAI({ apiKey });
  }

  async analyze(context) {
    const prompt = buildAnalysisPrompt(context);
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are DevPilot AI, an autonomous software architect. Analyze codebase structure and output valid structured JSON matching the schema.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return codebaseAnalysisOutputSchema.parse(parsed);
  }
}

/**
 * Deterministic Heuristic Static Provider (Zero External LLM Dependency)
 * Used as reliable fallback when API keys are not supplied.
 * Performs real rule-based static analysis to produce verified, evidence-backed engineering tasks.
 */
export class HeuristicStaticProvider {
  constructor() {
    this.name = 'Deterministic Static Analyzer';
  }

  async analyze(context) {
    const { analysis, repositoryName } = context;
    const { summary, files, testFiles, routeFiles } = analysis;

    const tasks = [];

    // 1. Test Coverage Gap Detection
    const untestedFiles = files.filter((f) => {
      const isSourceCode =
        f.extension === '.ts' || f.extension === '.tsx' || f.extension === '.js' || f.extension === '.jsx' || f.extension === '.py';
      const isTest = f.relativePath.includes('.test.') || f.relativePath.includes('.spec.');
      const isConfig = f.relativePath.includes('.config.') || f.relativePath.endsWith('.d.ts');
      return isSourceCode && !isTest && !isConfig;
    });

    for (const file of untestedFiles.slice(0, 3)) {
      const baseName = file.relativePath.replace(/\.[^/.]+$/, '');
      const hasMatchingTest = testFiles.some((t) => t.includes(baseName));

      if (!hasMatchingTest) {
        tasks.push({
          title: `Implement unit test coverage for ${path.basename(file.relativePath)}`,
          description: `The file ${file.relativePath} contains core logic but lacks dedicated automated unit test coverage. Adding automated unit tests ensures regression prevention and test verification.`,
          module: file.moduleName || 'Unassigned',
          relevantFiles: [file.relativePath],
          evidence: `Static inspection found no corresponding test file for ${file.relativePath}. Found ${testFiles.length} total test files across ${files.length} repository files.`,
          priority: 'HIGH',
          category: 'TEST_COVERAGE',
          estimatedComplexity: 'S',
          expectedBenefit: 'Increases code confidence, prevents silent regressions during autonomous tasks, and establishes test fixtures.',
          suggestedApproach: `Create a test file adjacent or under __tests__/ with unit tests covering core exported functions and boundary conditions.`,
          requiredTests: `Unit test assertions for valid inputs, error handling, and edge cases.`,
        });
      }
    }

    // 2. Documentation Audit
    if (!summary.hasDocumentation || (analysis.readmeExcerpt && analysis.readmeExcerpt.length < 250)) {
      tasks.push({
        title: 'Expand repository README with architecture and setup instructions',
        description: `The project documentation is either missing or brief. Comprehensive documentation is essential for team onboarding and module understanding.`,
        module: 'Unassigned',
        relevantFiles: ['README.md'],
        evidence: analysis.readmeExcerpt
          ? `README.md is only ${analysis.readmeExcerpt.length} characters long.`
          : 'No README.md was discovered in the repository root.',
        priority: 'MEDIUM',
        category: 'DOCUMENTATION',
        estimatedComplexity: 'XS',
        expectedBenefit: 'Accelerates developer onboarding and clarifies project architecture.',
        suggestedApproach: 'Draft clear sections for System Architecture, Local Development Prerequisites, and Test Execution commands.',
        requiredTests: 'Documentation formatting validation via Markdown linter.',
      });
    }

    // 3. CI/CD Pipeline Verification
    if (!summary.hasCi) {
      tasks.push({
        title: 'Establish automated CI workflow for linting and test validation',
        description: `No automated continuous integration (CI) workflow was discovered under .github/workflows. Establishing automated CI guarantees that every commit and Pull Request is validated against the test suite.`,
        module: 'Unassigned',
        relevantFiles: ['.github/workflows/ci.yml'],
        evidence: 'No workflow files found matching .github/workflows/*.yml.',
        priority: 'HIGH',
        category: 'TECH_DEBT',
        estimatedComplexity: 'S',
        expectedBenefit: 'Automates linting and unit test execution on every pull request.',
        suggestedApproach: 'Configure a GitHub Actions workflow with steps for dependency installation, lint checking, and test suite execution.',
        requiredTests: 'Run workflow locally with act or trigger on a draft PR.',
      });
    }

    // 4. API & Route Error Handling / Validation Audit
    if (routeFiles.length > 0) {
      tasks.push({
        title: 'Verify centralized input validation on exposed API routes',
        description: `Review exposed route handlers (${routeFiles.slice(0, 2).join(', ')}) to ensure incoming payloads and query parameters are strictly validated using Zod or equivalent validation schemas.`,
        module: 'Unassigned',
        relevantFiles: routeFiles.slice(0, 2),
        evidence: `Discovered ${routeFiles.length} API route files without universal schema assertions.`,
        priority: 'MEDIUM',
        category: 'SECURITY',
        estimatedComplexity: 'M',
        expectedBenefit: 'Hardens API boundaries against malformed or malicious client requests.',
        suggestedApproach: 'Attach schema validation middlewares before invoking route controllers.',
        requiredTests: 'Integration tests sending malformed JSON payloads and asserting 400 Bad Request responses.',
      });
    }

    const primaryLangs = Object.keys(summary.languages);
    const summaryText = `Architecture analysis completed for ${repositoryName}. Identified ${summary.totalFiles} files across ${primaryLangs.join(', ') || 'multiple languages'} using ${summary.frameworks.join(', ') || 'standard libraries'}. Formulated ${tasks.length} grounded development improvement tasks.`;

    const result = {
      summary: summaryText,
      architecture: {
        overview: `Project type: ${summary.projectType}. Managed by ${summary.packageManager || 'standard package manager'}.`,
        primaryLanguages: primaryLangs,
        detectedFrameworks: summary.frameworks,
        projectStructure: `Comprises ${summary.modules.length} defined module segments and ${summary.totalFiles} source files.`,
      },
      tasks,
    };

    return codebaseAnalysisOutputSchema.parse(result);
  }
}

/**
 * Factory creating the best available Intelligence Engine Provider.
 */
export class IntelligenceEngineFactory {
  static getProvider(options) {
    const geminiKey = options?.geminiApiKey ?? process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim().length > 0) {
      return new GeminiIntelligenceProvider(geminiKey.trim());
    }

    const openaiKey = options?.openaiApiKey ?? process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey.trim().length > 0) {
      return new OpenAIIntelligenceProvider(openaiKey.trim());
    }

    // Deterministic static analyzer fallback
    return new HeuristicStaticProvider();
  }
}

function buildAnalysisPrompt(context) {
  const { repositoryName, defaultBranch = 'main', analysis } = context;
  const { summary, files, dependencies, devDependencies, testFiles, readmeExcerpt } = analysis;

  const fileSample = files
    .slice(0, 150)
    .map((f) => `- ${f.relativePath} (${f.extension}, module: ${f.moduleName})`)
    .join('\n');

  return `You are DevPilot AI, an autonomous software architect. Analyze the provided repository context and produce a structured improvement report.

IMPORTANT RULES:
1. Do NOT invent bugs or fake files. Every suggestion MUST reference real files from the file list below.
2. Group suggestions into meaningful, actionable tasks.
3. Categorize each task: BUG_RISK, TEST_COVERAGE, DUPLICATION, DOCUMENTATION, TECH_DEBT, or SECURITY.
4. Assign priority: CRITICAL, HIGH, MEDIUM, LOW.
5. Provide concrete evidence referencing the files and architecture.
6. Return ONLY valid JSON adhering strictly to the JSON schema.

REPOSITORY METADATA:
- Repository: ${repositoryName}
- Default Branch: ${defaultBranch}
- Project Type: ${summary.projectType}
- Detected Languages: ${JSON.stringify(summary.languages)}
- Detected Frameworks: ${summary.frameworks.join(', ')}
- Total Files: ${summary.totalFiles}
- Existing Test Files (${testFiles.length}): ${testFiles.slice(0, 20).join(', ')}
- Dependencies: ${Object.keys(dependencies).slice(0, 30).join(', ')}
- DevDependencies: ${Object.keys(devDependencies).slice(0, 30).join(', ')}

README EXCERPT:
${readmeExcerpt || 'No README provided'}

REPOSITORY FILE TREE (SAMPLE):
${fileSample}

JSON OUTPUT FORMAT:
{
  "summary": "Executive summary of the repository architecture and health",
  "architecture": {
    "overview": "High level architecture description",
    "primaryLanguages": ["TypeScript", "Python"],
    "detectedFrameworks": ["React", "Express"],
    "projectStructure": "Monorepo / modular structure description"
  },
  "tasks": [
    {
      "title": "Clear action-oriented task title",
      "description": "Comprehensive explanation of what needs improvement and why",
      "module": "Module name or Unassigned",
      "relevantFiles": ["path/to/real/file.ts"],
      "evidence": "Concrete observation from the codebase files",
      "priority": "HIGH",
      "category": "TEST_COVERAGE",
      "estimatedComplexity": "S",
      "expectedBenefit": "Specific value delivered to the project",
      "suggestedApproach": "Step-by-step implementation guide",
      "requiredTests": "Tests that should be written to verify this change"
    }
  ]
}`;
}
