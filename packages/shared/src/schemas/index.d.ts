import { z } from 'zod';

export declare const connectRepositorySchema: z.ZodObject<{
    githubRepoId: z.ZodNumber;
    installationId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    githubRepoId: number;
    installationId: number;
}, {
    githubRepoId: number;
    installationId: number;
}>;

export declare const syncRepositoriesSchema: z.ZodObject<{
    installationId: z.ZodOptional<z.ZodNumber>;
    repositoryIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    installationId?: number | undefined;
    repositoryIds?: number[] | undefined;
}, {
    installationId?: number | undefined;
    repositoryIds?: number[] | undefined;
}>;

export declare const updateAgentSettingsSchema: z.ZodObject<{
    isEnabled: z.ZodOptional<z.ZodBoolean>;
    scheduleCron: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
    branchPrefix: z.ZodOptional<z.ZodString>;
    allowedPaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    excludedPaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    maxDailyRuns: z.ZodOptional<z.ZodNumber>;
    requirePrReview: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isEnabled?: boolean | undefined;
    scheduleCron?: string | undefined;
    timezone?: string | undefined;
    branchPrefix?: string | undefined;
    allowedPaths?: string[] | undefined;
    excludedPaths?: string[] | undefined;
    maxDailyRuns?: number | undefined;
    requirePrReview?: boolean | undefined;
}, {
    isEnabled?: boolean | undefined;
    scheduleCron?: string | undefined;
    timezone?: string | undefined;
    branchPrefix?: string | undefined;
    allowedPaths?: string[] | undefined;
    excludedPaths?: string[] | undefined;
    maxDailyRuns?: number | undefined;
    requirePrReview?: boolean | undefined;
}>;

export declare const updateRepositorySettingsSchema: z.ZodObject<{
    agentSettings: z.ZodOptional<z.ZodObject<{
        isEnabled: z.ZodOptional<z.ZodBoolean>;
        scheduleCron: z.ZodOptional<z.ZodString>;
        timezone: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
        branchPrefix: z.ZodOptional<z.ZodString>;
        allowedPaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        excludedPaths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        maxDailyRuns: z.ZodOptional<z.ZodNumber>;
        requirePrReview: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        isEnabled?: boolean | undefined;
        scheduleCron?: string | undefined;
        timezone?: string | undefined;
        branchPrefix?: string | undefined;
        allowedPaths?: string[] | undefined;
        excludedPaths?: string[] | undefined;
        maxDailyRuns?: number | undefined;
        requirePrReview?: boolean | undefined;
    }, {
        isEnabled?: boolean | undefined;
        scheduleCron?: string | undefined;
        timezone?: string | undefined;
        branchPrefix?: string | undefined;
        allowedPaths?: string[] | undefined;
        excludedPaths?: string[] | undefined;
        maxDailyRuns?: number | undefined;
        requirePrReview?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    agentSettings?: {
        isEnabled?: boolean | undefined;
        scheduleCron?: string | undefined;
        timezone?: string | undefined;
        branchPrefix?: string | undefined;
        allowedPaths?: string[] | undefined;
        excludedPaths?: string[] | undefined;
        maxDailyRuns?: number | undefined;
        requirePrReview?: boolean | undefined;
    } | undefined;
}, {
    agentSettings?: {
        isEnabled?: boolean | undefined;
        scheduleCron?: string | undefined;
        timezone?: string | undefined;
        branchPrefix?: string | undefined;
        allowedPaths?: string[] | undefined;
        excludedPaths?: string[] | undefined;
        maxDailyRuns?: number | undefined;
        requirePrReview?: boolean | undefined;
    } | undefined;
}>;

export declare const prioritizedTaskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    module: z.ZodDefault<z.ZodString>;
    relevantFiles: z.ZodArray<z.ZodString, "many">;
    evidence: z.ZodString;
    priority: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
    category: z.ZodEnum<["BUG_RISK", "TEST_COVERAGE", "DUPLICATION", "DOCUMENTATION", "TECH_DEBT", "SECURITY"]>;
    estimatedComplexity: z.ZodEnum<["XS", "S", "M", "L", "XL"]>;
    expectedBenefit: z.ZodString;
    suggestedApproach: z.ZodString;
    requiredTests: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    module: string;
    relevantFiles: string[];
    evidence: string;
    priority: "HIGH" | "LOW" | "CRITICAL" | "MEDIUM";
    category: "TECH_DEBT" | "DOCUMENTATION" | "BUG_RISK" | "TEST_COVERAGE" | "DUPLICATION" | "SECURITY";
    estimatedComplexity: "M" | "S" | "XS" | "L" | "XL";
    expectedBenefit: string;
    suggestedApproach: string;
    requiredTests: string;
}, {
    title: string;
    description: string;
    relevantFiles: string[];
    evidence: string;
    priority: "HIGH" | "LOW" | "CRITICAL" | "MEDIUM";
    category: "TECH_DEBT" | "DOCUMENTATION" | "BUG_RISK" | "TEST_COVERAGE" | "DUPLICATION" | "SECURITY";
    estimatedComplexity: "M" | "S" | "XS" | "L" | "XL";
    expectedBenefit: string;
    suggestedApproach: string;
    requiredTests: string;
    module?: string | undefined;
}>;

export declare const codebaseAnalysisOutputSchema: z.ZodObject<{
    summary: z.ZodString;
    architecture: z.ZodObject<{
        overview: z.ZodString;
        primaryLanguages: z.ZodArray<z.ZodString, "many">;
        detectedFrameworks: z.ZodArray<z.ZodString, "many">;
        projectStructure: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        overview: string;
        primaryLanguages: string[];
        detectedFrameworks: string[];
        projectStructure: string;
    }, {
        overview: string;
        primaryLanguages: string[];
        detectedFrameworks: string[];
        projectStructure: string;
    }>;
    tasks: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        module: z.ZodDefault<z.ZodString>;
        relevantFiles: z.ZodArray<z.ZodString, "many">;
        evidence: z.ZodString;
        priority: z.ZodEnum<["CRITICAL", "HIGH", "MEDIUM", "LOW"]>;
        category: z.ZodEnum<["BUG_RISK", "TEST_COVERAGE", "DUPLICATION", "DOCUMENTATION", "TECH_DEBT", "SECURITY"]>;
        estimatedComplexity: z.ZodEnum<["XS", "S", "M", "L", "XL"]>;
        expectedBenefit: z.ZodString;
        suggestedApproach: z.ZodString;
        requiredTests: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
        module: string;
        relevantFiles: string[];
        evidence: string;
        priority: "HIGH" | "LOW" | "CRITICAL" | "MEDIUM";
        category: "TECH_DEBT" | "DOCUMENTATION" | "BUG_RISK" | "TEST_COVERAGE" | "DUPLICATION" | "SECURITY";
        estimatedComplexity: "M" | "S" | "XS" | "L" | "XL";
        expectedBenefit: string;
        suggestedApproach: string;
        requiredTests: string;
    }, {
        title: string;
        description: string;
        relevantFiles: string[];
        evidence: string;
        priority: "HIGH" | "LOW" | "CRITICAL" | "MEDIUM";
        category: "TECH_DEBT" | "DOCUMENTATION" | "BUG_RISK" | "TEST_COVERAGE" | "DUPLICATION" | "SECURITY";
        estimatedComplexity: "M" | "S" | "XS" | "L" | "XL";
        expectedBenefit: string;
        suggestedApproach: string;
        requiredTests: string;
        module?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    summary: string;
    architecture: {
        overview: string;
        primaryLanguages: string[];
        detectedFrameworks: string[];
        projectStructure: string;
    };
    tasks: {
        title: string;
        description: string;
        module: string;
        relevantFiles: string[];
        evidence: string;
        priority: "HIGH" | "LOW" | "CRITICAL" | "MEDIUM";
        category: "TECH_DEBT" | "DOCUMENTATION" | "BUG_RISK" | "TEST_COVERAGE" | "DUPLICATION" | "SECURITY";
        estimatedComplexity: "M" | "S" | "XS" | "L" | "XL";
        expectedBenefit: string;
        suggestedApproach: string;
        requiredTests: string;
    }[];
}, {
    summary: string;
    architecture: {
        overview: string;
        primaryLanguages: string[];
        detectedFrameworks: string[];
        projectStructure: string;
    };
    tasks: {
        title: string;
        description: string;
        relevantFiles: string[];
        evidence: string;
        priority: "HIGH" | "LOW" | "CRITICAL" | "MEDIUM";
        category: "TECH_DEBT" | "DOCUMENTATION" | "BUG_RISK" | "TEST_COVERAGE" | "DUPLICATION" | "SECURITY";
        estimatedComplexity: "M" | "S" | "XS" | "L" | "XL";
        expectedBenefit: string;
        suggestedApproach: string;
        requiredTests: string;
        module?: string | undefined;
    }[];
}>;

export declare const createProjectSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    repositoryId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    repositoryId?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    repositoryId?: string | undefined;
}>;

export declare const createTeamSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodDefault<z.ZodString>;
    leadName: z.ZodOptional<z.ZodString>;
    leadEmail: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    color: string;
    description?: string | undefined;
    leadName?: string | undefined;
    leadEmail?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    color?: string | undefined;
    leadName?: string | undefined;
    leadEmail?: string | undefined;
}>;

export declare const mapModuleSchema: z.ZodObject<{
    name: z.ZodString;
    pathPattern: z.ZodString;
    teamId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    isShared: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    pathPattern: string;
    isShared: boolean;
    description?: string | undefined;
    teamId?: string | null | undefined;
}, {
    name: string;
    pathPattern: string;
    description?: string | undefined;
    teamId?: string | null | undefined;
    isShared?: boolean | undefined;
}>;

export declare const updateTeamSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    leadName: z.ZodOptional<z.ZodString>;
    leadEmail: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    name?: string | undefined;
    color?: string | undefined;
    leadName?: string | undefined;
    leadEmail?: string | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    color?: string | undefined;
    leadName?: string | undefined;
    leadEmail?: string | undefined;
}>;

export declare const updateModuleSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    pathPattern: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    isShared: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    name?: string | undefined;
    pathPattern?: string | undefined;
    teamId?: string | null | undefined;
    isShared?: boolean | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    pathPattern?: string | undefined;
    teamId?: string | null | undefined;
    isShared?: boolean | undefined;
}>;

export type ConnectRepositoryInput = z.infer<typeof connectRepositorySchema>;
export type SyncRepositoriesInput = z.infer<typeof syncRepositoriesSchema>;
export type UpdateAgentSettingsInput = z.infer<typeof updateAgentSettingsSchema>;
export type PrioritizedTaskInput = z.infer<typeof prioritizedTaskSchema>;
export type CodebaseAnalysisOutput = z.infer<typeof codebaseAnalysisOutputSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type MapModuleInput = z.infer<typeof mapModuleSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
