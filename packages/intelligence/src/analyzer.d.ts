import type { ArchitectureSummary } from '@devpilot/shared';

export interface TeamModuleInput {
  id: string;
  name: string;
  pathPattern: string;
  ownerName?: string;
  isShared?: boolean;
}

export interface FileMetadata {
  relativePath: string;
  sizeBytes: number;
  extension: string;
  moduleName: string;
  assignedMember?: string;
}

export interface CodebaseAnalysisResult {
  summary: ArchitectureSummary;
  files: FileMetadata[];
  readmeExcerpt: string | null;
  contributingExcerpt: string | null;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  testFiles: string[];
  schemaFiles: string[];
  routeFiles: string[];
}

export declare const SENSITIVE_EXCLUDE_PATTERNS: string[];
export declare const DIRECTORY_EXCLUDE_PATTERNS: string[];

export declare class RepositoryAnalyzer {
  static analyze(
    repoPath: string,
    teamModules?: TeamModuleInput[],
    allowedPaths?: string[],
    excludedPaths?: string[]
  ): Promise<CodebaseAnalysisResult>;
}
