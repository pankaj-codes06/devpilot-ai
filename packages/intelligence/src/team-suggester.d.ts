import type { CodebaseAnalysisResult } from './analyzer.js';

export interface SuggestedTeam {
  name: string;
  slug: string;
  description: string;
  color: string;
}

export interface SuggestedModule {
  name: string;
  description: string;
  pathPattern: string;
  teamSlug: string | null;
  isShared: boolean;
  suggestedBy: string;
}

export interface TeamSuggestionResult {
  teams: SuggestedTeam[];
  modules: SuggestedModule[];
}

export interface ModuleConflictCheck {
  id?: string;
  name: string;
  pathPattern: string;
  teamId?: string | null;
  isShared: boolean;
}

export declare class TeamSuggester {
  static suggest(analysis: CodebaseAnalysisResult): TeamSuggestionResult;
  static detectConflict(
    existingModules: ModuleConflictCheck[],
    candidate: ModuleConflictCheck
  ): { hasConflict: boolean; conflictingModule?: ModuleConflictCheck; reason?: string };
}
