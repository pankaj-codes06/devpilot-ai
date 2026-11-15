import type { CodebaseAnalysisOutput } from '@devpilot/shared';
import type { CodebaseAnalysisResult } from './analyzer.js';

export interface AnalysisPromptContext {
  repositoryName: string;
  defaultBranch?: string;
  analysis: CodebaseAnalysisResult;
}

export interface IIntelligenceProvider {
  readonly name: string;
  analyze(context: AnalysisPromptContext): Promise<CodebaseAnalysisOutput>;
}

export declare class GeminiIntelligenceProvider implements IIntelligenceProvider {
  readonly name: string;
  constructor(apiKey: string);
  analyze(context: AnalysisPromptContext): Promise<CodebaseAnalysisOutput>;
}

export declare class OpenAIIntelligenceProvider implements IIntelligenceProvider {
  readonly name: string;
  constructor(apiKey: string);
  analyze(context: AnalysisPromptContext): Promise<CodebaseAnalysisOutput>;
}

export declare class HeuristicStaticProvider implements IIntelligenceProvider {
  readonly name: string;
  constructor();
  analyze(context: AnalysisPromptContext): Promise<CodebaseAnalysisOutput>;
}

export interface IntelligenceFactoryOptions {
  geminiApiKey?: string;
  openaiApiKey?: string;
}

export declare class IntelligenceEngineFactory {
  static getProvider(options?: IntelligenceFactoryOptions): IIntelligenceProvider;
}
